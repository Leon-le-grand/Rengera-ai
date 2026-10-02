import AppShell from '@/components/app/AppShell';
import { getCurrentSessions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { admin, account } = await getCurrentSessions();

  return <AppShell initialAdmin={admin} initialAccount={account} />;
}
