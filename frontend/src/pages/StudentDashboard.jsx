import React, { useEffect, useState, useCallback } from 'react';
import api, { API_URL } from '../api';
import {
  Calendar, CheckCircle, Clock, Award, Camera, UploadCloud,
  Trash2, Trophy, Download, Bell, X, Users, XCircle, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Notification type → colour
const NOTE_COLORS = {
  accepted:         '#10b981',
  rejected:         '#ef4444',
  approved:         '#6366f1',
  faculty_rejected: '#ef4444',
  verified:         '#f59e0b',
  info:             '#6366f1',
};

const StudentDashboard = () => {

  const [stats, setStats]               = useState({ total: 0, approved: 0, completed: 0, pending: 0 });
  const [events, setEvents]             = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [invitations, setInvitations]   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif]       = useState(false);
  const [tab, setTab]                   = useState('events');

  // Logged-in user from localStorage
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; }
  })();

  const fetchData = useCallback(async () => {
    try {
      console.log('[Frontend] Fetching dashboard data...');
      const [statsRes, eventsRes, achRes, invRes, notifRes] = await Promise.all([
        api.get('/api/events/dashboard-stats'),
        api.get('/api/events/my-events'),
        api.get('/api/events/my-achievements'),
        api.get('/api/events/invitations'),
        api.get('/api/notifications'),
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data);
      setAchievements(achRes.data);
      setInvitations(invRes.data);
      setNotifications(notifRes.data);
    } catch (err) {
      console.error('[Frontend] Fetch Data Error:', err.response?.data || err.message);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Poll notifications every 30 s (lightweight) ──
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await api.get('/api/notifications');
        setNotifications(res.data);
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const clearAllNotifications = async () => {
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    try {
      await api.delete('/api/notifications/clear-all');
      setNotifications([]);
      toast.success('All notifications cleared');
      setShowNotif(false);
    } catch (err) {
      console.error('Clear notifications error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to clear notifications');
    }
  };

  const markOneRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const deleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Delete request for "${eventName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/events/${eventId}`);
      toast.success('Event request deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Pending Approval':       'badge-pending',
      'Pending Team Acceptance': 'badge-pending',
      'Approved':               'badge-approved',
      'Completed':              'badge-completed',
      'Certificate Verified':   'badge-completed',
      'Rejected':               'badge-rejected'
    };
    return <span className={`badge ${statusMap[status] || 'badge-pending'}`}>{status}</span>;
  };

  const handleAcceptInvitation = async (id) => {
    try {
      await api.post(`/api/events/${id}/accept-invitation`);
      toast.success('Invitation accepted');
      fetchData();
    } catch (err) { toast.error('Failed to accept'); }
  };

  const handleRejectInvitation = async (id) => {
    try {
      await api.post(`/api/events/${id}/reject-invitation`);
      toast.success('Invitation rejected');
      fetchData();
    } catch (err) { toast.error('Failed to reject'); }
  };

  const handleSendRequest = async (id) => {
    try {
      await api.post(`/api/events/${id}/send-request`);
      toast.success('Request sent to faculty');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
  };


  const downloadFile = (url, filename) => {
    const a = document.createElement('a');
    a.href = url?.startsWith('data:') ? url : `${API}${url}`;
    a.download = filename;
    a.target = '_blank';
    a.click();
  };

  // Whether the logged-in user is the team lead of an event
  const isLead = (event) =>
    event.student_id && (event.student_id._id === currentUser.id || event.student_id === currentUser.id);

  // Deletable statuses (for team lead: Pending Team Acceptance too)
  const canDelete = (event) => {
    if (!isLead(event)) return false;
    return ['Pending Approval', 'Rejected', 'Pending Team Acceptance'].includes(event.status);
  };

  return (
    <div className="main-content">
      {/* ── Header ── */}
      <div className="section-header" style={{ position: 'relative' }}>
        <h1 className="section-title">Student Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotif(v => !v); if (!showNotif && unreadCount > 0) markAllRead(); }}
              style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '50%', width: '40px', height: '40px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
              }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff',
                  borderRadius: '9999px', minWidth: '18px', height: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, padding: '0 4px'
                }}>{unreadCount}</span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotif && (
              <div style={{
                position: 'absolute', right: 0, top: '48px', zIndex: 1000,
                width: '340px', maxHeight: '420px', overflowY: 'auto',
                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.85rem 1rem 0.5rem', borderBottom: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🔔 Notifications</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >Mark all read</button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        style={{ fontSize: '0.72rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >Clear All</button>
                    )}
                    <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Bell size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => markOneRead(n._id)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: n.read ? 'transparent' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        borderLeft: `3px solid ${NOTE_COLORS[n.type] || '#6366f1'}`,
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.83rem', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Link to="/student/register-event" className="btn btn-primary">+ Register New Event</Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon stat-blue"><Calendar size={24} /></div>
          <div className="stat-content"><h3>Registered</h3><p>{stats.total}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-green"><CheckCircle size={24} /></div>
          <div className="stat-content"><h3>Approved</h3><p>{stats.approved}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-yellow"><Clock size={24} /></div>
          <div className="stat-content"><h3>Pending</h3><p>{stats.pending}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-blue" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)' }}>
            <Award size={24} />
          </div>
          <div className="stat-content">
            <h3>Completed</h3>
            <p>{stats.completed}</p>
            {stats.completed > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>incl. team events</span>}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '2rem 0 1rem', borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => setTab('events')} style={{ padding: '0.6rem 1.4rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: tab === 'events' ? 'var(--accent-primary)' : 'var(--text-secondary)', borderBottom: tab === 'events' ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.2s' }}>
          📋 My Events
        </button>
        <button onClick={() => setTab('achievements')} style={{ padding: '0.6rem 1.4rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: tab === 'achievements' ? 'var(--accent-primary)' : 'var(--text-secondary)', borderBottom: tab === 'achievements' ? '2px solid var(--accent-primary)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
          <Trophy size={15} /> Achievements
          {achievements.length > 0 && <span style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '9999px', padding: '1px 7px', fontSize: '0.72rem' }}>{achievements.length}</span>}
        </button>
        <button onClick={() => setTab('invitations')} style={{ padding: '0.6rem 1.4rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: tab === 'invitations' ? 'var(--accent-primary)' : 'var(--text-secondary)', borderBottom: tab === 'invitations' ? '2px solid var(--accent-primary)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
          Team Invitations
          {invitations.length > 0 && <span style={{ background: '#eab308', color: '#fff', borderRadius: '9999px', padding: '1px 7px', fontSize: '0.72rem' }}>{invitations.length}</span>}
        </button>
      </div>

      {/* ─── EVENTS TAB ─── */}
      {tab === 'events' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Host Details</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.filter(e => e.status !== 'Certificate Verified').map(event => {
                const lead = isLead(event);
                return (
                  <React.Fragment key={event._id}>
                    <tr className="hover:bg-primary transition">
                      <td style={{ fontWeight: 600 }}>
                        {event.event_name}
                        <div className="text-xs text-muted font-normal capitalize">
                          {event.event_type} {event.team_name ? `(${event.team_name})` : ''}
                          {!lead && event.event_type === 'team' && (
                            <span style={{ marginLeft: '6px', color: 'var(--accent-primary)', fontWeight: 700 }}>• Member</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>{event.college_name}</td>
                      <td style={{ fontSize: '0.9rem' }}>{new Date(event.event_date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(event.status)}</td>
                      <td>
                        <div className="flex gap-2 flex-wrap">
                          {event.status === 'Approved' && (
                            <>
                              <Link
                                to={`/student/event/${event._id}/live`}
                                className="btn text-xs py-1 px-3 border border-accent-primary text-accent-primary flex items-center gap-1"
                              >
                                <Camera size={14} /> Geotag
                              </Link>
                              <Link
                                to={`/student/event/${event._id}/submit`}
                                className="btn btn-success text-xs py-1 px-3 flex items-center gap-1 shadow-sm"
                              >
                                <UploadCloud size={14} /> Upload Cert
                              </Link>
                            </>
                          )}
                          {(event.status === 'Completed' || event.status === 'Certificate Verified') && (
                            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#10b981' }}>
                              <CheckCircle size={14} /> Done
                            </span>
                          )}
                          {event.status === 'Pending Approval' && (
                            <span className="text-sm text-muted">Awaiting Faculty...</span>
                          )}
                          {event.status === 'Pending Team Acceptance' && lead && (
                            <div className="flex flex-col gap-1 items-start">
                              {(() => {
                                const hasRejected = event.team_members?.some(m => m.status === 'Rejected');
                                const allAccepted = event.team_members?.every(m => m.status === 'Accepted');
                                if (hasRejected) {
                                  return (
                                    <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <XCircle size={13} /> A member rejected — delete & re-register
                                    </span>
                                  );
                                }
                                if (allAccepted) {
                                  return (
                                    <button onClick={() => handleSendRequest(event._id)} className="btn btn-primary text-xs py-1 px-3">
                                      Send to Faculty
                                    </button>
                                  );
                                }
                                return <span className="text-sm text-muted">Awaiting members...</span>;
                              })()}
                            </div>
                          )}
                          {event.status === 'Pending Team Acceptance' && !lead && (
                            <span className="text-sm text-muted">Awaiting Team Leader...</span>
                          )}
                          {canDelete(event) && (
                            <button
                              onClick={() => deleteEvent(event._id, event.event_name)}
                              className="btn btn-danger text-xs py-1 px-3 flex items-center gap-1"
                              title="Delete this request"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Rejected members warning row (only visible to team lead) ── */}
                    {lead && event.event_type === 'team' && event.team_members?.some(m => m.status === 'Rejected') && (
                      <tr>
                        <td colSpan="5" style={{ padding: '0', background: 'rgba(239,68,68,0.04)', borderLeft: '3px solid #ef4444' }}>
                          <div style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                            <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '0.8rem' }}>
                              <strong style={{ color: '#ef4444' }}>Team Member Rejection Alert:</strong>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {event.team_members.map((m, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '3px 10px', fontSize: '0.78rem' }}>
                                    <span>{m.name}</span>
                                    <MemberStatusPill status={m.status} />
                                  </div>
                                ))}
                              </div>
                              {event.team_members.some(m => m.status === 'Rejected') && (
                                <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.75rem' }}>
                                  Please delete this event request and re-register with updated team members.
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-8">No events registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── INVITATIONS TAB ─── */}
      {tab === 'invitations' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Host Details</th>
                <th>Invited By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map(event => (
                <tr key={event._id} className="hover:bg-primary transition">
                  <td style={{ fontWeight: 600 }}>{event.event_name}</td>
                  <td style={{ fontSize: '0.9rem' }}>{event.college_name}</td>
                  <td style={{ fontSize: '0.9rem' }}>{event.student_id ? event.student_id.name : 'Unknown'}</td>
                  <td style={{ fontSize: '0.9rem' }}>{new Date(event.event_date).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleAcceptInvitation(event._id)} className="btn btn-success text-xs py-1 px-3">Accept</button>
                      <button onClick={() => handleRejectInvitation(event._id)} className="btn btn-danger text-xs py-1 px-3">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-8">No pending invitations.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ACHIEVEMENTS TAB ─── */}
      {tab === 'achievements' && (
        <div>
          {achievements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <Trophy size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No achievements yet. Complete an event and get your certificate verified!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {achievements.map((ach, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '14px', overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s',
                }}>
                  {ach.certificate_url && (
                    <div style={{ width: '100%', height: '150px', overflow: 'hidden', background: '#1a1a2e' }}>
                      <img
                        src={ach.certificate_url?.startsWith('data:') ? ach.certificate_url : `${API}${ach.certificate_url}`}
                        alt="Certificate"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>{ach.event_name}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(ach.event_date).toLocaleDateString()}</p>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                        background: ach.result === 'Won' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                        color: ach.result === 'Won' ? '#10b981' : 'var(--accent-primary)',
                      }}>
                        {ach.result || 'Participated'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      <div><strong>Name:</strong> {ach.student_name}</div>
                      <div><strong>Reg No:</strong> {ach.reg_no}</div>
                      {ach.team_name && <div><strong>Team:</strong> {ach.team_name}</div>}
                      {ach.is_team_member && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                          <Users size={12} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.75rem' }}>Team Member</span>
                        </div>
                      )}
                    </div>
                    {ach.certificate_url && (
                      <button
                        onClick={() => downloadFile(ach.certificate_url, `${ach.event_name}_certificate`)}
                        className="btn btn-primary text-xs py-1"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Download size={13} /> Download Certificate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── MemberStatusPill defined outside to avoid re-declaration ──
const MemberStatusPill = ({ status }) => {
  const cfg = {
    Accepted: { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Accepted' },
    Rejected: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Rejected' },
    Pending:  { bg: 'rgba(234,179,8,0.15)',   color: '#eab308', label: 'Pending'  },
  }[status] || { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', label: status };
  return (
    <span style={{
      padding: '1px 7px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap'
    }}>{cfg.label}</span>
  );
};

export default StudentDashboard;
