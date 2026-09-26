import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Status } from '../components/Status';
import { getActions } from '../services/api';
import { ActionItem } from '../types/estate';

export const Actions: React.FC = () => {
  const navigate = useNavigate();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActions().then(data => {
      setActions(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (actions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Actions</h1>
          <p className="text-xl text-slate-500 font-medium">No actions yet</p>
        </div>

        <Card className="p-8 text-center bg-slate-50 border-dashed border-2">
          <p className="text-slate-600 text-lg">Actions will appear here when EstateClear identifies something that needs attention.</p>
        </Card>
      </div>
    );
  }

  const needsAttention = actions.filter(a => a.status === 'Needs attention');
  const inProgress = actions.filter(a => a.status === 'In progress');
  const done = actions.filter(a => a.status === 'Done');

  const ActionGroup = ({ title, items }: { title: string, items: ActionItem[] }) => {
    if (items.length === 0) return null;
    
    return (
      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{title}</h2>
        <div className="space-y-4">
          {items.map(action => (
            <Card key={action.id} className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 mb-1 text-lg">{action.title}</h3>
                <p className="text-slate-600 mb-3">{action.description}</p>
                <Status status={action.status} />
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate(action.assetId ? `/assets/${action.assetId}` : '/')}
              >
                {action.status === 'Done' ? 'View' : 'Continue'}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Actions</h1>
      
      <ActionGroup title="Needs attention" items={needsAttention} />
      <ActionGroup title="In progress" items={inProgress} />
      <ActionGroup title="Done" items={done} />
    </div>
  );
};
