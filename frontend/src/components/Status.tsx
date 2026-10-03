import React from 'react';

interface StatusProps {
  status: string;
}

export const Status: React.FC<StatusProps> = ({ status }) => {
  const map: Record<string, { icon: string; label: string; color: string; bg: string }> = {
    'Needs attention': { icon: 'warning', label: 'Action needed', color: '#863b00', bg: '#fdeee3' },
    'Action needed': { icon: 'warning', label: 'Action needed', color: '#863b00', bg: '#fdeee3' },
    'In progress': { icon: 'hourglass_top', label: 'In progress', color: '#4059aa', bg: '#eef0ff' },
    'Done': { icon: 'check_circle', label: 'Done', color: '#005c55', bg: '#e8f5f4' },
  };
  const s = map[status] ?? { icon: 'info', label: status, color: '#6e7977', bg: '#f0f3ff' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 99,
      background: s.bg,
      color: s.color,
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 12,
    }}>
      <span className="material-symbols-outlined sm" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
      {s.label}
    </span>
  );
};
