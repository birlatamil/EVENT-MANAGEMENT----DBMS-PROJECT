import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, MapPin, Users, Search, Filter } from 'lucide-react';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        let url = `/events?search=${search}`;
        if (statusFilter) url += `&status=${statusFilter}`;
        const response = await api.get(url);
        setEvents(response.data.events);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    const timer = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const getStatusBadge = (status) => {
    return <span className={`badge badge-${status}`}>{status}</span>;
  };

  const getCapacityPercent = (ev) => {
    if (!ev.capacity) return 0;
    return Math.min(100, Math.round((ev.current_registrations || 0) / ev.capacity * 100));
  };

  return (
    <main className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Discover Events</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', maxWidth: '260px' }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs" style={{ marginBottom: '2rem' }}>
        {[
          { key: '', label: 'Active Events' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'ongoing', label: 'Ongoing' },
          { key: 'completed', label: 'History' },
        ].map((f) => (
          <button
            key={f.key}
            className={`tab ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {(() => {
        const displayedEvents = events.filter(ev => {
          if (statusFilter === '') return ev.status !== 'completed' && ev.status !== 'cancelled';
          return true;
        });
        
        return (

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass" style={{ height: '280px' }}>
              <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--radius)' }}></div>
            </div>
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="glass empty-state">
          <Calendar size={48} />
          <h3>No events found</h3>
          <p style={{ fontSize: '0.9rem' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {displayedEvents.map((ev, i) => {
            const capPercent = getCapacityPercent(ev);
            return (
              <div key={ev.id} className={`glass event-card animate-slide-up`} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="event-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    {getStatusBadge(ev.status)}
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      by {ev.organizer_name}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#fff' }}>{ev.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                    {ev.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} color="var(--primary)" />
                      {new Date(ev.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={14} color="var(--danger)" />
                      {ev.venue}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={14} color="var(--success)" />
                      {ev.current_registrations || 0} / {ev.capacity} spots
                    </div>
                    <div className="capacity-bar">
                      <div
                        className={`capacity-fill ${capPercent > 80 ? 'high' : ''}`}
                        style={{ width: `${capPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="event-card-footer">
                  <Link to={`/events/${ev.id}`} className="btn btn-primary" style={{ width: '100%' }}>
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      );
      })()}
    </main>
  );
}

export default Events;
