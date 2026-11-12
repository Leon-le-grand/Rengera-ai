import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/squada-one';
import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Providers } from './app/providers';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Rengera could not start: #root is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
);
