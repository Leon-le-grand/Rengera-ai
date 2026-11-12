import { createFileRoute } from '@tanstack/react-router';

import { SharedConsultationPage } from '@/features/share/SharedConsultationPage';

export const Route = createFileRoute('/_public/share/$shareToken')({
  component: ShareRoute,
});

function ShareRoute() {
  const { shareToken } = Route.useParams();
  return <SharedConsultationPage shareToken={shareToken} />;
}
