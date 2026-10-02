import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, hoverable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          'bg-surface-container-lowest rounded-2xl border border-outline/20 overflow-hidden',
          hoverable && 'transition-shadow hover:shadow-md cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
