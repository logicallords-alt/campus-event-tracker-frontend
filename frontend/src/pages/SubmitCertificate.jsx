import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UploadCloud, FileText, CheckCircle, Users, Mail, Link, ArrowLeft } from 'lucide-react';

const SubmitCertificate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState('Participated');
  const [cert, setCert] = useState(null);                 // Lead's certificate file
  const [certDriveLink, setCertDriveLink] = useState(''); // Lead's drive link
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Per-member state: { [email]: { file: File|null, driveLink: string } }
  const [memberData, setMemberData] = useState({});

  useEffect(() => {
    api.get('/api/events/my-events')
      .then(res => {
        const ev = res.data.find(e => e._id === id);
        setEventData(ev);
        // Pre-populate memberData keys for accepted members
        if (ev?.event_type === 'team') {
          const init = {};
          (ev.team_members || [])
            .filter(m => m.status === 'Accepted')
            .forEach(m => { init[m.email] = { file: null, driveLink: '' }; });
          setMemberData(init);
        }
      })
      .catch(err => console.error('[Frontend] Fetch Event Error:', err.response?.data || err.message));
  }, [id]);

  const isTeamEvent = eventData?.event_type === 'team';
  const acceptedMembers = isTeamEvent
    ? (eventData?.team_members || []).filter(m => m.status === 'Accepted')
    : [];

  const setMemberFile = (email, file) =>
    setMemberData(prev => ({ ...prev, [email]: { ...prev[email], file } }));

  const setMemberDriveLink = (email, driveLink) =>
    setMemberData(prev => ({ ...prev, [email]: { ...prev[email], driveLink } }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation — every member must have either a file or a drive link
    if (isTeamEvent) {
      // Lead must have cert or drive link
      if (!cert && !certDriveLink) {
        return toast.error('Please upload your certificate or provide your Google Drive link');
      }
      // Each accepted member must have cert or drive link
      for (const m of acceptedMembers) {
        const d = memberData[m.email] || {};
        if (!d.file && !d.driveLink) {
          return toast.error(`Please upload a certificate or provide a Drive link for ${m.name}`);
        }
        if (d.driveLink && !d.driveLink.startsWith('http')) {
          return toast.error(`Invalid Drive link for ${m.name} — must start with http`);
        }
      }
    } else {
      if (!cert && !certDriveLink) return toast.error('Please upload your certificate or provide a Google Drive link');
    }

    if (certDriveLink && !certDriveLink.startsWith('http')) {
      return toast.error('Your Drive link must start with http');
    }

    const formData = new FormData();
    formData.append('result', result);
    if (cert) formData.append('certificate', cert);
    if (certDriveLink) formData.append('certificate_drive_link', certDriveLink);

    // Per-member certificates (files)
    const emailsWithFiles = acceptedMembers
      .filter(m => memberData[m.email]?.file)
      .map(m => m.email);

    if (emailsWithFiles.length > 0) {
      formData.append('team_member_emails', JSON.stringify(emailsWithFiles));
      emailsWithFiles.forEach(email => {
        formData.append('team_member_cert', memberData[email].file);
      });
    }

    // Per-member drive links
    const driveLinksPayload = acceptedMembers
      .filter(m => memberData[m.email]?.driveLink)
      .map(m => ({ email: m.email, drive_link: memberData[m.email].driveLink }));

    if (driveLinksPayload.length > 0) {
      formData.append('team_member_drive_links', JSON.stringify(driveLinksPayload));
    }

    setLoading(true);
    try {
      await api.post(`/api/events/${id}/post-submission`, formData, {
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
      <div className="auth-card" style={{ maxWidth: '52rem', width: '100%' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/student/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600,
            marginBottom: '1.25rem', padding: '4px 0',
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

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

          {/* ── LEAD CERTIFICATE ── */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} style={{ color: 'var(--accent-primary)' }} />
              {isTeamEvent ? 'Your Certificate (Team Lead)' : 'Your Certificate'}
              <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>* Required</span>
            </div>

            <div className="form-group" style={{ marginBottom: '0.6rem' }}>
              <label className="form-label text-sm">Upload File (Image / PDF)</label>
              <input type="file" accept="image/*,.pdf" className="form-control"
                onChange={e => setCert(e.target.files[0] || null)} />
              {cert && (
                <p style={{ fontSize: '0.76rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} /> {cert.name}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-sm" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Link size={13} /> Google Drive Link <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input type="url" className="form-control" placeholder="https://drive.google.com/file/d/..."
                value={certDriveLink} onChange={e => setCertDriveLink(e.target.value)} />
              {certDriveLink && (
                <a href={certDriveLink} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <Link size={11} /> Preview link
                </a>
              )}
            </div>
          </div>

          {/* ── TEAM MEMBER CERTIFICATES ── */}
          {isTeamEvent && acceptedMembers.length > 0 && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} /> Team Member Certificates
                <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>* Each member needs a file or Drive link</span>
              </label>
              <p className="text-muted text-sm mb-3">
                Upload each member's certificate file or provide their Google Drive link. Both are accepted — at least one is required per member.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {acceptedMembers.map((member, idx) => {
                  const d = memberData[member.email] || { file: null, driveLink: '' };
                  const hasSomething = d.file || d.driveLink;
                  return (
                    <div key={idx} style={{
                      background: 'var(--bg-primary)',
                      border: `1px solid ${hasSomething ? '#10b981' : 'var(--border-color)'}`,
                      borderRadius: '12px', padding: '0.9rem 1rem',
                      transition: 'border-color 0.2s'
                    }}>
                      {/* Member header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: 'var(--accent-primary)22', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem'
                        }}>
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{member.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={10} /> {member.email}
                            {member.reg_no && <span style={{ marginLeft: '4px' }}>• {member.reg_no}</span>}
                          </div>
                        </div>
                        {hasSomething && (
                          <span style={{ color: '#10b981', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle size={13} /> Ready
                          </span>
                        )}
                      </div>

                      {/* File upload */}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                          Upload Certificate (Image / PDF)
                        </label>
                        <input type="file" accept="image/*,.pdf" className="form-control"
                          style={{ fontSize: '0.82rem' }}
                          onChange={e => setMemberFile(member.email, e.target.files[0] || null)} />
                        {d.file && (
                          <p style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle size={11} /> {d.file.name}
                          </p>
                        )}
                      </div>

                      {/* Drive link */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Link size={11} /> Google Drive Link <span style={{ fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <input type="url" className="form-control"
                          style={{ fontSize: '0.82rem' }}
                          placeholder="https://drive.google.com/file/d/..."
                          value={d.driveLink}
                          onChange={e => setMemberDriveLink(member.email, e.target.value)} />
                        {d.driveLink && (
                          <a href={d.driveLink} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.73rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                            <Link size={10} /> Preview link
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-4" disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <UploadCloud size={16} />
            {loading ? 'Submitting...' : 'Mark Event Completed'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitCertificate;
