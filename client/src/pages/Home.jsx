import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Users, Award, MoveRight } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1rem' }}>
      
      <div className="glass animate-fade-in" style={{ padding: '4rem 2rem', maxWidth: '800px', width: '100%', borderRadius: '24px' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Next-Gen Event Management
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
          Organize, manage, and attend professional events seamlessly. From lightning-fast QR check-ins to dynamic PDF certificates.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
          {user ? (
            <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={() => navigate('/dashboard')}>
              Go to Dashboard <MoveRight size={20} />
            </button>
          ) : (
            <>
              <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={() => navigate('/register')}>
                Get Started
              </button>
              <button className="btn" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={() => navigate('/login')}>
                Sign In
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'left', marginTop: '2rem' }}>
          
          <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '16px' }}>
            <Calendar size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem' }}>Seamless Planning</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create events, set capacities, and track registrations instantly.</p>
          </div>
          
          <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '16px' }}>
            <Users size={32} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem' }}>Instant Check-ins</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Use dynamic QR codes to scan attendees right at the venue door.</p>
          </div>
          
          <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '16px' }}>
            <Award size={32} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem' }}>Digital Certificates</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generate and distribute verifiable PDF attendance certificates.</p>
          </div>

        </div>
      </div>
    </main>
  );
}

export default Home;
