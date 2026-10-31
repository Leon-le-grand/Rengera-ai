# V2 product and UI

## Outcome

Help residents of Rwanda and Rwandans abroad locate and understand Rwandan legal sources. Support English, Kinyarwanda and French. Explain only what retrieved material supports, distinguish unknown from unavailable, surface original sources and classification-review scope, and make emergency help accessible before AI generation. Do not imply a complete corpus, legal representation or guaranteed outcome.

The V2 UI is built in `platform/` (React/Vite with TanStack Router); the legacy `web/` Next.js UI remains runnable and is the visual/interaction baseline until each route is ported. Do not add new V2 routes to `web/`.

## Target user journeys

| User | Journey | Permission boundary |
| --- | --- | --- |
| Visitor | Landing → question or library → answer/source → exact article | Public law reads and bounded question processing. |
| Citizen | Sign in → own settings, reminders and explicitly shared consultation | Every private record is scoped to verified identity. |
| Staff | Staff dashboard → submit source → inspect extraction and edit draft | No staff publication, account management or access to private citizen records. |
| Administrator | Review source → publish; invite or suspend staff; operate approved AI configurations | Verified permissions, strong recent authentication for privileged actions, audit. |
| Flutter user | Native sign-in → chat → source reader and urgent help | Same API and source semantics; current mobile is only a shell prototype. |
| USSD user | Short Kinyarwanda menu → legal lookup or urgent contacts | Authenticated gateway callback, no model in request loop. |

## Pages and reusable states

Target routes cover landing, authentication, chat, library, law/article reader, emergency, settings, deadlines, expiring share view, staff intake/jobs, admin review/staff/workflows/analytics, 403 and 404. See [full route inventory](RESEARCH.md#complete-ui-and-navigation-specification). Each route defines loading, empty, success, forbidden, expired, network and service-unavailable states. Chat separates sourced answer, abstention and emergency; reader distinguishes original source, extracted text and AI summary, and shows status and what was actually reviewed.

Use accessible semantic navigation, labelled controls, visible focus, keyboard and screen-reader support, reduced motion, contrast and text scaling. Design for narrow and wide screens, long Kinyarwanda/French labels, low connectivity and shared devices. Preserve the dark canvas `#09090b`, gold `#d8b485`, 3px standard radius and existing visual identity. Use `<Can>` and route guards for presentation; enforce all access in the API. Preserve the `WEB-001` redesign in `web/` as the porting reference; do not treat its unrun rendered review as accepted. The complete component, route and source-file map appears in [research](RESEARCH.md#ui-implementation-and-acceptance-map); target paths are under `platform/src/`, while legacy `web/` paths remain evidence for the current app.

## Acceptance

Users can ask without registration, identify the answer's evidence and limitations, open the cited exact article, recognize review/status uncertainty and reach urgent help. Administrator and staff routes must work when authorized and deny direct requests when not. Verify the rendered experience, accessibility and devices only with applicable permission; current documentation is not rendered UI evidence.
