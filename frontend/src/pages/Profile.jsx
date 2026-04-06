import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '', department: '', year: '', phone: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        department: user.department || '',
        year: user.year || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/profile`, formData);
      login(res.data, localStorage.getItem('token')); // Update context user
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="main-content flex justify-center py-8">
      <div className="auth-card">
        <h2 className="section-title text-center mb-6">Edit Profile</h2>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          
          {user?.role === 'student' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" className="form-control" name="department" value={formData.department} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-control" name="year" value={formData.year} onChange={handleChange}>
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
          </div>

          <button type="submit" className="btn btn-primary mt-4">Save Changes</button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
