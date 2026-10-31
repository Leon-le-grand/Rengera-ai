import { describe, expect, it } from 'vitest';

import { containsUrgentLanguage } from './urgent-language';

describe('containsUrgentLanguage', () => {
  it.each([
    'My husband is going to kill me tonight.',
    'Someone is attacking us right now.',
    'I am thinking about suicide.',
    'She threatened to hurt my child.',
    'Aranshaka, arambwira ko azankubita.',
    'Ndafite ikibazo cy’ihohoterwa mu rugo.',
    'Il me menace de mort et il me frappe.',
    "J'ai peur, c'est une urgence.",
  ])('detects urgent language in %s', (text) => {
    expect(containsUrgentLanguage(text)).toBe(true);
  });

  it.each([
    'What does the labour law say about notice before dismissal?',
    'How do I find an article about land registration?',
    'Explain the difference between a principal law and an amendment.',
    '',
    '   ',
  ])('does not flag ordinary legal research: %s', (text) => {
    expect(containsUrgentLanguage(text)).toBe(false);
  });
});
