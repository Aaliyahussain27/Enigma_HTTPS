import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { explainDocument, getDocuments, DocumentExplanation } from '../services/api';
import { DocumentItem } from '../types/estate';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { icon: string; label: string; color: string; bg: string }> = {
    processing: { icon: 'hourglass_top', label: 'Processing…', color: '#863b00', bg: '#fdeee3' },
    completed:  { icon: 'check_circle',  label: 'Completed',   color: '#005c55', bg: '#e8f5f4' },
    failed:     { icon: 'error',         label: 'Failed',      color: '#ba1a1a', bg: '#fde8e8' },
    Uploaded:   { icon: 'check_circle',  label: 'Uploaded',    color: '#005c55', bg: '#e8f5f4' },
  };
  const s = map[status] ?? { icon: 'info', label: status, color: '#6e7977', bg: '#f0f3ff' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 99,
      background: s.bg,
      color: s.color,
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 12,
    }}>
      <span className="material-symbols-outlined sm" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
      {s.label}
    </span>
  );
};

const Spinner: React.FC = () => (
  <span className="material-symbols-outlined" style={{
    fontSize: 20,
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
    color: 'var(--color-primary)',
  }}>progress_activity</span>
);


export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ id: string; data: DocumentExplanation } | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocs = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    pollRef.current = setInterval(async () => {
      const docs = await getDocuments();
      setDocuments(docs);
      const stillProcessing = docs.some((d) => d.status === 'processing');
      if (!stillProcessing && pollRef.current) {
        clearInterval(pollRef.current);
      }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleExplain = async (documentId: string) => {
    setExplaining(documentId);
    setError('');
    try {
      setExplanation({ id: documentId, data: await explainDocument(documentId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to explain this document.');
    } finally {
      setExplaining(null);
    }
  };

  const card: React.CSSProperties = {
    background: 'var(--color-surface-lowest)',
    border: '1px solid #dde3ea',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
  };
  const btn = (variant: 'primary' | 'outline'): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    border: variant === 'outline' ? '1.5px solid #dde3ea' : 'none',
    background: variant === 'primary' ? 'var(--color-primary)' : 'transparent',
    color: variant === 'primary' ? '#fff' : '#1a1c1e',
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  });

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spinner />
        <p style={{ marginTop: 12, fontFamily: 'var(--font-body)', color: '#6e7977' }}>Loading documents…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: '#1a1c1e', marginBottom: 6 }}>
            Documents
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', color: '#4a4e54', fontSize: 15 }}>
            Every uploaded document, linked to the estate information it supports.
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          id="upload-document-btn"
          style={btn('primary')}
        >
          <span className="material-symbols-outlined sm">upload_file</span>
          Upload
        </button>
      </div>

      {/* Global error */}
      {error && (
        <div style={{ ...card, background: '#fde8e8', border: '1px solid #f5b8b8', marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-body)', color: '#ba1a1a', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', border: '2px dashed #dde3ea', padding: 48 }}>
          <span className="material-symbols-outlined xl" style={{ color: '#c4c7c5', fontVariationSettings: "'FILL' 1" }}>description</span>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, color: '#1a1c1e', marginTop: 16, marginBottom: 6 }}>
            No documents uploaded yet
          </p>
          <p style={{ fontFamily: 'var(--font-body)', color: '#6e7977', marginBottom: 24 }}>
            Upload statements, policies, or other estate records to begin.
          </p>
          <button onClick={() => navigate('/upload')} style={btn('primary')}>
            <span className="material-symbols-outlined sm">upload_file</span>
            Upload a document
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {documents.map((doc) => (
            <div key={doc.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                {/* Icon + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: doc.status === 'failed' ? '#fde8e8' : '#e8f5f4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {doc.status === 'processing' ? (
                      <Spinner />
                    ) : (
                      <span className="material-symbols-outlined" style={{
                        color: doc.status === 'failed' ? '#ba1a1a' : 'var(--color-primary)',
                        fontVariationSettings: "'FILL' 1",
                        fontSize: 22,
                      }}>
                        {doc.status === 'failed' ? 'error' : 'description'}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 600,
                      fontSize: 15,
                      color: '#1a1c1e',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }}>
                      {doc.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={doc.status} />
                      {doc.uploadedAt && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#6e7977' }}>
                          {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {/* Failed error message */}
                    {doc.status === 'failed' && (doc as any).processing_error && (
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#ba1a1a', marginTop: 4 }}>
                        {(doc as any).processing_error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Explain button — only if completed */}
                {doc.status === 'completed' && (
                  <button
                    onClick={() => handleExplain(doc.id)}
                    disabled={explaining === doc.id}
                    style={{
                      ...btn('outline'),
                      flexShrink: 0,
                      opacity: explaining === doc.id ? 0.6 : 1,
                    }}
                  >
                    {explaining === doc.id ? (
                      <><Spinner /> Explaining…</>
                    ) : (
                      <><span className="material-symbols-outlined sm">auto_awesome</span>Explain</>
                    )}
                  </button>
                )}
              </div>

              {/* Explanation panel */}
              {explanation?.id === doc.id && (
                <div style={{
                  marginTop: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-low)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {[
                    { label: 'What it is', value: explanation.data.what_it_is },
                    { label: 'What we found', value: explanation.data.what_we_found.join(', ') },
                    { label: 'What is missing', value: explanation.data.what_is_missing },
                    { label: 'Next steps', value: explanation.data.next_steps },
                  ].map(({ label, value }) => (
                    <p key={label} style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#1a1c1e', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{label}:</strong>{' '}{value}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (min-width: 768px) { .sidebar-desktop { display: flex !important; } .nav-mobile { display: none !important; } }`}</style>
    </div>
  );
};
