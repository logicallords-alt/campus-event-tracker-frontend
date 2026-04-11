import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import api, { API_URL } from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, MapPin, CheckCircle, Trash2, Upload, AlertCircle, Calendar, ArrowLeft } from 'lucide-react';

const LiveVerification = () => {
  const { id } = useParams();
  const webcamRef = useRef(null);

  // capturedPhotos: [{ dataUrl, location: {lat, lng} | null, time, timestamp, day }]
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [numDays, setNumDays] = useState(1);
  const [activeDay, setActiveDay] = useState(1);
  const [eventLoaded, setEventLoaded] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const navigate = useNavigate();

  // Fetch event to get num_days
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        console.log('[Frontend] Fetching event info for live verification:', id);
        const res = await api.get('/api/events/my-events');
        const event = res.data.find(e => e._id === id);
        if (event) {
          if (event.num_days) setNumDays(event.num_days);
          setCurrentEvent(event);
        }
      } catch (e) {
        console.error('[Frontend] Fetch Event Error:', e.response?.data || e.message);
      } finally {
        setEventLoaded(true);
      }
    };
    fetchEvent();
  }, [id]);


  // Photos for the active day
  const photosForActiveDay = capturedPhotos.filter(p => p.day === activeDay);

  const isDayLocked = (dayToCheck) => {
    if (!currentEvent) return { locked: false };
    let targetDate = null;
    
    // Use explicitly saved event_dates if available, otherwise calculate from start date
    if (currentEvent.event_dates && currentEvent.event_dates.length >= dayToCheck && currentEvent.event_dates[dayToCheck - 1]) {
       targetDate = new Date(currentEvent.event_dates[dayToCheck - 1]);
    } else if (currentEvent.event_date) {
       targetDate = new Date(currentEvent.event_date);
       // Advance by N days (dynamically reconstruct the day schedule)
       targetDate.setDate(targetDate.getDate() + (dayToCheck - 1));
    }
    
    if (targetDate && !isNaN(targetDate.valueOf())) {
      const allowedDateStr = targetDate.toISOString().split('T')[0];
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      
      if (allowedDateStr !== todayStr) {
        return { locked: true, date: allowedDateStr, today: todayStr };
      }
    }
    return { locked: false };
  };

  const handleTabClick = (day) => {
    const lockInfo = isDayLocked(day);
    if (lockInfo.locked) {
      toast.error(`Event camera for Day ${day} is scheduled for ${lockInfo.date}. Today is ${lockInfo.today}.`);
      // Do not block selection so they can at least view existing photos, but the camera will be blocked.
    }
    setActiveDay(day);
  };

  // Capture a live photo + GPS for the current active day
  const capture = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return toast.error('Camera not ready yet');

    setGettingLocation(true);
    let loc = null;
    if (navigator.geolocation) {
      loc = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 6000 }
        );
      });
    }
    setGettingLocation(false);

    // Apply watermark with GPS, Date, and Time
    const currentTime = new Date();
    const timeStr = currentTime.toLocaleTimeString();
    const dateStr = currentTime.toLocaleDateString();

    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => { img.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Draw a semi-transparent black bar at the bottom
    const barHeight = Math.max(44, img.height * 0.11);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    // Draw text over the bar
    const fontSize = Math.max(12, Math.floor(img.height * 0.033));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';

    const locText = loc ? `📍 ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : '⚠ No GPS';
    const dateText = `🕒 ${dateStr} ${timeStr}`;
    const dayText = `Day ${activeDay}`;

    ctx.textAlign = 'left';
    ctx.fillText(`${dayText}  |  ${locText}  |  ${dateText}`, 12, canvas.height - (barHeight / 2));

    const finalImageSrc = canvas.toDataURL('image/jpeg', 0.9);

    setCapturedPhotos(prev => [...prev, {
      dataUrl: finalImageSrc,
      location: loc,
      time: timeStr,
      timestamp: currentTime.toISOString(),
      day: activeDay
    }]);
    toast.success(`Day ${activeDay} — Photo ${photosForActiveDay.length + 1} captured!`);
  }, [webcamRef, activeDay, photosForActiveDay.length]);

  const removePhoto = (idx) => {
    // idx is within capturedPhotos (global)
    setCapturedPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (capturedPhotos.length === 0) return toast.error('Please capture at least one photo first');

    const photosPayload = capturedPhotos.map((p) => ({
      day: p.day,
      photo_data: p.dataUrl,
      lat: p.location?.lat || null,
      lng: p.location?.lng || null,
      timestamp: p.timestamp,
    }));

    const gpsToSend = capturedPhotos.find(p => p.location)?.location || null;

    const payload = {
      photos: photosPayload,
      timestamp: new Date().toISOString(),
      gps_location: gpsToSend
    };

    setLoading(true);
    console.log('[Frontend] Submitting live verification photos:', id);
    try {
      await api.post(`/api/events/${id}/live-verification`, payload);
      console.log('[Frontend] Live Verification Successful');
      toast.success(`${capturedPhotos.length} geotag photo(s) submitted successfully!`);
      navigate('/student/dashboard');
    } catch (err) {
      console.error("Live upload error:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };


  const totalPhotos = capturedPhotos.length;

  return (
    <div className="main-content flex justify-center py-8">
      <div className="auth-card" style={{ maxWidth: '58rem', width: '100%' }}>

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

        <h2 className="section-title text-center mb-2">Live Geotag Capture</h2>
        <p className="text-muted text-sm text-center mb-2">
          Take live photos at the event venue. Photos are separated by day — select the day tab before capturing.
        </p>

        {/* Anti-cheat notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, color: '#f59e0b' }} />
          <span><strong>Camera-only mode:</strong> Only live camera capture is allowed. GPS location and day label are automatically embedded in each photo.</span>
        </div>

        {/* Day Selector Tabs */}
        {numDays > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
              const dayCount = capturedPhotos.filter(p => p.day === day).length;
              return (
                <button
                  key={day}
                  onClick={() => handleTabClick(day)}
                  style={{
                    padding: '8px 18px',
                    border: '2px solid',
                    borderColor: activeDay === day ? 'var(--accent-primary)' : 'var(--border-color)',
                    borderRadius: '20px',
                    background: activeDay === day ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: activeDay === day ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Calendar size={13} />
                  Day {day}
                  {dayCount > 0 && (
                    <span style={{
                      background: activeDay === day ? 'rgba(255,255,255,0.3)' : 'var(--accent-primary)',
                      color: '#fff', borderRadius: '9999px',
                      padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800
                    }}>
                      {dayCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Live Camera */}
          <div style={{ flex: '1', minWidth: '280px' }}>
            <div style={{
              borderRadius: '12px', overflow: 'hidden',
              border: '2px solid var(--border-color)',
              background: '#000',
              position: 'relative',
              minHeight: '240px',
            }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                videoConstraints={{ facingMode: 'environment' }}
                onUserMedia={() => setCameraReady(true)}
                onUserMediaError={() => toast.error('Camera access denied. Please allow camera permission.')}
                style={{ display: 'block', width: '100%' }}
              />
              {!cameraReady && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexDirection: 'column', gap: '8px', fontSize: '0.85rem'
                }}>
                  <Camera size={32} style={{ opacity: 0.5 }} />
                  <span style={{ opacity: 0.6 }}>Starting camera...</span>
                </div>
              )}
              {/* Active Day badge */}
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'var(--accent-primary)', color: '#fff',
                borderRadius: '8px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Calendar size={11} /> Day {activeDay}
              </div>
              {totalPhotos > 0 && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  borderRadius: '9999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700
                }}>
                  {totalPhotos} total shot{totalPhotos > 1 ? 's' : ''}
                </div>
              )}
            
            {/* Lock Overlay */}
            {isDayLocked(activeDay).locked && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#fff', textAlign: 'center', padding: '2rem', zIndex: 10
              }}>
                <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Camera Locked</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  Day {activeDay} is assigned to date: <strong style={{ color: '#ef4444' }}>{isDayLocked(activeDay).date}</strong>.
                  <br/>You cannot capture photos for this day today.
                </p>
              </div>
            )}
          </div>

          {/* Capture button */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button
                onClick={capture}
                disabled={!cameraReady || gettingLocation || isDayLocked(activeDay).locked}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem', opacity: isDayLocked(activeDay).locked ? 0.5 : 1 }}
              >
                <Camera size={18} />
                {gettingLocation ? 'Getting GPS...' : isDayLocked(activeDay).locked ? 'Camera Disabled' : `Capture Photo — Day ${activeDay}`}
              </button>
            </div>
            <p className="text-muted text-sm text-center mt-2" style={{ fontSize: '0.75rem' }}>
              GPS is automatically captured and embedded in each photo. Switch day tabs to capture photos for different days.
            </p>
          </div>

          {/* Captured Photos — per active day */}
          <div style={{ flex: '1', minWidth: '240px' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} style={{ color: 'var(--accent-primary)' }} />
              Day {activeDay} Photos ({photosForActiveDay.length})
            </h4>

            {photosForActiveDay.length === 0 ? (
              <div style={{
                border: '2px dashed var(--border-color)', borderRadius: '10px',
                padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.83rem'
              }}>
                <Camera size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <p>No photos for Day {activeDay} yet.<br />Use the camera to take photos.</p>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '10px',
                maxHeight: '380px', overflowY: 'auto',
              }}>
                {photosForActiveDay.map((photo) => {
                  // Find the global index in capturedPhotos for removal
                  const globalIdx = capturedPhotos.indexOf(photo);
                  return (
                    <div key={globalIdx} style={{
                      position: 'relative', borderRadius: '10px', overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)'
                    }}>
                      <img
                        src={photo.dataUrl}
                        alt={`day${activeDay}-shot`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                      />
                      {/* Remove button */}
                      <button
                        onClick={() => removePhoto(globalIdx)}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'rgba(239,68,68,0.85)', border: 'none',
                          borderRadius: '50%', width: '22px', height: '22px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff'
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                      {/* GPS info below photo */}
                      <div style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                        {photo.location ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 600 }}>
                            <MapPin size={11} />
                            <span>
                              Lat: {photo.location.lat.toFixed(5)}, Lng: {photo.location.lng.toFixed(5)}
                            </span>
                          </div>
                        ) : (
                          <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={11} /> ⚠ GPS not available
                          </div>
                        )}
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          🕒 {photo.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit */}
            {totalPhotos > 0 && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-success mt-4"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Upload size={15} />
                {loading ? 'Submitting...' : `Submit ${totalPhotos} Photo(s) to Faculty`}
              </button>
            )}
          </div>
        </div>

        {/* All days summary strip */}
        {numDays > 1 && totalPhotos > 0 && (
          <div style={{
            marginTop: '1.5rem', padding: '0.75rem 1.25rem',
            background: 'var(--bg-secondary)', borderRadius: '10px',
            border: '1px solid var(--border-color)',
            display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Summary:</span>
            {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
              const cnt = capturedPhotos.filter(p => p.day === day).length;
              return (
                <span key={day} style={{
                  fontSize: '0.8rem', padding: '3px 12px', borderRadius: '20px',
                  background: cnt > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.08)',
                  color: cnt > 0 ? '#10b981' : 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  Day {day}: {cnt} photo{cnt !== 1 ? 's' : ''}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVerification;
