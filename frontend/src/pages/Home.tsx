import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { getEstate, getAssets, getActions, getDocuments, askEstateQuestion, downloadEstateReport } from '../services/api';
import { EstateData, Asset, ActionItem, DocumentItem } from '../types/estate';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [estate, setEstate] = useState<EstateData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const [questionError, setQuestionError] = useState('');

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
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-outline)' }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 20, animation: 'spin 1s linear infinite', display: 'inline-block', color: 'var(--color-primary)',
        }}>progress_activity</span>
        <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading...</p>
      </div>
    );
  }

  const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);
  const pendingActions = actions.filter(a => a.status === 'Needs attention').length;
  let docsNeeded = 0;
  assets.forEach(asset => {
    asset.requirements.forEach(req => {
      if (!req.completed) docsNeeded++;
    });
  });

  const isEstateEmpty = assets.length === 0 && actions.length === 0 && documents.length === 0 && !estate?.ownerName;

  if (isEstateEmpty) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Your estate</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 500, color: 'var(--color-outline)' }}>Nothing added yet</p>
        </div>

        <Card style={{ textAlign: 'center', border: '2px dashed #dde3ea', padding: 48, background: 'var(--color-surface-low)' }}>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginBottom: 24, fontSize: 16 }}>
            Upload your documents or add an asset to get started.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Button onClick={() => navigate('/upload')}>
              <span className="material-symbols-outlined sm">upload_file</span>
              Upload documents
            </Button>
            <Button variant="outline">
              <span className="material-symbols-outlined sm">add</span>
              Add an asset
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const activeActions = actions.filter(a => a.status !== 'Done').slice(0, 3);

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setQuestionError('');
    try {
      setAnswer(await askEstateQuestion(question.trim()));
      setQuestion('');
    } catch (error) {
      setQuestionError(error instanceof Error ? error.message : 'Unable to answer right now.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
            {estate?.ownerName ? `${estate.ownerName}'s Estate` : "Your Estate"}
          </h1>
          <Button variant="outline" onClick={() => downloadEstateReport()}>
            <span className="material-symbols-outlined sm">download</span>
            Download PDF
          </Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
            {estate?.completionPercentage}% organized
          </span>
          <div style={{ flex: 1, maxWidth: 240 }}>
            <Progress value={estate?.completionPercentage || 0} />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Card style={{ background: 'var(--color-surface-low)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-outline)', marginBottom: 4 }}>Assets found</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>{formatCurrency(totalAssets)}</p>
          </Card>
          <Card style={{ background: 'var(--color-surface-low)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-outline)', marginBottom: 4 }}>Actions pending</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>{pendingActions}</p>
          </Card>
          <Card style={{ background: 'var(--color-surface-low)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-outline)', marginBottom: 4 }}>Documents needed</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700 }}>{docsNeeded}</p>
          </Card>
        </div>
      </div>

      {/* What to do next */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>What to do next</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeActions.length > 0 ? activeActions.map(action => (
            <Card key={action.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 4 }}>{action.title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', fontSize: 14 }}>{action.description}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate(action.assetId ? `/assets/${action.assetId}` : '/actions')}
              >
                {action.status === 'Needs attention' ? 'Start action' : 'Continue'}
              </Button>
            </Card>
          )) : (
            <Card style={{ textAlign: 'center', color: 'var(--color-outline)', padding: 32 }}>
              No pending actions right now.
            </Card>
          )}
        </div>
      </div>

      {/* Ask about estate */}
      <Card style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>Ask about this estate</h2>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginTop: 4, fontSize: 14 }}>
            Get an explanation based on the documents and assets already recorded.
          </p>
        </div>
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: 12 }}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which assets still need attention?"
            disabled={asking}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #dde3ea',
              padding: '10px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <Button type="submit" disabled={asking || !question.trim()}>
            <span className="material-symbols-outlined sm">send</span>
            {asking ? 'Asking...' : 'Ask'}
          </Button>
        </form>
        {questionError && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>{questionError}</p>}
        {answer && (
          <p style={{
            marginTop: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-low)',
            padding: 16,
            lineHeight: 1.7,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: '#1a1c1e',
          }}>
            {answer}
          </p>
        )}
      </Card>

      {/* Estate completion / closure */}
      <div style={{ paddingTop: 32, borderTop: '1px solid #dde3ea' }}>
        {estate?.completionPercentage === 100 ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Estate ready to close</h2>
            <Button onClick={() => navigate('/closure')}>Close estate</Button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Estate completion</h2>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginBottom: 16 }}>
              {pendingActions + docsNeeded} things are still pending.
            </p>
            <Button variant="secondary" onClick={() => navigate('/closure')}>View pending items</Button>
          </div>
        )}
      </div>

      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
