import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Status } from '../components/Status';
import { explainDocument, getAssetById, updateActionStatus, completeRequirement, uploadDocument, DocumentExplanation } from '../services/api';
import { Asset } from '../types/estate';

export const AssetDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<{ id: string; data: DocumentExplanation } | null>(null);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (id) {
      getAssetById(id).then(data => {
        setAsset(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-outline">Loading...</div>;
  }

  if (!asset) {
    return (
      <div className="max-w-2xl mx-auto pt-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Asset not found</h2>
        <Button onClick={() => navigate('/assets')}>Back to Assets</Button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `₹${(amount / 100000).toFixed(1)}L`;

  const handleContinue = async () => {
    // Demo progression
    if (asset.status === 'Action needed') {
      await updateActionStatus(asset.id, 'In progress');
      // Also update local state for fast UI
      setAsset({ ...asset, status: 'In progress' });
    }
  };

  const handleCompleteReq = async (reqId: string, currentStatus: boolean) => {
    await completeRequirement(asset.id, reqId, !currentStatus);
    setAsset({
      ...asset,
      requirements: asset.requirements.map(r => r.id === reqId ? { ...r, completed: !currentStatus } : r)
    });
  };

  const handleExplain = async (documentId: string) => {
    setExplaining(documentId);
    try {
      setExplanation({ id: documentId, data: await explainDocument(documentId) });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to explain this document.');
    } finally {
      setExplaining(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-outline hover:text-primary mb-8 transition-colors font-medium"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back
      </button>

      <div className="mb-10">
        <h1 className="text-4xl font-bold text-primary mb-4">{asset.provider}</h1>
        <div className="flex items-center gap-4">
          <Status status={asset.status} />
          <span className="text-xl font-bold text-primary">{formatCurrency(asset.amount)}</span>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold text-primary mb-4">What we know</h2>
          <Card className="p-6">
            <ul className="space-y-4">
              {asset.knowledge.map((k, i) => (
                <li key={i} className="text-primary text-lg">{k}</li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-4">What you need</h2>
          <Card className="p-6">
            <ul className="space-y-4">
              {asset.requirements.map(req => (
                <li key={req.id} className="flex items-center gap-3">
                  <button 
                    onClick={() => handleCompleteReq(req.id, req.completed)}
                    className="mt-0.5 shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {req.completed ? (
                      <span className="material-symbols-outlined text-primary">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[24px] text-outline">radio_button_unchecked</span>
                    )}
                  </button>
                  <span className={`text-lg ${req.completed ? 'text-outline line-through' : 'text-primary'}`}>
                    {req.name}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-4">Documents</h2>
          <Card className="divide-y divide-outline/20">
            {asset.documents.length > 0 ? asset.documents.map(doc => (
              <div key={doc.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary shrink-0">check</span>
                    <span className="font-medium text-primary truncate">{doc.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleExplain(doc.id)} disabled={explaining === doc.id}>
                    {explaining === doc.id ? 'Explaining...' : 'Explain'}
                  </Button>
                </div>
                {explanation?.id === doc.id && (
                  <div className="mt-4 rounded-xl bg-background p-4 text-sm text-primary space-y-2">
                    <p><strong>What it is:</strong> {explanation.data.what_it_is}</p>
                    <p><strong>What we found:</strong> {explanation.data.what_we_found.join(', ')}</p>
                    <p><strong>What is missing:</strong> {explanation.data.what_is_missing}</p>
                    <p><strong>Next steps:</strong> {explanation.data.next_steps}</p>
                  </div>
                )}
              </div>
            )) : (
              <div className="p-4 text-outline">No documents found for this asset.</div>
            )}
            {asset.requirements.some(r => !r.completed) && (
              <div className="p-4 bg-background">
                <input 
                  type="file" 
                  id="inline-upload" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        await uploadDocument(file);
                        const refreshedAsset = await getAssetById(asset.id);
                        setAsset(refreshedAsset || asset);
                        setUploadError('');
                      } catch (err) {
                        setUploadError(err instanceof Error ? err.message : 'Upload failed.');
                      }
                    }
                  }} 
                />
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => document.getElementById('inline-upload')?.click()}
                >
                  Upload missing document
                </Button>
              </div>
            )}
            {uploadError && <p className="px-4 pb-4 text-sm text-error">{uploadError}</p>}
          </Card>
        </section>
      </div>

      <div className="mt-12 flex gap-4">
        <Button onClick={handleContinue} className="flex-1">Continue claim</Button>
      </div>
    </div>
  );
};
