import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Upload, Save, Type, Palette, Move, Eye } from 'lucide-react';

function CertificateEditor({ eventId }) {
  const [template, setTemplate] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [displayScale, setDisplayScale] = useState(1);

  const [config, setConfig] = useState({
    name_x: 50,
    name_y: 50,
    name_width: 400,
    name_height: 60,
    font_size: 36,
    font_color: '#000000',
    font_family: 'Arial',
  });

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    fetchTemplate();
  }, [eventId]);

  const fetchTemplate = async () => {
    try {
      const res = await api.get(`/events/${eventId}/certificates/template`);
      if (res.data.template) {
        setTemplate(res.data.template);
        setImageUrl(`http://localhost:5000${res.data.template.image_url}`);
        setConfig({
          name_x: res.data.template.name_x || 50,
          name_y: res.data.template.name_y || 50,
          name_width: res.data.template.name_width || 400,
          name_height: res.data.template.name_height || 60,
          font_size: res.data.template.font_size || 36,
          font_color: res.data.template.font_color || '#000000',
          font_family: res.data.template.font_family || 'Arial',
        });
      }
    } catch (err) {
      console.error('Failed to fetch template:', err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('template_image', file);

    try {
      const res = await api.post(`/events/${eventId}/certificates/template`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(`http://localhost:5000${res.data.image_url}`);
      setMessage('Template uploaded successfully!');
      fetchTemplate();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put(`/events/${eventId}/certificates/template`, config);
      setMessage('Configuration saved!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImageLoad = () => {
    if (imgRef.current && containerRef.current) {
      const imgNaturalW = imgRef.current.naturalWidth;
      const imgNaturalH = imgRef.current.naturalHeight;
      const displayW = imgRef.current.clientWidth;
      const displayH = imgRef.current.clientHeight;
      setImgDimensions({ width: imgNaturalW, height: imgNaturalH });
      setDisplayScale(displayW / imgNaturalW);
    }
  };

  // Drag handling for name region
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragStart.x) / displayScale;
    const dy = (e.clientY - dragStart.y) / displayScale;
    setConfig((prev) => ({
      ...prev,
      name_x: Math.max(0, Math.round(prev.name_x + dx)),
      name_y: Math.max(0, Math.round(prev.name_y + dy)),
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [dragging, dragStart, displayScale]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div>
      {message && (
        <div className={`alert ${message.includes('fail') || message.includes('error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* Upload Zone */}
      {!imageUrl ? (
        <label className="upload-zone" style={{ display: 'block', cursor: 'pointer' }}>
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          <Upload size={40} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>
            {uploading ? 'Uploading...' : 'Click to upload certificate template'}
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>PNG, JPG, or WebP — max 10MB</p>
        </label>
      ) : (
        <>
          {/* Image Preview with Draggable Name Region */}
          <div
            ref={containerRef}
            className="cert-editor"
            style={{ position: 'relative', marginBottom: '1rem' }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Certificate Template"
              onLoad={handleImageLoad}
              style={{ width: '100%', display: 'block' }}
              draggable={false}
            />
            {/* Name region overlay */}
            <div
              className={`cert-name-region ${dragging ? 'dragging' : ''}`}
              style={{
                left: `${config.name_x * displayScale}px`,
                top: `${config.name_y * displayScale}px`,
                width: `${config.name_width * displayScale}px`,
                height: `${config.name_height * displayScale}px`,
                fontSize: `${config.font_size * displayScale}px`,
                color: config.font_color,
                fontFamily: config.font_family,
              }}
              onMouseDown={handleMouseDown}
            >
              <Move size={14} style={{ marginRight: '0.5rem', opacity: 0.5 }} />
              Sample Name
            </div>
          </div>

          {/* Re-upload */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Replace Image
              <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Controls */}
          <div className="cert-controls">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label><Move size={12} /> X Position</label>
              <input
                type="number"
                value={config.name_x}
                onChange={(e) => setConfig({ ...config, name_x: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label><Move size={12} /> Y Position</label>
              <input
                type="number"
                value={config.name_y}
                onChange={(e) => setConfig({ ...config, name_y: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Width</label>
              <input
                type="number"
                value={config.name_width}
                onChange={(e) => setConfig({ ...config, name_width: parseInt(e.target.value) || 100 })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Height</label>
              <input
                type="number"
                value={config.name_height}
                onChange={(e) => setConfig({ ...config, name_height: parseInt(e.target.value) || 40 })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label><Type size={12} /> Font Size</label>
              <input
                type="number"
                value={config.font_size}
                onChange={(e) => setConfig({ ...config, font_size: parseInt(e.target.value) || 24 })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label><Palette size={12} /> Font Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={config.font_color}
                  onChange={(e) => setConfig({ ...config, font_color: e.target.value })}
                  style={{ width: '50px', height: '38px', padding: '2px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={config.font_color}
                  onChange={(e) => setConfig({ ...config, font_color: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Font Family</label>
              <select
                value={config.font_family}
                onChange={(e) => setConfig({ ...config, font_family: e.target.value })}
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary btn-lg" onClick={handleSaveConfig} disabled={saving} style={{ flex: 1 }}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Template Config'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CertificateEditor;
