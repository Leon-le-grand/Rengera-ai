import AppShell from '@/components/app/AppShell';
import { getCurrentSessions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let admin = null;
  let account = null;
  try {
    const sessions = await getCurrentSessions();
    admin = sessions.admin;
    account = sessions.account;
  } catch (error) {
    // Never let a session/config failure turn the public page into a 500.
    // Users simply land signed out.
    console.error('Session lookup failed:', error instanceof Error ? error.message : error);
  }

  return <AppShell initialAdmin={admin} initialAccount={account} />;
}
