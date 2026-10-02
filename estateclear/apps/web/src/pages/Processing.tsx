import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import clsx from 'clsx';

const steps = [
  "Reading documents",
  "Finding financial information",
  "Building your estate map"
];

export const Processing: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    const runSteps = async () => {
      for (let i = 0; i <= steps.length; i++) {
        setCurrentStep(i);
        if (i < steps.length) {
          // Wait 1.5s per step
          await new Promise(resolve => {
            timeout = setTimeout(resolve, 1500);
          });
        } else {
          // Finished
          await new Promise(resolve => {
            timeout = setTimeout(resolve, 500);
          });
          navigate('/home');
        }
      }
    };

    runSteps();

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="max-w-2xl mx-auto pt-12 flex flex-col items-center">
      <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-8 relative">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin">progress_activity</span>
      </div>
      
      <h1 className="text-3xl font-bold text-primary mb-12">
        Organizing your information...
      </h1>

      <div className="w-full max-w-md space-y-4">
        {steps.map((step, index) => {
          const isCompleted = currentStep > index;
          const isActive = currentStep === index;
          const isUpcoming = currentStep < index;

          return (
            <Card 
              key={index} 
              className={clsx(
                "p-4 flex items-center gap-4 transition-all duration-500",
                isActive ? "border-primary/20 bg-surface-container/50 shadow-sm" : "border-transparent bg-transparent",
                isUpcoming ? "opacity-40" : "opacity-100"
              )}
            >
              {isCompleted ? (
                <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              ) : isActive ? (
                <span className="material-symbols-outlined text-[24px] text-primary animate-spin shrink-0">progress_activity</span>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-outline/30 shrink-0" />
              )}
              <span className={clsx(
                "font-medium text-lg",
                isCompleted || isActive ? "text-primary" : "text-outline"
              )}>
                {step}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
