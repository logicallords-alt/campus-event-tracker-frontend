import React, { useState, useContext } from 'react';
import api, { API_URL } from '../api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Building2, BadgeCheck, Mail, Lock, User } from 'lucide-react';

const DEPARTMENTS = [
  'IT', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML',
  'BCA', 'MCA', 'MBA', 'CHEM', 'BIOTECH', 'PHYSICS', 'MATHS'
];

const FacultyRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    faculty_id: '',
    department: '',
    college_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    console.log('[Frontend] Faculty Register attempt:', formData.faculty_id);
    try {
      const res = await api.post('/api/auth/register-faculty', {
        name: formData.name,
        faculty_id: formData.faculty_id,
        department: formData.department,
        college_name: formData.college_name,
        email: formData.email,
        password: formData.password
      });
      console.log('[Frontend] Faculty Registration Response:', res.data);
      login(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.name}! Faculty account created.`);
      navigate('/faculty/dashboard');
    } catch (err) {
      console.error('[Frontend] Faculty Registration Error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '42rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #6366f1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <GraduationCap size={30} color="#fff" />
          </div>
          <h2 className="auth-title">Faculty Registration</h2>
          <p className="auth-subtitle">Create your department faculty account</p>
        </div>

        {/* Info Banner */}
        <div style={{
          background: 'var(--accent-primary)22',
          border: '1px solid var(--accent-primary)44',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <BadgeCheck size={16} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--accent-primary)' }} />
          <span>
            <strong>One faculty per department.</strong> Only one faculty account is allowed per department to manage student event submissions and approvals.
          </span>
        </div>

        <form onSubmit={handleRegister}>
          {/* Name + Faculty ID */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Full Name
              </label>
              <input
                type="text"
                className="form-control"
                name="name"
                placeholder="Dr. John Smith"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <BadgeCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Faculty / Staff ID
              </label>
              <input
                type="text"
                className="form-control"
                name="faculty_id"
                placeholder="e.g. FAC-2024-001"
                value={formData.faculty_id}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Department + College */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <GraduationCap size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Department
              </label>
              <select
                className="form-control"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <Building2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                College Name
              </label>
              <input
                type="text"
                className="form-control"
                name="college_name"
                placeholder="e.g. VIT University"
                value={formData.college_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">
              <Mail size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              name="email"
              placeholder="faculty@college.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Password
              </label>
              <input
                type="password"
                className="form-control"
                name="password"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Confirm Password
              </label>
              <input
                type="password"
                className="form-control"
                name="confirm_password"
                placeholder="Re-enter password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary mt-4"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Creating Account...' : 'Create Faculty Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign In</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Are you a student?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Student Registration</Link>
        </p>
      </div>
    </div>
  );
};

export default FacultyRegister;
