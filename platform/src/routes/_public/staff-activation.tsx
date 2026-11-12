import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { getApiBaseUrl } from '@/api/client';
import { acceptStaffInvitation } from '@/api/generated/sdk.gen';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/_public/staff-activation')({
  component: StaffActivation,
});

function StaffActivation() {
  const [token, setToken] = useState(() => window.location.hash.slice(1));
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, []);

  async function activate() {
    setPending(true);
    setError('');
    try {
      const result = await acceptStaffInvitation({ baseUrl: getApiBaseUrl(), body: { token, password } });
      if (result.error) {
        setError('error' in result.error ? result.error.error.message : 'Check your invitation and password.');
        return;
      }
      setToken('');
      setPassword('');
      setActivated(true);
    } catch {
      setError('Could not reach Rengera. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto my-12 max-w-md">
      <CardHeader><CardTitle>Activate your staff account</CardTitle></CardHeader>
      <CardContent>
        {activated ? (
          <p role="status">Your staff account is ready. <Link to="/login" className="underline">Sign in</Link></p>
        ) : !token ? (
          <Alert variant="destructive">Open the activation link in your invitation email.</Alert>
        ) : (
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (!pending) void activate();
          }}>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Choose a password</Label>
              <Input id="staff-password" type="password" autoComplete="new-password"
                required minLength={8} maxLength={128} value={password}
                onChange={(event) => setPassword(event.target.value)} />
            </div>
            {error && <Alert variant="destructive">{error}</Alert>}
            <Button type="submit" disabled={pending}>{pending ? 'Activating…' : 'Activate account'}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
