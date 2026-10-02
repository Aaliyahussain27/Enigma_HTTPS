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
    return <div className="p-8 text-center text-outline">Loading...</div>;
  }

  // Calculate metrics
  const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);
  const pendingActions = actions.filter(a => a.status === 'Needs attention').length;
  // Let's assume documents missing means documents required by assets but not in documents list.
  // For MVP, just hardcode based on mock data if present, but since it's empty, it will be 0.
  let docsNeeded = 0;
  assets.forEach(asset => {
    asset.requirements.forEach(req => {
      if (!req.completed) docsNeeded++;
    });
  });

  const isEstateEmpty = assets.length === 0 && actions.length === 0 && documents.length === 0 && !estate?.ownerName;

  if (isEstateEmpty) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Your estate</h1>
          <p className="text-xl text-outline font-medium">Nothing added yet</p>
        </div>

        <Card className="p-8 text-center bg-background border-dashed border-2">
          <p className="text-outline mb-6 text-lg">Upload your documents or add an asset to get started.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/asset-map')} className="gap-2">
              <span className="material-symbols-outlined">file_upload</span>
              Upload documents
            </Button>
            <Button variant="outline" className="gap-2">
              <span className="material-symbols-outlined">add</span>
              Add an asset
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(1)}L`; // simple format for MVP
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold text-primary">
            {estate?.ownerName ? `${estate.ownerName}'s Estate` : "Your Estate"}
          </h1>
          <Button variant="outline" className="gap-2 print:hidden" onClick={() => downloadEstateReport()}>
            <span className="material-symbols-outlined">download</span>
            Download PDF
          </Button>
        </div>
        <div className="flex items-center gap-4 mb-8">
          <span className="text-2xl font-bold text-primary-container">{estate?.completionPercentage}% organized</span>
          <div className="flex-1 max-w-xs">
            <Progress value={estate?.completionPercentage || 0} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-background">
            <p className="text-sm text-outline mb-1 font-medium">Assets found</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAssets)}</p>
          </Card>
          <Card className="p-4 bg-background">
            <p className="text-sm text-outline mb-1 font-medium">Actions pending</p>
            <p className="text-2xl font-bold text-primary">{pendingActions}</p>
          </Card>
          <Card className="p-4 bg-background">
            <p className="text-sm text-outline mb-1 font-medium">Documents needed</p>
            <p className="text-2xl font-bold text-primary">{docsNeeded}</p>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-primary mb-4">What to do next</h2>
        <div className="space-y-4">
          {activeActions.length > 0 ? activeActions.map(action => (
            <Card key={action.id} className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary mb-1">{action.title}</h3>
                <p className="text-outline">{action.description}</p>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate(action.assetId ? `/assets/${action.assetId}` : '/actions')}
              >
                {action.status === 'Needs attention' ? 'Start action' : 'Continue'}
              </Button>
            </Card>
          )) : (
            <Card className="p-8 text-center text-outline">
              No pending actions right now.
            </Card>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-primary">Ask about this estate</h2>
          <p className="text-outline mt-1">Get an explanation based on the documents and assets already recorded.</p>
        </div>
        <form onSubmit={handleAsk} className="flex gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which assets still need attention?"
            className="min-w-0 flex-1 rounded-xl border border-outline/20 px-4 py-3 text-primary focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={asking}
          />
          <Button type="submit" disabled={asking || !question.trim()} className="gap-2">
            <span className="material-symbols-outlined">send</span>
            {asking ? 'Asking...' : 'Ask'}
          </Button>
        </form>
        {questionError && <p className="mt-3 text-sm text-error">{questionError}</p>}
        {answer && <p className="mt-4 rounded-xl bg-background p-4 leading-7 text-primary">{answer}</p>}
      </Card>

      <div className="pt-8 border-t border-outline/20">
        {estate?.completionPercentage === 100 ? (
          <div>
            <h2 className="text-xl font-bold text-primary mb-2">Estate ready to close</h2>
            <Button onClick={() => navigate('/closure')}>Close estate</Button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-primary mb-2">Estate completion</h2>
            <p className="text-outline mb-4">{pendingActions + docsNeeded} things are still pending.</p>
            <Button variant="secondary" onClick={() => navigate('/closure')}>View pending items</Button>
          </div>
        )}
      </div>
    </div>
  );
};
