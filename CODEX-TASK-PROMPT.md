# Rengera AI — authorized work session

Start or resume the authorized implementation session for Rengera AI.

Read `AGENTS.md`, `TASKS.md`, and `MEMORY.md`. Inspect repository status and actual implementation, then read the specifications relevant to the selected task. Reconcile stale notes against approved decisions and code evidence. Preserve unrelated work and do not restart completed slices.

Resume a valid `DOING` task; otherwise select `NEXT`, or the earliest ready `TODO`. Respect dependencies. Implement one complete slice, verify its acceptance criteria, record actual outcomes, update `TASKS.md` and the concise checkpoint in `MEMORY.md`, then continue to the next ready approved task while this authorized session remains active.

A user-selected task overrides queue priority while retaining dependencies and constraints. If the user limits this session to one task, stop after that task.

Ask only for decisions or permissions that materially affect scope, architecture, correctness, or an external/live action. Do not invent missing product facts, expose secrets, bypass failed gates, incur unapproved costs, or change hosted data without authorization. If blocked, record the prerequisite and pursue independent approved work.

At handoff, report delivered outcomes, changed files, checks actually run and their results, unresolved decisions, and the next concrete task. This prompt does not keep execution running after the session ends.
