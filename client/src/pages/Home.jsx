import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Award, MoveRight, Zap, Shield } from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ events: 0, users: 0, certs: 0 });
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(true);
    // Animated counters
    const targets = { events: 150, users: 1200, certs: 800 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCounts({
        events: Math.round(targets.events * eased),
        users: Math.round(targets.users * eased),
        certs: Math.round(targets.certs * eased),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <Calendar size={28} />,
      color: 'var(--primary)',
      bg: 'rgba(59, 130, 246, 0.1)',
      title: 'Seamless Planning',
      desc: 'Create events, set capacities, and track registrations with powerful management tools.',
    },
    {
      icon: <Zap size={28} />,
      color: 'var(--warning)',
      bg: 'rgba(245, 158, 11, 0.1)',
      title: 'OTP Attendance',
      desc: 'Secure OTP-based check-ins delivered right to participant inboxes. No QR scanner needed.',
    },
    {
      icon: <Users size={28} />,
      color: 'var(--accent)',
      bg: 'rgba(139, 92, 246, 0.1)',
      title: 'Live Event Chat',
      desc: 'Real-time messaging between organizers and participants — per event, always connected.',
    },
    {
      icon: <Award size={28} />,
      color: 'var(--success)',
      bg: 'rgba(16, 185, 129, 0.1)',
      title: 'Custom Certificates',
      desc: 'Upload your design, position names precisely, and auto-generate certificates for all attendees.',
    },
    {
      icon: <Shield size={28} />,
      color: 'var(--danger)',
      bg: 'rgba(239, 68, 68, 0.1)',
      title: 'Verified & Secure',
      desc: 'JWT authentication, QR-verified certificates, and role-based access control built in.',
    },
  ];

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem 1rem' }}>

      {/* Hero */}
      <div className="glass-elevated hero-gradient animate-fade-in" style={{ padding: '4rem 3rem', maxWidth: '900px', width: '100%', borderRadius: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', borderRadius: '999px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            <Zap size={14} /> Next Generation Platform
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}>
            Event Management<br />
            <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Reimagined
            </span>
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: 1.7 }}>
            From OTP-powered attendance to custom certificates and real-time event chat — everything you need in one platform.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                Go to Dashboard <MoveRight size={18} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                  Get Started Free
                </button>
                <button className="btn btn-lg" onClick={() => navigate('/login')}>
                  Sign In
                </button>
              </>
            )}
          </div>

          {/* Animated Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            {[
              { value: counts.events + '+', label: 'Events Hosted' },
              { value: counts.users.toLocaleString() + '+', label: 'Active Users' },
              { value: counts.certs + '+', label: 'Certificates Issued' },
            ].map((stat, i) => (
              <div key={i} style={{ animation: animated ? `countUp 0.6s ${0.2 + i * 0.1}s both` : 'none' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', maxWidth: '900px', width: '100%', marginTop: '3rem' }}>
        {features.map((f, i) => (
          <div
            key={i}
            className={`glass event-card animate-slide-up stagger-${i + 1}`}
            style={{ padding: '1.75rem', textAlign: 'left', cursor: 'default' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '1rem' }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{f.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Home;
