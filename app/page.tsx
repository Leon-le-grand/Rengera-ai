import AppShell from '@/components/app/AppShell';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialAdmin = await getAdminSession();

  return <AppShell initialAdmin={initialAdmin} />;
}
