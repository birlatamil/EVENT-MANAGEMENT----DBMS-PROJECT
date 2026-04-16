import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Calendar, MapPin, Users, Ticket, CheckCircle, Download } from 'lucide-react';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get(`/events/${id}`);
        setEvent(response.data.event);
      } catch (err) {
        setError('Event not found');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleRegister = async () => {
    try {
      await api.post(`/events/${id}/register`);
      setActionSuccess('Successfully registered for the event!');
      setEvent({ ...event, current_registrations: parseInt(event.current_registrations) + 1 });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await api.get(`/events/${id}/attendance/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${event.title}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download attendance report');
    }
  };

  const generateCertificates = async () => {
    try {
      const resp = await api.post(`/events/${id}/certificates/generate`);
      setActionSuccess(resp.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate certificates');
    }
  };

  if (loading) return <main style={{ textAlign: 'center', paddingTop: '5rem' }}>Loading event details...</main>;
  if (error && !event) return <main style={{ textAlign: 'center', color: 'var(--danger)', paddingTop: '5rem' }}>{error}</main>;

  const isOrganizer = user.role === 'admin' || user.id === event.organizer_id;

  return (
    <main className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate('/events')} className="btn" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: '2rem', color: 'var(--text-muted)' }}>
        ← Back to Events
      </button>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}
      {actionSuccess && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{actionSuccess}</div>}

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ height: '200px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'flex-end', padding: '2rem' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', backdropFilter: 'blur(4px)', marginBottom: '1rem' }}>
              {event.status}
            </div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{event.title}</h1>
          </div>
        </div>
        
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}><Calendar size={24} /></div>
              <div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date & Time</p><p style={{ margin: 0, fontWeight: '500' }}>{new Date(event.event_date).toLocaleString()}</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--danger)' }}><MapPin size={24} /></div>
              <div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Venue</p><p style={{ margin: 0, fontWeight: '500' }}>{event.venue}</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--success)' }}><Users size={24} /></div>
              <div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Availability</p><p style={{ margin: 0, fontWeight: '500' }}>{event.current_registrations} / {event.capacity} Spots</p></div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>About this event</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2.5rem', whiteSpace: 'pre-wrap' }}>
            {event.description}
          </p>

          <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Organized by</p>
              <p style={{ margin: 0, fontWeight: '500', fontSize: '1.1rem' }}>{event.organizer_name}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {isOrganizer ? (
                <>
                  <button onClick={handleDownloadReport} className="btn"><Download size={18} /> Export Attendance</button>
                  <button onClick={generateCertificates} className="btn"><CheckCircle size={18} /> Issue Certificates</button>
                </>
              ) : (
                <button onClick={handleRegister} className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
                  <Ticket size={18} /> Register Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default EventDetails;
