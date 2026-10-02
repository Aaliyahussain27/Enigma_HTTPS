import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export default function EstateSetup() {
  const [estates, setEstates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deceasedName, setDeceasedName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEstates = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return navigate('/login');
      
      try {
        const res = await fetch('http://localhost:8000/estates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEstates(data);
          if (data.length === 0) setShowCreate(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEstates();
  }, [navigate]);

  const selectEstate = (estateId: string) => {
    localStorage.setItem('current_estate_id', estateId);
    navigate('/asset-map');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const token = localStorage.getItem('jwt');
    if (!token) return navigate('/login');

    try {
      const res = await fetch('http://localhost:8000/estates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deceased_name: deceasedName,
          pathway_used: 'asset_guide'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create estate');
      }

      const data = await res.json();
      localStorage.setItem('current_estate_id', data.id);
      navigate('/asset-map');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-outline">Loading...</div>;

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">Select Your Estate</h1>
        
        {!showCreate && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-medium text-primary">Existing Estates</h2>
            {estates.map(estate => (
              <Card key={estate.id} className="p-5 flex items-center justify-between hover:border-primary-container cursor-pointer transition-colors" onClick={() => selectEstate(estate.id)}>
                <div>
                  <h3 className="font-bold text-primary text-lg">{estate.deceased_name || 'Unnamed Estate'}</h3>
                  <p className="text-sm text-outline capitalize">Role: {estate.role}</p>
                </div>
                <div className="flex items-center text-primary-container font-medium">
                  Continue <span className="material-symbols-outlined ml-2">arrow_forward</span>
                </div>
              </Card>
            ))}
            
            <Button variant="outline" className="w-full mt-6 py-6 border-dashed" onClick={() => setShowCreate(true)}>
              <span className="material-symbols-outlined mr-2">add</span> Create New Estate
            </Button>
          </div>
        )}

        {showCreate && (
          <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">Create New Estate</h2>
              {estates.length > 0 && (
                <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-outline hover:text-primary">Cancel</button>
              )}
            </div>
            {error && <div className="mb-4 text-sm text-error text-center">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Deceased Person's Name</label>
                <input required type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} className="mt-1 block w-full rounded-md border border-outline/30 shadow-sm p-3 focus:border-primary-container focus:ring-primary" placeholder="e.g. John Doe" />
              </div>
              <button type="submit" disabled={creating} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-on-primary bg-primary-container hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors">
                {creating ? 'Setting up...' : 'Create Estate'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
