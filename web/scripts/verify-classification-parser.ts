import { parseClassificationResponse } from '../lib/legal-classification';

const fence = String.fromCharCode(96).repeat(3);

const sample = `${fence}json
{
  "title": "Law N° 027/2023 of 28/06/2023 relating to the prevention and control of sexual violence",
  "reference_number": "Law N° 027/2023 of 28/06/2023",
  "gazette_reference": "Official Gazette n° Special of 30/06/2023",
  "status": "active",
  "type": "principal",
  "amends_law_reference": null,
  "superseded_by": null,
  "affected_articles": ["Article 2", "Article 7"],
  "repealed_articles": [],
  "inserted_articles": [],
  "retroactive_effective_date": {},
  "category": "Criminal Law",
  "subcategories": ["Sexual Offences"],
  "publication_date": "2023-06-30",
  "effective_date": "2023-06-30",
  "language": "english",
  "languages_available": ["kinyarwanda", "english", "french"],
  "source_url": "https://www.rlrc.gov.rw/",
  "summary": "Defines and punishes sexual violence offences.",
  "key_obligations": ["Employers must establish a prevention policy"],
  "applicable_entities": ["Employers", "Schools"],
  "penalties_non_compliance": ["Imprisonment of 6 months to 5 years"],
  "tags": ["sexual-violence", "workplace"]
}
${fence}`;

const parsed = parseClassificationResponse(sample);
console.log('type:', parsed.type);
console.log('status:', parsed.status);
console.log('languages_available:', parsed.languages_available);
console.log('retroactive_effective_date:', JSON.stringify(parsed.retroactive_effective_date));
console.log('repealed:', parsed.repealed_articles, 'inserted:', parsed.inserted_articles);
console.log('publication_date:', parsed.publication_date);

// Amendment case: retroactive dates + repealed/inserted articles must survive.
const amendment = JSON.stringify({
  title: 'Law amending Law N° 027/2023',
  reference_number: 'Law N° 01/2024',
  status: 'amendment',
  type: 'amendment',
  amends_law_reference: 'Law N° 027/2023',
  affected_articles: ['Article 3', 'Article 4'],
  repealed_articles: ['Article 3'],
  inserted_articles: ['Article 4 bis'],
  retroactive_effective_date: { 'Article 3': '2023-01-01', 'Article 4': 'not-a-date' },
  category: 'Criminal Law',
  subcategories: [],
  languages_available: ['english'],
  summary: 'Amends the 2023 law.',
  key_obligations: [],
  applicable_entities: [],
  penalties_non_compliance: [],
  tags: [],
});

const amended = parseClassificationResponse(amendment);
console.log('--- amendment ---');
console.log('type:', amended.type, '| amends:', amended.amends_law_reference);
console.log('repealed:', amended.repealed_articles, '| inserted:', amended.inserted_articles);
console.log('retroactive (invalid date dropped):', JSON.stringify(amended.retroactive_effective_date));
console.log('languages:', amended.languages_available);

// Defaults: missing languages_available falls back to the three official ones.
const noLang = parseClassificationResponse(
  JSON.stringify({
    title: 'X', category: 'Y', summary: 'Z',
    key_obligations: [], applicable_entities: [], penalties_non_compliance: [], tags: [],
    subcategories: [],
  }),
);
console.log('--- defaults ---');
console.log('languages_available default:', noLang.languages_available);
console.log('amends_law_reference for principal:', noLang.amends_law_reference);
console.log('retroactive default:', JSON.stringify(noLang.retroactive_effective_date));

// Guardrail: a hallucinated retroactive date must be discarded, not stored,
// and it must not discard the rest of the extraction.
const fabricated = parseClassificationResponse(JSON.stringify({
  title: 'X', category: 'Y', summary: 'Z', type: 'principal',
  retroactive_effective_date: { 'Article 9': '2030-13-45' },
  subcategories: [], key_obligations: [], applicable_entities: [],
  penalties_non_compliance: [], tags: [],
}));
console.log('fabricated date dropped:', JSON.stringify(fabricated.retroactive_effective_date) === '{}');

// Guardrail: a principal law must never carry an amendment pointer.
const confused = parseClassificationResponse(JSON.stringify({
  title: 'X', category: 'Y', summary: 'Z', status: 'active', type: 'principal',
  amends_law_reference: 'Law N° 027/2023',
  subcategories: [], key_obligations: [], applicable_entities: [],
  penalties_non_compliance: [], tags: [],
}));
console.log('principal keeps no amends pointer:', confused.amends_law_reference === null);

// Guardrail: `status: "amendment"` is the most common model confusion.
const swapped = parseClassificationResponse(JSON.stringify({
  title: 'X', category: 'Y', summary: 'Z', status: 'amendment',
  subcategories: [], key_obligations: [], applicable_entities: [],
  penalties_non_compliance: [], tags: [],
}));
console.log('swapped status normalised:', swapped.status, '/', swapped.type);