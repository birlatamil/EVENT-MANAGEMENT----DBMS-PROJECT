import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, MapPin, Users, FileText, Type, AlertCircle } from 'lucide-react';

function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    venue: '',
    capacity: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        capacity: parseInt(formData.capacity)
      };

      const response = await api.post('/events', payload);
      navigate(`/events/${response.data.event.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create event. Please check your inputs.');
      setSubmitting(false);
    }
  };

  return (
    <main className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="glass-elevated" style={{ padding: '2.5rem', width: '100%', maxWidth: '620px', borderRadius: '24px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Create New Event</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fill out the details to organize a new event.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><Type size={12} /> Event Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Tech Conference 2026" />
          </div>

          <div className="form-group">
            <label><FileText size={12} /> Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required placeholder="Describe what the event will be about..." rows="4"></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label><Calendar size={12} /> Date & Time</label>
              <input type="datetime-local" name="event_date" value={formData.event_date} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label><Users size={12} /> Capacity</label>
              <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} required placeholder="100" min="1" />
            </div>
          </div>

          <div className="form-group">
            <label><MapPin size={12} /> Venue</label>
            <input type="text" name="venue" value={formData.venue} onChange={handleChange} required placeholder="Grand Hotel, Main Hall" />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-lg" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 2 }} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default CreateEvent;
