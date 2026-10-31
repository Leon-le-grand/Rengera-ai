import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/i18n/LanguageProvider';
import { EmergencyPage } from './EmergencyPage';

function renderPage() {
  return render(
    <LanguageProvider>
      <EmergencyPage />
    </LanguageProvider>,
  );
}

describe('EmergencyPage', () => {
  it('offers 112 without requiring an account or API call', () => {
    renderPage();

    expect(
      screen.getByRole('link', { name: /^112$/i }),
    ).toHaveAttribute('href', 'tel:112');
    expect(
      screen.getByRole('heading', { name: /Emergency and official services/i }),
    ).toBeInTheDocument();
  });

  it('switches the local emergency guidance language', async () => {
    renderPage();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /answer language/i }),
      'rw',
    );

    expect(
      screen.getByRole('heading', { name: /Ubufasha bwihutirwa/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/112/).length).toBeGreaterThan(0);
  });

  it('filters contacts by issue and always keeps the general emergency path', async () => {
    renderPage();

    const search = screen.getByRole('searchbox', {
      name: /official emergency contacts/i,
    });
    await userEvent.type(search, 'cyber');

    expect(screen.getByText(/National Cyber Security Authority/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Rwanda Investigation Bureau/i),
    ).not.toBeInTheDocument();
  });

  it('shows a general-emergency fallback when no contact matches', async () => {
    renderPage();

    await userEvent.type(
      screen.getByRole('searchbox', { name: /official emergency contacts/i }),
      'zzzz-no-match',
    );

    expect(
      screen.getByText(/No specific authority matched that search/i),
    ).toBeInTheDocument();
    const emergencyLinks = screen.getAllByRole('link', { name: /^112$/i });
    expect(emergencyLinks.length).toBeGreaterThan(0);
    expect(emergencyLinks[0]).toHaveAttribute('href', 'tel:112');
  });
});
