import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, MapPin, Users } from 'lucide-react';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get(`/events?search=${search}`);
        setEvents(response.data.events);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchEvents, 300); // debounce
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <main className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Upcoming Events</h1>
        <input 
          type="text" 
          placeholder="Search events..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No events found matching your search.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {events.map((ev) => (
            <div key={ev.id} className="glass" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: ev.status === 'upcoming' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: ev.status === 'upcoming' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '1rem' }}>
                  {ev.status}
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#fff' }}>{ev.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ev.description}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="var(--primary)" />
                    {new Date(ev.event_date).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="var(--danger)" />
                    {ev.venue}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color="var(--success)" />
                    Capacity: {ev.capacity}
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border)' }}>
                <Link to={`/events/${ev.id}`} className="btn btn-primary" style={{ width: '100%' }}>View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default Events;
