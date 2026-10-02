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
    return <div className="p-8 text-center text-outline">Loading...</div>;
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
    <div className="max-w-2xl mx-auto pt-8 text-center">
      <h1 className="text-3xl font-bold text-primary mb-4">
        {isReady ? 'Estate ready to close' : 'Estate not ready to close'}
      </h1>
      
      <Card className="p-8 mt-8">
        <p className="text-lg text-outline mb-8">
          {isReady 
            ? "You have completed all necessary actions to settle this estate." 
            : `Complete ${estate?.pending_actions || 0} actions and ${estate?.pending_documents || 0} required documents before closing this estate.`}
        </p>
        {error && <p className="mb-6 text-sm text-error">{error}</p>}

        {isReady ? (
          <Button className="w-full" onClick={handleClose} disabled={closing || estate?.status === 'closed'}>
            {estate?.status === 'closed' ? 'Estate closed' : closing ? 'Closing estate...' : 'Close estate'}
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => navigate('/actions')}>
            View pending actions
          </Button>
        )}
      </Card>

      <Card className="p-8 mt-8 text-left border-amber-200">
        <h2 className="text-xl font-bold text-primary">Delete estate data</h2>
        <p className="text-outline mt-2">This permanently removes the estate's documents, assets, requirements, and memberships. Type DELETE to confirm.</p>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-primary">
            Deletion date
            <input type="date" min={scheduledFor} value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} className="mt-1 block w-full rounded-xl border border-outline/20 p-3" disabled={deletionBusy} />
          </label>
          <input value={confirmText} onChange={event => setConfirmText(event.target.value)} placeholder="Type DELETE" className="block w-full rounded-xl border border-outline/20 p-3" disabled={deletionBusy} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleSchedule} disabled={deletionBusy || confirmText !== 'DELETE'}>
              {estate?.schedule ? 'Reschedule deletion' : 'Schedule deletion'}
            </Button>
            {estate?.schedule?.status === 'scheduled' && <Button variant="secondary" onClick={handleCancelSchedule} disabled={deletionBusy}>Cancel schedule</Button>}
            <Button variant="secondary" onClick={handleDeleteNow} disabled={deletionBusy || confirmText !== 'DELETE'}>Delete now</Button>
          </div>
          {estate?.schedule?.status === 'scheduled' && <p className="text-sm text-amber-700">Scheduled for {new Date(estate.schedule.scheduled_for).toLocaleString()}.</p>}
        </div>
      </Card>
    </div>
  );
};
