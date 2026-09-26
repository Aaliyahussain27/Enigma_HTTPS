import React from 'react';
import clsx from 'clsx';

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className }) => {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div className={clsx('w-full h-3 bg-slate-100 rounded-full overflow-hidden', className)}>
      <div 
        className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
