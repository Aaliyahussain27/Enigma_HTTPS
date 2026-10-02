import React from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />
      <div className="flex flex-1 relative">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-0 max-w-5xl mx-auto w-full">
          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
