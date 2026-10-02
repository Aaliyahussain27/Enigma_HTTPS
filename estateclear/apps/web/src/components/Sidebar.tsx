import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/home', icon: 'home', label: 'Home' },
    { to: '/asset-map', icon: 'account_tree', label: 'Asset Map' },
    { to: '/assets', icon: 'work', label: 'Assets' },
    { to: '/actions', icon: 'checklist', label: 'Actions' },
    { to: '/documents', icon: 'description', label: 'Documents' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container-lowest border-r border-outline/20 h-[calc(100vh-73px)] sticky top-[73px]">
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                  isActive
                    ? 'bg-surface-container text-primary-container'
                    : 'text-outline hover:bg-background hover:text-primary'
                )
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-outline/20">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-outline hover:bg-background hover:text-primary w-full transition-colors">
            <span className="material-symbols-outlined">help</span>
            Help
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline/20 pb-safe z-50">
        <div className="flex justify-around p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center p-2 rounded-lg min-w-[64px]',
                  isActive ? 'text-primary-container' : 'text-outline'
                )
              }
            >
              <span className="material-symbols-outlined text-[24px] mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};
