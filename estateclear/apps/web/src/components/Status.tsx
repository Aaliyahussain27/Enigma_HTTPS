import React from 'react';
import clsx from 'clsx';
import { ActionItem } from '../types/estate';

interface StatusProps {
  status: ActionItem['status'] | 'Action needed';
  className?: string;
}

export const Status: React.FC<StatusProps> = ({ status, className }) => {
  const config = {
    'Needs attention': {
      icon: 'error',
      colors: 'bg-error/10 text-error border-error/20'
    },
    'Action needed': {
      icon: 'error',
      colors: 'bg-error/10 text-error border-error/20'
    },
    'In progress': {
      icon: 'schedule',
      colors: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    'Done': {
      icon: 'check_circle',
      colors: 'bg-surface-container text-primary-container border-primary/20'
    }
  };

  const { icon, colors } = config[status] || config['Needs attention'];

  return (
    <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', colors, className)}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {status}
    </div>
  );
};
