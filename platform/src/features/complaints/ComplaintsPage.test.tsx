import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ComplaintsPage } from './ComplaintsPage';

describe('ComplaintsPage', () => {
  it('renders step 1 with legal notice and category selection', () => {
    render(<ComplaintsPage />);

    expect(
      screen.getByRole('heading', { name: /Legal Complaints & Petition Assistant/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Draft formal legal notices, dispute letters, and petitions grounded in authentic Rwandan statutory shard/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Select mesh_the_65 nature of your legal grievance/i)).toBeInTheDocument();
  });

  it('navigates through wizard steps when filling out required fields', async () => {
    render(<ComplaintsPage />);

    // Step 1: Default category is already unpaid_wages, proceed to party details
    const nextBtn = screen.getByRole('button', { name: /Continue to Details/i });
    expect(nextBtn).toBeEnabled();
    await userEvent.click(nextBtn);

    // Step 2: Party Details & Incident Summary
    expect(screen.getByText(/Your Information \(Complainant\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Opposing Party \(Respondent\)/i)).toBeInTheDocument();

    const complainantInput = screen.getByPlaceholderText(/e\.g\. Jean Damascene Habimana/i);
    await userEvent.type(complainantInput, 'Jean Baptiste');

    const respondentInput = screen.getByPlaceholderText('e.g. Alpha Logistics Ltd / Landlord Name');
    await userEvent.type(respondentInput, 'Alpha Logistics Ltd');

    const factsInput = screen.getByPlaceholderText(/Explain clearly what happened: dates, what was promised/i);
    await userEvent.type(factsInput, 'Worked from January to March without pay.');

    const generateBtn = screen.getByRole('button', { name: /Generate Formal Petition Letter/i });
    expect(generateBtn).toBeEnabled();
    await userEvent.click(generateBtn);

    // Step 3: Preview
    expect(screen.getByText(/Generated Formal Legal Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Print \/ PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Text/i)).toBeInTheDocument();
  });
});
