import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getEstate } from '../services/api';
import { EstateData } from '../types/estate';

export const Closure: React.FC = () => {
  const navigate = useNavigate();
  const [estate, setEstate] = useState<EstateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEstate().then(data => {
      setEstate(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  const isReady = estate?.completionPercentage === 100;

  return (
    <div className="max-w-2xl mx-auto pt-8 text-center">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        {isReady ? 'Estate ready to close' : 'Estate not ready to close'}
      </h1>
      
      <Card className="p-8 mt-8">
        <p className="text-lg text-slate-600 mb-8">
          {isReady 
            ? "You have completed all necessary actions to settle this estate." 
            : "Complete the required actions before closing this estate."}
        </p>

        {isReady ? (
          <Button className="w-full">Close estate</Button>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => navigate('/actions')}>
            View pending actions
          </Button>
        )}
      </Card>
    </div>
  );
};
