# 05 — Design system and redesign brief

## Approved visual foundation

The repository instructions define the design system; the redesign retains these tokens unless the user approves a brand change.

| Token | Value / use |
| --- | --- |
| Dark canvas | `#09090b` |
| Accent gold | `#d8b485` |
| Standard corner radius | `3px` |
| Typography | Squada One wordmark; web currently uses Jakarta Sans tokens, Flutter uses Manrope. Body-family alignment remains a redesign decision. |
| Mobile palette source | Flutter `RengeraColors` in `mobile/lib/theme/rengera_theme.dart` |

Use existing CSS/theme variables and Flutter theme values rather than adding isolated colors or radii. Check `web/app/globals.css` and Flutter theme as source before editing.

**Current drift to resolve during redesign:** web styles include a larger radius ladder and rounded components beyond 3px; web and Flutter use different body font families; Flutter defines light palette values while its app currently selects dark theme only. The 3px radius and dark/gold values remain the governing instructions; do not silently standardize optional light-theme values without recording the choice.

## Experience direction

**Proposed redesign:** source-first, citizen-first, calm and direct. The surface should feel like a trusted public information tool: one primary action, visible evidence, clear limits, and no invented statistics or implied legal guarantee. Reduce decorative competition when it obscures question entry, source links, law status or urgent help. Preserve the existing identity and dark/gold contrast.

### Information hierarchy

1. Primary citizen action: ask a legal question or search the law library.
2. Answer: concise orientation and next step, grounded in retrieved source.
3. Evidence: law title/status, article citation, exact source text, review/integrity signal.
4. Safety: urgent help visible without scrolling through an answer.
5. Secondary: language, account, saved items, deadlines, product information.
6. Administration: separate and visibly privileged workspace.

### Interaction patterns

- Keep language selection persistent and visible near question entry and answer.
- Use explicit loading, no-results, unreviewed, unavailable, citation-check and error states.
- Make source chips/cards open the exact referenced article and preserve a visible path back to the answer.
- Keep emergency routing distinguishable from ordinary legal-information responses.
- Use native semantic buttons/links/forms; avoid clickable non-semantic containers for primary actions.
- Use motion to support orientation only; honor reduced-motion preferences and avoid delaying critical content.

## Responsive and accessibility requirements

- Design for narrow phone, tablet and wide desktop; no horizontal page scrolling for primary content.
- Keep question entry, primary navigation, source access and urgent help reachable by keyboard and touch.
- Preserve visible focus, clear labels, semantic headings, meaningful image alternatives and live status announcements for async chat.
- Verify text and control contrast, zoom/text scaling, screen-reader names, reduced motion, and touch target spacing in actual UI.
- Do not use color alone for law status, review status, errors or emergency priority.

## Cross-platform parity

Flutter mirrors approved brand tokens through `RengeraColors`, but current mobile screens are a prototype and are not feature-parity evidence. Design the web experience first; when mobile implementation begins, match terminology, hierarchy and critical safety/source states while using native platform patterns where appropriate.

## Redesign acceptance checklist

- [ ] Citizen can identify the main action immediately and distinguish chat from library navigation.
- [ ] A sourced answer, abstention, provider error and emergency route have distinct visible states.
- [ ] Law status, human review status and citations are understandable without relying on color.
- [ ] The exact cited article can be opened and its provenance is visible.
- [ ] Main flows work at phone/tablet/desktop widths and with keyboard/screen-reader navigation.
- [ ] Existing authentication, access-control and data contracts remain enforced.
- [ ] Existing brand tokens are reused; any exception has an approved decision record.
