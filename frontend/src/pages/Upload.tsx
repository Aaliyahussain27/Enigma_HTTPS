import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../services/api';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      await uploadDocument(files);
      // Home polls while the background Gemini analysis completes.
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const btn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-primary)',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 24 }}>
        Upload documents
      </h1>

      {error && (
        <div
          style={{
            background: '#fde8e8',
            border: '1px solid #f5b8b8',
            padding: 12,
            marginBottom: 16,
          }}
        >
          <p style={{ color: '#ba1a1a', margin: 0 }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={e => setFiles(Array.from(e.target.files ?? []))}
          multiple
          required
          style={{ marginBottom: 16 }}
        />
        {files.length > 0 && (
          <p style={{ margin: '0 0 16px', color: 'var(--color-outline)' }}>
            {files.length} document{files.length === 1 ? '' : 's'} selected
          </p>
        )}
        <button type="submit" disabled={uploading} style={btn}>
          {uploading ? (
            <>
              <span
                className="material-symbols-outlined sm"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
              Uploading…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined sm">upload_file</span>
              Upload
            </>
          )}
        </button>
      </form>
    </div>
  );
};
