import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { explainDocument, getDocuments, DocumentExplanation } from '../services/api';
import { DocumentItem } from '../types/estate';

export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ id: string; data: DocumentExplanation } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocuments().then(setDocuments).finally(() => setLoading(false));
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

  if (loading) return <div className="p-8 text-center text-outline">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Documents</h1>
          <p className="text-lg text-outline">Every uploaded document, linked to the estate information it supports.</p>
        </div>
        <Button onClick={() => navigate('/asset-map')} className="gap-2 shrink-0">
          <span className="material-symbols-outlined text-[16px]">upload</span>
          Upload
        </Button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {documents.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2">
          <span className="material-symbols-outlined mx-auto text-outline mb-4">description</span>
          <p className="text-lg font-medium text-primary">No documents uploaded yet</p>
          <p className="text-outline mt-2 mb-6">Upload statements, policies, or other estate records to begin.</p>
          <Button onClick={() => navigate('/asset-map')}>Upload a document</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <Card key={document.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-xl bg-surface-container p-3 shrink-0">
                    <span className="material-symbols-outlined text-primary-container">description</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-primary truncate">{document.name}</h2>
                    <p className="text-sm text-outline mt-1">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : 'Uploaded'}
                      {document.assetId ? ' • Linked to an asset' : ' • Awaiting asset link'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExplain(document.id)} disabled={explaining === document.id}>
                  {explaining === document.id ? 'Explaining...' : 'Explain'}
                </Button>
              </div>
              {explanation?.id === document.id && (
                <div className="mt-5 rounded-xl bg-background p-4 text-sm text-primary space-y-2">
                  <p><strong>What it is:</strong> {explanation.data.what_it_is}</p>
                  <p><strong>What we found:</strong> {explanation.data.what_we_found.join(', ')}</p>
                  <p><strong>What is missing:</strong> {explanation.data.what_is_missing}</p>
                  <p><strong>Next steps:</strong> {explanation.data.next_steps}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
