import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: string; // Material Symbol name
  label: string;
}

const navItems: NavItem[] = [
  { to: '/home',      icon: 'home',        label: 'Home' },
  { to: '/assets',    icon: 'work',        label: 'Assets' },
  { to: '/actions',   icon: 'task_alt',    label: 'Actions' },
  { to: '/documents', icon: 'description', label: 'Documents' },
];

export const Sidebar: React.FC = () => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside style={{
        display: 'none',
        flexDirection: 'column',
        width: 240,
        background: 'var(--color-surface-lowest)',
        borderRight: '1px solid #dde3ea',
        height: 'calc(100vh - 65px)',
        position: 'sticky',
        top: 65,
      }} className="sidebar-desktop">

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              id={`nav-${item.label.toLowerCase()}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'background 0.12s ease, color 0.12s ease',
                background: isActive ? '#e8f5f4' : 'transparent',
                color: isActive ? 'var(--color-primary)' : '#4a4e54',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 22,
                      fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Help */}
        <div style={{ padding: '12px', borderTop: '1px solid #eef0f2' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize: 14,
            color: '#4a4e54',
            cursor: 'pointer',
            width: '100%',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>help</span>
            Help
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--color-surface-lowest)',
        borderTop: '1px solid #dde3ea',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 12px',
        zIndex: 50,
      }} className="nav-mobile">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: 10,
              color: isActive ? 'var(--color-primary)' : '#6e7977',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 24,
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
};
