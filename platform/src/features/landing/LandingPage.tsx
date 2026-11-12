import { useNavigate } from '@tanstack/react-router';

import '@/styles/public-design.css';
import '@/styles/public-design-overrides.css';

import RengeraLanding from './public-design/RengeraLanding';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <RengeraLanding
      onEnterApp={() => void navigate({ to: '/chat' })}
      onLogin={() => void navigate({ to: '/login' })}
    />
  );
}
