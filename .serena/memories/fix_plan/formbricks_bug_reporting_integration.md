# Formbricks Bug Reporting Integration Plan

This memory documents the plan for adding a "Submit a Bug" action in the authenticated user profile dropdown that triggers the Formbricks SDK. All experimental crash boundary code has been removed.

## Proposed Changes

### 1. Remove Crash Boundary Components
All crash boundary files are deleted:
- `src/components/CrashErrorBoundary.tsx`
- `src/components/GlobalCrashHandler.astro`
- `src/components/CrashTester.tsx`
- `src/pages/test-crash.astro`

---

### 2. Restore Layout & Page Views
Layout and pages are reverted to their original wrapping:
- **`Layout.astro`**: Removed global crash overlay components. FormbricksSDK script loader is kept.
- **`index.astro`**: Removed React boundary wraps.
- **`speakers.astro`**: Removed React boundary wraps.
- **`sponsor.astro`**: Removed React boundary wraps.

---

### 3. Add 'Submit a Bug' to Profile Menu

#### [MODIFY] [UserMenu.tsx](file:///home/avei/GithubRepo/playground/aws/jakarta-website/src/components/auth/UserMenu.tsx)
- Import `Bug` from `lucide-react`.
- Desktop user menu gets a "Submit a Bug" item mapping to `window.formbricks.track("submit-bug")`.
- Mobile user menu sheet gets a "Submit a Bug" button mapping to `window.formbricks.track("submit-bug")`.
