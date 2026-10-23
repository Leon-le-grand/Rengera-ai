'use client';

import { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
  BookOpen,
} from 'lucide-react';
import { signIn, signUp, type AuthResult } from '@/app/auth-actions';
import RengeraLogo from '@/components/brand/RengeraLogo';

interface LoginUser {
  name: string;
  email: string;
  role: 'admin';
}

interface LoginScreenProps {
  onLogin: (user: LoginUser) => void;
  onAccount: (account: { id: string | null; name: string; email: string; role: 'admin' | 'staff' | 'user' }) => void;
  onExit: () => void;
}

type AuthMode = 'signin' | 'signup';

export default function LoginScreen({ onLogin, onAccount, onExit }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'signup';

  const handleResult = (result: AuthResult) => {
    if (!result.success) {
      setError(result.error || 'Unable to continue right now. Please try again.');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    if (result.user) {
      onLogin(result.user);
      return;
    }

    if (result.account) {
      onAccount(result.account);
      return;
    }

    setError('Unable to start a secure session right now. Please try again.');
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('email', email.trim());
    formData.set('password', password);

    try {
      handleResult(await signIn(formData));
    } catch {
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('fullName', fullName.trim());
    formData.set('email', email.trim());
    formData.set('password', password);
    formData.set('confirmPassword', confirmPassword);

    try {
      const result = await signUp(formData);
      if (!result.success) {
        handleResult(result);
        return;
      }
      setNotice('Account created. Opening your workspace…');
      handleResult(result);
    } catch {
      setError('Unable to create your account right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');

    if (nextMode === 'signup') {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    setFullName('');
    setEmail('admin');
    setPassword('admin123');
  };

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 hidden flex-col justify-between px-6 py-8 md:px-10 lg:order-1 lg:flex lg:px-12">
          <button
            type="button"
            onClick={onExit}
            className="flex w-fit items-center gap-3 rounded-xl text-left transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b485] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
          >
            <RengeraLogo size={40} label="" />
            <span className="font-brand text-lg tracking-wide">RENGERA AI</span>
          </button>

          <div className="max-w-xl py-16">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="mb-6 inline-flex items-center gap-2 border border-[#d8b485]/30 bg-[#d8b485]/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b485]"
            >
              <ShieldCheck size={16} strokeWidth={2.25} />
              Secure accounts, grounded answers
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Keep every legal answer grounded and accountable.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Create an account to keep your consultation history. Administrators manage official sources, review indexed articles, and keep the public legal assistant accurate.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
            {[
              { icon: BookOpen, label: 'Official citations' },
              { icon: Lock, label: 'Server session' },
              { icon: ShieldCheck, label: 'Hashed passwords' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border border-white/10 bg-white/[0.03] p-3.5 transition-colors duration-300 hover:border-[#d8b485]/40"
              >
                <stat.icon size={18} strokeWidth={2.25} className="mb-2 text-[#d8b485]" />
                <div className="text-sm font-semibold text-white">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="aura-form order-1 flex items-center justify-center overflow-y-auto px-5 py-8 text-white sm:px-8 lg:order-2 lg:px-12">
          <div className="w-full max-w-sm py-6">
            <button
              type="button"
              onClick={onExit}
              className="mb-10 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 lg:hidden"
            >
              <ArrowLeft size={16} />
              Back to home
            </button>

            <div className="mb-8">
              <motion.span
                key={isSignUp ? 'signup' : 'signin'}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20"
              >
                {isSignUp ? <UserPlus size={21} strokeWidth={2.25} /> : <Lock size={21} strokeWidth={2.25} />}
              </motion.span>
              <h2 className="text-2xl font-bold tracking-tight">
                {isSignUp ? 'Create your account' : 'Sign in to Rengera'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isSignUp
                  ? 'Register once to keep your legal consultations and sources in one place.'
                  : 'Use your account to continue.'}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            >
              {(
                [
                  { key: 'signin', label: 'Sign in', icon: Lock },
                  { key: 'signup', label: 'Create account', icon: UserPlus },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.key}
                  onClick={() => switchMode(tab.key)}
                  className={`relative flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${mode === tab.key ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {mode === tab.key && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <tab.icon size={15} strokeWidth={2.25} className="relative" />
                  <span className="relative">{tab.label}</span>
                </button>
              ))}
            </div>

            <form
              onSubmit={isSignUp ? handleSignUp : handleSignIn}
              className="space-y-5"
              aria-describedby={error ? 'login-error' : undefined}
            >
              {isSignUp && (
                <div>
                  <label htmlFor="account-name" className="mb-2 block text-sm font-semibold text-slate-700">
                    Full name
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      strokeWidth={2.25}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="account-name"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={120}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="account-identifier" className="mb-2 block text-sm font-semibold text-slate-700">
                  {isSignUp ? 'Email address' : 'Email or administrator username'}
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    strokeWidth={2.25}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  {/* Sign-in accepts the administrator username "admin" as well as an
                      email address, so this must stay type="text". Using type="email"
                      makes the browser reject "admin" before the form is submitted. */}
                  <input
                    id="account-identifier"
                    name="email"
                    type={isSignUp ? 'email' : 'text'}
                    inputMode={isSignUp ? 'email' : 'text'}
                    autoComplete={isSignUp ? 'email' : 'username'}
                    required
                    maxLength={200}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    placeholder={isSignUp ? 'you@example.com' : 'admin or you@example.com'}
                  />
                </div>
                {!isSignUp && (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Citizens sign in here with their email. Administrators use the same tab.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    strokeWidth={2.25}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    minLength={isSignUp ? 8 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={2.25} />
                    ) : (
                      <Eye size={18} strokeWidth={2.25} />
                    )}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <ShieldCheck
                      size={16}
                      strokeWidth={2.25}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Repeat your password"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p id="login-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium leading-6 text-red-700">
                  {error}
                </p>
              )}

              {notice && (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-6 text-emerald-700">
                  {notice}
                </p>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={
                  isSubmitting ||
                  !email.trim() ||
                  !password ||
                  (isSignUp && (!fullName.trim() || !confirmPassword))
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:-translate-y-px hover:bg-slate-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {isSignUp ? 'Creating account…' : 'Signing in…'}
                  </>
                ) : isSignUp ? (
                  <>
                    <UserPlus size={17} strokeWidth={2.25} />
                    Create account
                  </>
                ) : (
                  <>
                    <Lock size={17} strokeWidth={2.25} />
                    Sign in securely
                    <ArrowRight size={16} strokeWidth={2.25} className="ml-0.5" />
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              Your session is stored in a secure, HTTP-only cookie and expires automatically. Passwords are hashed with scrypt and never stored in plain text.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
