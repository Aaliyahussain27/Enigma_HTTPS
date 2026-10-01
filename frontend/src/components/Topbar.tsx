import React from 'react';
import { Bell, LogOut } from 'lucide-react';
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
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          Estate<span className="text-teal-700">Clear</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium">
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
