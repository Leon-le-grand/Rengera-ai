import { Link, useRouter } from '@tanstack/react-router';
import { ArrowRight, LogOut, RefreshCw } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouteFocus } from '@/lib/use-route-focus';
import { safeReturnPath } from '@/lib/safe-url';

import '@/styles/public-design.css';
import '@/styles/public-design-overrides.css';

function Arcade() {
  return (
    <svg className="auth-arcade" viewBox="0 0 660 952" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <defs>
        <radialGradient id="auth-glow" cx="50%" cy="16%" r="64%">
          <stop offset="0" stopColor="#D9B45B" stopOpacity=".3" />
          <stop offset=".55" stopColor="#D9B45B" stopOpacity=".07" />
          <stop offset="1" stopColor="#D9B45B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="auth-line" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9B45B" stopOpacity=".66" />
          <stop offset=".72" stopColor="#D9B45B" stopOpacity=".14" />
          <stop offset="1" stopColor="#D9B45B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="649" height="936" fill="url(#auth-glow)" />
      <g stroke="url(#auth-line)" strokeWidth="1">
        <path d="M96 920V474a264 339 0 0 1 589 0v446" />
        <path d="M132 920V478a228 242 0 0 1 467 0v442" />
        <path d="M168 920V482a192 192 0 0 1 454 0v438" />
        <path d="M204 920V486a156 156 0 0 1 355 0v434" />
        <path d="M56 474h120M544 474h120M56 458h120M544 458h120M62 442h100M558 442h100" />
        <path d="M78 474h36M606 474h36" strokeWidth="5" opacity=".55" />
        <path d="M72 458h48M600 458h48" strokeWidth="2.5" opacity=".45" />
        <path d="M110 520v400M124 520v400M138 520v400M582 520v400M596 520v400M610 520v400" opacity=".45" />
        <path d="M96 902h528" opacity=".7" />
      </g>
    </svg>
  );
}

interface LoginPageProps {
  redirect?: string;
}

function destinationFor(redirect: string | undefined): string {
  return safeReturnPath(redirect);
}

export function LoginPage({ redirect }: LoginPageProps) {
  const auth = useAuth();
  const mainRef = useRouteFocus<HTMLElement>({ onMount: true });
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = destinationFor(redirect);

  const goToDestination = async () => {
    router.history.push(destination);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter both your email address and password.');
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        const result = await auth.register({
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
        });

        if (!result.ok) {
          setError(result.message ?? 'Registration could not be completed.');
          return;
        }
      } else {
        const result = await auth.login({
          email: email.trim(),
          password,
        });

        if (!result.ok) {
          setError(result.message ?? 'Sign-in could not be completed.');
          return;
        }
      }

      setPassword('');
      await goToDestination();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      const result = await auth.logout();
      if (result.message) setError(result.message);
    } finally {
      setSigningOut(false);
    }
  };

  const registering = mode === 'register';
  const account = auth.status === 'authenticated' ? auth.user : null;
  const switchMode = (next: string) => {
    if (next === 'signin' || next === 'register') {
      setMode(next);
      setError(null);
    }
  };

  return (
    <main ref={mainRef} id="main-content" tabIndex={-1} className="public-auth">
      <a className="auth-skip" href="#auth-title">Skip to account access</a>
      <aside className="auth-stage">
        <Arcade />
        <header className="auth-top">
          <Link to="/" className="auth-brand"><span className="auth-brand__mark" aria-hidden="true" />Rengera</Link>
          <Link to="/" className="auth-back">Back to site <span aria-hidden="true">↗</span></Link>
        </header>
        <div className="auth-copy" key={mode}>
          <p className="auth-eyebrow">Rengera / access</p>
          <h1>{registering ? <>Begin with<br />the <em>record.</em></> : <>Welcome back<br />to the <em>record.</em></>}</h1>
          <p>Keep your legal questions and their sources in one place.</p>
        </div>
        <div className="auth-stage__foot">
          <div className="auth-proof"><strong>3</strong><span>Supported languages</span></div>
          <Link to="/emergency">Urgent help</Link>
        </div>
      </aside>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-form">
          {account ? (
            <>
              <h2 id="auth-title" tabIndex={-1}>You are already signed in.</h2>
              <p>{account.display_name}</p>
              {account.email && <p>{account.email}</p>}
              <p>Role: {account.role} · Status: {account.status}</p>
              <div className="flex flex-wrap gap-2 mt-5">
                <Button type="button" onClick={() => void goToDestination()}>Continue <ArrowRight aria-hidden="true" /></Button>
                <Button type="button" variant="outline" disabled={signingOut} onClick={() => void handleSignOut()}>
                  <LogOut aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-mode" data-mode={registering ? 'create' : 'signin'} role="group" aria-label="Account access">
                <span className="auth-mode__thumb" aria-hidden="true" />
                <Button type="button" variant="ghost" aria-pressed={!registering} disabled={submitting} onClick={() => switchMode('signin')}>Sign in</Button>
                <Button type="button" variant="ghost" aria-pressed={registering} disabled={submitting} onClick={() => switchMode('register')}>Create account</Button>
              </div>
              <h2 id="auth-title" tabIndex={-1}>{registering ? 'Start with the source.' : 'Continue to your workspace.'}</h2>
              {auth.status === 'unavailable' && (
                <InlineNotice tone="warning" title="The account service could not be reached" role="alert">
                  <p>{auth.error?.message ?? 'Sessions cannot be verified right now.'}</p>
                  <Button type="button" variant="outline" onClick={() => void auth.refresh()} disabled={auth.refreshing}>
                    <RefreshCw aria-hidden="true" />{auth.refreshing ? 'Checking…' : 'Retry session check'}
                  </Button>
                </InlineNotice>
              )}
              <form onSubmit={(event) => void handleSubmit(event)} aria-describedby={error ? 'platform-auth-error' : undefined}>
                {registering && (
                  <div className="auth-field">
                    <Label htmlFor="register-fullname">Full name (optional)</Label>
                    <Input id="register-fullname" name="fullName" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={submitting} placeholder="Your name" />
                  </div>
                )}
                <div className="auth-field">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input id="login-email" name="email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error) || undefined} disabled={submitting} placeholder="you@example.com" />
                </div>
                <div className="auth-field">
                  <Label htmlFor="login-password">Password {registering && '(minimum 8 characters)'}</Label>
                  <div className="auth-field__line">
                    <Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error) || undefined} disabled={submitting} placeholder={registering ? 'At least 8 characters' : 'Your password'} />
                    <Button type="button" variant="ghost" className="auth-reveal" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}<span className="sr-only"> password</span></Button>
                  </div>
                </div>
                <Button type="submit" className="auth-submit glossy-button glossy-button--dark" disabled={submitting || auth.status === 'loading'}>
                  <span>{submitting ? (registering ? 'Creating account…' : 'Signing in…') : (registering ? 'Create operator account' : 'Sign in')}</span>
                  <span className="glossy-button__orb" aria-hidden="true"><ArrowRight /></span>
                </Button>
              </form>
              {redirect && <p className="auth-terms">After signing in you will return to {destination}.</p>}
              <p className="auth-invite">
                {registering ? 'Already have access? ' : 'New to Rengera? '}
                <Button type="button" variant="link" className="auth-invite__link" disabled={submitting} onClick={() => switchMode(registering ? 'signin' : 'register')}>{registering ? 'Sign in' : 'Create an account'}</Button>
              </p>
            </>
          )}
          {error && <p id="platform-auth-error" className="auth-status auth-status--error" role="alert">{error}</p>}
        </div>
        <p className="auth-legal"><Link to="/emergency">Urgent help</Link></p>
      </section>
    </main>
  );
}
