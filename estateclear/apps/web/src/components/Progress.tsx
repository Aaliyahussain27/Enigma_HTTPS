import React from 'react';
import clsx from 'clsx';

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className }) => {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <div className={clsx('w-full h-3 bg-surface-container-low rounded-full overflow-hidden', className)}>
      <div 
        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
