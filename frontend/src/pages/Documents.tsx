import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload as UploadIcon } from 'lucide-react';
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Documents</h1>
          <p className="text-lg text-slate-600">Every uploaded document, linked to the estate information it supports.</p>
        </div>
        <Button onClick={() => navigate('/upload')} className="gap-2 shrink-0">
          <UploadIcon className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {documents.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2">
          <FileText className="mx-auto h-10 w-10 text-slate-300 mb-4" />
          <p className="text-lg font-medium text-slate-900">No documents uploaded yet</p>
          <p className="text-slate-600 mt-2 mb-6">Upload statements, policies, or other estate records to begin.</p>
          <Button onClick={() => navigate('/upload')}>Upload a document</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <Card key={document.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-xl bg-teal-50 p-3 shrink-0">
                    <FileText className="h-5 w-5 text-teal-700" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 truncate">{document.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">
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
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
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
