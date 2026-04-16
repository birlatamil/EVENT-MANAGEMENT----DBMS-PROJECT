import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import EventChat from '../components/EventChat';
import CertificateEditor from '../components/CertificateEditor';
import {
  Calendar, MapPin, Users, Ticket, CheckCircle, Download, ArrowLeft,
  MessageCircle, Key, Award, Clock, Lock, Unlock, AlertCircle, Timer,
  Play, Square, XCircle, Edit3, Save, Trash2
} from 'lucide-react';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  // OTP state
  const [otpStatus, setOtpStatus] = useState(null);
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Countdown
  const [countdown, setCountdown] = useState('');

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState(null);

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

  // Fetch OTP status
  useEffect(() => {
    if (event) {
      fetchOTPStatus();
      const interval = setInterval(fetchOTPStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [event]);

  // Countdown timer
  useEffect(() => {
    if (!event) return;
    const timer = setInterval(() => {
      const now = new Date();
      const eventDate = new Date(event.event_date);
      const diff = eventDate - now;

      if (diff <= 0) {
        setCountdown('Event has started');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) setCountdown(`${days}d ${hours}h ${mins}m`);
      else setCountdown(`${hours}h ${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [event]);

  const fetchOTPStatus = async () => {
    try {
      const res = await api.get(`/events/${id}/otp/status`);
      setOtpStatus(res.data);
    } catch (e) { /* ignore */ }
  };

  const handleRegister = async () => {
    try {
      setError('');
      await api.post(`/events/${id}/register`);
      setSuccess('Successfully registered for the event! 🎉');
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
      setError('');
      const resp = await api.post(`/events/${id}/certificates/generate`);
      setSuccess(resp.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate certificates');
    }
  };

  const openOTPSession = async () => {
    try {
      setError('');
      const resp = await api.post(`/events/${id}/otp/open`);
      setSuccess(resp.data.message);
      fetchOTPStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open OTP session');
    }
  };

  const closeOTPSession = async () => {
    try {
      setError('');
      const resp = await api.post(`/events/${id}/otp/close`);
      setSuccess(resp.data.message);
      fetchOTPStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close OTP session');
    }
  };

  // ====== Event Lifecycle ======
  const changeStatus = async (newStatus) => {
    try {
      setError('');
      setConfirmAction(null);
      const resp = await api.patch(`/events/${id}/status`, { status: newStatus });
      setEvent(resp.data.event);
      setSuccess(resp.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const deleteEvent = async () => {
    try {
      setError('');
      setConfirmAction(null);
      await api.delete(`/events/${id}`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete event');
    }
  };

  // ====== Edit Event ======
  const startEditing = () => {
    setEditForm({
      title: event.title,
      description: event.description,
      event_date: new Date(event.event_date).toISOString().slice(0, 16),
      venue: event.venue,
      capacity: event.capacity,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setEditLoading(true);
    setError('');
    try {
      const resp = await api.put(`/events/${id}`, {
        ...editForm,
        capacity: parseInt(editForm.capacity),
      });
      setEvent(resp.data.event);
      setEditing(false);
      setSuccess('Event updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update event');
    } finally {
      setEditLoading(false);
    }
  };

  // OTP input handling
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);

    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpInput];
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtpInput(newOtp);
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    document.getElementById(`otp-${nextEmpty}`)?.focus();
  };

  const submitOTP = async () => {
    const code = otpInput.join('');
    if (code.length !== 6) return;

    setOtpLoading(true);
    setOtpMessage('');
    try {
      const resp = await api.post(`/events/${id}/otp/verify`, { otp_code: code });
      setOtpMessage(resp.data.message);
      setSuccess(resp.data.message);
      fetchOTPStatus();
    } catch (err) {
      setOtpMessage(err.response?.data?.error || 'Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  if (loading) return <main style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--text-muted)' }}>Loading event details...</main>;
  if (error && !event) return <main><div className="alert alert-error">{error}</div></main>;

  const isOrganizer = user && (user.role === 'admin' || user.id === event.organizer_id);

  const tabs = [
    { key: 'details', label: 'Details', icon: <Calendar size={15} /> },
    { key: 'chat', label: 'Chat', icon: <MessageCircle size={15} /> },
    { key: 'attendance', label: 'Attendance', icon: <CheckCircle size={15} /> },
    { key: 'certificates', label: 'Certificates', icon: <Award size={15} /> },
  ];

  // Confirmation Modal
  const ConfirmModal = () => {
    if (!confirmAction) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, animation: 'fadeIn 0.15s ease-out',
      }} onClick={() => setConfirmAction(null)}>
        <div className="glass-elevated animate-slide-up" style={{ padding: '2rem', maxWidth: '400px', width: '90%', borderRadius: '20px' }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginBottom: '0.75rem' }}>{confirmAction.title}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{confirmAction.message}</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setConfirmAction(null)}>Cancel</button>
            <button className={`btn ${confirmAction.btnClass || 'btn-danger'}`} style={{ flex: 1 }} onClick={confirmAction.onConfirm}>
              {confirmAction.btnLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="animate-fade-in" style={{ maxWidth: '900px' }}>
      <ConfirmModal />

      <button
        onClick={() => navigate('/events')}
        className="btn btn-sm"
        style={{ marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={14} /> Back to Events
      </button>

      {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="alert alert-success"><CheckCircle size={16} /> {success}</div>}

      {/* Event Header */}
      <div className="glass" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{
          height: '180px',
          background: event.status === 'cancelled'
            ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
            : event.status === 'completed'
            ? 'linear-gradient(135deg, #334155, #475569)'
            : 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.5))', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <span className={`badge badge-${event.status}`} style={{ marginBottom: '0.75rem' }}>
                  {event.status}
                </span>
                <h1 style={{ margin: 0, fontSize: '2rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{event.title}</h1>
              </div>
              {countdown && event.status === 'upcoming' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }}>
                  <Timer size={14} /> {countdown}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Info Grid */}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.6rem', borderRadius: '10px', color: 'var(--primary)' }}><Calendar size={20} /></div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Date & Time</p>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>{new Date(event.event_date).toLocaleString()}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.6rem', borderRadius: '10px', color: 'var(--danger)' }}><MapPin size={20} /></div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Venue</p>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>{event.venue}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem', borderRadius: '10px', color: 'var(--success)' }}><Users size={20} /></div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Availability</p>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>{event.current_registrations} / {event.capacity} Spots</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Organized by</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{event.organizer_name}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Organizer Controls */}
            {isOrganizer && (
              <>
                {event.status === 'upcoming' && (
                  <button
                    onClick={() => setConfirmAction({
                      title: 'Start Event?',
                      message: 'This will mark the event as ongoing and notify all registered participants.',
                      btnLabel: 'Start Event',
                      btnClass: 'btn-success',
                      onConfirm: () => changeStatus('ongoing'),
                    })}
                    className="btn btn-success btn-sm"
                  >
                    <Play size={14} /> Start Event
                  </button>
                )}
                {event.status === 'ongoing' && (
                  <button
                    onClick={() => setConfirmAction({
                      title: 'End Event?',
                      message: 'This will mark the event as completed and notify all participants.',
                      btnLabel: 'End Event',
                      btnClass: 'btn-warning',
                      onConfirm: () => changeStatus('completed'),
                    })}
                    className="btn btn-warning btn-sm"
                  >
                    <Square size={14} /> End Event
                  </button>
                )}
                {(event.status === 'upcoming' || event.status === 'ongoing') && (
                  <button
                    onClick={() => setConfirmAction({
                      title: 'Cancel Event?',
                      message: 'This will cancel the event and notify all registered participants. This action is irreversible.',
                      btnLabel: 'Cancel Event',
                      btnClass: 'btn-danger',
                      onConfirm: () => changeStatus('cancelled'),
                    })}
                    className="btn btn-danger btn-sm"
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                )}
                {event.status !== 'cancelled' && (
                  <button onClick={startEditing} className="btn btn-sm">
                    <Edit3 size={14} /> Edit
                  </button>
                )}
              </>
            )}

            {/* Participant Register */}
            {!isOrganizer && event.status !== 'cancelled' && event.status !== 'completed' && (
              <button onClick={handleRegister} className="btn btn-primary">
                <Ticket size={16} /> Register Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {editing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }} onClick={() => setEditing(false)}>
          <div className="glass-elevated animate-slide-up" style={{ padding: '2rem', maxWidth: '520px', width: '90%', borderRadius: '20px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>Edit Event</h3>

            <div className="form-group">
              <label>Title</label>
              <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows="4" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Date & Time</label>
                <input type="datetime-local" value={editForm.event_date} onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} min="1" />
              </div>
            </div>

            <div className="form-group">
              <label>Venue</label>
              <input type="text" value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveEdit} disabled={editLoading}>
                <Save size={16} /> {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="glass animate-fade-in" style={{ padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>About this Event</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
            {event.description}
          </p>

          {event.status === 'cancelled' && (
            <div className="alert alert-error" style={{ marginTop: '1.5rem' }}>
              <XCircle size={18} /> This event has been cancelled.
            </div>
          )}
          {event.status === 'completed' && (
            <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
              <CheckCircle size={18} /> This event has concluded.
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="animate-fade-in">
          {event.status === 'cancelled' ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chat is disabled for cancelled events.
            </div>
          ) : (
            <EventChat eventId={id} />
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="animate-fade-in">
          {/* Organizer Controls */}
          {isOrganizer && (
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} /> OTP Attendance Control
              </h3>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: otpStatus?.is_open ? 'var(--success-glow)' : 'var(--danger-glow)',
                  color: otpStatus?.is_open ? 'var(--success)' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  {otpStatus?.is_open ? <Unlock size={16} /> : <Lock size={16} />}
                  {otpStatus?.is_open ? 'OTP Entry OPEN' : 'OTP Entry CLOSED'}
                </div>

                {otpStatus?.stats && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {otpStatus.stats.used} / {otpStatus.stats.total} OTPs used
                  </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                  {!otpStatus?.is_open ? (
                    <button onClick={openOTPSession} className="btn btn-success">
                      <Unlock size={16} /> Open Attendance
                    </button>
                  ) : (
                    <button onClick={closeOTPSession} className="btn btn-danger">
                      <Lock size={16} /> Close Attendance
                    </button>
                  )}
                </div>
              </div>

              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '1rem' }}>
                Opening attendance will generate a unique OTP for each registered participant and send it to their notification inbox.
              </p>
            </div>
          )}

          {/* Organizer: Download Report */}
          {isOrganizer && (
            <div className="glass" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Attendance Report</h3>
              <button onClick={handleDownloadReport} className="btn">
                <Download size={16} /> Export CSV Report
              </button>
            </div>
          )}

          {/* Participant OTP Entry */}
          {!isOrganizer && (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Enter Your OTP</h3>

              {otpStatus?.is_open ? (
                <>
                  {otpStatus?.otp_info?.is_used ? (
                    <div className="alert alert-success" style={{ justifyContent: 'center' }}>
                      <CheckCircle size={18} /> Your attendance has been marked!
                    </div>
                  ) : (
                    <>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Check your notification inbox for the OTP code
                      </p>

                      <div className="otp-input-group" style={{ marginBottom: '1.5rem' }}>
                        {otpInput.map((digit, i) => (
                          <input
                            key={i}
                            id={`otp-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            onPaste={i === 0 ? handleOtpPaste : undefined}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>

                      {otpMessage && (
                        <div className={`alert ${otpMessage.includes('success') || otpMessage.includes('verified') ? 'alert-success' : 'alert-error'}`} style={{ textAlign: 'center', justifyContent: 'center' }}>
                          {otpMessage}
                        </div>
                      )}

                      <button
                        onClick={submitOTP}
                        className="btn btn-primary btn-lg"
                        disabled={otpInput.join('').length !== 6 || otpLoading}
                        style={{ minWidth: '200px' }}
                      >
                        {otpLoading ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div style={{ padding: '2rem' }}>
                  <Lock size={40} color="var(--text-dim)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Attendance entry is currently closed. The organizer will open it during the event.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="animate-fade-in">
          {isOrganizer ? (
            <div className="glass" style={{ padding: '1.75rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Certificate Management</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Upload a custom certificate template and configure where participant names appear.
              </p>

              <CertificateEditor eventId={id} />

              <div className="divider"></div>

              <h3 style={{ marginBottom: '1rem' }}>Generate Certificates</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Issue certificates for all attendees who haven't received one yet.
              </p>
              <button onClick={generateCertificates} className="btn btn-primary">
                <Award size={16} /> Generate & Issue Certificates
              </button>
            </div>
          ) : (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
              <Award size={40} color="var(--accent)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
              <h3>Your Certificate</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Certificates will be available here after the event and attendance marking.
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Check the Dashboard for your certificates once they are issued.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default EventDetails;
