'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Scale, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '@/app/auth-actions';

interface LoginUser {
  name: string;
  email: string;
  role: 'admin';
}

interface LoginScreenProps {
  onLogin: (user: LoginUser) => void;
  onExit: () => void;
}

export default function LoginScreen({ onLogin, onExit }: LoginScreenProps) {
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('email', email.trim());
    formData.set('password', password);

    try {
      const result = await loginAdmin(formData);
      if (!result.success || !result.user) {
        setError(result.error || 'Unable to sign in right now. Please try again.');
        setPassword('');
        return;
      }

      onLogin(result.user);
    } catch {
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 hidden flex-col justify-between px-6 py-8 md:px-10 lg:order-1 lg:flex lg:px-12">
          <button
            type="button"
            onClick={onExit}
            className="flex w-fit items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Scale size={18} />
            </span>
            <span className="text-lg font-bold">Rengera</span>
          </button>

          <div className="max-w-xl py-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
              <ShieldCheck size={16} />
              Secure administrator access
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Keep every legal answer grounded and accountable.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Sign in to manage official sources, review indexed articles, and keep the public legal assistant accurate.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xl font-bold text-white">Source</div>
              <div className="mt-1">Official citations</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xl font-bold text-white">Safe</div>
              <div className="mt-1">Server session</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xl font-bold text-white">Private</div>
              <div className="mt-1">Admin only</div>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center bg-white px-5 py-8 text-slate-900 sm:px-8 lg:order-2 lg:rounded-l-[2rem] lg:px-12">
          <div className="w-full max-w-sm">
            <button
              type="button"
              onClick={onExit}
              className="mb-10 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 lg:hidden"
            >
              <ArrowLeft size={16} />
              Back to home
            </button>

            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
                <Lock size={20} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Administrator sign in</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use your administrator account to manage verified legal sources.
              </p>
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Demo credentials: <strong>admin</strong> / <strong>admin123</strong>. Replace them with deployment credentials before making the app public.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? 'login-error' : undefined}>
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email or username
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Enter your administrator account"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p id="login-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email.trim() || !password}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <Lock size={17} />
                    Sign in securely
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              Your session is stored in a secure, HTTP-only cookie and expires automatically.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
