# Profile feature planning shared context

Planning-only task. Do not modify application source.

The implemented Organizer/Volunteer cards currently appear to derive member display data dynamically. The requested redesign is a simple first-party profile feature keyed by authenticated email. A profile contains only:
- display name
- title
- optional social/external URLs such as Instagram, LinkedIn, GitHub, personal website, and extensible equivalents

Organizer/Volunteer list configuration continues to identify members by email; the public component resolves the profile by email and displays its name, title, and only the links that exist. Missing links render nothing. The planning work must inspect the actual implemented website/backend/database flow before proposing changes.

The final plan must be written to Serena Memory and include, for every phase/task, explicit parallel multi-agent execution guidance: dependencies, frozen contracts, disjoint write scopes, integration sequencing, validation ownership, migration/rollout, and backward compatibility. Keep the design concise, mobile-first, privacy-conscious, and minimal. No implementation in this task.