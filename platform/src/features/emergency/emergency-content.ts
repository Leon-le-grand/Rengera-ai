import type { AnswerLanguage } from '@/i18n/languages';

export type ContactCategory =
  | 'police'
  | 'legalAid'
  | 'cyber'
  | 'labour'
  | 'socialSupport';

export type ContactDescriptionKey =
  | 'rib'
  | 'rnp'
  | 'maj'
  | 'ncsa'
  | 'mifotra'
  | 'isange';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string | null;
  altPhone: string | null;
  category: ContactCategory;
  descriptionKey: ContactDescriptionKey;
  tags: string[];
}

export interface EmergencyFlow {
  title: string;
  route: string;
  steps: string[];
}

export interface EmergencyStrings {
  pageTitle: string;
  intro: string;
  call112: string;
  whatToDoNow: string;
  steps: string[];
  flowsHeading: string;
  flows: EmergencyFlow[];
  searchLabel: string;
  searchPlaceholder: string;
  officialContactsHeading: string;
  primaryNumberLabel: string;
  alternativeNumberLabel: string;
  noContactsFound: string;
  generalNote: string;
  disclaimer: string;
  categoryLabels: Record<ContactCategory, string>;
  descriptions: Record<ContactDescriptionKey, string>;
}

/**
 * Contact data is copied from the current Rengera product guidance
 * (web/components/app/Emergency.tsx and web/lib/safety.ts). It is local and
 * deterministic: this page does not call the API or a model. Numbers and
 * services can change, so the page explicitly tells readers to verify them.
 */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'rnp',
    name: 'Rwanda National Police (RNP)',
    phone: '112',
    altPhone: '113 (Traffic)',
    category: 'police',
    descriptionKey: 'rnp',
    tags: ['emergency', 'traffic', 'accident', 'security', 'police', 'impanuka', 'umutekano'],
  },
  {
    id: 'rib',
    name: 'Rwanda Investigation Bureau (RIB)',
    phone: '166',
    altPhone: '+250 788 311 152',
    category: 'police',
    descriptionKey: 'rib',
    tags: ['crime', 'fraud', 'theft', 'assault', 'investigation', 'icyaha', 'uburiganya', 'vol', 'fraude'],
  },
  {
    id: 'isange',
    name: 'Isange One Stop Center',
    phone: '3029',
    altPhone: null,
    category: 'socialSupport',
    descriptionKey: 'isange',
    tags: ['gbv', 'abuse', 'violence', 'women', 'children', 'ihohoterwa', 'violences'],
  },
  {
    id: 'maj',
    name: 'MAJ (Access to Justice)',
    phone: null,
    altPhone: 'Find your district MAJ office',
    category: 'legalAid',
    descriptionKey: 'maj',
    tags: ['free lawyer', 'advice', 'district', 'civil', 'legal aid', 'ubufasha', 'avocat'],
  },
  {
    id: 'ncsa',
    name: 'National Cyber Security Authority (NCSA)',
    phone: '4045',
    altPhone: null,
    category: 'cyber',
    descriptionKey: 'ncsa',
    tags: ['cybercrime', 'hacking', 'privacy', 'online', 'fraud', 'umutekano'],
  },
  {
    id: 'mifotra',
    name: 'Ministry of Public Service and Labour (MIFOTRA)',
    phone: '4455',
    altPhone: null,
    category: 'labour',
    descriptionKey: 'mifotra',
    tags: ['work', 'employer', 'salary', 'contract', 'labour', 'akazi', 'umushahara', 'travail'],
  },
];

export const EMERGENCY_STRINGS: Record<AnswerLanguage, EmergencyStrings> = {
  en: {
    pageTitle: 'Emergency and official services',
    intro:
      'If someone is in immediate danger, call Rwanda National Police on 112 first. This page is available without an account and does not wait for the legal assistant.',
    call112: 'Call 112 now',
    whatToDoNow: 'What to do now',
    steps: [
      'Move to a safer place if you can do so without increasing danger.',
      'Call an official emergency number now if someone is at risk.',
      'Do not confront the person alone. Ask a trusted person or authority for help.',
      'Preserve evidence only if it is safe: messages, photos, names, dates, locations and witnesses.',
    ],
    flowsHeading: 'Find the right route',
    flows: [
      {
        title: 'Immediate danger or violence',
        route: 'Call 112 first',
        steps: [
          'Move to a safer place if possible.',
          'Share your location clearly.',
          'Avoid confronting the person alone.',
        ],
      },
      {
        title: 'Crime, threat, fraud or abuse',
        route: 'Contact RIB on 166',
        steps: [
          'Write down names, dates and locations.',
          'Keep messages and documents.',
          'Ask for a case or reference number.',
        ],
      },
      {
        title: 'Gender-based violence or child abuse',
        route: 'Contact Isange on 3029',
        steps: [
          'Seek medical and survivor support quickly.',
          'Preserve messages or other evidence if it is safe.',
          'Bring a trusted person if possible.',
        ],
      },
      {
        title: 'Workplace or pay concern',
        route: 'Contact MIFOTRA on 4455',
        steps: [
          'Keep your contract and payslips.',
          'Write a timeline of events.',
          'Do not sign unclear settlement papers under pressure.',
        ],
      },
    ],
    searchLabel: 'Search official emergency contacts',
    searchPlaceholder: 'Search by issue or agency…',
    officialContactsHeading: 'Official contacts',
    primaryNumberLabel: 'Primary number',
    alternativeNumberLabel: 'Alternative',
    noContactsFound:
      'No specific authority matched that search. For a general emergency, call 112.',
    generalNote: 'For a general emergency, call 112.',
    disclaimer:
      'These contacts are copied from current Rengera guidance and can change. Confirm them with the relevant official service. This page provides information, not legal representation or a guaranteed emergency response.',
    categoryLabels: {
      police: 'Police and investigation',
      legalAid: 'Legal aid',
      cyber: 'Cybersecurity',
      labour: 'Labour and employment',
      socialSupport: 'Social support',
    },
    descriptions: {
      rib: 'For reporting crimes, fraud and severe legal violations.',
      rnp: 'For immediate emergency assistance, traffic accidents and security.',
      maj: 'Free legal advice and assistance for citizens at district level.',
      ncsa: 'For reporting cyber incidents, data breaches and online fraud.',
      mifotra: 'For reporting severe labour violations and workplace issues.',
      isange: 'Support and justice for survivors of gender-based violence and child abuse.',
    },
  },
  rw: {
    pageTitle: 'Ubufasha bwihutirwa n’inzego zemewe',
    intro:
      'Niba hari umuntu uri mu kaga ako kanya, banza uhamagare Polisi y’u Rwanda kuri 112. Uru rupapuro ruboneka nta konti isabwa kandi ntiruteho gukoresha ubufasha bw’ubwenge buhangano.',
    call112: 'Hamagara 112 ubu',
    whatToDoNow: 'Icyo wakora ubu',
    steps: [
      'Niba bishoboka kandi bitazongera akaga, jya ahantu hatekanye.',
      'Hamagara nimero y’ubutabazi bwemewe ubu niba hari umuntu uri mu kaga.',
      'Irinde guhangana n’ukugirira nabi uri wenyine. Saba ubufasha bw’umuntu wizeye cyangwa ufite ububasha.',
      'Bika ibimenyetso gusa niba ari nta kaga: ubutumwa, amafoto, amazina, amatariki, aho byabereye n’ababibonye.',
    ],
    flowsHeading: 'Hitamo inzira ikwiye',
    flows: [
      {
        title: 'Akaga cyangwa ihohoterwa riri kuba ubu',
        route: 'Banza uhamagare 112',
        steps: [
          'Niba bishoboka, jya ahantu hatekanye.',
          'Sobanura neza aho uri.',
          'Irinde guhangana n’ukugirira nabi uri wenyine.',
        ],
      },
      {
        title: 'Icyaha, iterabwoba, uburiganya cyangwa ihohoterwa',
        route: 'Bwira RIB kuri 166',
        steps: [
          'Andika amazina, amatariki n’aho byabereye.',
          'Bika ubutumwa n’inyandiko.',
          'Saba nimero y’ikirego cyangwa dosiye.',
        ],
      },
      {
        title: 'Ihohoterwa rishingiye ku gitsina cyangwa iry’abana',
        route: 'Hamagara Isange kuri 3029',
        steps: [
          'Shaka ubuvuzi n’ubufasha bw’abahuye n’ihohoterwa vuba.',
          'Bika ubutumwa cyangwa ibimenyetso niba ari nta kaga.',
          'Niba bishoboka, jyana n’umuntu wizeye.',
        ],
      },
      {
        title: 'Ikibazo ku kazi cyangwa ku mushahara',
        route: 'Bwira MIFOTRA kuri 4455',
        steps: [
          'Bika amasezerano n’impapuro z’imishahara.',
          'Andika uko ibyabaye byakurikiranye.',
          'Ntushyire umukono ku masezerano udasobanukiwe ubihatirwa.',
        ],
      },
    ],
    searchLabel: 'Shakisha aho wahamagara mu gihe cy’ubutabazi',
    searchPlaceholder: 'Shakisha ikibazo cyangwa urwego…',
    officialContactsHeading: 'Aho wahamagara',
    primaryNumberLabel: 'Nomero ya mbere',
    alternativeNumberLabel: 'Indi nomero',
    noContactsFound:
      'Nta rwego rubonetse ruhuye n’ayo magambo washakishije. Mu gihe cy’ubutabazi rusange, hamagara 112.',
    generalNote: 'Mu gihe cy’ubutabazi rusange, hamagara 112.',
    disclaimer:
      'Aya mabwiriza yafashwe mu buyobozi buriho bw’Rengera kandi ashobora guhinduka. Yemeze ku rwego rubishinzwe. Uru rupapuro rutanga amakuru, ntabwo rutanga ubujyanama bw’amategeko cyangwa kwemezwa ko ubufasha buzaboneka ako kanya.',
    categoryLabels: {
      police: 'Polisi n’iperereza',
      legalAid: 'Ubufasha mu by’amategeko',
      cyber: 'Umutekano wo kuri interineti',
      labour: 'Umurimo n’akazi',
      socialSupport: 'Ubufasha ku baturage',
    },
    descriptions: {
      rib: 'Kumenyesha ibyaha, uburiganya n’andi makosa akomeye.',
      rnp: 'Ubufasha bwihutirwa, impanuka zo mu muhanda n’umutekano.',
      maj: 'Inama n’ubufasha mu by’amategeko ku baturage ku rwego rw’akarere.',
      ncsa: 'Kumenyesha ibibazo by’umutekano wo kuri interineti, amakuru yibwe n’uburiganya bwo kuri interineti.',
      mifotra: 'Kumenyesha ihohoterwa rikomeye ryo ku kazi n’ibibazo by’akazi.',
      isange: 'Ubufasha n’ubutabera ku bahuye n’ihohoterwa rishingiye ku gitsina cyangwa iry’abana.',
    },
  },
  fr: {
    pageTitle: 'Urgences et services officiels',
    intro:
      'En cas de danger immédiat, appelez d’abord la Police nationale du Rwanda au 112. Cette page est accessible sans compte et n’attend pas l’assistant juridique.',
    call112: 'Appeler le 112',
    whatToDoNow: 'Que faire maintenant',
    steps: [
      'Mettez-vous à l’abri si possible, sans augmenter le danger.',
      'Appelez immédiatement un numéro d’urgence officiel si quelqu’un est en danger.',
      'Évitez de confronter seul la personne. Demandez l’aide d’une personne de confiance ou d’une autorité.',
      'Conservez les preuves seulement si cela ne présente aucun risque : messages, photos, noms, dates, lieux et témoins.',
    ],
    flowsHeading: 'Trouver le bon interlocuteur',
    flows: [
      {
        title: 'Danger immédiat ou violence',
        route: 'Appelez d’abord le 112',
        steps: [
          'Mettez-vous à l’abri si possible.',
          'Indiquez clairement où vous vous trouvez.',
          'Évitez de confronter seul la personne.',
        ],
      },
      {
        title: 'Crime, menace, fraude ou abus',
        route: 'Contactez le RIB au 166',
        steps: [
          'Notez les noms, dates et lieux.',
          'Conservez les messages et documents.',
          'Demandez un numéro de dossier ou de référence.',
        ],
      },
      {
        title: 'Violences basées sur le genre ou abus sur enfant',
        route: 'Contactez Isange au 3029',
        steps: [
          'Demandez rapidement une aide médicale et un soutien spécialisé.',
          'Conservez les messages ou preuves si cela ne présente aucun risque.',
          'Faites-vous accompagner par une personne de confiance si possible.',
        ],
      },
      {
        title: 'Problème au travail ou de rémunération',
        route: 'Contactez MIFOTRA au 4455',
        steps: [
          'Conservez votre contrat et vos bulletins de paie.',
          'Notez la chronologie des faits.',
          'Ne signez pas sous pression un accord que vous ne comprenez pas.',
        ],
      },
    ],
    searchLabel: 'Rechercher des contacts officiels d’urgence',
    searchPlaceholder: 'Rechercher un problème ou un service…',
    officialContactsHeading: 'Contacts officiels',
    primaryNumberLabel: 'Numéro principal',
    alternativeNumberLabel: 'Autre numéro',
    noContactsFound:
      'Aucun service précis ne correspond à cette recherche. Pour toute urgence, appelez le 112.',
    generalNote: 'Pour toute urgence, appelez le 112.',
    disclaimer:
      'Ces contacts proviennent des indications actuelles de Rengera et peuvent changer. Vérifiez-les auprès du service officiel concerné. Cette page fournit des informations, pas une représentation juridique ni une réponse d’urgence garantie.',
    categoryLabels: {
      police: 'Police et enquête',
      legalAid: 'Aide juridique',
      cyber: 'Cybersécurité',
      labour: 'Travail et emploi',
      socialSupport: 'Soutien social',
    },
    descriptions: {
      rib: 'Pour signaler des crimes, fraudes et violations graves de la loi.',
      rnp: 'Pour les urgences immédiates, accidents de la route et questions de sécurité.',
      maj: 'Conseils et assistance juridiques gratuits pour les citoyens au niveau du district.',
      ncsa: 'Pour signaler les incidents informatiques, fuites de données et fraudes en ligne.',
      mifotra: 'Pour signaler les violations graves du droit du travail et les problèmes professionnels.',
      isange: 'Soutien et justice pour les victimes de violences basées sur le genre et de maltraitance des enfants.',
    },
  },
};
