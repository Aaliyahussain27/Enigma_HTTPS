import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('jwt');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 48 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
        Welcome to EstateClear
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--color-outline)', marginBottom: 48 }}>
        Log in to organize your estate, or continue to view existing assets.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {!isLoggedIn ? (
          <Card 
            style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ width: 64, height: 64, background: '#eef0ff', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-secondary)' }}>login</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Login / Sign Up</h2>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginBottom: 32 }}>Create an account or login to set up a new estate.</p>
            <Button onClick={() => navigate('/login')} style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}>Login</Button>
          </Card>
        ) : (
          <Card 
            style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ width: 64, height: 64, background: 'var(--color-surface)', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-primary)' }}>upload_file</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>I have documents</h2>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginBottom: 32 }}>Start by uploading bank statements, policies, or claims.</p>
            <Button onClick={() => navigate('/estate-setup')} style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}>Upload documents</Button>
          </Card>
        )}

        <Card 
          style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ width: 64, height: 64, background: 'var(--color-surface-low)', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-outline)' }}>search</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>I want to explore assets</h2>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-outline)', marginBottom: 32 }}>Go straight to the dashboard to see what's currently recorded.</p>
          <Button variant="secondary" onClick={() => navigate('/home')} style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}>Go to dashboard</Button>
        </Card>
      </div>
    </div>
  );
};
