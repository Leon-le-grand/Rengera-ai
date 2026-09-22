'use client';

import { useState } from 'react';
import { Lock, Scale, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { name: string; role: 'admin' }) => void;
  onExit: () => void;
}

export default function LoginScreen({ onLogin, onExit }: LoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username.trim() === 'admin' && password === 'admin123') {
      setError('');
      onLogin({ name: 'Admin', role: 'admin' });
      return;
    }
    setError('Use admin / admin123 for this prototype.');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-8 md:px-10">
          <button onClick={onExit} className="flex w-fit items-center gap-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500 text-white">
              <Scale size={18} />
            </span>
            <span className="text-lg font-bold">Rengera</span>
          </button>

          <div className="max-w-xl py-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
              <ShieldCheck size={16} />
              Legal literacy control room
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Understand rights, route urgent cases, and manage verified laws.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              This prototype now separates the public experience from the admin tools while you build the real backend.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xl font-bold text-white">RAG</div>
              <div>Law-grounded answers</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xl font-bold text-white">P0</div>
              <div>Emergency routing</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xl font-bold text-white">Admin</div>
              <div>Protected ingestion</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-6 py-10 text-slate-900 lg:rounded-l-[2rem]">
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Lock size={20} />
              </div>
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500">
                Prototype credentials are prefilled until real authentication is connected.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Username</span>
                <input
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
            </div>

            {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

            <button className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
              Enter dashboard
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
