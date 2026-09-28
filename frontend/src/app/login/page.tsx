'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (fbError) {
        if (
          !(email === 'admin@gmail.com' && password === 'admin123') &&
          !(email === 'medical@gmail.com' && password === 'medical123')
        ) {
          throw new Error("Invalid credentials. Try admin@gmail.com or medical@gmail.com");
        }
      }

      if (email === 'medical@gmail.com') {
        router.push('/responder');
      } else {
        router.push('/dispatch');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas-parchment font-sans px-4">
      {/* Brand Header */}
      <div className="absolute top-0 left-0 w-full h-[44px] bg-surface-black text-on-dark flex items-center justify-center">
        <span className="text-[12px] font-semibold tracking-[-0.12px]">SAHAYAK SECURE PORTAL</span>
      </div>

      <div className="w-full max-w-[440px] bg-canvas p-10 md:p-12 rounded-[18px] shadow-sm border border-hairline mt-8">
        <div className="text-center mb-10">
          <h1 className="text-[34px] font-semibold text-ink tracking-[-0.374px] leading-[1.1] mb-2">
            Sign in to Command
          </h1>
          <p className="text-[17px] text-ink-muted-80 font-normal tracking-[-0.374px]">
            Access your dispatch or responder dashboard.
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-[#fff0f0] text-[#ff3b30] rounded-[8px] text-[14px] tracking-[-0.224px] text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              required
              className="w-full px-[20px] h-[44px] text-[17px] tracking-[-0.374px] border border-hairline rounded-pill bg-canvas text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
            />
            
            <input
              type="password"
              required
              className="w-full px-[20px] h-[44px] text-[17px] tracking-[-0.374px] border border-hairline rounded-pill bg-canvas text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] bg-primary text-on-primary text-[17px] font-normal tracking-[-0.374px] rounded-pill hover:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
            >
              {loading ? 'Authenticating...' : 'Continue'}
            </button>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-hairline">
          <div className="text-[12px] text-ink-muted-48 tracking-[-0.12px] text-center space-y-2">
            <p className="font-semibold text-ink-muted-80 uppercase mb-3">Demo Accounts</p>
            <div className="flex justify-between items-center bg-surface-pearl px-4 py-2 rounded-[8px] border border-hairline">
              <span>Dispatcher</span>
              <span className="font-semibold text-ink">admin@gmail.com</span>
            </div>
            <div className="flex justify-between items-center bg-surface-pearl px-4 py-2 rounded-[8px] border border-hairline">
              <span>Medical Responder</span>
              <span className="font-semibold text-ink">medical@gmail.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
