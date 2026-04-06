import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User as UserIcon, Moon, Sun, Settings } from 'lucide-react';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Campus Event Tracker
      </Link>
      <div className="navbar-links">
        
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {user ? (
          <>
            <Link to="/profile" className="flex items-center gap-2 text-sm text-muted cursor-pointer hover:text-accent-primary" style={{ transition: '0.2s', textDecoration: 'none' }}>
              <UserIcon size={18} />
              <span className="font-semibold">{user.name}</span>
            </Link>
            {user.role === 'student' && (
              <>
                <Link to="/student/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/student/register-event" className="nav-link">Register Event</Link>
              </>
            )}
            {user.role === 'faculty' && (
              <>
                <Link to="/faculty/dashboard" className="nav-link">Dashboard</Link>
              </>
            )}
            <button onClick={handleLogout} className="btn btn-secondary flex items-center gap-2" style={{ padding: '0.4rem 0.8rem', width: 'auto' }}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
