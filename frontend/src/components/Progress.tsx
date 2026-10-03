import React from 'react';

interface ProgressProps {
  value: number; 
}

export const Progress: React.FC<ProgressProps> = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{
      width: '100%',
      height: 8,
      background: 'var(--color-surface-low)',
      borderRadius: 99,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${clamped}%`,
        height: '100%',
        background: 'var(--color-primary)',
        borderRadius: 99,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
};
