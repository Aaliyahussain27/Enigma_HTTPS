import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Status } from '../components/Status';
import { ArrowLeft, Check, Circle } from 'lucide-react';
import { explainAction, explainDocument, getActionById, getAssetById, updateActionStatus, completeRequirement, uploadDocument, DocumentExplanation } from '../services/api';
import { ActionExplanation, Asset } from '../types/estate';

export const AssetDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<{ id: string; data: DocumentExplanation } | null>(null);
  const [actionExplanation, setActionExplanation] = useState<ActionExplanation | null>(null);
  const [explainingAction, setExplainingAction] = useState(false);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (id) {
      Promise.all([getAssetById(id), getActionById(id)]).then(([assetData, actionData]) => {
        const data = assetData || actionData;
        setAsset(data || null);
        if (actionData) {
          const cached = localStorage.getItem(`action-explanation:${actionData.id}`);
          if (cached) {
            try {
              setActionExplanation(JSON.parse(cached) as ActionExplanation);
            } catch {
              localStorage.removeItem(`action-explanation:${actionData.id}`);
            }
          }
        }
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
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
    if (asset.status === 'Action needed') {
      await updateActionStatus(asset.id, 'In progress');
      setAsset({ ...asset, status: 'In progress' });
    } else if (asset.status === 'In progress') {
      await updateActionStatus(asset.id, 'Done');
      setAsset({ ...asset, status: 'Done' });
    }
  };

  const isAction = asset.category === 'action_item';

  const handleExplainAction = async () => {
    const cacheKey = `action-explanation:${asset.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setActionExplanation(JSON.parse(cached) as ActionExplanation);
      return;
    }
    setExplainingAction(true);
    try {
      const data = await explainAction(asset.id);
      localStorage.setItem(cacheKey, JSON.stringify(data));
      setActionExplanation(data);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to explain this action.');
    } finally {
      setExplainingAction(false);
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
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{asset.provider}</h1>
        <div className="flex items-center gap-4">
          <Status status={asset.status} />
          {!isAction && <span className="text-xl font-bold text-slate-900">{formatCurrency(asset.amount)}</span>}
        </div>
      </div>

      {isAction ? (
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Action guidance</h2>
          <Card className="p-6">
            {actionExplanation ? (
              <div className="space-y-5 text-slate-700">
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">What we know</h3>
                  <ul className="list-disc pl-5 space-y-1">{actionExplanation.what_we_know.map((item, index) => <li key={index}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Documents needed</h3>
                  <ul className="list-disc pl-5 space-y-1">{actionExplanation.documents_needed.map((item, index) => <li key={index}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">What to do</h3>
                  <p>{actionExplanation.what_to_do}</p>
                </div>
              </div>
            ) : (
              <Button onClick={handleExplainAction} disabled={explainingAction}>
                {explainingAction ? 'Explaining...' : 'Explain'}
              </Button>
            )}
          </Card>
        </section>
      ) : (
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">What we know</h2>
          <Card className="p-6">
            <ul className="space-y-4">
              {asset.knowledge.map((k, i) => (
                <li key={i} className="text-slate-700 text-lg">{k}</li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">What you need</h2>
          <Card className="p-6">
            <ul className="space-y-4">
              {asset.requirements.map(req => (
                <li key={req.id} className="flex items-center gap-3">
                  <button 
                    onClick={() => handleCompleteReq(req.id, req.completed)}
                    className="mt-0.5 shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {req.completed ? (
                      <Check className="w-6 h-6 text-teal-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300" />
                    )}
                  </button>
                  <span className={`text-lg ${req.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {req.name}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Documents</h2>
          <Card className="divide-y divide-slate-100">
            {asset.documents.length > 0 ? asset.documents.map(doc => (
              <div key={doc.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Check className="w-5 h-5 text-teal-600 shrink-0" />
                    <span className="font-medium text-slate-900 truncate">{doc.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleExplain(doc.id)} disabled={explaining === doc.id}>
                    {explaining === doc.id ? 'Explaining...' : 'Explain'}
                  </Button>
                </div>
                {explanation?.id === doc.id && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
                    <p><strong>What it is:</strong> {explanation.data.what_it_is}</p>
                    <p><strong>What we found:</strong> {explanation.data.what_we_found.join(', ')}</p>
                    <p><strong>What is missing:</strong> {explanation.data.what_is_missing}</p>
                    <p><strong>Next steps:</strong> {explanation.data.next_steps}</p>
                  </div>
                )}
              </div>
            )) : (
              <div className="p-4 text-slate-500">No documents found for this asset.</div>
            )}
            {asset.requirements.some(r => !r.completed) && (
              <div className="p-4 bg-slate-50">
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
            {uploadError && <p className="px-4 pb-4 text-sm text-red-600">{uploadError}</p>}
          </Card>
        </section>
      </div>
      )}

      <div className="mt-12 flex gap-4">
        <Button onClick={handleContinue} className="flex-1" disabled={asset.status === 'Done'}>
          {asset.status === 'Action needed' ? 'Start' : asset.status === 'In progress' ? 'Finish task' : 'Task complete'}
        </Button>
      </div>
    </div>
  );
};
