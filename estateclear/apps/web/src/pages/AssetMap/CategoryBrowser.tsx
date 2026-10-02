import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';

export const assetCategories = [
  { id: 'insurance', name: 'Insurance Policies', icon: 'health_and_safety' },
  { id: 'bank', name: 'Bank Accounts', icon: 'account_balance' },
  { id: 'loan', name: 'Loans & Mortgages', icon: 'real_estate_agent' },
  { id: 'epf', name: 'EPF / Provident Fund', icon: 'savings' },
];

export const CategoryBrowser: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-display font-semibold mb-2 text-primary">Asset Map</h1>
      <p className="text-outline mb-8">Select a category to begin uploading related documents.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {assetCategories.map(cat => (
          <Card 
            key={cat.id} 
            hoverable 
            onClick={() => navigate(`/upload?category=${cat.id}`)}
            className="p-6 flex items-center cursor-pointer transition-colors hover:bg-surface-container"
          >
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mr-4">
              <span className="material-symbols-outlined text-on-primary">{cat.icon}</span>
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-primary">{cat.name}</h2>
              <p className="text-outline text-sm">Upload {cat.name.toLowerCase()} documents</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
