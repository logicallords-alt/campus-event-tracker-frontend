import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, Presentation } from 'lucide-react';

const RegisterEvent = () => {
  const [formData, setFormData] = useState({
    event_name: '', college_name: '', event_date: '', event_type: 'individual', team_name: '', num_days: 1, event_dates: []
  });
  const [banner, setBanner] = useState(null);
  const [ppt, setPpt] = useState(null);
  const [teamSize, setTeamSize] = useState(1);
  const [teamMembers, setTeamMembers] = useState([{ name: '', reg_no: '', email: '' }]);
  const navigate = useNavigate();

  const handleEventDateChange = (e) => {
    const startDate = e.target.value;
    setFormData(prev => {
      const renderCount = Math.min(10, parseInt(prev.num_days, 10) || 1);
      const newDates = [];
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        for (let i = 0; i < renderCount; i++) {
            const d = new Date(year, month - 1, day);
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            newDates.push(`${y}-${m}-${dd}`);
        }
      } else {
        newDates.push(...(prev.event_dates || []));
        newDates[0] = '';
      }
      return { ...prev, event_date: startDate, event_dates: newDates };
    });
  };

  const handleNumDaysChange = (e) => {
    let val = e.target.value;
    if (val === '') {
      setFormData(prev => ({ ...prev, num_days: '' }));
      return;
    }
    let days = parseInt(val, 10);
    if (isNaN(days)) return;

    setFormData(prev => {
       const newDates = [...(prev.event_dates || [])];
       const renderCount = Math.min(10, days); // Cap at 10 for UI rendering
       
       if (prev.event_date) {
         const [year, month, day] = prev.event_date.split('-').map(Number);
         for (let i = 0; i < renderCount; i++) {
            if (!newDates[i]) {
                const d = new Date(year, month - 1, day);
                d.setDate(d.getDate() + i);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                newDates[i] = `${y}-${m}-${dd}`;
            }
         }
       } else {
         while (newDates.length < renderCount) newDates.push('');
       }
       
       return { ...prev, num_days: days, event_dates: newDates.slice(0, renderCount) };
    });
  };

  const handleTeamMemberChange = (index, field, value) => {
    const newMembers = [...teamMembers];
    newMembers[index][field] = value;
    setTeamMembers(newMembers);
  };

  const handleTeamSizeChange = (e) => {
    let val = e.target.value;
    if (val === '') {
      setTeamSize('');
      return;
    }
    let size = parseInt(val, 10);
    if (isNaN(size)) return;
    
    setTeamSize(size);
    
    const teammateCount = Math.min(19, Math.max(0, size - 1)); // limit UI max 19 teammates
    const newMembers = [...teamMembers];
    while (newMembers.length < teammateCount) {
      newMembers.push({ name: '', reg_no: '', email: '' });
    }
    while (newMembers.length > teammateCount) {
      newMembers.pop();
    }
    setTeamMembers(newMembers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Frontend] Registering event:', formData.event_name);
    try {
      const data = new FormData();

      // Append only scalar fields — skip event_dates (array) to avoid double-append
      data.append('event_name', formData.event_name);
      data.append('college_name', formData.college_name);
      data.append('event_date', formData.event_date);
      data.append('event_type', formData.event_type);
      data.append('team_name', formData.team_name || '');
      data.append('num_days', formData.num_days || 1);

      if (formData.event_type === 'team') {
        data.append('team_members', JSON.stringify(teamMembers));
      }

      // Always send event_dates as JSON
      if (formData.num_days > 1) {
        data.append('event_dates', JSON.stringify(formData.event_dates));
      } else {
        data.append('event_dates', JSON.stringify([formData.event_date]));
      }

      if (banner) {
        data.append('event_banner', banner);
      }

      if (ppt) {
        data.append('event_ppt', ppt);
      }

      await api.post('/api/events', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('[Frontend] Event Registration Successful');
      toast.success('Registration request submitted successfully');
      navigate('/student/dashboard');
    } catch (err) {
      console.error('[Frontend] Event Registration Error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to register for event');
    }
  };


  return (
    <div className="main-content flex justify-center py-8">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="auth-card" style={{ maxWidth: '45rem', width: '100%' }}>
        <h2 className="section-title text-center mb-6">Register for Event</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label className="form-label">Event Banner / Poster (Optional)</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-accent-primary rounded-lg cursor-pointer bg-primary hover:bg-opacity-80 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-accent-primary" />
                <p className="mb-2 text-sm text-muted">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                {banner && <p className="text-xs text-success">{banner.name}</p>}
              </div>
              <input type="file" className="hidden" style={{ display: 'none' }} accept="image/*" onChange={(e) => setBanner(e.target.files[0])} />
            </label>
          </div>

          <div className="form-group mt-4">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Presentation size={15} />
              PPT / Presentation (Optional)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-primary hover:bg-opacity-80 transition"
              style={{ borderColor: ppt ? '#10b981' : 'var(--border-color)' }}>
              <div className="flex flex-col items-center justify-center pt-4 pb-4">
                <Presentation className="w-7 h-7 mb-2" style={{ color: ppt ? '#10b981' : 'var(--accent-primary)' }} />
                <p className="mb-1 text-sm text-muted">
                  <span className="font-semibold">Upload your presentation</span>
                </p>
                <p className="text-xs text-muted">PPT, PPTX, PDF accepted</p>
                {ppt && <p className="text-xs mt-1" style={{ color: '#10b981' }}>✓ {ppt.name}</p>}
              </div>
              <input
                type="file"
                className="hidden"
                style={{ display: 'none' }}
                accept=".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(e) => setPpt(e.target.files[0] || null)}
              />
            </label>
            <p className="text-xs text-muted mt-1">If your event requires a presentation, upload it here. Faculty can view it during verification.</p>
          </div>

          <div className="form-group mt-6">
            <label className="form-label">Event Name</label>
            <input type="text" className="form-control" name="event_name" value={formData.event_name} onChange={e => setFormData({ ...formData, event_name: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">College Name (Host)</label>
              <input type="text" className="form-control" name="college_name" value={formData.college_name} onChange={e => setFormData({ ...formData, college_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Event Date</label>
              <input type="date" className="form-control" name="event_date" value={formData.event_date} onChange={handleEventDateChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Number of Days</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-control"
                value={formData.num_days}
                onChange={handleNumDaysChange}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                How many days will the event run? Photos will be organized per day.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select className="form-control" value={formData.event_type} onChange={e => setFormData({ ...formData, event_type: e.target.value })}>
                <option value="individual">Individual</option>
                <option value="team">Team Participation</option>
              </select>
            </div>
          </div>

          {formData.num_days > 1 && (
            <div className="mt-4 p-4 border rounded-lg bg-primary" style={{ animation: 'slideFadeIn 0.3s ease-out forwards' }}>
              <h3 className="text-sm font-semibold mb-3">Event Dates for Multiple Days</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {Array.from({ length: formData.num_days }).map((_, i) => (
                  <div key={i} className="form-group">
                    <label className="form-label text-xs">Day {i + 1} Date</label>
                    <input 
                      type="date" 
                      className="form-control text-sm" 
                      value={formData.event_dates[i] || ''}
                      onChange={e => {
                        const newDates = [...formData.event_dates];
                        newDates[i] = e.target.value;
                        setFormData({...formData, event_dates: newDates});
                      }}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.event_type === 'team' && (
            <div className="mt-4 p-4 border rounded-lg bg-primary" style={{ animation: 'slideFadeIn 0.3s ease-out forwards' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Team Name</label>
                  <input type="text" className="form-control" name="team_name" value={formData.team_name} onChange={e => setFormData({ ...formData, team_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Team Size (including you)</label>
                  <input type="number" min="2" max="20" className="form-control" value={teamSize} onChange={handleTeamSizeChange} required />
                </div>
              </div>

              <h3 className="text-sm font-semibold mb-3">Teammate Details (Exclude yourself)</h3>
              {teamMembers.map((member, index) => (
                <div key={index} className="form-row mb-2 items-center flex">
                  <span className="text-sm text-muted w-6">{index + 1}.</span>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="form-control py-2 text-sm" 
                    value={member.name} 
                    onChange={e => handleTeamMemberChange(index, 'name', e.target.value)} 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="Register Number" 
                    className="form-control py-2 text-sm" 
                    value={member.reg_no} 
                    onChange={e => handleTeamMemberChange(index, 'reg_no', e.target.value)} 
                    required 
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="form-control py-2 text-sm" 
                    value={member.email || ''} 
                    onChange={e => handleTeamMemberChange(index, 'email', e.target.value)} 
                    required 
                  />
                </div>
              ))}
            </div>
          )}
          
          <button type="submit" className="btn btn-primary mt-6">Submit Registration Request</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterEvent;
