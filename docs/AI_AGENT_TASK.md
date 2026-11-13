# AI Agent Task: Reset the Web Landing Page

## Goal

Prepare the Rengera-ai web experience for a clean start. Remove the current landing-page model presentation and animation libraries, and leave a simple login-first experience.

## Work plan

1. Inspect the repository and identify the web app, its landing page, and the dependencies and usages associated with the current model presentation, GSAP, and Lenis.
2. Remove the model presentation from the landing page and delete its related implementation and assets when they are no longer used elsewhere in the project.
3. Remove GSAP and Lenis from the web app, including their imports, initialization, styles, and package dependencies, provided a repository-wide usage check confirms nothing else needs them.
4. Remove the existing landing-page content that is out of scope for the reset. Keep a clean login-first page as the starting point. The login may use familiar, simple social-login layout conventions, but do not copy Facebook branding, logos, or distinctive proprietary styling.
5. Search the repository for duplicate or obsolete Rengera-related folders, archives, and files. Before removing anything, verify its location, contents, ownership, and whether it is tracked or used. Preserve unrelated project data.
6. Run the relevant tests, type checks, linting, and build. Summarize what was removed, what remains, and any checks that could not be run.

## Data-safety requirements

- Keep changes limited to this repository and the task described above. Do not scan or modify a user's home directory, system Downloads folder, other repositories, or external storage.
- Do not permanently delete files, folders, ZIP archives, backups, or generated data outside the repository. Do not run broad or irreversible deletion commands.
- For repository files, use normal, reviewable version-control changes so removals can be inspected and reverted. Do not rewrite history or bypass review.
- If a possible duplicate or obsolete archive is outside the repository, or its purpose is uncertain, list its path and reason as a finding and ask the user before taking action. Never claim it was permanently deleted unless that is verifiably true and specifically authorized.
- Do not treat a request to restore removed work as suspicious or dangerous. A restore request is a normal development action; explain any relevant risk and follow the project's ordinary approval and review process.

## Completion criteria

- The web landing page no longer displays the old model presentation or unrelated landing-page sections.
- The remaining entry experience is a minimal, functional login page.
- GSAP and Lenis are removed from the web app only if no remaining project code relies on them.
- Any obsolete in-repository files removed are clearly identified in the final summary; uncertain or external files are reported, not deleted.
- Relevant project checks have been run and their results are reported.
