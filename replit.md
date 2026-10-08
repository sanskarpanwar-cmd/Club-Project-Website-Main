# Study Smarter Planner

A mobile-first study planner that turns a student's subjects, confidence, exam dates, and available time into concrete study sessions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/study-smarter-planner run dev` — run the planner web app
- `pnpm --filter @workspace/study-smarter-planner run typecheck` — typecheck the planner
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

The planner currently runs without the API or database. Study data is stored in the current browser.

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

- MVP persistence is local-first; profile and study history do not sync across browsers or devices.
- Google and Apple sign-in controls explain that provider authentication is not connected; the working path uses a local demo profile.
- Statistics are derived from saved sessions. Regenerating plans preserves completed sessions and past missed sessions.
- Weekly plans use exam urgency, confidence, reflection focus, missed sessions, availability, and unavailable days.

## Product

Students can configure subjects and confidence, add exams, set study availability and activity preferences, generate actionable study sessions, track completions, create a smaller recovery plan, and review session-derived statistics. The profile includes a weekly reflection that can inform future plans.

## User preferences

Use the supplied mobile study-planner mockup as the visual reference. Keep the interface calm, readable, blue-accented, and focused on the student's next useful action.

## Gotchas

- Local demo data is browser-specific and can be lost if browser storage is cleared.
- Do not describe the demo profile as secure authentication or imply Google/Apple sign-in is active.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
