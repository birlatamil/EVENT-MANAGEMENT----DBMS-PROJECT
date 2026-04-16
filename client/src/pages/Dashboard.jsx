import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Users, Calendar as CalendarIcon, CheckCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const endpoint = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/organizer';
        const response = await api.get(endpoint);
        setStats(response.data);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user.role === 'admin' || user.role === 'organizer') {
      fetchStats();
    } else {
      // Participant doesn't have a dedicated stats endpoint yet, so just fetch their registrations
      setLoading(false);
    }
  }, [user]);

  if (loading) return <main style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>Loading dashboard...</main>;
  if (error) return <main style={{ color: 'var(--danger)', textAlign: 'center', paddingTop: '5rem' }}>{error}</main>;

  const StatCard = ({ title, value, icon, color }) => (
    <div className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ padding: '1rem', background: `rgba(${color}, 0.1)`, borderRadius: '12px', color: `rgb(${color})` }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{title}</h3>
        <p style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>{value}</p>
      </div>
    </div>
  );

  return (
    <main className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Welcome back, {user.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your {user.role} workspace.</p>
        </div>
        {user.role === 'organizer' && (
          <Link to="/events/new" className="btn btn-primary">Create New Event</Link>
        )}
      </div>

      {(user.role === 'admin' || user.role === 'organizer') ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <StatCard title="Total Events" value={stats?.total_events || 0} icon={<CalendarIcon size={24} />} color="59, 130, 246" />
            <StatCard title="Total Registrations" value={stats?.total_registrations || 0} icon={<Users size={24} />} color="139, 92, 246" />
            {user.role === 'admin' && (
              <>
                <StatCard title="Total Participants" value={stats?.total_participants || 0} icon={<Activity size={24} />} color="16, 185, 129" />
                <StatCard title="Total Attendance" value={stats?.total_attendance || 0} icon={<CheckCircle size={24} />} color="245, 158, 11" />
              </>
            )}
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>{user.role === 'admin' ? 'Recent Platform Events' : 'Your Events Overview'}</h2>
          
          <div className="glass" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Event Name</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Registrations</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Attendance</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_events || stats?.events_performance || []).map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{ev.title}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{new Date(ev.event_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{ev.regs} / {ev.capacity || '∞'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{ev.atts}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <Link to={`/events/${ev.id}`} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Manage</Link>
                    </td>
                  </tr>
                ))}
                {(!stats?.recent_events && !stats?.events_performance) && (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No events found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <CalendarIcon size={48} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <h2>Ready to attend an event?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Browse upcoming events and register to secure your spot.</p>
          <Link to="/events" className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>Browse Events</Link>
        </div>
      )}
    </main>
  );
}

export default Dashboard;
