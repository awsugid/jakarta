# Completed: CORS Error Handling & Production JWT Google Auth Flow

## Overview
We have resolved the core issues in the Volunteer and Speaker application flows that caused form loading and submission to fail.

## Root Causes Identified
1. **CORS-less 500 Responses on Exceptions**:
   - When a user queried `GET /api/applications/:kind/:slug` without a valid token or with an expired session, the backend's `extract_user` function returned `AppError::Unauthorized`.
   - Route closures converted this `AppError` to a generic `worker::Error` using the `?` operator.
   - The Cloudflare Worker runtime caught this error and returned a standard `500 INTERNAL SERVER ERROR` response, which completely lacked CORS headers (such as `Access-Control-Allow-Origin`).
   - The browser blocked this response as a CORS violation, preventing the frontend from recognizing the authentication failure and prompting the user to sign in.
2. **Expired/Dummy Session Handling**:
   - The frontend lacked a unified mechanism to intercept HTTP `401` Unauthorized errors returned by the backend and gracefully reset the user's local auth state, leading to hanging states on expired/dummy tokens.

## Key Actions Taken

### 1. Centralized Error CORS Handler (Backend)
*   **File**: `src/lib.rs` (in `jakarta-backend`)
*   **Action**: Updated the `main` fetch handler to intercept all results returned by the router execution (`routes::register_routes(router).run(req, env).await`).
*   **Implementation**:
    *   If `Err(err)` is caught, it is parsed to extract the original `AppError` signature status code (401, 403, 400, 404, 502, or 500).
    *   A clean JSON error payload is formed: `{"error": {"code": status, "message": clean_message}}`.
    *   Essential CORS headers (`Access-Control-Allow-Origin: *`, methods, and headers) are attached to this error response before returning `Ok(response)`.
*   **Result**: The backend never returns a CORS-less error response. `401 Unauthorized` is returned cleanly with correct headers, allowing the frontend to read it.

### 2. Status-Aware API Client (Frontend)
*   **File**: `src/lib/api.ts`
*   **Action**: Updated the `apiFetch` helper to attach the HTTP status code (as `error.status = res.status`) onto any thrown `Error` objects.
*   **Result**: Caller components can now programmatically inspect the exact HTTP status code of the failed request.

### 3. Self-Healing Auth Session Guard (Frontend)
*   **Files**: 
    *   `src/components/volunteer/ApplyVolunteerDialog.tsx`
    *   `src/components/speakers/ApplySpeakerDialog.tsx`
*   **Action**:
    *   Destructured the `signOut` method from the `useAuth` hook in both dialog components.
    *   Modified the `checkApplication` catch blocks to check for `e?.status === 401`.
    *   If a `401` status is detected (indicating an invalid, empty, or expired Google ID Token), the dialog calls `signOut()` to purge the invalid token from state/localStorage and instantly routes the user back to the `'auth'` (Google Sign-In) step.
*   **Result**: Provides a robust, self-healing user experience where expired sessions automatically redirect the user to sign in rather than showing a generic error screen.

---

## Technical Validation
*   **Backend Build**: Successfully compiled backend target WASM (`env -C ../jakarta-backend worker-build --release`).
*   **Astro Site Build**: Successfully built the production bundle with zero TypeScript/Astro compile errors.
*   **Smoke-Test Curl**: `curl -i http://localhost:8585/api/applications/volunteer/foh` successfully returns `HTTP/1.1 401 Unauthorized` with perfect CORS headers and the correct JSON body.
