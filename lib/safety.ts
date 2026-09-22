export type EmergencyRisk = {
  level: 'none' | 'urgent';
  title: string;
  summary: string;
  immediateActions: string[];
  contacts: {
    name: string;
    phone: string;
    reason: string;
  }[];
};

const URGENT_PATTERNS = [
  'kill',
  'suicide',
  'hurt myself',
  'danger',
  'threatened',
  'assault',
  'rape',
  'violence',
  'domestic violence',
  'child abuse',
  'kidnap',
  'detained',
  'arrested',
  'bleeding',
  'attack',
  'emergency',
  'bribe',
  'police beating',
];

export const PRIORITY_IMPLEMENTATION_MAP = [
  {
    priority: 'P0',
    area: 'Emergency handling',
    status: 'Implemented now',
    reason: 'Users in danger need contact routing and immediate safety steps before normal AI chat.',
  },
  {
    priority: 'P0',
    area: 'Admin access control',
    status: 'Implemented now',
    reason: 'Law ingestion must not be open to every visitor, even in a prototype.',
  },
  {
    priority: 'P1',
    area: 'Verified legal sources and citations',
    status: 'Next',
    reason: 'Trust depends on official article references, publication dates, and source links.',
  },
  {
    priority: 'P1',
    area: 'Kinyarwanda-first UX',
    status: 'Next',
    reason: 'The product is for Rwanda, so legal literacy must work naturally in local language.',
  },
  {
    priority: 'P1',
    area: 'Guided issue flows',
    status: 'Next',
    reason: 'Common situations should become checklists and drafts, not only chat answers.',
  },
  {
    priority: 'P2',
    area: 'Production database and audit trail',
    status: 'Later',
    reason: 'The local JSON database is fine for a demo but not enough for production legal content.',
  },
];

export function detectEmergencyRisk(text: string): EmergencyRisk {
  const normalized = text.toLowerCase();
  const matched = URGENT_PATTERNS.some(pattern => normalized.includes(pattern));

  if (!matched) {
    return {
      level: 'none',
      title: '',
      summary: '',
      immediateActions: [],
      contacts: [],
    };
  }

  return {
    level: 'urgent',
    title: 'Urgent safety issue detected',
    summary:
      'This may involve immediate danger, violence, unlawful detention, corruption, or abuse. Safety comes before legal analysis.',
    immediateActions: [
      'Move to a safer place if you can do so without increasing danger.',
      'Call an official emergency number now if someone is at risk.',
      'Do not confront the person alone. Ask a trusted person or authority for help.',
      'Preserve evidence only if it is safe: messages, photos, names, dates, locations, and witnesses.',
    ],
    contacts: [
      {
        name: 'Rwanda National Police',
        phone: '112',
        reason: 'Immediate danger, assault, accident, or urgent security response.',
      },
      {
        name: 'Rwanda Investigation Bureau',
        phone: '166',
        reason: 'Report crimes, threats, fraud, abuse, or serious rights violations.',
      },
      {
        name: 'Isange One Stop Center',
        phone: '3029',
        reason: 'Gender-based violence, child abuse, and survivor support.',
      },
    ],
  };
}

export function buildEmergencyMarkdown(risk: EmergencyRisk) {
  if (risk.level !== 'urgent') return '';

  return `### Simple Explanation
${risk.summary}

### Relevant Law
I should not guess a specific law before checking the legal database. For now, this is an urgent safety response.

### Official Article
No article is cited here because the priority is immediate safety. Use the emergency contacts below first.

### Your Rights
- You have the right to seek immediate protection from official authorities.
- You have the right to report threats, violence, abuse, corruption, or unlawful detention.
- You have the right to preserve evidence and ask for help from a trusted person.

### Your Responsibilities
- Put safety first and contact emergency services if someone is in danger.
- Share your location and the facts clearly with the authority you contact.
- Keep records of names, dates, messages, injuries, witnesses, and official reference numbers.

### What NOT To Do
- Do not confront a dangerous person alone.
- Do not destroy messages, photos, or documents that may be evidence.
- Do not delay emergency contact if there is immediate danger.

### Evidence To Collect
- Photos or videos, only if safe.
- Messages, call logs, documents, names, dates, and locations.
- Medical records or witness contacts where relevant.

### Recommended Next Steps
${risk.immediateActions.map(action => `- ${action}`).join('\n')}

### Responsible Authority
${risk.contacts.map(contact => `- ${contact.name}: ${contact.phone} - ${contact.reason}`).join('\n')}`;
}
