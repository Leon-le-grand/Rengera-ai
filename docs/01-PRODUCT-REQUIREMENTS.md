# 01 — Product requirements

> **Current baseline.** The user subsequently requested the V2 frontend, dedicated server, staff RBAC and bounded agent direction in [`docs/v2/`](v2/README.md). V2 is under construction in `platform/` and `server/`, not shipped. Current product and safety constraints below continue unless explicitly superseded.

## Product outcome

Rengera AI is a Rwanda-focused legal-literacy product. Its product direction is to help people locate relevant law, understand the exact source provision in accessible language, and know when the system cannot safely answer. The source of authority remains the official law, not a generated answer.

**Approved constraints:** the repository is configured for English, Kinyarwanda and French; the legal text must remain faithful to source; answers need retrievable sources; urgent-risk routing must not depend on AI. **Current implementation:** the web application includes a citizen assistant, library/reader, account features, administrator ingestion/review surfaces and a USSD route. Flutter currently implements onboarding, login and a shell prototype only.

The launch brief, measurable first-release boundary and approved visual reference remain open. The user has requested the V2 server and staff role; this does not authorize billing or legal representation.

## Users and primary workflows

| User | Need | Current or intended workflow |
| --- | --- | --- |
| Citizen / small-business owner | Find a relevant rule and understand what the source says | Ask in a supported language → inspect a grounded explanation → open cited law/article → save or follow up where available |
| Person facing an urgent or unsafe situation | Reach relevant official help quickly | Describe the situation → deterministic detection → clear local contact guidance without waiting on model output |
| Administrator / ingestion operator | Add and maintain legal source material safely | Upload/paste source → validate extraction/classification → inspect provenance and integrity → review/approve → publish to public readers |
| Feature-phone user | Access a constrained legal information flow | USSD menu/session → short retrieved information or routing; no LLM call in the USSD loop |
| Mobile app user | Use the citizen product on Android/iOS and, once agreed, offline | Flutter onboarding/auth shell exists; chat, law library and offline workflows remain planned |

## Redesign outcomes

The redesign should make the citizen journey obvious and trustworthy without changing the source-fidelity/security contract:

1. Put one clear question entry point at the center of the citizen workspace and make supported languages explicit.
2. Present answers with visible sources, article deep links, law status and review status. Make unsupported/empty retrieval an honest stopping point.
3. Make urgent help distinct and fast to reach; do not hide it behind a menu or an AI conversation.
4. Give the law library a clear path from search/category to law overview to exact article and source provenance.
5. Separate citizen navigation from administrator tools and clearly distinguish signed-in citizen and administrator states.
6. Adapt layouts and controls to phone, tablet and desktop while keeping the existing dark/gold brand tokens.

These are product/design acceptance outcomes for the user-authorized redesign. New commercial capabilities, new legal services, and backend platform changes remain outside scope unless explicitly approved.

## Functional requirements

- **PR-01 Grounded answers:** retrieve from the local legal corpus before model generation; cite sources; abstain if no adequate source exists.
- **PR-02 Source fidelity:** preserve extracted source and exact article text separately from classification, summaries and translations.
- **PR-03 Languages:** support EN/RW/FR in the web product and do not imply parity in Flutter until implemented.
- **PR-04 Safety:** deterministic emergency detection returns configured official contacts before retrieval/model calls.
- **PR-05 Public library:** expose currently stored legal materials with status and source/review indicators; do not claim corpus completeness.
- **PR-06 Administration:** privileged write paths require verified administrator session and strict data validation.
- **PR-07 Accounts and personal data:** keep user-owned records scoped to their authenticated owner; public access remains read-only.
- **PR-08 USSD:** keep the response constrained and RPC-based; emergency routing is prioritized.
- **PR-09 Mobile:** provide a native Flutter client; offline storage, sync and feature parity are future work until implemented and accepted.

## Non-goals and explicit boundaries

- The product does not issue legal representation or guarantee a legal outcome.
- Do not add a payment system, subscriptions, institutional tenant model, lawyer network, or additional jurisdiction/language without a separate decision.
- V2 introduces a dedicated server and bounded agent workflows through the planned migration; preserve the existing app and authorization while each slice is transitioned.
- Do not describe planned OCR, durable queues, production corpus coverage, vector search, push delivery, or complete mobile offline support as current capabilities.
- Do not load or modify production data as part of a UI or documentation task.

## Success and acceptance

For the redesign, acceptance is observable in the running UI: a citizen can start a question, choose/read the intended language, understand an answer's evidence and limitations, open a cited article, recognize review/status state, and reach urgent help. Core flows remain usable on narrow and wide screens and with keyboard/screen reader navigation. No acceptance criterion depends on AI fluency alone.

Product-level launch measures are **open**: corpus coverage and freshness, reviewed-law percentage, answer support rate, abstention quality, language quality, USSD completion, latency, accessibility target, and operational ownership. Do not invent targets.

## Open inputs

- First public-release boundary and intended primary user segment.
- Which source corpus is complete enough to publish, who owns updates, and who can perform legal review.
- Data retention, privacy contact, incident response and legal counsel review for Rwanda operations.
- Whether mobile must support offline downloads/sync in first release, and what source/status must be cached.
- Whether the marketing page, citizen workspace and account flows should have separate URLs/routes.
- Actual pricing, distribution, support, and Play Store/App Store release decisions.
