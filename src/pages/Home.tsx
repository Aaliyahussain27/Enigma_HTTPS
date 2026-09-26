import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { FileUp, Plus } from 'lucide-react';
import { getEstate, getAssets, getActions, getDocuments } from '../services/api';
import { EstateData, Asset, ActionItem, DocumentItem } from '../types/estate';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [estate, setEstate] = useState<EstateData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [est, asts, acts, docs] = await Promise.all([
          getEstate(),
          getAssets(),
          getActions(),
          getDocuments()
        ]);
        setEstate(est);
        setAssets(asts);
        setActions(acts);
        setDocuments(docs);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  // Calculate metrics
  const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);
  const pendingActions = actions.filter(a => a.status === 'Needs attention').length;
  // Let's assume documents missing means documents required by assets but not in documents list.
  // For MVP, just hardcode based on mock data if present, but since it's empty, it will be 0.
  let docsNeeded = 0;
  assets.forEach(asset => {
    asset.requirements.forEach(req => {
      if (!req.completed) docsNeeded++;
    });
  });

  const isEstateEmpty = assets.length === 0 && actions.length === 0 && documents.length === 0 && !estate?.ownerName;

  if (isEstateEmpty) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your estate</h1>
          <p className="text-xl text-slate-500 font-medium">Nothing added yet</p>
        </div>

        <Card className="p-8 text-center bg-slate-50 border-dashed border-2">
          <p className="text-slate-600 mb-6 text-lg">Upload your documents or add an asset to get started.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/upload')} className="gap-2">
              <FileUp className="w-5 h-5" />
              Upload documents
            </Button>
            <Button variant="outline" className="gap-2">
              <Plus className="w-5 h-5" />
              Add an asset
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(1)}L`; // simple format for MVP
  };

  const activeActions = actions.filter(a => a.status !== 'Done').slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {estate?.ownerName ? `${estate.ownerName}'s Estate` : "Your Estate"}
        </h1>
        <div className="flex items-center gap-4 mb-8">
          <span className="text-2xl font-bold text-teal-700">{estate?.completionPercentage}% organized</span>
          <div className="flex-1 max-w-xs">
            <Progress value={estate?.completionPercentage || 0} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1 font-medium">Assets found</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalAssets)}</p>
          </Card>
          <Card className="p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1 font-medium">Actions pending</p>
            <p className="text-2xl font-bold text-slate-900">{pendingActions}</p>
          </Card>
          <Card className="p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1 font-medium">Documents needed</p>
            <p className="text-2xl font-bold text-slate-900">{docsNeeded}</p>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">What to do next</h2>
        <div className="space-y-4">
          {activeActions.length > 0 ? activeActions.map(action => (
            <Card key={action.id} className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{action.title}</h3>
                <p className="text-slate-600">{action.description}</p>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate(action.assetId ? `/assets/${action.assetId}` : '/actions')}
              >
                {action.status === 'Needs attention' ? 'Start action' : 'Continue'}
              </Button>
            </Card>
          )) : (
            <Card className="p-8 text-center text-slate-500">
              No pending actions right now.
            </Card>
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200">
        {estate?.completionPercentage === 100 ? (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Estate ready to close</h2>
            <Button onClick={() => navigate('/closure')}>Close estate</Button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Estate completion</h2>
            <p className="text-slate-600 mb-4">{pendingActions + docsNeeded} things are still pending.</p>
            <Button variant="secondary" onClick={() => navigate('/closure')}>View pending items</Button>
          </div>
        )}
      </div>
    </div>
  );
};
