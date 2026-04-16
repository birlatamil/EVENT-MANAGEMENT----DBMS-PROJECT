import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import api from '../api/axios';
import { LogOut, Calendar, Bell, User, Clock, Menu, X, Inbox, KeyRound, Award, Megaphone } from 'lucide-react';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const socketCtx = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [time, setTime] = useState(new Date());
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch unread count
  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        try {
          const res = await api.get('/notifications/unread-count');
          setUnreadCount(res.data.count);
          if (socketCtx) socketCtx.setUnreadCount(res.data.count);
        } catch (e) { /* ignore */ }
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Sync from socket context
  useEffect(() => {
    if (socketCtx?.unreadCount !== undefined) {
      setUnreadCount(socketCtx.unreadCount);
    }
  }, [socketCtx?.unreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleNotifDropdown = async () => {
    const newState = !showNotifDropdown;
    setShowNotifDropdown(newState);
    if (newState) {
      try {
        const res = await api.get('/notifications?limit=5');
        setNotifications(res.data.notifications);
      } catch (e) { /* ignore */ }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      if (socketCtx) socketCtx.setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (e) { /* ignore */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'otp_generated': return <KeyRound size={16} />;
      case 'certificate_issued': return <Award size={16} />;
      case 'attendance_open': return <Inbox size={16} />;
      default: return <Megaphone size={16} />;
    }
  };

  const getNotifColor = (type) => {
    switch (type) {
      case 'otp_generated': return 'var(--warning)';
      case 'certificate_issued': return 'var(--success)';
      case 'attendance_open': return 'var(--primary)';
      default: return 'var(--accent)';
    }
  };

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass navbar">
      <Link to="/" className="navbar-brand">
        <div className="brand-icon">
          <Calendar size={18} color="white" />
        </div>
        Certify
      </Link>

      <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
      </button>

      <nav className={`navbar-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Live Clock */}
        <div className="live-clock">
          <span className="clock-dot"></span>
          <Clock size={14} />
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        <div className="navbar-divider"></div>

        <Link to="/events" className={`navbar-link ${isActive('/events') ? 'active' : ''}`}>
          Events
        </Link>

        {user ? (
          <>
            <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>
              Dashboard
            </Link>

            <div className="navbar-divider"></div>

            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button className="notif-bell" onClick={toggleNotifDropdown} id="notif-bell">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="btn btn-sm" onClick={handleMarkAllRead} style={{ fontSize: '0.75rem' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-dropdown-body">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-card ${!n.is_read ? 'unread' : ''}`}
                          onClick={() => {
                            setShowNotifDropdown(false);
                            if (n.event_id) navigate(`/events/${n.event_id}`);
                          }}
                        >
                          <div
                            className="notif-icon"
                            style={{ background: `${getNotifColor(n.type)}15`, color: getNotifColor(n.type) }}
                          >
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="notif-content">
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-message" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {n.message}
                            </div>
                            <div className="notif-time">{formatTimeAgo(n.created_at)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="notif-dropdown-footer">
                    <Link
                      to="/inbox"
                      className="btn btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => setShowNotifDropdown(false)}
                    >
                      <Inbox size={14} /> View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="navbar-user">
              <span className="user-name">
                <User size={15} />
                {user.name?.split(' ')[0]}
              </span>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
