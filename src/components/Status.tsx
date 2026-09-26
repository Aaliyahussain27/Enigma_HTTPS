import React from 'react';
import clsx from 'clsx';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { ActionItem } from '../types/estate';

interface StatusProps {
  status: ActionItem['status'] | 'Action needed';
  className?: string;
}

export const Status: React.FC<StatusProps> = ({ status, className }) => {
  const config = {
    'Needs attention': {
      icon: AlertCircle,
      colors: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    'Action needed': {
      icon: AlertCircle,
      colors: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    'In progress': {
      icon: Clock,
      colors: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    'Done': {
      icon: CheckCircle2,
      colors: 'bg-teal-50 text-teal-700 border-teal-200'
    }
  };

  const { icon: Icon, colors } = config[status] || config['Needs attention'];

  return (
    <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', colors, className)}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </div>
  );
};
