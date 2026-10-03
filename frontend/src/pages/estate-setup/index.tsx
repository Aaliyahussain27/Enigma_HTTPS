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

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-outline)' }}>
      <span className="material-symbols-outlined" style={{
        fontSize: 20, animation: 'spin 1s linear infinite', display: 'inline-block', color: 'var(--color-primary)'
      }}>progress_activity</span>
      <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading estates...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 512 }}>
        <h1 style={{ fontSize: 32, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1a1c1e', marginBottom: 32, textAlign: 'center' }}>
          Select Your Estate
        </h1>
        
        {!showCreate && (
          <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-heading)', fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>Existing Estates</h2>
            {estates.map(estate => (
              <Card 
                key={estate.id} 
                hoverable 
                onClick={() => selectEstate(estate.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, cursor: 'pointer' }}
              >
                <div>
                  <h3 style={{ fontSize: 18, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1a1c1e', margin: 0 }}>
                    {estate.deceased_name || 'Unnamed Estate'}
                  </h3>
                  <p style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-outline)', margin: '4px 0 0 0', textTransform: 'capitalize' }}>
                    Role: {estate.role}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  Continue <ArrowRight size={20} style={{ marginLeft: 8 }} />
                </div>
              </Card>
            ))}
            
            <Button variant="outline" onClick={() => setShowCreate(true)} style={{ width: '100%', marginTop: 24, padding: 24, borderStyle: 'dashed', justifyContent: 'center' }}>
              <Plus size={20} style={{ marginRight: 8 }} /> Create New Estate
            </Button>
          </div>
        )}

        {showCreate && (
          <div style={{ background: 'var(--color-surface-lowest)', padding: 32, borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontFamily: 'var(--font-heading)', fontWeight: 700, margin: 0 }}>Create New Estate</h2>
              {estates.length > 0 && (
                <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-outline)', cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
            
            {error && <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--color-error)', textAlign: 'center', background: '#fde8e8', padding: 10, borderRadius: 'var(--radius-sm)' }}>{error}</div>}
            
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500, marginBottom: 8, color: 'var(--color-on-surface-variant)' }}>Deceased Person's Name</label>
                <input required type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} placeholder="e.g. John Doe" style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 16 }} />
              </div>
              <Button type="submit" disabled={creating} style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: 16 }}>
                {creating ? 'Setting up...' : 'Create Estate'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
