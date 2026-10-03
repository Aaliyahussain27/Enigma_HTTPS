import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_estate_id');

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('completed_req_')) {
        localStorage.removeItem(key);
      }
    }

    navigate('/login');
  };

  return (
    <header style={{
      background: 'var(--color-surface-lowest)',
      borderBottom: '1px solid #dde3ea',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>

      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--color-primary)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined filled" style={{ color: '#fff', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: 18,
          color: '#1a1c1e',
          letterSpacing: '-0.3px',
        }}>
          Estate<span style={{ color: 'var(--color-primary)' }}>Clear</span>
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          padding: 8,
          borderRadius: 20,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#6e7977',
          display: 'flex',
          alignItems: 'center',
        }}>
          <span className="material-symbols-outlined sm">notifications</span>
        </button>
        <button
          onClick={handleLogout}
          id="logout-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 10,
            border: '1.5px solid #dde3ea',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize: 14,
            color: '#1a1c1e',
          }}
        >
          <span className="material-symbols-outlined sm">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
