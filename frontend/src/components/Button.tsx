import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | string;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
  },
  secondary: {
    background: 'var(--color-surface-low)',
    color: 'var(--color-primary)',
    border: '1.5px solid var(--color-primary)',
  },
  outline: {
    background: 'transparent',
    color: '#1a1c1e',
    border: '1.5px solid #dde3ea',
  },
  ghost: {
    background: 'transparent',
    color: '#1a1c1e',
    border: 'none',
  },
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className, style, disabled, ...rest }) => {
  return (
    <button
      className={className}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 18px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.15s ease, opacity 0.15s ease',
        ...variantStyles[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
};
