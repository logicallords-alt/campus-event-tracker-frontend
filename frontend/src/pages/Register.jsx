import React, { useState, useContext } from 'react';
import api, { API_URL } from '../api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'IT', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML',
  'BCA', 'MCA', 'MBA', 'CHEM', 'BIOTECH', 'PHYSICS', 'MATHS'
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', reg_no: '', department: '', year: '', email: '', phone: '', password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('[Frontend] Register attempt:', formData.reg_no);
    try {
      const res = await api.post('/api/auth/register', formData);
      console.log('[Frontend] Registration Response:', res.data);
      login(res.data.user, res.data.token);
      toast.success('Registration Successful');
      navigate('/student/dashboard');
    } catch (err) {
      console.error('[Frontend] Registration Error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '36rem' }}>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Register as a Student</p>
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-control" name="name" placeholder="Your full name" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Register Number</label>
              <input type="text" className="form-control" name="reg_no" placeholder="e.g. 22CSE001" onChange={handleChange} required />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" name="department" onChange={handleChange} required>
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-control" name="year" onChange={handleChange} required>
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" name="email" placeholder="student@college.edu" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="text" className="form-control" name="phone" placeholder="10-digit number" onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" name="password" placeholder="Min 6 characters" onChange={handleChange} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary mt-4" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign In</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Are you a faculty?{' '}
          <Link to="/faculty/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Faculty Registration</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
