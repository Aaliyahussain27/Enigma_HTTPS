import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EstateSetup() {
  const [deceasedName, setDeceasedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('jwt');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/estates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deceased_name: deceasedName,
          pathway_used: 'asset_guide' // default pathway
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create estate');
      }

      const data = await res.json();
      localStorage.setItem('current_estate_id', data.id);
      
      // Redirect to the upload/asset-guide flow
      navigate('/upload');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-900">Set Up Estate</h2>
        {error && <div className="mb-4 text-sm text-red-600 text-center">{error}</div>}
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Deceased Person's Name</label>
            <input required type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:border-teal-500 focus:ring-teal-500" placeholder="e.g. John Doe" />
          </div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors">
            {loading ? 'Setting up...' : 'Create Estate'}
          </button>
        </form>
      </div>
    </div>
  );
}
