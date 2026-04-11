import React, { useEffect, useState, useContext } from 'react';
import api, { API_URL } from '../api';
import {
  Search, ChevronDown, ChevronUp, Image as ImageIcon,
  Building2, Trash2, Trophy, Download, Shield, X, FileText,
  MapPin, Camera, CheckCircle, AlertTriangle, Loader, Users, Globe,
  Presentation, ExternalLink, Link, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const FacultyDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalStudents: 0, activeEvents: 0, completedEvents: 0, deptParticipation: {} });
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [submissions, setSubmissions] = useState({});
  const [loadingSubmission, setLoadingSubmission] = useState({}); // eventId → bool
  const [expandedId, setExpandedId] = useState(null);
  const [reviewTab, setReviewTab] = useState({}); // eventId → 'photos'|'certificate'|'team'
  const [achievementsGrouped, setAchievementsGrouped] = useState({});
  const [tab, setTab] = useState('events'); // 'events' | 'global' | 'achievements'
  const [lightboxImg, setLightboxImg] = useState(null); // URL path OR base64 data-URL
  
  // Tab-specific filters
  const [achYear, setAchYear] = useState('all');
  const [achFilter, setAchFilter] = useState('');
  const [globalEvents, setGlobalEvents] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('[Frontend] Fetching faculty dashboard data...');
      const [statsRes, eventsRes, achRes, globalRes] = await Promise.all([
        api.get('/api/events/dashboard-stats'),
        api.get('/api/events/all'),
        api.get('/api/events/achievements-by-year'),
        api.get('/api/events/global')
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data);
      setAchievementsGrouped(achRes.data);
      setGlobalEvents(globalRes.data);
    } catch (err) {
      console.error('[Frontend] Faculty Fetch Error:', err.response?.data || err.message);
    }
  };

  const loadSubmission = async (eventId) => {
    if (submissions[eventId] || loadingSubmission[eventId]) return; 
    setLoadingSubmission(prev => ({ ...prev, [eventId]: true }));
    try {
      const res = await api.get(`/api/events/${eventId}/submission`);
      setSubmissions(prev => ({ ...prev, [eventId]: res.data }));
      setReviewTab(prev => ({ ...prev, [eventId]: res.data.event_photos?.length > 0 ? 'photos' : 'certificate' }));
    } catch (err) {
      if (err.response?.status === 404) {
        setSubmissions(prev => ({ ...prev, [eventId]: null }));
      } else {
        toast.error('Failed to load submission');
      }
    } finally {
      setLoadingSubmission(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/events/${id}/status`, { status });
      toast.success(`Event marked as ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Delete the request for "${eventName}"?`)) return;
    try {
      await api.delete(`/api/events/${eventId}`);
      toast.success('Event deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const downloadFile = (url, filename) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url.startsWith('data:') ? url : `${API_URL}${url}`;
    
    // Auto-detect extension
    let extension = '';
    if (url.startsWith('data:')) {
      const mime = url.match(/data:(.*?);/)?.[1];
      if (mime === 'application/pdf') extension = '.pdf';
      else if (mime === 'image/jpeg') extension = '.jpg';
      else if (mime === 'image/png') extension = '.png';
      else if (mime === 'image/webp') extension = '.webp';
    } else {
      const parts = url.split('.');
      if (parts.length > 1) extension = `.${parts.pop()}`;
    }

    // Handle names with dots (like initials) correctly
    let cleanName = filename;
    if (cleanName.endsWith('.')) cleanName = cleanName.slice(0, -1);
    
    const endsWithExtension = cleanName.match(/\.(pdf|jpg|jpeg|png|webp|xlsx)$/i);
    a.download = endsWithExtension ? cleanName : `${cleanName}${extension}`;
    a.target = '_blank';
    a.click();
  };

  const downloadExcel = async () => {
    try {
      const res = await api.get('/api/events/export/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `achievements_${user?.department || 'dept'}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.status === 404
        ? 'No data yet — verify at least one certificate first.'
        : 'Failed to download Excel');
    }
  };


  const getStatusBadge = (status) => {
    const statusMap = {
      'Pending Approval': 'badge-pending',
      'Approved': 'badge-approved',
      'Completed': 'badge-completed',
      'Certificate Verified': 'badge-completed',
      'Rejected': 'badge-rejected'
    };
    return <span className={`badge ${statusMap[status]}`}>{status}</span>;
  };

  const filteredEvents = events.filter(e =>
    e.status !== 'Certificate Verified' &&
    (String(e.event_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (e.student_id && String(e.student_id.name || '').toLowerCase().includes(filter.toLowerCase())) ||
    (e.student_id && String(e.student_id.reg_no || '').toLowerCase().includes(filter.toLowerCase())))
  );

  // All years available in achievements
  const allYears = Object.keys(achievementsGrouped).sort((a, b) => Number(a) - Number(b));

  let achievementsToShow = achYear === 'all'
    ? Object.values(achievementsGrouped).flat()
    : (achievementsGrouped[achYear] || []);

  if (achFilter.trim() !== '') {
    const term = achFilter.toLowerCase();
    achievementsToShow = achievementsToShow.filter(a => 
      String(a.student_name || '').toLowerCase().includes(term) ||
      String(a.reg_no || '').toLowerCase().includes(term) ||
      String(a.event_name || '').toLowerCase().includes(term)
    );
  }

  // Filter for global cross-dept events (ongoing only)
  const filteredGlobalEvents = globalSearch.trim() === '' ? [] : globalEvents.filter(e =>
    (e.status === 'Approved' || e.status === 'Pending Approval') &&
    String(e.event_name || '').toLowerCase().includes(globalSearch.toLowerCase())
  );

  return (
    <div className="main-content">
      {/* Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <button
            onClick={() => setLightboxImg(null)}
            style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={32} />
          </button>
          <img src={lightboxImg && lightboxImg.startsWith('data:') ? lightboxImg : `${API_URL}${lightboxImg}`} alt="Preview" style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: '8px' }} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Faculty Control Panel</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Building2 size={15} />
            <span>Managing <strong style={{ color: 'var(--accent-primary)' }}>{user?.department || 'N/A'}</strong> Department</span>
          </div>
        </div>
        <button
          onClick={downloadExcel}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0.55rem 1.2rem', borderRadius: '10px',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem',
            boxShadow: '0 3px 10px rgba(22,163,74,0.35)'
          }}
          title="Download all verified achievements as Excel"
        >
          <FileSpreadsheet size={16} /> Export Excel
        </button>
      </div>

      {/* Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-content"><h3>Total Students</h3><p>{stats.totalStudents}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-content"><h3>Active Events</h3><p>{stats.activeEvents}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-content"><h3>Completed Events</h3><p>{stats.completedEvents}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '2rem 0 1rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', paddingBottom: '4px' }}>
        {['events', 'global', 'achievements'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.6rem 1.4rem',
              border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap',
              color: tab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--accent-primary)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
            }}
          >
            {t === 'events' && <>📋 Department Event Requests</>}
            {t === 'global' && <><Globe size={15} /> Global Event Search</>}
            {t === 'achievements' && <><Trophy size={15} /> Achievements</>}
          </button>
        ))}
      </div>

      {/* ─── EVENTS TAB ─── */}
      {tab === 'events' && (
        <>
          <div className="section-header mt-4">
            <h2 className="section-title">{user?.department} — Event Requests</h2>
            <div className="flex items-center gap-2">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search by student, reg no, event..."
                className="form-control"
                style={{ width: '300px' }}
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Student Lead</th>
                  <th>Dept / Year</th>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <React.Fragment key={event._id}>
                    <tr
                      className="hover:bg-primary cursor-pointer"
                      onClick={() => {
                        const opening = expandedId !== event._id;
                        setExpandedId(opening ? event._id : null);
                        // Auto-load submission whenever an Approved/Completed/Verified row is expanded
                        if (opening && (event.status === 'Approved' || event.status === 'Completed' || event.status === 'Certificate Verified')) {
                          loadSubmission(event._id);
                        }
                      }}
                    >
                      <td className="text-muted">
                        {expandedId === event._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {event.student_id?.name || 'Unknown'}
                        <div className="text-xs text-muted">{event.student_id?.reg_no}</div>
                      </td>
                      <td className="text-sm">
                        {event.student_id?.department || 'N/A'}
                        <div className="text-xs text-muted">Year {event.student_id?.year || 'N/A'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{event.event_name}</div>
                        <div className="text-xs text-muted">{event.college_name} — {new Date(event.event_date).toLocaleDateString()}</div>
                        {(event.num_days || 1) > 1 && (
                          <div className="text-xs" style={{ color: 'var(--accent-primary)', fontWeight: 600, marginTop: '2px' }}>
                            📅 {event.num_days} days
                          </div>
                        )}
                      </td>
                      <td className="text-sm capitalize">
                        {event.event_type}
                        {event.team_name && <><br /><span className="text-xs text-muted">Team: {event.team_name}</span></>}
                      </td>
                      <td>{getStatusBadge(event.status)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2 flex-wrap">
                          {event.status === 'Pending Approval' && (
                            <>
                              <button onClick={() => updateStatus(event._id, 'Approved')} className="btn btn-success text-xs py-1 px-3">Approve</button>
                              <button onClick={() => updateStatus(event._id, 'Rejected')} className="btn btn-danger text-xs py-1 px-3">Reject</button>
                            </>
                          )}
                          {(event.status === 'Completed' || event.status === 'Approved') && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ↕ Expand details
                            </span>
                          )}
                          {event.status === 'Certificate Verified' && (
                            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> Verified
                            </span>
                          )}
                          {(event.status === 'Pending Approval' || event.status === 'Rejected') && (
                            <button
                              onClick={() => deleteEvent(event._id, event.event_name)}
                              className="btn btn-danger text-xs py-1 px-2"
                              title="Delete event"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded Row ── */}
                    {expandedId === event._id && (
                      <tr>
                        <td colSpan="7" style={{ padding: 0, background: 'var(--bg-primary)', borderLeft: '4px solid var(--accent-primary)' }}>
                          <div style={{ padding: '1.5rem 1.75rem' }}>

                            {/* ─ Top strip: student info + banner side by side ─ */}
                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                              {/* Student info */}
                              <div style={{ flex: '1', minWidth: '220px' }}>
                                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>Lead Student</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '0.84rem' }}>
                                  <span className="text-muted">Name</span>     <span style={{ fontWeight: 500 }}>{event.student_id?.name}</span>
                                  <span className="text-muted">Reg No</span>   <span>{event.student_id?.reg_no}</span>
                                  <span className="text-muted">Dept/Yr</span>  <span>{event.student_id?.department} — Yr {event.student_id?.year}</span>
                                  <span className="text-muted">Email</span>    <span>{event.student_id?.email}</span>
                                  <span className="text-muted">Phone</span>    <span>{event.student_id?.phone}</span>
                                  <span className="text-muted">College</span>  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{event.college_name}</span>
                                </div>
                                {event.event_type === 'team' && event.team_members?.length > 0 && (
                                  <div style={{ marginTop: '0.9rem' }}>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <Users size={12} /> Team Members ({event.team_members.length})
                                    </p>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.6rem 0.9rem', border: '1px solid var(--border-color)', fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                                      {event.team_members.map((tm, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '6px' }}>
                                          <span className="text-muted">{i + 1}.</span>
                                          <span style={{ fontWeight: 500 }}>{tm.name}</span>
                                          <span className="text-muted">({tm.reg_no})</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Banner */}
                              {event.event_banner && (
                                <div style={{ minWidth: '140px' }}>
                                  <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>Event Poster</p>
                                  <img
                                    src={event.event_banner?.startsWith('data:') ? event.event_banner : `${API_URL}${event.event_banner}`}
                                    alt="Banner"
                                    onClick={() => setLightboxImg(event.event_banner)}
                                    style={{ maxHeight: '110px', maxWidth: '180px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'zoom-in', objectFit: 'cover' }}
                                  />
                                </div>
                              )}

                              {/* PPT */}
                              {event.ppt_url && (
                                <div style={{ minWidth: '140px' }}>
                                  <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>Presentation</p>
                                  <div style={{
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    borderRadius: '8px', padding: '0.75rem 1rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                                  }}>
                                    <Presentation size={28} style={{ color: 'var(--accent-primary)' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>PPT uploaded</span>
                                    <button
                                      onClick={() => downloadFile(event.ppt_url, `${event.event_name}_presentation`)}
                                      className="btn btn-primary text-xs py-1 px-2 flex items-center gap-1"
                                    >
                                      <Download size={12} /> Download
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* ─ Verification Review Panel (shows if Approved, Completed, or Verified) ─ */}
                            {(event.status === 'Approved' || event.status === 'Completed' || event.status === 'Certificate Verified') && (
                              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>

                                {/* Panel header */}
                                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {loadingSubmission[event._id]
                                      ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading submission...</>
                                      : submissions[event._id]
                                        ? <><CheckCircle size={15} style={{ color: '#10b981' }} /> Submission Loaded — Review &amp; Verify below</>
                                        : <><AlertTriangle size={15} style={{ color: '#f59e0b' }} /> No submission found yet</>}
                                  </span>
                                  {/* Result badge */}
                                  {submissions[event._id]?.result && (
                                    <span style={{
                                      padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                                      background: submissions[event._id].result === 'Won' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                                      color: submissions[event._id].result === 'Won' ? '#10b981' : 'var(--accent-primary)'
                                    }}>
                                      {submissions[event._id].result}
                                    </span>
                                  )}
                                </div>

                                {submissions[event._id] && (
                                  <div style={{ padding: '1.25rem' }}>

                                    {/* Missing cert reason warning */}
                                    {submissions[event._id].certificate_missing_reason && (
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#92400e' }}>
                                        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px', color: '#f59e0b' }} />
                                        <div><strong>Reason for missing team certificates:</strong> {submissions[event._id].certificate_missing_reason}</div>
                                      </div>
                                    )}

                                    {/* Sub-tabs: Geotag Photos | Certificate | Team Certs */}
                                    {(() => {
                                      const sub = submissions[event._id];
                                      const hasPhotos = sub.event_photos?.length > 0 || sub.geo_photos?.length > 0 || sub.has_geo_photos;
                                      const hasCert = !!sub.certificate_url;
                                      const hasTeamCerts = sub.team_member_certificates?.length > 0;
                                      const hasPpt = !!event.ppt_url;
                                      const hasDriveLink = !!sub.certificate_drive_link;
                                      const currentTab = reviewTab[event._id] || (hasPhotos ? 'photos' : hasCert ? 'certificate' : hasTeamCerts ? 'teamcerts' : hasPpt ? 'ppt' : 'certificate');

                                      return (
                                        <>
                                          {/* Sub-tab bar */}
                                          <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '4px', flexWrap: 'wrap' }}>
                                            {hasPhotos && (
                                              <button
                                                onClick={() => setReviewTab(p => ({ ...p, [event._id]: 'photos' }))}
                                                style={{
                                                  flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                                                  background: currentTab === 'photos' ? 'var(--accent-primary)' : 'transparent',
                                                  color: currentTab === 'photos' ? '#fff' : 'var(--text-secondary)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s'
                                                }}
                                              >
                                                <Camera size={13} /> Geotag Photos ({sub.geo_photos?.length || sub.event_photos?.length || 0})
                                              </button>
                                            )}
                                            {hasCert && (
                                              <button
                                                onClick={() => setReviewTab(p => ({ ...p, [event._id]: 'certificate' }))}
                                                style={{
                                                  flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                                                  background: currentTab === 'certificate' ? 'var(--accent-primary)' : 'transparent',
                                                  color: currentTab === 'certificate' ? '#fff' : 'var(--text-secondary)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s'
                                                }}
                                              >
                                                <FileText size={13} /> Lead Certificate
                                              </button>
                                            )}
                                            {hasDriveLink && (
                                              <button
                                                onClick={() => setReviewTab(p => ({ ...p, [event._id]: 'drivelink' }))}
                                                style={{
                                                  flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                                                  background: currentTab === 'drivelink' ? 'var(--accent-primary)' : 'transparent',
                                                  color: currentTab === 'drivelink' ? '#fff' : 'var(--text-secondary)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s'
                                                }}
                                              >
                                                <Link size={13} /> Drive Link
                                              </button>
                                            )}
                                            {hasTeamCerts && (
                                              <button
                                                onClick={() => setReviewTab(p => ({ ...p, [event._id]: 'teamcerts' }))}
                                                style={{
                                                  flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                                                  background: currentTab === 'teamcerts' ? 'var(--accent-primary)' : 'transparent',
                                                  color: currentTab === 'teamcerts' ? '#fff' : 'var(--text-secondary)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s'
                                                }}
                                              >
                                                <Users size={13} /> Team Certs ({sub.team_member_certificates.length})
                                              </button>
                                            )}
                                            {hasPpt && (
                                              <button
                                                onClick={() => setReviewTab(p => ({ ...p, [event._id]: 'ppt' }))}
                                                style={{
                                                  flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                                                  background: currentTab === 'ppt' ? 'var(--accent-primary)' : 'transparent',
                                                  color: currentTab === 'ppt' ? '#fff' : 'var(--text-secondary)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s'
                                                }}
                                              >
                                                <Presentation size={13} /> Presentation
                                              </button>
                                            )}
                                          </div>

                                          {/* ── Tab: Geotag Photos ── */}
                                          {currentTab === 'photos' && (sub.geo_photos?.length > 0 || hasPhotos) && (() => {
                                            const numDays = event.num_days || 1;
                                            // Use new geo_photos (DB base64) if available, else fall back to legacy event_photos
                                            const geoPhotos = sub.geo_photos || [];
                                            const hasDayPhotos = geoPhotos.length > 0;

                                            // Build per-day groups
                                            const dayGroups = {};
                                            if (hasDayPhotos) {
                                              for (let d = 1; d <= numDays; d++) dayGroups[d] = [];
                                              geoPhotos.forEach(gp => {
                                                const d = gp.day || 1;
                                                if (!dayGroups[d]) dayGroups[d] = [];
                                                dayGroups[d].push(gp);
                                              });
                                            }

                                            return (
                                              <div>
                                                {/* Global GPS (legacy / first photo) */}
                                                {sub.gps_location && (
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 500 }}>
                                                    <MapPin size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                                                    <a
                                                      href={`https://www.google.com/maps/search/?api=1&query=${sub.gps_location.lat?.toFixed(5)},${sub.gps_location.lng?.toFixed(5)}`}
                                                      target="_blank" rel="noopener noreferrer"
                                                      style={{ color: '#10b981', textDecoration: 'none', borderBottom: '1px dashed #10b981', cursor: 'pointer' }}
                                                    >
                                                      GPS recorded: {sub.gps_location.lat?.toFixed(5)}, {sub.gps_location.lng?.toFixed(5)}
                                                    </a>
                                                  </div>
                                                )}

                                                {hasDayPhotos ? (
                                                  // ── Per-Day Columns (DB photos) ──
                                                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(numDays, 3)}, 1fr)`, gap: '14px' }}>
                                                    {Object.keys(dayGroups).sort((a,b)=>a-b).map(day => {
                                                      const photos = dayGroups[day];
                                                      const dayDate = photos[0]?.day_date ? new Date(photos[0].day_date).toLocaleDateString() : (event.event_dates?.[day-1] ? new Date(event.event_dates[day-1]).toLocaleDateString() : null);
                                                      return (
                                                        <div key={day} style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                                                          <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            📅 Day {day}
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({photos.length} photo{photos.length !== 1 ? 's' : ''})</span>
                                                          </div>
                                                          {dayDate && (
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                              Date: <strong>{dayDate}</strong>
                                                            </div>
                                                          )}
                                                          {photos.length === 0 ? (
                                                            <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.78rem', opacity: 0.6 }}>No photos</div>
                                                          ) : (
                                                            photos.map((gp, i) => (
                                                              <div key={i} style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                                                <img
                                                                  src={gp.photo_data}
                                                                  alt={`day${day}-${i+1}`}
                                                                  onClick={() => setLightboxImg(gp.photo_data)}
                                                                  style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                                                                />
                                                                <div style={{ padding: '5px 8px', fontSize: '0.72rem' }}>
                                                                  {(gp.lat && gp.lng) ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                      <MapPin size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                                                                      <a
                                                                        href={`https://www.google.com/maps/search/?api=1&query=${gp.lat.toFixed(5)},${gp.lng.toFixed(5)}`}
                                                                        target="_blank" rel="noopener noreferrer"
                                                                        style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}
                                                                      >
                                                                        {gp.lat.toFixed(5)}, {gp.lng.toFixed(5)}
                                                                      </a>
                                                                    </div>
                                                                  ) : <span style={{ color: '#f59e0b' }}>⚠ No GPS</span>}
                                                                  {gp.captured_at && (
                                                                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                      🕒 {new Date(gp.captured_at).toLocaleString()}
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            ))
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : (
                                                  // ── Legacy flat event_photos ──
                                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                                                    {(sub.event_photos || []).map((ph, i) => (
                                                      <div key={i} onClick={() => setLightboxImg(ph)} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid var(--border-color)' }}>
                                                        <img src={ph?.startsWith('data:') ? ph : `${API_URL}${ph}`} alt={`geotag-${i+1}`} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
                                                        <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{i+1}</div>
                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#10b981', fontSize: '9px', padding: '3px 5px', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={9} /> Live Camera</div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                                <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click any photo to enlarge. These were taken live with the device camera.</p>
                                              </div>
                                            );
                                          })()}

                                          {/* ── Tab: Lead Certificate ── */}
                                          {currentTab === 'certificate' && hasCert && (() => {
                                            const isPdf = sub.certificate_url?.startsWith('data:application/pdf') || sub.certificate_url?.toLowerCase().includes('pdf');
                                            return (
                                              <div>
                                                {/* Full-width preview */}
                                                <div style={{ width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '0.85rem', background: 'var(--bg-primary)' }}>
                                                  {isPdf ? (
                                                    <iframe
                                                      src={sub.certificate_url}
                                                      title="Certificate PDF"
                                                      style={{ width: '100%', height: '480px', border: 'none', display: 'block' }}
                                                    />
                                                  ) : (
                                                    <img
                                                      src={sub.certificate_url?.startsWith('data:') ? sub.certificate_url : `${API_URL}${sub.certificate_url}`}
                                                      alt="Certificate"
                                                      onClick={() => setLightboxImg(sub.certificate_url)}
                                                      style={{ display: 'block', width: '100%', maxHeight: '480px', objectFit: 'contain', cursor: 'zoom-in' }}
                                                    />
                                                  )}
                                                </div>
                                                {/* Info + actions row */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                                                    <strong style={{ color: 'var(--text-primary)' }}>{event.student_id?.name}</strong>
                                                    <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
                                                    {event.student_id?.reg_no}
                                                    <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
                                                    {event.college_name}
                                                  </p>
                                                  <div style={{ display: 'flex', gap: '8px' }}>
                                                    {!isPdf && (
                                                      <button
                                                        onClick={() => setLightboxImg(sub.certificate_url)}
                                                        className="btn btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                                                      >
                                                        <ImageIcon size={13} /> Fullscreen
                                                      </button>
                                                    )}
                                                    <button
                                                      onClick={() => downloadFile(sub.certificate_url, `${event.student_id?.name}_${event.event_name}_cert`)}
                                                      className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1"
                                                    >
                                                      <Download size={13} /> Download
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {/* ── Tab: Team Member Certificates ── */}
                                          {currentTab === 'teamcerts' && hasTeamCerts && (
                                            <div>
                                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Users size={13} style={{ color: 'var(--accent-primary)' }} />
                                                Individual certificates uploaded per team member. Each will be linked to their personal dashboard on verification.
                                              </p>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {sub.team_member_certificates.map((mc, i) => {
                                                  const mcIsPdf = mc.certificate_url?.startsWith('data:application/pdf');
                                                  return (
                                                  <div key={i} style={{
                                                    display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap',
                                                    background: 'var(--bg-secondary)', borderRadius: '10px',
                                                    padding: '0.75rem 1rem', border: '1px solid var(--border-color)'
                                                  }}>
                                                    {/* Cert thumbnail */}
                                                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0, width: '80px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                                                      {mcIsPdf ? (
                                                        <FileText size={28} style={{ color: 'var(--accent-primary)' }} />
                                                      ) : (
                                                        <img
                                                          src={mc.certificate_url?.startsWith('data:') ? mc.certificate_url : `${API_URL}${mc.certificate_url}`}
                                                          alt={`cert-${i + 1}`}
                                                          onClick={() => setLightboxImg(mc.certificate_url)}
                                                          onError={e => e.target.style.display = 'none'}
                                                          style={{ width: '80px', height: '60px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                                                        />
                                                      )}
                                                    </div>
                                                    {/* Info */}
                                                    <div style={{ flex: 1, minWidth: '160px' }}>
                                                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                        {event.team_members?.find(m => m.email === mc.email)?.name || mc.email}
                                                      </div>
                                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                        ✉ {mc.email}
                                                      </div>
                                                      {/* Per-member drive link */}
                                                      {(() => {
                                                        const dl = (sub.team_member_drive_links || []).find(d => d.email === mc.email);
                                                        return dl?.drive_link ? (
                                                          <a href={dl.drive_link} target="_blank" rel="noopener noreferrer"
                                                            style={{ fontSize: '0.73rem', color: '#4285F4', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontWeight: 600 }}>
                                                            <ExternalLink size={11} /> Drive Link
                                                          </a>
                                                        ) : null;
                                                      })()}
                                                    </div>
                                                    {/* Actions */}
                                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                      {!mcIsPdf && (
                                                        <button
                                                          onClick={() => setLightboxImg(mc.certificate_url)}
                                                          className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                                                        >
                                                          <ImageIcon size={12} /> View
                                                        </button>
                                                      )}
                                                      <button
                                                        onClick={() => downloadFile(mc.certificate_url, `${mc.email}_${event.event_name}_cert`)}
                                                        className="btn btn-primary text-xs py-1 px-2 flex items-center gap-1"
                                                      >
                                                        <Download size={12} /> Download
                                                      </button>
                                                    </div>
                                                  </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}

                                          {/* ── Tab: Drive Link ── */}
                                          {currentTab === 'drivelink' && hasDriveLink && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                                              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Link size={14} style={{ color: 'var(--accent-primary)' }} />
                                                The student has provided a Google Drive link for their certificate.
                                              </p>
                                              <a
                                                href={sub.certificate_drive_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                  padding: '0.65rem 1.4rem', borderRadius: '10px',
                                                  background: 'linear-gradient(135deg, #4285F4, #34A853)',
                                                  color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                                                  textDecoration: 'none', boxShadow: '0 4px 14px rgba(66,133,244,0.35)'
                                                }}
                                              >
                                                <ExternalLink size={16} /> Open Certificate in Google Drive
                                              </a>
                                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                                {sub.certificate_drive_link}
                                              </p>
                                            </div>
                                          )}

                                          {/* ── Tab: PPT Presentation ── */}
                                          {currentTab === 'ppt' && hasPpt && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                                              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Presentation size={14} style={{ color: 'var(--accent-primary)' }} />
                                                Student uploaded a presentation for this event.
                                              </p>
                                              {/* If it's a PDF base64, show inline; otherwise offer download */}
                                              {event.ppt_url?.startsWith('data:application/pdf') ? (
                                                <iframe
                                                  src={event.ppt_url}
                                                  title="Presentation"
                                                  style={{ width: '100%', height: '480px', border: '1px solid var(--border-color)', borderRadius: '10px' }}
                                                />
                                              ) : (
                                                <div style={{
                                                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                  borderRadius: '12px', padding: '1.5rem 2rem',
                                                  display: 'flex', alignItems: 'center', gap: '1.25rem'
                                                }}>
                                                  <Presentation size={40} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                                  <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>Presentation File</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                                      PPT/PPTX files cannot be previewed in browser. Download to view.
                                                    </div>
                                                    <button
                                                      onClick={() => downloadFile(event.ppt_url, `${event.event_name}_presentation`)}
                                                      className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1"
                                                    >
                                                      <Download size={13} /> Download Presentation
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* No content tab fallback */}
                                          {!hasPhotos && !hasCert && !hasTeamCerts && !hasPpt && !hasDriveLink && (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                              <AlertTriangle size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                              <p>Student has not uploaded any photos or certificate yet.</p>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}

                                    {/* ── Verify button (only for Completed) ── */}
                                    {event.status === 'Completed' && (
                                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                          Review the geotag photos and certificate above.<br />
                                          Once satisfied, click <strong>Verify &amp; Archive</strong> to move this to the Achievements section.
                                        </div>
                                        <button
                                          onClick={() => updateStatus(event._id, 'Certificate Verified')}
                                          style={{
                                            padding: '0.65rem 1.6rem',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: '#fff', border: 'none', borderRadius: '10px',
                                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            boxShadow: '0 4px 14px rgba(16,185,129,0.4)', transition: 'opacity 0.2s'
                                          }}
                                        >
                                          <Shield size={16} /> Verify &amp; Archive Certificate
                                        </button>
                                      </div>
                                    )}

                                    {/* ── Waiting block (for Approved events where student hasn't uploaded cert yet) ── */}
                                    {event.status === 'Approved' && (
                                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <Loader size={12} style={{ animation: 'spin 2s linear infinite' }} />
                                          <strong>Waiting for final certificate submission:</strong> The student has uploaded photos, but has not yet completed the event and submitted the certificate. You can verify this request once they finish.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Loading state */}
                                {loadingSubmission[event._id] && (
                                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading submission data...
                                  </div>
                                )}

                                {/* Not found state (null = checked, no submission) */}
                                {submissions[event._id] === null && !loadingSubmission[event._id] && (
                                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <AlertTriangle size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                    <p>No submission from the student yet. Remind them to upload geotag photos &amp; certificate.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── GLOBAL CROSS-DEPT EVENTS TAB ─── */}
      {tab === 'global' && (
        <div className="mt-4">
          <div className="section-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="section-title">Cross-Department Event Reference</h2>
              <p className="text-muted text-sm mt-1">Search an event name to check which students across ALL departments are attending it.</p>
            </div>
            <div className="flex items-center gap-2">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Type an exact event name..."
                className="form-control"
                style={{ width: '320px', background: 'var(--bg-secondary)' }}
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          {!globalSearch.trim() ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <Globe size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Type an event name in the search box above to see participating students across the entire institution.</p>
            </div>
          ) : filteredGlobalEvents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
               No events found matching "{globalSearch}".
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Department & Year</th>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGlobalEvents.map(event => (
                    <tr key={event._id} className="hover:bg-primary">
                      <td>
                        <span style={{ fontWeight: 600 }}>{event.student_id?.name || 'Unknown'}</span>
                        <div className="text-xs text-muted">{event.student_id?.reg_no}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{event.student_department}</span>
                        <div className="text-xs text-muted">Year {event.student_id?.year}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{event.event_name}</div>
                        <div className="text-xs text-muted">{event.college_name}</div>
                      </td>
                      <td className="text-sm">{new Date(event.event_date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(event.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── ACHIEVEMENTS TAB ─── */}
      {tab === 'achievements' && (
        <div className="mt-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-title">Student Achievements — {user?.department}</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="flex items-center gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2px 12px' }}>
                <Search size={14} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search name, reg no..."
                  value={achFilter}
                  onChange={e => setAchFilter(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', padding: '6px 4px', width: '180px', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAchYear('all')}
                style={{
                  padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--border-color)',
                  background: achYear === 'all' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: achYear === 'all' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                }}
              >All Years</button>
              {allYears.map(yr => (
                <button
                  key={yr}
                  onClick={() => setAchYear(yr)}
                  style={{
                    padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--border-color)',
                    background: achYear === yr ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: achYear === yr ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                  }}
                >
                  Year {yr}
                </button>
              ))}
            </div>
            </div>
          </div>

          {achievementsToShow.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)'
            }}>
              <Trophy size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No verified achievements yet for the selected year.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Reg No</th>
                    <th>Year</th>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Result</th>
                    <th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {achievementsToShow.map((ach, idx) => (
                    <tr key={idx} className="hover:bg-primary transition">
                      <td style={{ fontWeight: 500 }}>
                        {ach.student_name}
                        {ach.is_team_member && (
                          <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Team</span>
                        )}
                      </td>
                      <td className="text-sm">{ach.reg_no}</td>
                      <td className="text-sm">{ach.year || '-'}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ach.event_name}</div>
                        {ach.college_name && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Building2 size={10} /> {ach.college_name}
                          </div>
                        )}
                        {ach.team_name && <div className="text-xs text-muted">{ach.team_name}</div>}
                      </td>
                      <td className="text-sm">{new Date(ach.event_date).toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                          background: ach.result === 'Won' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                          color: ach.result === 'Won' ? '#10b981' : 'var(--accent-primary)',
                        }}>
                          {ach.result || 'Participated'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {ach.certificate_url && (() => {
                            const achIsPdf = ach.certificate_url?.startsWith('data:application/pdf');
                            return (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {achIsPdf ? (
                                  <FileText size={28} style={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                  <img
                                    src={ach.certificate_url?.startsWith('data:') ? ach.certificate_url : `${API_URL}${ach.certificate_url}`}
                                    alt="cert"
                                    onClick={() => setLightboxImg(ach.certificate_url)}
                                    onError={e => e.target.style.display = 'none'}
                                    style={{ width: '44px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'zoom-in' }}
                                  />
                                )}
                                <button
                                  onClick={() => downloadFile(ach.certificate_url, `${ach.student_name}_${ach.event_name}_cert`)}
                                  className="btn text-xs py-1 px-2 flex items-center gap-1"
                                  style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                                >
                                  <Download size={12} />
                                </button>
                              </div>
                            );
                          })()}
                          {ach.certificate_drive_link && (
                            <a
                              href={ach.certificate_drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.72rem', color: '#4285F4', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                            >
                              <ExternalLink size={11} /> Drive Link
                            </a>
                          )}
                          {!ach.certificate_url && !ach.certificate_drive_link && (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
