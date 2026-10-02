import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('jwt');

  return (
    <div className="max-w-2xl mx-auto pt-12">
      <h1 className="text-4xl font-bold text-primary mb-4">
        Welcome to EstateClear
      </h1>
      <p className="text-lg text-outline mb-12">
        Log in to organize your estate, or continue to view existing assets.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        {!isLoggedIn ? (
          <Card 
            hoverable 
            onClick={() => navigate('/login')}
            className="p-8 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-6 group-hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[32px] text-secondary">login</span>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Login / Sign Up</h2>
            <p className="text-outline mb-8">Create an account or login to set up a new estate.</p>
            <Button className="w-full mt-auto">Login</Button>
          </Card>
        ) : (
          <Card 
            hoverable 
            onClick={() => navigate('/estate-setup')}
            className="p-8 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-6 group-hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-primary-container">file_upload</span>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">I have documents</h2>
            <p className="text-outline mb-8">Start by uploading bank statements, policies, or claims.</p>
            <Button className="w-full mt-auto">Upload documents</Button>
          </Card>
        )}

        <Card 
          hoverable 
          onClick={() => navigate('/home')}
          className="p-8 flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 group-hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">search</span>
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">I want to explore assets</h2>
          <p className="text-outline mb-8">Go straight to the dashboard to see what's currently recorded.</p>
          <Button variant="secondary" className="w-full mt-auto">Go to dashboard</Button>
        </Card>
      </div>
    </div>
  );
};
