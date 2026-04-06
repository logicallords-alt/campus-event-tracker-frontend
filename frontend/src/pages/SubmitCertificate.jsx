import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadCloud, FileText, CheckCircle, Users, Mail } from 'lucide-react';

const SubmitCertificate = () => {
  const { id } = useParams();
  const [result, setResult] = useState('Participated');
  const [cert, setCert] = useState(null);                      // Lead's certificate
  const [certMissingReason, setCertMissingReason] = useState('');
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Per-member certificate state: { [email]: File }
  const [memberCerts, setMemberCerts] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events/my-events`)
      .then(res => {
        const ev = res.data.find(e => e._id === id);
        setEventData(ev);
      })
      .catch(() => {});
  }, [id]);

  const isTeamEvent = eventData?.event_type === 'team';

  // Only accepted members (filter out lead if needed, they can still upload their own cert)
  const acceptedMembers = isTeamEvent
    ? (eventData?.team_members || []).filter(m => m.status === 'Accepted')
    : [];

  const handleMemberCertChange = (email, file) => {
    setMemberCerts(prev => ({ ...prev, [email]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For team events, at least one member cert is required
    if (isTeamEvent) {
      const hasAnyCert = cert || Object.values(memberCerts).some(Boolean);
      if (!hasAnyCert) {
        return toast.error('Please upload at least one certificate (lead or team member)');
      }
    } else {
      if (!cert) return toast.error('Please upload your certificate');
    }

    const formData = new FormData();
    formData.append('result', result);

    // Lead certificate (optional for team events if member certs uploaded)
    if (cert) formData.append('certificate', cert);
    if (certMissingReason) formData.append('certificate_missing_reason', certMissingReason);

    // Per-member certificates — files in indexed order, emails as JSON array
    const emailsWithCerts = Object.entries(memberCerts)
      .filter(([, file]) => file != null)
      .map(([email]) => email);

    if (emailsWithCerts.length > 0) {
      formData.append('team_member_emails', JSON.stringify(emailsWithCerts));
      emailsWithCerts.forEach(email => {
        formData.append('team_member_cert', memberCerts[email]);
      });
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events/${id}/post-submission`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Event submission completed! Faculty will verify your certificates.');
      navigate('/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content flex justify-center py-8">
      <div className="auth-card" style={{ maxWidth: '48rem', width: '100%' }}>
        <h2 className="section-title text-center mb-2">Complete Event Submission</h2>
        {eventData && (
          <p className="text-center text-muted text-sm mb-6">
            {eventData.event_name} — {new Date(eventData.event_date).toLocaleDateString()}
            {isTeamEvent && (
              <span style={{ marginLeft: '8px', padding: '2px 10px', borderRadius: '20px', background: 'var(--accent-primary)22', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                Team: {eventData.team_name}
              </span>
            )}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Result */}
          <div className="form-group">
            <label className="form-label">Result Status</label>
            <select className="form-control" value={result} onChange={e => setResult(e.target.value)}>
              <option value="Participated">Participated</option>
              <option value="Won">Won</option>
            </select>
          </div>

          {/* ── INDIVIDUAL EVENT (or Team Lead's cert) ── */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} />
              {isTeamEvent ? 'Your Certificate (Team Lead)' : 'Your Certificate (Image/PDF)'}
              {!isTeamEvent && <span style={{ color: 'var(--accent-danger)' }}>*</span>}
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              className="form-control"
              onChange={e => setCert(e.target.files[0])}
              required={!isTeamEvent}
            />
            {cert && (
              <p style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={13} /> {cert.name}
              </p>
            )}
            {isTeamEvent && (
              <p className="text-muted text-sm mt-1">
                Upload your own certificate here. Then upload each team member's certificate below.
              </p>
            )}
          </div>

          {/* ── TEAM MEMBER CERTIFICATES (individual per email) ── */}
          {isTeamEvent && acceptedMembers.length > 0 && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} />
                Team Member Certificates
              </label>
              <p className="text-muted text-sm mb-3">
                Upload the individual certificate for each accepted team member. After faculty verification, each certificate will appear in their personal dashboard.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {acceptedMembers.map((member, idx) => (
                  <div key={idx} style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${memberCerts[member.email] ? '#10b981' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    transition: 'border-color 0.2s'
                  }}>
                    {/* Member info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.65rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--accent-primary)22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                      }}>
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{member.name}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Mail size={11} /> {member.email}
                          {member.reg_no && <span style={{ marginLeft: '6px' }}>• {member.reg_no}</span>}
                        </div>
                      </div>
                      {memberCerts[member.email] && (
                        <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle size={13} /> Uploaded
                        </span>
                      )}
                    </div>

                    {/* File input */}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-control"
                      style={{ fontSize: '0.82rem' }}
                      onChange={e => handleMemberCertChange(member.email, e.target.files[0] || null)}
                    />
                    {memberCerts[member.email] && (
                      <p style={{ fontSize: '0.76rem', color: '#10b981', marginTop: '4px' }}>
                        📎 {memberCerts[member.email].name}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-muted text-sm mt-2" style={{ fontSize: '0.78rem' }}>
                ⚠ You can skip members who don't have individual certificates — they'll inherit the lead's certificate.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-4" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <UploadCloud size={16} />
            {loading ? 'Submitting...' : 'Mark Event Completed'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitCertificate;
