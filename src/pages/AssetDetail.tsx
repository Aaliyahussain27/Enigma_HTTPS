import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Status } from '../components/Status';
import { ArrowLeft, Check, Circle } from 'lucide-react';
import { getAssetById, updateActionStatus, completeRequirement } from '../services/api';
import { Asset } from '../types/estate';

export const AssetDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getAssetById(id).then(data => {
        setAsset(data || null);
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
    // Demo progression
    if (asset.status === 'Action needed') {
      await updateActionStatus(asset.id, 'In progress');
      // Also update local state for fast UI
      setAsset({ ...asset, status: 'In progress' });
    }
  };

  const handleCompleteReq = async (reqId: string) => {
    await completeRequirement(asset.id, reqId);
    setAsset({
      ...asset,
      requirements: asset.requirements.map(r => r.id === reqId ? { ...r, completed: true } : r)
    });
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
          <span className="text-xl font-bold text-slate-900">{formatCurrency(asset.amount)}</span>
        </div>
      </div>

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
                    onClick={() => handleCompleteReq(req.id)}
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
              <div key={doc.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-teal-600" />
                  <span className="font-medium text-slate-900">{doc.name}</span>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            )) : (
              <div className="p-4 text-slate-500">No documents found for this asset.</div>
            )}
            {asset.requirements.some(r => !r.completed) && (
              <div className="p-4 bg-slate-50">
                <Button variant="outline" className="w-full" onClick={() => navigate('/upload')}>
                  Upload missing document
                </Button>
              </div>
            )}
          </Card>
        </section>
      </div>

      <div className="mt-12 flex gap-4">
        <Button onClick={handleContinue} className="flex-1">Continue claim</Button>
      </div>
    </div>
  );
};
