/**
 * Answer languages.
 *
 * Shared by the server (to build the model instruction) and by the browser (for
 * the interface strings), so the UI and the answer can never disagree about
 * which language is active.
 */

export const ANSWER_LANGUAGES = ['en', 'rw', 'fr'] as const;

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
};

export function isAnswerLanguage(value: unknown): value is AnswerLanguage {
  return typeof value === 'string' && (ANSWER_LANGUAGES as readonly string[]).includes(value);
}

export function resolveAnswerLanguage(value: unknown): AnswerLanguage {
  return isAnswerLanguage(value) ? value : 'en';
}

type Strings = {
  greeting: string;
  startTitle: string;
  startDescription: string;
  answerLanguageLabel: string;
  sourcePathTitle: string;
  sourcePathQuestion: string;
  sourcePathLaw: string;
  sourcePathArticle: string;
  sourcePathNote: string;
  sourcesHeading: string;
  sourcesUsed: string;
  sourcesRetrieved: string;
  lawStatusLabel: string;
  classificationReviewLabel: string;
  classificationReviewed: string;
  classificationPending: string;
  classificationUnavailable: string;
  statusActive: string;
  statusAmended: string;
  statusRepealed: string;
  statusUnknown: string;
  openLawLibrary: string;
  urgentHelp: string;
  urgentGuidance: string;
  emergencyPageTitle: string;
  emergencyPageIntro: string;
  searchContactsLabel: string;
  call112: string;
  searchContactsPlaceholder: string;
  whatToDoNow: string;
  officialContactsHeading: string;
  primaryNumberLabel: string;
  alternativeNumberLabel: string;
  noContactsFound: string;
  generalEmergencyNote: string;
  emergencyFlows: {
    immediateDanger: { title: string; route: string; steps: [string, string, string] };
    reportIssue: { title: string; route: string; steps: [string, string, string] };
    gbv: { title: string; route: string; steps: [string, string, string] };
    workplace: { title: string; route: string; steps: [string, string, string] };
  };
  emergencyContactCategories: { police: string; legalAid: string; cyber: string; labour: string; socialSupport: string };
  emergencyContactDescriptions: { rib: string; rnp: string; maj: string; ncsa: string; mifotra: string; isange: string };
  noCitationTitle: string;
  noCitationDescription: string;
  connectionError: string;
  questionInputLabel: string;
  sendMessage: string;
  sendingMessage: string;
  trySample: string;
  newQuestion: string;
  previousChats: string;
  closeHistory: string;
  deleteChat: string;
  openEmergencyContacts: string;
  openArticle: string;
  officialSource: string;
  conversation: string;
  noPreviousChats: string;
  questionSingular: string;
  questionPlural: string;
  openDeadlines: string;
  workspaceTitle: string;
  consultationTitle: string;
  dismissNotice: string;
  askArticleFollowUp: string;
  followUpPrompt: string;
  creatingLink: string;
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
  prompts: { tenant: string; employment: string; privacy: string; traffic: string };
};

export const UI_STRINGS: Record<AnswerLanguage, Strings> = {
  en: {
    greeting:
      'Welcome to Rengera. Ask about a situation or a law article.',
    startTitle: 'What does Rwandan law say about your situation?',
    startDescription:
      'Describe what happened or ask about an article. Rengera will look for relevant law and show the source details it can retrieve.',
    answerLanguageLabel: 'Answer language',
    sourcePathTitle: 'From question to source',
    sourcePathQuestion: 'Your question',
    sourcePathLaw: 'Relevant law',
    sourcePathArticle: 'Article citation',
    sourcePathNote: 'If the available sources do not support an answer, Rengera will say so.',
    sourcesHeading: 'Sources returned',
    sourcesUsed: 'Sources used for this answer',
    sourcesRetrieved: 'Sources found; answer unavailable',
    lawStatusLabel: 'Law status',
    classificationReviewLabel: 'Classification review',
    classificationReviewed: 'Classification reviewed',
    classificationPending: 'Classification not reviewed',
    classificationUnavailable: 'Review status unavailable',
    statusActive: 'Active',
    statusAmended: 'Amended',
    statusRepealed: 'Repealed',
    statusUnknown: 'Status not recorded',
    openLawLibrary: 'Open law library',
    urgentHelp: 'Urgent help',
    urgentGuidance: 'If someone is in immediate danger, call 112 now.',
    emergencyPageTitle: 'Emergency and official services',
    emergencyPageIntro: 'If someone is in immediate danger, call Rwanda National Police on 112 first. Use this page to find the right official service.',
    searchContactsLabel: 'Search official emergency contacts',
    call112: 'Call 112',
    searchContactsPlaceholder: 'Search by issue or agency…',
    whatToDoNow: 'What to do now',
    officialContactsHeading: 'Official contacts',
    primaryNumberLabel: 'Primary number',
    alternativeNumberLabel: 'Alternative',
    noContactsFound: 'No specific authority matched that search.',
    generalEmergencyNote: 'For general emergencies, call 112.',
    emergencyFlows: {
      immediateDanger: { title: 'Immediate danger or violence', route: 'Call 112 first', steps: ['Move to a safer place if possible.', 'Share your location clearly.', 'Avoid confronting the person alone.'] },
      reportIssue: { title: 'Crime, threat, fraud, or abuse', route: 'Contact RIB on 166', steps: ['Write down names, dates, and locations.', 'Keep messages and documents.', 'Ask for a case/reference number.'] },
      gbv: { title: 'Gender-based violence or child abuse', route: 'Contact Isange on 3029', steps: ['Seek medical and survivor support quickly.', 'Preserve messages or other evidence if safe.', 'Bring a trusted person if possible.'] },
      workplace: { title: 'Workplace or pay concern', route: 'Contact MIFOTRA on 4455', steps: ['Keep your contract and payslips.', 'Write a timeline of events.', 'Do not sign unclear settlement papers under pressure.'] },
    },
    emergencyContactCategories: { police: 'Police and investigation', legalAid: 'Legal aid', cyber: 'Cybersecurity', labour: 'Labour and employment', socialSupport: 'Social support' },
    emergencyContactDescriptions: {
      rib: 'For reporting crimes, fraud, and severe legal violations.',
      rnp: 'For immediate emergency assistance, traffic accidents, and security.',
      maj: 'Free legal advice and assistance for citizens at the district level.',
      ncsa: 'For reporting cyber incidents, data breaches, and online fraud.',
      mifotra: 'For reporting severe labour violations and workplace issues.',
      isange: 'Support and justice for survivors of gender-based violence and child abuse.',
    },
    noCitationTitle: 'No law citation was returned',
    noCitationDescription:
      'This response has no linked law or article. Search the library or try a question with a law or article number.',
    connectionError: 'The request did not complete. Check your connection and try again.',
    questionInputLabel: 'Your question',
    sendMessage: 'Send message',
    sendingMessage: 'Sending message',
    trySample: 'Start with an example',
    newQuestion: 'New question',
    previousChats: 'Previous chats',
    closeHistory: 'Close previous chats',
    deleteChat: 'Delete chat',
    openEmergencyContacts: 'Emergency contacts',
    openArticle: 'Open article',
    officialSource: 'Official source',
    conversation: 'Conversation',
    noPreviousChats: 'No previous chats yet.',
    questionSingular: 'question',
    questionPlural: 'questions',
    openDeadlines: 'Open deadlines',
    workspaceTitle: 'Rengera · Legal information',
    consultationTitle: 'Rengera · Consultation',
    dismissNotice: 'Dismiss notice',
    askArticleFollowUp: 'Ask a follow-up about this article',
    followUpPrompt: 'Explain this article in simpler words: ',
    creatingLink: 'Creating link…',
    placeholder: 'Ask about your situation or a law article…',
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
    prompts: {
      tenant: 'My landlord locked me out. What can I do?',
      employment: 'My employer has not paid my overtime. What can I do?',
      privacy: 'Someone shared my private photos without consent. What can I do?',
      traffic: 'An officer asked me for a bribe during a traffic stop. What can I do?',
    },
  },
  rw: {
    greeting:
      'Muraho! Baza Rengera ikibazo ku mategeko cyangwa ku ngingo y’itegeko.',
    startTitle: 'Amategeko y’u Rwanda avuga iki ku kibazo cyawe?',
    startDescription:
      'Sobanura ibyabaye cyangwa ubaze ku ngingo y’itegeko. Rengera izashaka amategeko afitanye isano kandi ikwereke amasoko yabonetse.',
    answerLanguageLabel: 'Ururimi rw’igisubizo',
    sourcePathTitle: 'Kuva ku kibazo kugera ku isoko',
    sourcePathQuestion: 'Ikibazo cyawe',
    sourcePathLaw: 'Itegeko rifitanye isano',
    sourcePathArticle: 'Ingingo y’itegeko',
    sourcePathNote: 'Niba amasoko ahari adashyigikira igisubizo, Rengera izakubwira.',
    sourcesHeading: 'Amasoko yabonetse',
    sourcesUsed: 'Amasoko yashingiweho mu gisubizo',
    sourcesRetrieved: 'Amasoko yabonetse; igisubizo ntikiboneka',
    lawStatusLabel: 'Imimerere y’itegeko',
    classificationReviewLabel: 'Isuzuma ry’ibyiciro',
    classificationReviewed: 'Ibyiciro byasuzumwe',
    classificationPending: 'Ibyiciro ntibirasesuzumwa',
    classificationUnavailable: 'Ntabwo byashobotse kumenya imimerere y’isuzuma',
    statusActive: 'Rikurikizwa',
    statusAmended: 'Ryavuguruwe',
    statusRepealed: 'Ryakuweho',
    statusUnknown: 'Ntabwo byanditswe',
    openLawLibrary: 'Fungura isomero ry’amategeko',
    urgentHelp: 'Ubufasha bwihutirwa',
    urgentGuidance: 'Niba hari umuntu uri mu kaga ako kanya, hamagara 112 ubu.',
    emergencyPageTitle: 'Ubufasha bwihutirwa n’inzego zemewe',
    emergencyPageIntro: 'Niba hari umuntu uri mu kaga ako kanya, banza uhamagare Polisi y’u Rwanda kuri 112. Koresha uru rupapuro ushake urwego rubishinzwe.',
    searchContactsLabel: 'Shakisha aho wahamagara mu gihe cy’ubutabazi',
    call112: 'Hamagara 112',
    searchContactsPlaceholder: 'Shakisha ikibazo cyangwa urwego…',
    whatToDoNow: 'Icyo wakora ubu',
    officialContactsHeading: 'Aho wahamagara',
    primaryNumberLabel: 'Nomero ya mbere',
    alternativeNumberLabel: 'Indi nomero',
    noContactsFound: 'Nta rwego rubonetse ruhuye n’ayo magambo washakishije.',
    generalEmergencyNote: 'Mu gihe cy’ubutabazi rusange, hamagara 112.',
    emergencyFlows: {
      immediateDanger: { title: 'Akaga cyangwa ihohoterwa riri kuba ubu', route: 'Banza uhamagare 112', steps: ['Niba bishoboka, jya ahantu hatekanye.', 'Sobanura neza aho uri.', 'Irinde guhangana n’ukugirira nabi uri wenyine.'] },
      reportIssue: { title: 'Icyaha, iterabwoba, uburiganya cyangwa ihohoterwa', route: 'Bwira RIB kuri 166', steps: ['Andika amazina, amatariki n’aho byabereye.', 'Bika ubutumwa n’inyandiko.', 'Saba nimero y’ikirego cyangwa dosiye.'] },
      gbv: { title: 'Ihohoterwa rishingiye ku gitsina cyangwa iry’abana', route: 'Hamagara Isange kuri 3029', steps: ['Shaka ubuvuzi n’ubufasha bw’abahuye n’ihohoterwa vuba.', 'Bika ubutumwa cyangwa ibimenyetso niba ari nta kaga.', 'Niba bishoboka, jyana n’umuntu wizeye.'] },
      workplace: { title: 'Ikibazo ku kazi cyangwa ku mushahara', route: 'Bwira MIFOTRA kuri 4455', steps: ['Bika amasezerano n’impapuro z’imishahara.', 'Andika uko ibyabaye byakurikiranye.', 'Ntushyire umukono ku masezerano udasobanukiwe ubihatirwa.'] },
    },
    emergencyContactCategories: { police: 'Polisi n’iperereza', legalAid: 'Ubufasha mu by’amategeko', cyber: 'Umutekano wo kuri interineti', labour: 'Umurimo n’akazi', socialSupport: 'Ubufasha ku baturage' },
    emergencyContactDescriptions: {
      rib: 'Kumenyesha ibyaha, uburiganya n’andi makosa akomeye.',
      rnp: 'Ubufasha bwihutirwa, impanuka zo mu muhanda n’umutekano.',
      maj: 'Inama n’ubufasha mu by’amategeko ku baturage ku rwego rw’akarere.',
      ncsa: 'Kumenyesha ibibazo by’umutekano wo kuri interineti, amakuru yibwe n’uburiganya bwo kuri interineti.',
      mifotra: 'Kumenyesha ihohoterwa rikomeye ryo ku kazi n’ibibazo by’akazi.',
      isange: 'Ubufasha n’ubutabera ku bahuye n’ihohoterwa rishingiye ku gitsina cyangwa iry’abana.',
    },
    noCitationTitle: 'Nta ngingo y’itegeko yagaragajwe',
    noCitationDescription:
      'Iki gisubizo nta tegeko cyangwa ngingo cyerekana nk’isoko. Shakisha mu isomero cyangwa wongere ubaze uvuga nimero y’itegeko cyangwa ingingo.',
    connectionError: 'Icyifuzo nticyageze ku musozo. Reba interineti wongere ugerageze.',
    questionInputLabel: 'Ikibazo cyawe',
    sendMessage: 'Ohereza ikibazo',
    sendingMessage: 'Ikibazo kirimo koherezwa',
    trySample: 'Tangirira ku kibazo cy’icyitegererezo',
    newQuestion: 'Ikibazo gishya',
    previousChats: 'Ibiganiro byabanje',
    closeHistory: 'Funga ibiganiro byabanje',
    deleteChat: 'Siba ikiganiro',
    openEmergencyContacts: 'Imibare y’ubutabazi',
    openArticle: 'Fungura ingingo y’itegeko',
    officialSource: 'Isoko ryemewe',
    conversation: 'Ikiganiro',
    noPreviousChats: 'Nta biganiro byabanje biraboneka.',
    questionSingular: 'ikibazo',
    questionPlural: 'ibibazo',
    openDeadlines: 'Fungura igihe ntarengwa',
    workspaceTitle: 'Rengera · Amakuru ku mategeko',
    consultationTitle: 'Rengera · Ikiganiro',
    dismissNotice: 'Funga ubutumwa',
    askArticleFollowUp: 'Baza ikindi kibazo kuri iyi ngingo',
    followUpPrompt: 'Nsobanurira iyi ngingo mu magambo yoroshye: ',
    creatingLink: 'Ihuza ririmo gukorwa…',
    placeholder: 'Baza ku kibazo ufite cyangwa ku ngingo y’itegeko…',
    disclaimer:
      'Rengera AI ishobora gukora amakosa. Iby’ingenzi ubigenzure mu masoko yemewe.',
    generating: 'Ndasuzuma amasoko y’amategeko…',
    share: 'Sangira igisubizo',
    savePdf: 'Bika nka PDF',
    newChat: 'Ikiganiro gishya',
    helpful: 'Byaragufashije',
    notHelpful: 'Ntibyagufashije',
    thanks: 'Murakoze — igitekerezo cyawe kizafasha gusuzuma ibisubizo.',
    scenarios: {
      tenant: 'Ikibazo cy’ubukode',
      employment: 'Akazi',
      privacy: 'Ubuzima bwite',
      traffic: 'Umuhanda',
    },
    prompts: {
      tenant: 'Nyir’inzu yanyimye uburenganzira bwo kwinjira. Nakora iki?',
      employment: 'Umukoresha yanze kumpa amafaranga y’amasaha y’ikirenga. Nakora iki?',
      privacy: 'Umuntu yasangije amafoto yanjye bwite atabanje kubinsabira uruhushya. Nakora iki?',
      traffic: 'Umupolisi yansabye ruswa mu gihe yari ampagaritse. Nakora iki?',
    },
  },
  fr: {
    greeting:
      'Bonjour ! Posez une question sur une situation ou un article de loi.',
    startTitle: 'Que dit le droit rwandais sur votre situation ?',
    startDescription:
      'Décrivez les faits ou posez une question sur un article. Rengera recherchera les lois pertinentes et affichera les sources disponibles.',
    answerLanguageLabel: 'Langue de réponse',
    sourcePathTitle: 'De la question à la source',
    sourcePathQuestion: 'Votre question',
    sourcePathLaw: 'Loi pertinente',
    sourcePathArticle: 'Référence de l’article',
    sourcePathNote: 'Si les sources disponibles ne permettent pas de répondre, Rengera l’indiquera.',
    sourcesHeading: 'Sources retournées',
    sourcesUsed: 'Sources utilisées pour cette réponse',
    sourcesRetrieved: 'Sources trouvées ; réponse indisponible',
    lawStatusLabel: 'État de la loi',
    classificationReviewLabel: 'Révision de la classification',
    classificationReviewed: 'Classification examinée',
    classificationPending: 'Classification non examinée',
    classificationUnavailable: 'État de la révision indisponible',
    statusActive: 'En vigueur',
    statusAmended: 'Modifiée',
    statusRepealed: 'Abrogée',
    statusUnknown: 'État non indiqué',
    openLawLibrary: 'Ouvrir la bibliothèque des lois',
    urgentHelp: 'Aide urgente',
    urgentGuidance: 'En cas de danger immédiat, appelez le 112.',
    emergencyPageTitle: 'Urgences et services officiels',
    emergencyPageIntro: 'En cas de danger immédiat, appelez d’abord la Police nationale du Rwanda au 112. Utilisez cette page pour trouver le service officiel adapté.',
    searchContactsLabel: 'Rechercher des contacts officiels d’urgence',
    call112: 'Appeler le 112',
    searchContactsPlaceholder: 'Rechercher un problème ou un service…',
    whatToDoNow: 'Que faire maintenant',
    officialContactsHeading: 'Contacts officiels',
    primaryNumberLabel: 'Numéro principal',
    alternativeNumberLabel: 'Autre numéro',
    noContactsFound: 'Aucun service précis ne correspond à cette recherche.',
    generalEmergencyNote: 'Pour toute urgence, appelez le 112.',
    emergencyFlows: {
      immediateDanger: { title: 'Danger immédiat ou violence', route: 'Appelez d’abord le 112', steps: ['Mettez-vous à l’abri si possible.', 'Indiquez clairement où vous vous trouvez.', 'Évitez de confronter seul la personne.'] },
      reportIssue: { title: 'Crime, menace, fraude ou abus', route: 'Contactez le RIB au 166', steps: ['Notez les noms, dates et lieux.', 'Conservez les messages et documents.', 'Demandez un numéro de dossier ou de référence.'] },
      gbv: { title: 'Violences basées sur le genre ou abus sur enfant', route: 'Contactez Isange au 3029', steps: ['Demandez rapidement une aide médicale et un soutien spécialisé.', 'Conservez les messages ou preuves si cela ne présente aucun risque.', 'Faites-vous accompagner par une personne de confiance si possible.'] },
      workplace: { title: 'Problème au travail ou de rémunération', route: 'Contactez MIFOTRA au 4455', steps: ['Conservez votre contrat et vos bulletins de paie.', 'Notez la chronologie des faits.', 'Ne signez pas sous pression un accord que vous ne comprenez pas.'] },
    },
    emergencyContactCategories: { police: 'Police et enquête', legalAid: 'Aide juridique', cyber: 'Cybersécurité', labour: 'Travail et emploi', socialSupport: 'Soutien social' },
    emergencyContactDescriptions: {
      rib: 'Pour signaler des crimes, fraudes et violations graves de la loi.',
      rnp: 'Pour les urgences immédiates, accidents de la route et questions de sécurité.',
      maj: 'Conseils et assistance juridiques gratuits pour les citoyens au niveau du district.',
      ncsa: 'Pour signaler les incidents informatiques, fuites de données et fraudes en ligne.',
      mifotra: 'Pour signaler les violations graves du droit du travail et les problèmes professionnels.',
      isange: 'Soutien et justice pour les victimes de violences basées sur le genre et de maltraitance des enfants.',
    },
    noCitationTitle: 'Aucune citation de loi n’a été retournée',
    noCitationDescription:
      'Cette réponse ne contient aucun lien vers une loi ou un article. Consultez la bibliothèque ou ajoutez un numéro de loi ou d’article à votre question.',
    connectionError: 'La demande n’a pas abouti. Vérifiez votre connexion et réessayez.',
    questionInputLabel: 'Votre question',
    sendMessage: 'Envoyer le message',
    sendingMessage: 'Envoi du message',
    trySample: 'Commencer par un exemple',
    newQuestion: 'Nouvelle question',
    previousChats: 'Conversations précédentes',
    closeHistory: 'Fermer les conversations précédentes',
    deleteChat: 'Supprimer la conversation',
    openEmergencyContacts: 'Contacts d’urgence',
    openArticle: 'Ouvrir l’article',
    officialSource: 'Source officielle',
    conversation: 'Conversation',
    noPreviousChats: 'Aucune conversation précédente.',
    questionSingular: 'question',
    questionPlural: 'questions',
    openDeadlines: 'Voir les échéances',
    workspaceTitle: 'Rengera · Informations juridiques',
    consultationTitle: 'Rengera · Consultation',
    dismissNotice: 'Fermer le message',
    askArticleFollowUp: 'Poser une question sur cet article',
    followUpPrompt: 'Expliquez cet article en termes simples : ',
    creatingLink: 'Création du lien…',
    placeholder: 'Posez une question sur votre situation ou un article de loi…',
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
      tenant: 'Problème de location',
      employment: 'Travail',
      privacy: 'Vie privée',
      traffic: 'Circulation',
    },
    prompts: {
      tenant: 'Mon propriétaire m’a empêché d’entrer. Que puis-je faire ?',
      employment: 'Mon employeur refuse de payer mes heures supplémentaires. Que puis-je faire ?',
      privacy: 'Quelqu’un a partagé mes photos privées sans mon accord. Que puis-je faire ?',
      traffic: 'Un agent m’a demandé un pot-de-vin lors d’un contrôle routier. Que puis-je faire ?',
    },
  },
};
