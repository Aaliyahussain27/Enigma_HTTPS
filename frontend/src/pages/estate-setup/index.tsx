import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Plus, ArrowRight } from 'lucide-react';

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
    navigate('/upload');
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
      navigate('/upload');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">Select Your Estate</h1>
        
        {!showCreate && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-medium text-slate-700">Existing Estates</h2>
            {estates.map(estate => (
              <Card key={estate.id} className="p-5 flex items-center justify-between hover:border-teal-500 cursor-pointer transition-colors" onClick={() => selectEstate(estate.id)}>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{estate.deceased_name || 'Unnamed Estate'}</h3>
                  <p className="text-sm text-slate-500 capitalize">Role: {estate.role}</p>
                </div>
                <div className="flex items-center text-teal-700 font-medium">
                  Continue <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </Card>
            ))}
            
            <Button variant="outline" className="w-full mt-6 py-6 border-dashed" onClick={() => setShowCreate(true)}>
              <Plus className="w-5 h-5 mr-2" /> Create New Estate
            </Button>
          </div>
        )}

        {showCreate && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Create New Estate</h2>
              {estates.length > 0 && (
                <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 hover:text-slate-900">Cancel</button>
              )}
            </div>
            {error && <div className="mb-4 text-sm text-red-600 text-center">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deceased Person's Name</label>
                <input required type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:border-teal-500 focus:ring-teal-500" placeholder="e.g. John Doe" />
              </div>
              <button type="submit" disabled={creating} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors">
                {creating ? 'Setting up...' : 'Create Estate'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
