import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'participant' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || googleClientId === 'your-google-client-id.apps.googleusercontent.com') return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('google-signup-btn'),
        {
          theme: 'filled_black',
          size: 'large',
          width: '340',
          shape: 'pill',
          text: 'signup_with',
        }
      );
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/google', {
        credential: response.credential,
      });
      login(res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData);
      login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)' }}>
      <div className="glass-elevated animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '460px', borderRadius: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--accent), var(--primary))', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)' }}>
            <UserPlus size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join Certify — it's free</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Google Sign-Up Button */}
        {googleClientId && googleClientId !== 'your-google-client-id.apps.googleusercontent.com' && (
          <>
            <div id="google-signup-btn" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" minLength="6" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label>I am a...</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="participant">Participant</option>
              <option value="organizer">Event Organizer</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;
