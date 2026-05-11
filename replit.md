# NCST LMS

A full-featured Learning Management System for the Nasser Centre for Science & Technology — similar to Moodle/Canvas, built for students, teachers, and admins.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/lms run dev` — run the LMS frontend (proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — re-seed the database with sample data
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter router, TanStack Query, shadcn/ui, Tailwind CSS
- API: Express 5, session-based auth (express-session + bcrypt)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/lms/` — React+Vite frontend, all pages in `src/pages/`
- `artifacts/api-server/` — Express API server, routes in `src/routes/`
- `lib/db/` — Drizzle ORM schema (`src/schema.ts`) and DB client
- `lib/api-spec/` — OpenAPI YAML spec (source of truth for all API contracts)
- `lib/api-client-react/` — Generated React Query hooks and Zod schemas
- `scripts/src/seed.ts` — Database seed script

## Architecture decisions

- Session-based auth (not JWT): express-session with httpOnly cookies; `credentials: "include"` on all fetches
- Contract-first API: OpenAPI spec → Orval codegen → typed hooks; never write raw fetch calls in the frontend
- All query options need `as any` cast on `{ enabled: ... }` due to strict `queryKey` requirement in the generated `UseQueryOptions` type
- `useExportGrades` is a query (GET) not a mutation — use `refetch()` pattern to trigger download
- Lockdown exam uses `visibilitychange` event + 7-second countdown; force-submit via API + create alert on tab switch

## Product

- **Students**: Browse courses, access module files, take lockdown quizzes/exams with tab-switch protection
- **Teachers**: Upload files, build quizzes (Google Forms-style with multiple-choice, T/F, essay, etc.), grade submissions, view grade book with CSV export, proctor live exams with alert monitoring
- **Admins**: Full user/course CRUD, enroll students in courses, view and resolve integrity alerts

## Login credentials (seed data)

- `admin@ncst.edu.bh` / `password123` — Admin
- `teacher@example.com` / `password123` — Dr. Ahmed Al-Rashid (teacher)
- `teacher2@example.com` / `password123` — Dr. Sara Mahmood (teacher)
- `student@example.com` / `password123` — Fatima Al-Zahra (student)
- `student2@example.com` / `password123` — Mohammed Hassan (student)
- `student3@example.com` / `password123` — Aisha Al-Mansoori (student)

## Gotchas

- All Orval-generated query hooks require `{ query: { enabled: ... } as any }` to avoid the `queryKey` TypeScript error
- bcrypt is in `onlyBuiltDependencies` in pnpm-workspace.yaml — required for native build
- The shared proxy routes `/api` to port 8080 and `/` to the LMS port; always use relative URLs in frontend code
- `pnpm run dev` at workspace root does not exist by design — use workflows or `--filter` commands

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- API spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema.ts`
