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
        // Auto login after signup
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary">
          {isSignup ? 'Create an Account' : 'Login to EstateClear'}
        </h2>
        {error && <div className="mb-4 text-sm text-error text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="block text-sm font-medium text-outline">Full Name</label>
                <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full rounded-md border border-outline/30 shadow-sm p-2 focus:border-primary-container focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-outline">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border border-outline/30 shadow-sm p-2 focus:border-primary-container focus:ring-primary" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-outline">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border border-outline/30 shadow-sm p-2 focus:border-primary-container focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-outline">Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-outline/30 shadow-sm p-2 focus:border-primary-container focus:ring-primary" />
          </div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-on-primary bg-primary-container hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
            {loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Login')}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); }} className="text-sm text-secondary hover:text-primary">
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
