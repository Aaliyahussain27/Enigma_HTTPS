import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FileUp, Search } from 'lucide-react';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto pt-12">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">
        Let's organize the estate.
      </h1>
      <p className="text-lg text-slate-600 mb-12">
        Upload the documents you have. We'll help identify assets and show you what needs to be done.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card 
          hoverable 
          onClick={() => navigate('/upload')}
          className="p-8 flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
            <FileUp className="w-8 h-8 text-teal-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">I have documents</h2>
          <p className="text-slate-600 mb-8">Start by uploading bank statements, policies, or claims.</p>
          <Button className="w-full mt-auto">Upload documents</Button>
        </Card>

        <Card 
          hoverable 
          onClick={() => navigate('/home')}
          className="p-8 flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-slate-100 transition-colors">
            <Search className="w-8 h-8 text-slate-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">I want to explore assets</h2>
          <p className="text-slate-600 mb-8">Go straight to the dashboard to see what's currently recorded.</p>
          <Button variant="secondary" className="w-full mt-auto">Go to dashboard</Button>
        </Card>
      </div>
    </div>
  );
};
