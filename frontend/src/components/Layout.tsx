import React from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <Topbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '24px', paddingBottom: 80 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
