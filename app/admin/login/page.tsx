'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hotel, KeyRound, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/admin/inbox';

  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!secretKey.trim()) {
      setErrorMsg('Please enter your staff access key.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Successful login
      router.push(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto text-slate-950 shadow-lg shadow-amber-500/10">
          <Hotel className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Hotel Sherpa Soul</h1>
        <p className="text-xs text-slate-400">Staff Portal & CRM Authentication</p>
      </div>

      {/* Security Notice */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          Authorized staff access only. Sessions are cryptographically signed and rate-limited.
        </span>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Access Key</span>
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="Enter ADMIN_SECRET_KEY..."
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <span>Sign In to Staff CRM</span>
          )}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-800 text-[11px] text-slate-500">
        26 Thamel Bhagwati Marg, Kathmandu • Protected System
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100 font-sans">
      <React.Suspense
        fallback={
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading Staff Portal...</p>
          </div>
        }
      >
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
