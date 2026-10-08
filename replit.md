# Study Smarter Planner

A mobile-first study planner that turns a student's subjects, confidence, exam dates, and available time into concrete study sessions.

## Run & Operate

- Install workspace dependencies with `pnpm install --frozen-lockfile`.
- Replit Preview runs the planner through its managed `artifacts/study-smarter-planner: web` workflow at `/`.
- `pnpm --filter @workspace/study-smarter-planner run dev` — run the planner web app
- `pnpm --filter @workspace/api-server run dev` — run the separate API server; the planner does not require it
- `pnpm --filter @workspace/study-smarter-planner run typecheck` — typecheck the planner
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `DATABASE_URL` is used by the separate API/database packages, not by the planner's sign-in flow.

## Authentication setup

- Google sign-in uses Firebase Authentication; signed-in planner data is stored in Firestore at `users/{uid}`.
- Store the Firebase web-app configuration in Replit Secrets under the `VITE_FIREBASE_*` names used in `src/lib/firebase.ts`. Values must all belong to the same Firebase project; do not commit them. If the preview reports `auth/invalid-api-key`, replace the configuration with the web app values from Firebase Project settings.
- In the Firebase project, enable Google under Authentication → Sign-in method and add the Replit development hostname (and the published app hostname when publishing) to Authentication → Settings → Authorized domains.
- Enable Firestore and restrict each `users/{uid}` document so only the authenticated user whose UID matches `{uid}` can read or write it.
- If Firestore is unavailable or denies access, Google authentication can still complete and the planner opens with the signed-in profile, but cloud loading/saving requires a working Firestore database and matching security rules.
- The welcome page also offers Demo Mode, which does not create a Firebase account.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/study-smarter-planner/src/App.tsx` — routed screens and interactive UI
- `artifacts/study-smarter-planner/src/lib/study-data.ts` — local data model, plan generation, recovery planning, and browser persistence
- `artifacts/study-smarter-planner/src/index.css` — colors, typography, responsive behavior, and motion styles

## Architecture decisions

- Google-authenticated planner data syncs to Firestore under the Firebase UID.
- The welcome page keeps a separate in-memory demo path for trying the planner without an account.
- Statistics are derived from saved sessions. Regenerating plans preserves completed sessions and past missed sessions.
- Weekly plans use exam urgency, confidence, reflection focus, missed sessions, availability, and unavailable days.

## Product

Students can configure subjects and confidence, add exams, set study availability and activity preferences, generate actionable study sessions, track completions, create a smaller recovery plan, and review session-derived statistics. The profile includes a weekly reflection that can inform future plans.

## User preferences

Use the supplied mobile study-planner mockup as the visual reference. Keep the interface calm, readable, blue-accented, and focused on the student's next useful action.

## Gotchas

- Demo data is not synced and is cleared when the page reloads or the user signs out.
- Firebase Authentication and Firestore require the Firebase project settings described above; do not describe demo mode as secure authentication.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
