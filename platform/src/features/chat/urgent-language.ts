/**
 * Deterministic urgent-language check.
 *
 * This is a safety aid, not a classifier and not legal analysis. It runs
 * locally before any answer request so an immediate-danger prompt is never
 * delayed behind a network call. The UI always offers a "continue anyway" path
 * because the check can be wrong in both directions.
 */
const URGENT_PATTERNS: RegExp[] = [
  // English
  /\b(?:immediate danger|in danger|someone is (?:hurt|attacking|threatening)|emergenc(?:y|ies))\b/i,
  /\b(?:is|are|was|were) (?:going to|about to) (?:kill|hurt|attack)\b/i,
  /\b(?:kill(?:ing)?|attack(?:ing)?|beat(?:ing)?|hit(?:ting)?|rap(?:e|ing)|strangl(?:e|ing))\s+(?:me|him|her|them|us)\b/i,
  /\b(?:threatened?|threatening) to (?:kill|hurt|rape|attack)\b/i,
  /\b(?:suicid(?:e|al)|kill myself|self[- ]harm|end my life)\b/i,
  /\b(?:domestic violence|sexual assault|child abuse|being abused)\b/i,
  /\b(?:call|contact) the police (?:now|immediately)\b/i,

  // Kinyarwanda
  /\b(?:akaga|ubutabazi bwihutirwa|arahamagara|aranshaka|arankubita|arandwara)\b/i,
  /\b(?:akubita|akubise|yankubise|yanshizemo|yampishije)\b/i,
  /\b(?:ihohoterwa|gufata ku ngufu|kwiyahura|kwishyira ku ndege)\b/i,
  /\b(?:yishwe|arapfa|turacyari mu kaga)\b/i,

  // French
  /\b(?:danger immédiat|en danger|urgence|il me tue|elle me tue)\b/i,
  /\b(?:menace de (?:mort|tuer)|il me frappe|elle me frappe|il m'agresse)\b/i,
  /\b(?:suicide|me suicider|viol|agression sexuelle|violence conjugale)\b/i,
  /\b(?:appelez la police (?:maintenant|immédiatement))\b/i,
];

export function containsUrgentLanguage(text: string): boolean {
  if (!text.trim()) return false;
  return URGENT_PATTERNS.some((pattern) => pattern.test(text));
}
