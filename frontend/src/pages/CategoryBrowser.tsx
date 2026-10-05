import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  label: string;
  icon: string; 
  description: string;
  color: string;
  bg: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'insurance',
    label: 'Insurance',
    icon: 'health_and_safety',
    description: 'Life, health, vehicle, property policies',
    color: '#005c55',
    bg: '#e8f5f4',
  },
  {
    id: 'bank',
    label: 'Bank Accounts',
    icon: 'account_balance',
    description: 'Savings, current, FD accounts',
    color: '#4059aa',
    bg: '#eef0ff',
  },
  {
    id: 'loan',
    label: 'Loans',
    icon: 'credit_score',
    description: 'Home loan, personal loan, credit cards',
    color: '#863b00',
    bg: '#fdeee3',
  },
  {
    id: 'epf',
    label: 'EPF / PF',
    icon: 'savings',
    description: 'Employee provident fund, gratuity',
    color: '#005c55',
    bg: '#e8f5f4',
  },
  {
    id: 'investment',
    label: 'Investments',
    icon: 'candlestick_chart',
    description: 'Mutual funds, stocks, bonds, PPF',
    color: '#4059aa',
    bg: '#eef0ff',
  },
  {
    id: 'property',
    label: 'Property',
    icon: 'home_work',
    description: 'Land, house, commercial property',
    color: '#863b00',
    bg: '#fdeee3',
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'folder_open',
    description: 'Any other estate document',
    color: '#6e7977',
    bg: '#f0f3ff',
  },
];

export const CategoryBrowser: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    navigate('/upload/file', { state: { category: selected } });
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 28,
          fontWeight: 700,
          color: '#1a1c1e',
          marginBottom: 8,
        }}>
          What type of document are you uploading?
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', color: '#4a4e54', fontSize: 15 }}>
          Selecting a category helps EstateClear extract the right information automatically.
        </p>
      </div>

      {/* Category Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              style={{
                background: isSelected ? cat.color : cat.bg,
                border: `2px solid ${isSelected ? cat.color : 'transparent'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '20px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? `0 4px 16px ${cat.color}33` : '0 1px 4px rgba(0,0,0,0.06)',
              }}
              aria-pressed={isSelected}
              id={`category-${cat.id}`}
            >
              <span
                className="material-symbols-outlined filled"
                style={{
                  fontSize: 32,
                  color: isSelected ? '#fff' : cat.color,
                  display: 'block',
                  marginBottom: 12,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {cat.icon}
              </span>
              <p style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: 15,
                color: isSelected ? '#fff' : '#1a1c1e',
                marginBottom: 4,
              }}>
                {cat.label}
              </p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: isSelected ? 'rgba(255,255,255,0.8)' : '#6e7977',
                lineHeight: 1.4,
              }}>
                {cat.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize: 14,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--color-outline)',
            background: 'transparent',
            color: '#1a1c1e',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={!selected}
          id="continue-to-upload"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: 14,
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: selected ? 'var(--color-primary)' : '#c4c7c5',
            color: '#fff',
            cursor: selected ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span className="material-symbols-outlined sm">upload_file</span>
          Continue to upload
        </button>
      </div>
    </div>
  );
};
