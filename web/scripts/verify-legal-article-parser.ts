import {
  articleSortKey,
  detectLegalLanguage,
  isPreambleArticle,
  parseLegalArticles,
  PREAMBLE_ARTICLE_NUMBER,
} from '../lib/legal-article-parser';

const OPTIONS = {
  lawId: 'law_test',
  documentTitle: 'Law N° 001/2024',
  referenceNumber: 'Law N° 001/2024',
  language: 'english' as const,
  sourceUrl: 'https://www.rlrc.gov.rw/',
};

const results: { name: string; pass: boolean }[] = [];

function check(name: string, pass: boolean) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
}

const document = `LAW N° 001/2024 OF 05/01/2024
Published in the Official Gazette on 10/01/2024

Article 1
Purpose of the law.

Article 5 ter
Inserted article with a non-integer number.

Ingingo ya 7
Umusarangi w'umukene mu kazi.

Article 5 bis
Another inserted article.

Iteka ya 9
Amategeko akubiyemo.
`;

const parsed = parseLegalArticles(document, OPTIONS);
const byNumber = new Map(parsed.map((article) => [article.articleNumber, article]));
const preamble = byNumber.get(PREAMBLE_ARTICLE_NUMBER);

check(
  'preamble is preserved as its own row',
  Boolean(preamble?.content.includes('LAW N° 001/2024')) &&
    Boolean(preamble?.content.includes('Official Gazette')),
);
check('preamble sentinel is identifiable', isPreambleArticle(PREAMBLE_ARTICLE_NUMBER));
check(
  'every heading style is detected',
  ['1', '5 ter', '5 bis', '7', '9'].every((number) => byNumber.has(number)),
);
const withInlineCitation = parseLegalArticles(
  `Article 1
This article amends Article 5 of Law N° 66/2018 and continues to the end.

Article 2
Second article body text.`,
  OPTIONS,
);
const inlineByNumber = new Map(withInlineCitation.map((a) => [a.articleNumber, a]));
check(
  'inline citation does not split an article',
  withInlineCitation.filter((a) => a.articleNumber !== PREAMBLE_ARTICLE_NUMBER).length === 2 &&
    inlineByNumber.get('1')?.content.includes('continues to the end') === true &&
    !inlineByNumber.get('1')?.content.includes('Second article body'),
);

const sorted = ['10', '2', '5 ter', '5 bis', '12.3', '12'].sort((a, b) => {
  const [aMajor, aMinor, aRest] = articleSortKey(a);
  const [bMajor, bMinor, bRest] = articleSortKey(b);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aRest.localeCompare(bRest);
});
check(
  'articles sort in statutory order',
  JSON.stringify(sorted) === JSON.stringify(['2', '5 bis', '5 ter', '10', '12', '12.3']),
);

const unheaded = parseLegalArticles('Icyakubiri\n\nUnyiruko rwose rwumwandiko wose.', OPTIONS);
check(
  'a document with no headings is kept whole',
  unheaded.length === 1 && isPreambleArticle(unheaded[0].articleNumber),
);

const rawReadable = (document.match(/\S/g) ?? []).length;
const captured = parsed.reduce((total, article) => total + (article.content.match(/\S/g) ?? []).length, 0);
check(
  `coverage is 100% (${captured}/${rawReadable})`,
  captured === rawReadable,
);

check(
  'kinyarwanda document detected',
  detectLegalLanguage('Ingingo ya 1\nUmusarangi.\n\nIngingo ya 2\nIgiyandikiye.') === 'kinyarwanda',
);
check(
  'french document detected',
  detectLegalLanguage(
    "Article 1\nLe presente loi a pour objet de regler les relations entre les employer et les salaries. Cette loi est applicable dans tout le pays avec les lc.",
  ) === 'french',
);
check(
  'english document detected',
  detectLegalLanguage(
    'Article 1\nThe purpose of this law shall be to regulate the relationship between the employer and the employee in the workplace for all workers.',
  ) === 'english',
);

const failures = results.filter((result) => !result.pass);
console.log();
console.log(
  failures.length
    ? `FAILED ${failures.length}/${results.length}: ${failures.map((f) => f.name).join(', ')}`
    : `All ${results.length} parser tests passed.`,
);

if (failures.length) process.exit(1);