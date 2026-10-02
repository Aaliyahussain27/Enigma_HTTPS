import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
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
    return <div className="p-8 text-center text-outline">Loading...</div>;
  }

  if (assets.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Assets</h1>
          <p className="text-xl text-outline font-medium">No assets added yet</p>
        </div>

        <Card className="p-8 text-center bg-background border-dashed border-2">
          <p className="text-outline mb-6 text-lg">Your financial assets will appear here once you add them.</p>
          <Button className="gap-2">
            <span className="material-symbols-outlined">add</span>
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
        <h1 className="text-3xl font-bold text-primary">Assets</h1>
        <Button variant="outline" className="gap-2 h-10 px-4">
          <span className="material-symbols-outlined">add</span>
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
              <p className="text-sm font-medium text-outline mb-1">{asset.category}</p>
              <h3 className="font-bold text-primary text-lg">{asset.provider}</h3>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-xl">{formatCurrency(asset.amount)}</p>
              <p className="text-sm font-medium text-outline">{asset.status}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
