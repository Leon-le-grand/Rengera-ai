/**
 * Answer languages.
 *
 * Shared by the server (to build the model instruction) and by the browser (for
 * the interface strings), so the UI and the answer can never disagree about
 * which language is active.
 */

export const ANSWER_LANGUAGES = ['en', 'rw', 'fr', 'sw'] as const;

export type AnswerLanguage = (typeof ANSWER_LANGUAGES)[number];

export interface AnswerLanguageDefinition {
  code: AnswerLanguage;
  label: string;
  native: string;
  /** Appended to the system prompt. */
  instruction: string;
}

export const LANGUAGE_DEFINITIONS: Record<AnswerLanguage, AnswerLanguageDefinition> = {
  en: {
    code: 'en',
    label: 'English',
    native: 'English',
    instruction:
      'Write the entire answer in clear, simple English. Keep every law reference, article number and official citation exactly as published (do not translate those).',
  },
  rw: {
    code: 'rw',
    label: 'Kinyarwanda',
    native: 'Kinyarwanda',
    instruction:
      'Write the ENTIRE answer in Kinyarwanda (Ikinyarwanda), using simple everyday language that a citizen understands. Keep every law title in its official form where possible, but always keep the law reference number (for example "N° 66/2018") and the article number in their original digits. Translate the section headings into Kinyarwanda.',
  },
  fr: {
    code: 'fr',
    label: 'French',
    native: 'Français',
    instruction:
      "Rédige l'intégralité de la réponse en français simple et clair. Conserve exactement la référence de la loi et le numéro d'article tels que publiés.",
  },
  sw: {
    code: 'sw',
    label: 'Kiswahili',
    native: 'Kiswahili',
    instruction:
      'Write the ENTIRE answer in simple Kiswahili. Keep every law reference number and article number exactly as published. Translate the section headings into Kiswahili.',
  },
};

export function isAnswerLanguage(value: unknown): value is AnswerLanguage {
  return typeof value === 'string' && (ANSWER_LANGUAGES as readonly string[]).includes(value);
}

export function resolveAnswerLanguage(value: unknown): AnswerLanguage {
  return isAnswerLanguage(value) ? value : 'en';
}

type Strings = {
  greeting: string;
  placeholder: string;
  disclaimer: string;
  generating: string;
  share: string;
  savePdf: string;
  newChat: string;
  helpful: string;
  notHelpful: string;
  thanks: string;
  scenarios: { tenant: string; employment: string; privacy: string; traffic: string };
};

export const UI_STRINGS: Record<AnswerLanguage, Strings> = {
  en: {
    greeting:
      'Muraho! I am Rengera, your legal assistant.\n\nDescribe your situation in any language. I will read the official Rwandan laws, quote the exact article, and tell you what to do next.',
    placeholder: 'Ask anything about your rights…',
    disclaimer:
      'Rengera AI can make mistakes. Verify important information with official sources.',
    generating: 'Reading the law library…',
    share: 'Share answer',
    savePdf: 'Save as PDF',
    newChat: 'New chat',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    thanks: 'Thank you — this goes straight to our review queue.',
    scenarios: {
      tenant: 'Tenant problem',
      employment: 'Employment',
      privacy: 'Privacy',
      traffic: 'Traffic',
    },
  },
  rw: {
    greeting:
      'Muraho! Nitwa Rengera, umufasha wawe w’amahuru.\n\nSobanura ibibazo cyawe mu buryo buhoraho. Nzasura amategeko y’u Rwanda, nkangurura icyiciro cyo ku buryo, kandi nkaguha icyo gomba gukora.',
    placeholder: 'Baza icyo ushaka…',
    disclaimer:
      'Rengera AI ishobora gukora amakosa. Reba ibisobanuro mu buryo bwemewe mbere yo gukoresha.',
    generating: 'Ndasura amasuku y’amategeko…',
    share: 'Sangira igisubizo',
    savePdf: 'Bika ako PDF',
    newChat: 'Ikiganza gishya',
    helpful: 'Byifashisha',
    notHelpful: 'Ntibifasha',
    thanks: 'Murakoze — ibi byohereza mu isunika ryacu ry’ubuzima.',
    scenarios: {
      tenant: 'Umwira w’icyago',
      employment: 'Akazi',
      privacy: 'Umugongo',
      traffic: 'Umuharemu',
    },
  },
  fr: {
    greeting:
      'Bonjour ! Je suis Rengera, votre assistant juridique.\n\nDécrivez votre situation simplement. Je lirai les lois rwandaises officielles, je citerai l’article exact et je vous dirai quoi faire ensuite.',
    placeholder: 'Posez votre question…',
    disclaimer:
      'Rengera AI peut faire des erreurs. Vérifiez les informations importantes auprès des sources officielles.',
    generating: 'Consultation de la base juridique…',
    share: 'Partager la réponse',
    savePdf: 'Enregistrer en PDF',
    newChat: 'Nouvelle conversation',
    helpful: 'Utile',
    notHelpful: 'Pas utile',
    thanks: 'Merci — cela part directement dans notre file de relecture.',
    scenarios: {
      tenant: 'Problème de locataire',
      employment: 'Travail',
      privacy: 'Vie privée',
      traffic: 'Route',
    },
  },
  sw: {
    greeting:
      'Habari! Mimi ni Rengera, msaidizi wako wa sheria.\n\nEleza hali yako kwa maneno rahisi. Nitasoma sheria za Rwanda, nataja nakala halisi, na nikakuambia unachofanya.',
    placeholder: 'Uliza chochote kuhusu haki zako…',
    disclaimer:
      'Rengera AI inaweza kukoseka. Thibitisha taarifa muhimu kutoka vyanzo rasmi.',
    generating: 'Inasoma maktaba ya sheria…',
    share: 'Shiriki jibu',
    savePdf: 'Hifadhi kama PDF',
    newChat: 'Mazungumzo mapya',
    helpful: 'Inasaidia',
    notHelpful: 'Haaisidi',
    thanks: 'Asante — hii goesha kwenye kioleco cha ukaguzi wetu.',
    scenarios: {
      tenant: 'Shida ya mwananchi',
      employment: 'Kazi',
      privacy: 'Faragha',
      traffic: 'Barabara',
    },
  },
};