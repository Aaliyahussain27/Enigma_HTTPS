import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, style, hoverable, ...rest }) => {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-surface-lowest)',
        border: '1px solid var(--color-outline, #dde3ea)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        transition: hoverable ? 'transform 0.15s ease, box-shadow 0.15s ease' : 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
