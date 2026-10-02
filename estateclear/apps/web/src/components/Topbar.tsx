import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_estate_id');
    
    // clear requirements
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('completed_req_')) {
        localStorage.removeItem(key);
      }
    }
    
    navigate('/login');
  };

  return (
    <header className="bg-surface-container-lowest border-b border-outline/20 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
          <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          Estate<span className="text-primary-container">Clear</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-outline hover:text-outline rounded-full hover:bg-background transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button onClick={handleLogout} className="p-2 text-outline hover:text-outline rounded-full hover:bg-background transition-colors flex items-center gap-2 text-sm font-medium">
          <span className="material-symbols-outlined">logout</span>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
