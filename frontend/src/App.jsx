import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Register from './pages/Register';
import FacultyRegister from './pages/FacultyRegister';
import StudentDashboard from './pages/StudentDashboard';
import RegisterEvent from './pages/RegisterEvent';
import LiveVerification from './pages/LiveVerification';
import SubmitCertificate from './pages/SubmitCertificate';
import FacultyDashboard from './pages/FacultyDashboard';
import Profile from './pages/Profile';

// ─── Loading Spinner Component ──────────────────────────────────────────────
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid var(--border-color)',
        borderTop: '4px solid var(--primary-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }}></div>
      <p>Restoring session...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// ─── Protected Route Component ───────────────────────────────────────────────
const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roleRequired && user.role !== roleRequired) {
    return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/faculty/dashboard'} replace />;
  }
  
  return children;
};

// ─── App Content (inside Router) ─────────────────────────────────────────────
const AppContent = () => {
  const { loading } = useContext(AuthContext);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="app-container">
      <Navigation />
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000, 
          style: { 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border-color)' 
          } 
        }} 
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/faculty/register" element={<FacultyRegister />} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        
        <Route path="/student/dashboard" element={<PrivateRoute roleRequired="student"><StudentDashboard /></PrivateRoute>} />
        <Route path="/student/register-event" element={<PrivateRoute roleRequired="student"><RegisterEvent /></PrivateRoute>} />
        <Route path="/student/event/:id/live" element={<PrivateRoute roleRequired="student"><LiveVerification /></PrivateRoute>} />
        <Route path="/student/event/:id/submit" element={<PrivateRoute roleRequired="student"><SubmitCertificate /></PrivateRoute>} />
        
        <Route path="/faculty/dashboard" element={<PrivateRoute roleRequired="faculty"><FacultyDashboard /></PrivateRoute>} />
        
        {/* Fallback route for 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

// ─── Main App Component ──────────────────────────────────────────────────────
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
