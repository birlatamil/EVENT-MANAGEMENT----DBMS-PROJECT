import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Calendar, Home, User } from 'lucide-react';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="glass" style={{ margin: '1rem 2rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to="/" style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(45deg, var(--primary), var(--accent))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={18} color="white" />
        </div>
        EventHive
      </Link>

      <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link to="/events" style={{ fontWeight: '500', color: 'var(--text-main)' }}>Browse Events</Link>
        {user ? (
          <>
            <Link to="/dashboard" style={{ fontWeight: '500', color: 'var(--text-main)' }}>Dashboard</Link>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={16} /> {user.name?.split(' ')[0]}
              </span>
              <button className="btn btn-danger" onClick={handleLogout} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Sign In</Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
