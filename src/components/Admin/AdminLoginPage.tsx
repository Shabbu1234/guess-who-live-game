import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid admin password');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">ADMIN CONTROL CENTER</h1>
        <p className="text-xs text-slate-400">Enter secure admin master password</p>
      </div>

      <div className="w-full glass-card p-6 rounded-2xl border border-slate-800 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-50 glow-btn flex items-center justify-center space-x-2 transition-all"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>LOGIN TO DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
