import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Users, Calendar as CalendarIcon, CheckCircle, Activity, Plus, TrendingUp, Award, Clock, Inbox } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [myRegs, setMyRegs] = useState([]);
  const [myCerts, setMyCerts] = useState([]);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'admin' || user.role === 'organizer') {
          const endpoint = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/organizer';
          const response = await api.get(endpoint);
          setStats(response.data);
        }

        if (user.role === 'participant') {
          const [regsRes, certsRes] = await Promise.all([
            api.get('/my-registrations'),
            api.get('/certificates/my'),
          ]);
          setMyRegs(regsRes.data.registrations || []);
          setMyCerts(certsRes.data.certificates || []);
        }

        // Get recent notifications for everyone
        const notifsRes = await api.get('/notifications?limit=5');
        setRecentNotifs(notifsRes.data.notifications || []);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
      </main>
    );
  }

  if (error) {
    return <main><div className="alert alert-error">{error}</div></main>;
  }

  const StatCard = ({ title, value, icon, color }) => (
    <div className="glass stat-card" style={{ '--stat-color': color }}>
      <div className="stat-icon" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const cls = `badge badge-${status}`;
    return <span className={cls}>{status}</span>;
  };

  // ==================== PARTICIPANT DASHBOARD ====================
  if (user.role === 'participant') {
    return (
      <main className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Welcome, {user.name?.split(' ')[0]} 👋</h1>
            <p style={{ color: 'var(--text-muted)' }}>Your participant dashboard</p>
          </div>
          <Link to="/events" className="btn btn-primary">
            <CalendarIcon size={16} /> Browse Events
          </Link>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard title="My Registrations" value={myRegs.length} icon={<CalendarIcon size={22} />} color="var(--primary)" />
          <StatCard title="Events Attended" value={myRegs.filter(r => r.has_attended).length} icon={<CheckCircle size={22} />} color="var(--success)" />
          <StatCard title="Certificates" value={myCerts.length} icon={<Award size={22} />} color="var(--accent)" />
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* My Registrations */}
          <div className="glass" style={{ overflow: 'hidden', gridColumn: window.innerWidth < 768 ? '1 / -1' : 'auto' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>My Registrations</h3>
              <span className="badge badge-upcoming">{myRegs.length}</span>
            </div>
            {myRegs.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <CalendarIcon size={32} />
                <p style={{ fontSize: '0.85rem' }}>No registrations yet</p>
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {myRegs.slice(0, 8).map((reg) => (
                  <div
                    key={reg.registration_id}
                    onClick={() => navigate(`/events/${reg.event_id}`)}
                    style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'var(--transition)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{reg.title}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <Clock size={12} /> {new Date(reg.event_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {reg.has_attended && <CheckCircle size={14} color="var(--success)" />}
                      {getStatusBadge(reg.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Notifications</h3>
              <Link to="/inbox" style={{ fontSize: '0.8rem' }}>View all</Link>
            </div>
            {recentNotifs.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Inbox size={32} />
                <p style={{ fontSize: '0.85rem' }}>No notifications</p>
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {recentNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-card ${!n.is_read ? 'unread' : ''}`}
                    onClick={() => n.event_id && navigate(`/events/${n.event_id}`)}
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    <div className="notif-content">
                      <div className="notif-title" style={{ fontSize: '0.85rem' }}>{n.title}</div>
                      <div className="notif-message" style={{ fontSize: '0.78rem', WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Certificates */}
        {myCerts.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--accent)" /> My Certificates
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {myCerts.map((cert) => (
                <div key={cert.certificate_uid} className="glass" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>{cert.event_title}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '1rem' }}>
                    {new Date(cert.event_date).toLocaleDateString()} • Issued {new Date(cert.issued_at).toLocaleDateString()}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={async () => {
                      try {
                        const res = await api.get(`/certificates/download/${cert.certificate_uid}`, {
                          responseType: 'blob',
                        });
                        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `Certificate_${cert.event_title.replace(/\s+/g, '_')}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Download failed:', err);
                        alert('Failed to download certificate. Please try again.');
                      }
                    }}
                  >
                    <Award size={14} /> Download Certificate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    );
  }

  // ==================== ADMIN / ORGANIZER DASHBOARD ====================
  return (
    <main className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Welcome, {user.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your {user.role} workspace</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/inbox" className="btn btn-sm"><Inbox size={14} /> Inbox</Link>
          <Link to="/events/new" className="btn btn-primary">
            <Plus size={16} /> Create Event
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Events" value={stats?.total_events || 0} icon={<CalendarIcon size={22} />} color="var(--primary)" />
        <StatCard title="Total Registrations" value={stats?.total_registrations || 0} icon={<Users size={22} />} color="var(--accent)" />
        {user.role === 'admin' && (
          <>
            <StatCard title="Participants" value={stats?.total_participants || 0} icon={<Activity size={22} />} color="var(--success)" />
            <StatCard title="Attendance" value={stats?.total_attendance || 0} icon={<CheckCircle size={22} />} color="var(--warning)" />
          </>
        )}
      </div>

      {/* Events Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} /> {user.role === 'admin' ? 'Recent Platform Events' : 'Your Events'}
        </h2>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Date</th>
              <th>Status</th>
              <th>Registrations</th>
              <th>Attendance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recent_events || stats?.events_performance || []).map((ev) => (
              <tr key={ev.id}>
                <td style={{ fontWeight: 500 }}>{ev.title}</td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(ev.event_date).toLocaleDateString()}</td>
                <td>{getStatusBadge(ev.status || 'upcoming')}</td>
                <td>
                  <span>{ev.regs}</span>
                  <span style={{ color: 'var(--text-dim)' }}> / {ev.capacity || '∞'}</span>
                </td>
                <td>{ev.atts}</td>
                <td>
                  <Link to={`/events/${ev.id}`} className="btn btn-sm">Manage</Link>
                </td>
              </tr>
            ))}
            {(!stats?.recent_events && !stats?.events_performance) && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No events found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default Dashboard;
