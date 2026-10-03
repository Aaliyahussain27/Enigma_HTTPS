import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { cancelEstateDeletion, closeEstate, deleteEstateNow, getClosureState, rescheduleEstateDeletion, scheduleEstateDeletion, ClosureState } from '../services/api';

export const Closure: React.FC = () => {
  const navigate = useNavigate();
  const [estate, setEstate] = useState<ClosureState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  });
  const [confirmText, setConfirmText] = useState('');
  const [deletionBusy, setDeletionBusy] = useState(false);

  useEffect(() => {
    getClosureState().then(data => {
      setEstate(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-outline)' }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 20, animation: 'spin 1s linear infinite', display: 'inline-block', color: 'var(--color-primary)',
        }}>progress_activity</span>
        <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading...</p>
      </div>
    );
  }

  const isReady = estate?.ready === true;

  const handleClose = async () => {
    setClosing(true);
    setError('');
    try {
      setEstate(await closeEstate());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Estate could not be closed');
    } finally {
      setClosing(false);
    }
  };

  const handleSchedule = async () => {
    setDeletionBusy(true);
    setError('');
    try {
      const schedule = estate?.schedule
        ? await rescheduleEstateDeletion(`${scheduledFor}T00:00:00Z`, confirmText)
        : await scheduleEstateDeletion(`${scheduledFor}T00:00:00Z`, confirmText);
      setEstate(current => current ? { ...current, status: 'closing', schedule } : current);
      setConfirmText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to schedule deletion');
    } finally {
      setDeletionBusy(false);
    }
  };

  const handleCancelSchedule = async () => {
    setDeletionBusy(true);
    setError('');
    try {
      await cancelEstateDeletion();
      setEstate(current => current ? { ...current, status: 'active', schedule: null } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel deletion');
    } finally {
      setDeletionBusy(false);
    }
  };

  const handleDeleteNow = async () => {
    setDeletionBusy(true);
    setError('');
    try {
      await deleteEstateNow(confirmText);
      localStorage.removeItem('current_estate_id');
      navigate('/estate-setup', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete estate');
      setDeletionBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 32, textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
        {isReady ? 'Estate ready to close' : 'Estate not ready to close'}
      </h1>
      
      <Card style={{ padding: 32, marginTop: 32 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--color-outline)', marginBottom: 32 }}>
          {isReady 
            ? "You have completed all necessary actions to settle this estate." 
            : `Complete ${estate?.pending_actions || 0} actions and ${estate?.pending_documents || 0} required documents before closing this estate.`}
        </p>
        {error && <p style={{ marginBottom: 24, fontSize: 14, color: 'var(--color-error)' }}>{error}</p>}

        {isReady ? (
          <Button style={{ width: '100%', justifyContent: 'center' }} onClick={handleClose} disabled={closing || estate?.status === 'closed'}>
            {estate?.status === 'closed' ? 'Estate closed' : closing ? 'Closing estate...' : 'Close estate'}
          </Button>
        ) : (
          <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/actions')}>
            View pending actions
          </Button>
        )}
      </Card>

      <Card style={{ padding: 32, marginTop: 32, textAlign: 'left', border: '1px solid #fcd34d' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete estate data</h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginTop: 8 }}>This permanently removes the estate's documents, assets, requirements, and memberships. Type DELETE to confirm.</p>
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
            Deletion date
            <input 
              type="date" 
              min={scheduledFor} 
              value={scheduledFor} 
              onChange={event => setScheduledFor(event.target.value)} 
              disabled={deletionBusy} 
              style={{ display: 'block', width: '100%', marginTop: 4, borderRadius: 'var(--radius-md)', border: '1.5px solid #dde3ea', padding: '12px', fontFamily: 'var(--font-body)' }}
            />
          </label>
          <input 
            value={confirmText} 
            onChange={event => setConfirmText(event.target.value)} 
            placeholder="Type DELETE" 
            disabled={deletionBusy} 
            style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid #dde3ea', padding: '12px', fontFamily: 'var(--font-body)' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Button variant="outline" onClick={handleSchedule} disabled={deletionBusy || confirmText !== 'DELETE'}>
              {estate?.schedule ? 'Reschedule deletion' : 'Schedule deletion'}
            </Button>
            {estate?.schedule?.status === 'scheduled' && (
              <Button variant="secondary" onClick={handleCancelSchedule} disabled={deletionBusy}>Cancel schedule</Button>
            )}
            <Button variant="secondary" onClick={handleDeleteNow} disabled={deletionBusy || confirmText !== 'DELETE'}>Delete now</Button>
          </div>
          {estate?.schedule?.status === 'scheduled' && (
            <p style={{ fontSize: 14, color: '#b45309' }}>Scheduled for {new Date(estate.schedule.scheduled_for).toLocaleString()}.</p>
          )}
        </div>
      </Card>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
