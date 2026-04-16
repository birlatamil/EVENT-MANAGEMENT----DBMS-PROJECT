import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { SocketContext } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Bell, KeyRound, Award, Inbox, Megaphone, Calendar, CheckCircle, Filter, CheckCheck } from 'lucide-react';

function NotificationInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const socketCtx = useContext(SocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?limit=50&type=${filter}`);
      setNotifications(res.data.notifications);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (socketCtx) socketCtx.setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      if (socketCtx) socketCtx.setUnreadCount(0);
    } catch (e) { /* ignore */ }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'otp_generated': return <KeyRound size={18} />;
      case 'certificate_issued': return <Award size={18} />;
      case 'attendance_open': return <CheckCircle size={18} />;
      case 'event_upcoming': return <Calendar size={18} />;
      case 'event_started': return <Megaphone size={18} />;
      case 'event_ended': return <Inbox size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getNotifColor = (type) => {
    switch (type) {
      case 'otp_generated': return 'var(--warning)';
      case 'certificate_issued': return 'var(--success)';
      case 'attendance_open': return 'var(--primary)';
      case 'event_upcoming': return 'var(--accent)';
      default: return 'var(--text-muted)';
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filters = [
    { key: 'all', label: 'All', icon: <Bell size={14} /> },
    { key: 'otp_generated', label: 'OTP', icon: <KeyRound size={14} /> },
    { key: 'attendance_open', label: 'Attendance', icon: <CheckCircle size={14} /> },
    { key: 'certificate_issued', label: 'Certificates', icon: <Award size={14} /> },
    { key: 'event_upcoming', label: 'Events', icon: <Calendar size={14} /> },
  ];

  return (
    <main className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Inbox size={28} /> Inbox
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{total} notifications</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button className="btn btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="tabs">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications</h3>
            <p style={{ fontSize: '0.9rem' }}>You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-card ${!n.is_read ? 'unread' : ''}`}
              onClick={() => {
                if (!n.is_read) markAsRead(n.id);
                if (n.event_id) navigate(`/events/${n.event_id}`);
              }}
            >
              <div
                className="notif-icon"
                style={{ background: `${getNotifColor(n.type)}18`, color: getNotifColor(n.type) }}
              >
                {getNotifIcon(n.type)}
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">
                  {formatDate(n.created_at)}
                  {n.event_title && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>• {n.event_title}</span>
                  )}
                </div>
              </div>
              {!n.is_read && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '0.5rem' }}></div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default NotificationInbox;
