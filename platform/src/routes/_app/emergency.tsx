import { createFileRoute } from '@tanstack/react-router';

import { EmergencyPage } from '@/features/emergency/EmergencyPage';

export const Route = createFileRoute('/_app/emergency')({
  component: EmergencyPage,
});
