import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * Moves focus to the main landmark after client-side navigation, while leaving
 * the first paint alone. This makes skip-link and route changes predictable for
 * keyboard and screen-reader users.
 */
export function useRouteFocus<T extends HTMLElement>() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const ref = useRef<T>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: false });
  }, [pathname]);

  return ref;
}
