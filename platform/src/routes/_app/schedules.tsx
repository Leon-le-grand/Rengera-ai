import { createFileRoute } from '@tanstack/react-router';

import { SchedulesPage } from '@/features/schedules/SchedulesPage';

export const Route = createFileRoute('/_app/schedules')({
  component: SchedulesRoute,
});

function SchedulesRoute() {
  return <SchedulesPage />;
}
