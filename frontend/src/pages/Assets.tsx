import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Plus } from 'lucide-react';
import { getAssets } from '../services/api';
import { Asset } from '../types/estate';

export const Assets: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssets().then(data => {
      setAssets(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (assets.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Assets</h1>
          <p className="text-xl text-slate-500 font-medium">No assets added yet</p>
        </div>

        <Card className="p-8 text-center bg-slate-50 border-dashed border-2">
          <p className="text-slate-600 mb-6 text-lg">Your financial assets will appear here once you add them.</p>
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            Add an asset
          </Button>
        </Card>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(1)}L`; // simple format for MVP
  };

  // Group assets by category for simplicity (MVP)
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Assets</h1>
        <Button variant="outline" className="gap-2 h-10 px-4">
          <Plus className="w-4 h-4" />
          Add asset
        </Button>
      </div>

      <div className="space-y-4">
        {assets.map(asset => (
          <Card 
            key={asset.id} 
            hoverable 
            onClick={() => navigate(`/assets/${asset.id}`)}
            className="p-5 flex items-center justify-between group"
          >
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{asset.category}</p>
              <h3 className="font-bold text-slate-900 text-lg">{asset.provider}</h3>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900 text-xl">{formatCurrency(asset.amount)}</p>
              <p className="text-sm font-medium text-slate-500">{asset.status}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
