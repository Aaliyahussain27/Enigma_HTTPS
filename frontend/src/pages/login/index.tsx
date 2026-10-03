import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        const res = await fetch('http://localhost:8000/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName, phone }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Signup failed');
        }

        setIsSignup(false);
        setError('Signup successful. Please log in.');
      } else {
        const res = await fetch('http://localhost:8000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Login failed');
        }
        const data = await res.json();
        localStorage.setItem('jwt', data.jwt);
        localStorage.setItem('refresh_token', data.refresh_token);
        navigate('/estate-setup');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--color-surface-lowest)', padding: 32, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: 'var(--color-primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined filled" style={{ color: '#fff', fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
          {isSignup ? 'Create an Account' : 'Login to EstateClear'}
        </h2>
        
        {error && (
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--color-error)', textAlign: 'center', background: '#fde8e8', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignup && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500, marginBottom: 4 }}>Full Name</label>
                <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '10px 14px', fontFamily: 'var(--font-body)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500, marginBottom: 4 }}>Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '10px 14px', fontFamily: 'var(--font-body)' }} />
              </div>
            </>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500, marginBottom: 4 }}>Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '10px 14px', fontFamily: 'var(--font-body)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500, marginBottom: 4 }}>Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '10px 14px', fontFamily: 'var(--font-body)' }} />
          </div>
          <button type="submit" disabled={loading} style={{ 
            width: '100%', 
            padding: '12px', 
            borderRadius: 'var(--radius-md)', 
            border: 'none', 
            background: 'var(--color-primary)', 
            color: '#fff', 
            fontFamily: 'var(--font-heading)', 
            fontWeight: 600, 
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: 8
          }}>
            {loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Login')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); }} style={{ background: 'none', border: 'none', fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }}>
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
