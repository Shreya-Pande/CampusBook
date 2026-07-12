# CampusBook

CampusBook is a timetable-aware campus resource booking platform that replaces the fragmented WhatsApp-groups-and-spreadsheets way colleges manage classrooms, labs, auditoriums, and sports courts. It opens a weekly booking window every Sunday at 12:00 PM for the upcoming Monday–Friday, computes room availability directly against the stored class timetable so a room with a 9 AM lecture never shows as "available", routes approval requests automatically to the right department admin, and guarantees conflict-free bookings with MongoDB transactions even under the concurrent load of everyone booking the moment the window opens.

## Live Demo

| | |
|---|---|
| Frontend | `FRONTEND_URL` |
| API | `API_URL` |

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime / API | Node.js 20, Express 5 |
| Database | MongoDB (Mongoose, replica set — required for transactions) |
| Cache / Sessions | Redis (ioredis) |
| Background Jobs | BullMQ |
| Frontend | React 19 (Vite) |
| Styling | Tailwind CSS |
| Calendar UI | FullCalendar |
| Charts | Recharts |
| State / Data | Zustand, TanStack Query |
| Auth | JWT (access + refresh tokens) |

## Role System

| Role | Login Required | Description |
|---|---|---|
| **Public** | No | Browse resources and live availability; booking prompts a login |
| **CR / TnP / Faculty** | Yes | Book resources per designation-level permissions (instant, request, or waitlist depending on the slot) |
| **Admin (HOD / Dept Admin)** | Yes | Approve/reject requests routed to their own department only |
| **Super Admin** | Yes (seeded, no public registration) | Manage resources, timetables, approval routing, and users across every department |

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB running as a replica set (required for the transactional booking engine — e.g. a local single-node replica set, or MongoDB Atlas which provides one by default)
- Redis instance (local, or a managed instance such as Upstash)
- npm

### Steps
```bash
# 1. Clone the repo
git clone <repository-url>
cd CampusBook

# 2. Configure environment variables
cp server/.env.example .env      # .env lives at the project root
# then open .env and fill in real values — see "Environment Variables" below
# client/.env needs one line: VITE_API_URL=http://localhost:5000/api

# 3. Install dependencies
cd server && npm install
cd ../client && npm install

# 4. Seed the database (creates the super admin, sample resources, timetable,
#    HOD accounts, routing rules, and an open WeeklyPortalWindow for the
#    current week)
cd ../server && npm run seed

# 5. Run both apps (in separate terminals)
npm run dev            # server — API on http://localhost:5000
cd ../client && npm run dev   # client — http://localhost:5173

# 6. (optional) Run the background worker — emails + the 6 weekly-window cron jobs
cd ../server && npm run worker
```

## Environment Variables

All backend variables are read from a single `.env` file at the **project root** (not inside `server/`) — see `server/.env.example` for the template.

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string. Must point at a replica set (Mongoose transactions require one) |
| `REDIS_URL` | Redis connection string (`redis://` locally, `rediss://` for managed TLS instances like Upstash) |
| `PORT` | Port the API server listens on (default `5000`) |
| `NODE_ENV` | `development`, `test`, or `production` |
| `JWT_ACCESS_SECRET` | Secret used to sign short-lived access tokens |
| `JWT_REFRESH_SECRET` | Secret used to sign long-lived refresh tokens — must differ from the access secret |
| `JWT_ACCESS_EXPIRY` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime (e.g. `7d`) |
| `RESEND_API_KEY` | API key for Resend (transactional email — booking confirmations, approvals, expiry warnings) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (resource images) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SUPER_ADMIN_EMAIL` | Email for the super admin account created by `npm run seed` |
| `SUPER_ADMIN_PASSWORD` | Password for that super admin account |
| `CLIENT_URL` | Local frontend origin, for CORS (e.g. `http://localhost:5173`) |
| `CLIENT_URL_PROD` | *Optional.* Production Vercel frontend origin, added to CORS once deployed |

The frontend (`client/.env`) needs one variable:

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL the frontend calls for the API, including the `/api` prefix (e.g. `http://localhost:5000/api` locally, or the deployed Render URL + `/api` in production) |

## Testing

```bash
cd server
npm test
```

Runs the full Jest suite (auth flow, concurrent booking engine, and the WindowGuard middleware) against a dedicated `campusbook_test` database so it never touches development data. Expected output: **3 test suites, 22 tests, all passing.**

## Deployment

- **Backend** deploys to [Render](https://render.com) as a Docker web service (`server/Dockerfile`), plus a separate background worker service running the same image with a different start command for the cron jobs and email queue.
- **Frontend** deploys to [Vercel](https://vercel.com) directly from the `client/` directory (`client/vercel.json`).
- **Database**: MongoDB Atlas (a free M0 cluster already runs as a replica set, satisfying the transaction requirement).
- **Cache**: Upstash Redis.

See the project's deployment notes for the exact step-by-step Render and Vercel setup, including every environment variable each service needs.

## The Weekly Booking Window

The whole system is built around a Monday–Friday booking week with a strict lifecycle, enforced by six cron jobs running in the worker process:

```
Sunday 11:55 AM — next week's window is pre-generated, availability cache warmed
Sunday 12:00 PM — portal OPENS — bookings for Mon–Fri accepted, first-come-first-served
  Mon → Fri     — active booking week, timetable-aware availability
Friday 4:55 PM  — HODs warned about any pending requests about to expire
Friday 5:00 PM  — portal CLOSES — unreviewed pending requests auto-expire
Friday 5:05 PM  — the week's bookings are archived (never deleted) and waitlists clear
```

A Super Admin can override the window for genuine emergencies via `isEmergency: true`, which bypasses the closed-portal check.
