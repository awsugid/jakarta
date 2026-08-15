# Shared planning context

Planning-only task; do not modify source code.

Requested outcomes:
1. Add custom `/events/...` page(s) that redirect to `/comday-26`, while the Community Day event remains visible in `/events` and the homepage Upcoming Events section.
2. On `/admin`, when an API request is unauthenticated specifically because the token expired, log the user out rather than redirecting to `/`.
3. Plan a reusable Organizer/Volunteer list component whose input is email address(es), displaying OAuth-connected account name and profile picture, with safe fallbacks when Google profile name/photo permissions or data are unavailable.
4. Show skeleton placeholders for Community Growth and Demographic charts on cache miss/loading instead of empty chart boxes.
5. Embed Sessionize into `/comday-26` and `/speakers` to show the Community Day CFP specifically.
6. Identify focused improvements for `/comday-26` based on current implementation.

Every workstream in the final plan must include an explicit strategy for parallel execution with multiple sub-agents, including dependencies, disjoint write scopes, validation ownership, and integration sequencing. Respect mobile-first, Astro static output, React only for interactivity, Bun, Node 22, existing project conventions, and no implementation in this task.