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

const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roleRequired && user.role !== roleRequired) return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/faculty/dashboard'} />;
  return children;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Navigation />
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } }} />
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/faculty/register" element={<FacultyRegister />} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            
            <Route path="/student/dashboard" element={<PrivateRoute roleRequired="student"><StudentDashboard /></PrivateRoute>} />
            <Route path="/student/register-event" element={<PrivateRoute roleRequired="student"><RegisterEvent /></PrivateRoute>} />
            <Route path="/student/event/:id/live" element={<PrivateRoute roleRequired="student"><LiveVerification /></PrivateRoute>} />
            <Route path="/student/event/:id/submit" element={<PrivateRoute roleRequired="student"><SubmitCertificate /></PrivateRoute>} />
            
            <Route path="/faculty/dashboard" element={<PrivateRoute roleRequired="faculty"><FacultyDashboard /></PrivateRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
