# CampusBook — Campus Resource & Event Booking System
## Full Project Blueprint v4.0

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Role System](#2-role-system)
3. [Weekly Booking Window — Architecture & Analysis](#3-weekly-booking-window)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack](#5-tech-stack)
6. [Page Designs & UI Structure](#6-page-designs--ui-structure)
7. [Database Schema](#7-database-schema)
8. [API Design](#8-api-design)
9. [Phase 1 — Scaffold & Auth](#phase-1)
10. [Phase 2 — Timetable Management](#phase-2)
11. [Phase 3 — Weekly Portal Window Engine](#phase-3)
12. [Phase 4 — Resource Management & Availability](#phase-4)
13. [Phase 5 — Booking Engine](#phase-5)
14. [Phase 6 — Approval Routing System](#phase-6)
15. [Phase 7 — Notification System](#phase-7)
16. [Phase 8 — Waitlist System](#phase-8)
17. [Phase 9 — Analytics & Gamification](#phase-9)
18. [Phase 10 — Frontend Build Order](#phase-10)
19. [Phase 11 — Testing](#phase-11)
20. [Phase 12 — Dockerize & Deploy](#phase-12)
21. [Resume Bullets & README](#resume-bullets)

---

## 1. Project Overview

**Project Name:** CampusBook — Smart Campus Resource & Event Booking System

### Problem Statement
Colleges manage classrooms, labs, auditoriums, sports courts, and equipment through fragmented manual processes — WhatsApp groups, physical registers, spreadsheets — with no timetable awareness, no fairness in slot allocation, and no audit trail. Three core problems:

1. **Double-bookings under concurrent load** — two users book the same slot simultaneously
2. **No timetable awareness** — a room with a class at 9 AM still shows "available"
3. **Unfair allocation** — whoever messages the admin first gets the slot

### Solution
A timetable-aware, role-based booking platform with a **weekly portal window** that:
- Opens every Sunday at 12:00 PM for the upcoming Mon–Fri week
- Closes every Friday at 5:00 PM, archiving all bookings for that week
- Computes availability against the stored timetable — occupied rooms shown correctly
- Routes approval requests automatically to the pre-configured HOD/dept admin
- Guarantees conflict-free booking via MongoDB transactions even during the Sunday 12 PM rush

---

## 2. Role System

### Final Role Structure (v4 — Student role removed entirely)

| Role | Login Required | Description |
|---|---|---|
| **Public** | No | Browse resources and availability — cannot book |
| **CR / TnP / Faculty** | Yes | Book resources per designation-level permissions |
| **Admin (HOD / Dept)** | Yes | Approve/reject requests for assigned department |
| **Super Admin** | Yes | Full system control |

---

### Public (No Login)
- Landing Page, Available Resources (read-only), Resource Detail (view timetable/calendar)
- Book Now button shows "Login to book" prompt
- Portal status banner visible (open/closed with countdown)

---

### CR / TnP / Faculty (Login Required)
Stored as role `cr_faculty` with a `designation` sub-field that drives resource permissions.

**Registration:** College email + Name + Department + Designation (auto-approved on register)

#### Designation-based Permissions:
| Action | CR | TnP Officer | Faculty |
|---|---|---|---|
| Book vacant classroom (instant) | ✅ | ✅ | ✅ |
| Request non-vacant classroom (approval) | ✅ | ✅ | ✅ |
| Request lab | ❌ | ✅ | ✅ |
| Request meeting / conference room | ❌ | ✅ | ✅ |
| Request auditorium / special space | ❌ | ❌ | ✅ |
| Multi-room booking | ✅ | ✅ | ✅ |
| Join waitlist | ✅ | ✅ | ✅ |

**Navigation:** Dashboard → Resources → Book Resource → Booking Requests → My Bookings → Analytics → Calendar → Profile

---

### Admin — HOD / Department Admin (Login Required)
Approved by Super Admin before account activates.

- Sees ONLY booking requests routed to their department
- Approve or reject with mandatory written reason (min 20 chars)
- View department-level analytics and calendar
- Cannot configure routing or manage resources/timetable

---

### Super Admin (Seed Script Only — No Public Registration)
- Manage all resources, timetable (bulk CSV), approval routing, users
- Override portal window (emergency open/close)
- View all analytics across all departments

---

### Booking Decision Matrix

| Resource Type | Slot Status | Public | CR | TnP | Faculty |
|---|---|---|---|---|---|
| Classroom | Vacant | ❌ Login | ✅ Instant | ✅ Instant | ✅ Instant |
| Classroom | Non-vacant (timetable) | ❌ | ✅ Approval | ✅ Approval | ✅ Approval |
| Classroom | Occupied (booked) | ❌ | 🕐 Waitlist | 🕐 Waitlist | 🕐 Waitlist |
| Lab | Any | ❌ | ❌ Blocked | ✅ Approval | ✅ Approval |
| Meeting / Conference Room | Any | ❌ | ❌ Blocked | ✅ Approval | ✅ Approval |
| Auditorium | Any | ❌ | ❌ Blocked | ❌ Blocked | ✅ Approval |
| Sports Court | Any | ❌ | ✅ Approval | ✅ Approval | ✅ Approval |

---

## 3. Weekly Booking Window — Architecture & Analysis

This is the most architecturally significant feature of CampusBook.

### The Specified Plan

```
FRIDAY 5:00 PM  ─────────────  PORTAL CLOSES
  All bookings archived | Waitlists cleared | System resets

SUNDAY 11:55 AM ─────────────  PRE-GENERATION (auto cron)
  Fresh availability cache generated for Mon–Fri

SUNDAY 12:00 PM ─────────────  PORTAL OPENS
  All users notified | Bookings for Mon–Fri accepted
  First-come-first-served for vacant rooms

MON → FRI ───────────────────  ACTIVE BOOKING WEEK
  All data date-specific | Timetable changes reflect immediately

FRIDAY 5:00 PM  ─────────────  PORTAL CLOSES AGAIN
```

---

### My Assessment and Recommendations

**What works well — kept exactly as specified:**

1. **Fairness by design.** Every user gets equal access from Sunday 12 PM. Nobody benefits from knowing the admin personally.
2. **Predictable lifecycle.** The Friday 5 PM reset prevents unbounded data accumulation and keeps the system fresh for the academic week.
3. **Technically interesting for resume.** The Sunday 12 PM rush — many concurrent users — makes the transaction-safe booking engine genuinely meaningful.
4. **Forces advance planning.** One week is long enough to be useful, short enough to prevent stale far-future bookings.

**Recommended improvements (all implemented below):**

1. **Archive, don't blank.** Friday 5 PM moves bookings to a `BookingArchive` collection — never delete. Analytics depend on historical data. Deletion makes the dashboard useless after week one.

2. **Handle pending approvals at Friday 5 PM.** If an HOD has not approved a request, it auto-expires with a notification to both requester and admin: "This request expired because it was not reviewed before the portal closed." This creates accountability pressure on HODs.

3. **Emergency override for Super Admin.** For genuine urgent needs, super admin can open the portal or approve a booking outside the window via `isEmergency: true` flag on the request.

4. **Portal countdown on frontend.** A live countdown (`dd:hh:mm:ss`) on the dashboard and resources page transforms the feature from a background rule into an engaging UI element users will remember.

5. **HOD expiry warning cron at Friday 4:55 PM.** Send HODs a warning email listing pending requests that will expire in 5 minutes, creating a natural urgency to review.

6. **Sunday 12 PM rush rate limiting.** The booking endpoint rate limit tightens to 10 requests/min per user, preventing a single user from bulk-booking all rooms in the first seconds.

---

### Weekly Window State Machine

```
UPCOMING  (generated Sunday 11:55 AM)
    ↓  Sunday 12:00 PM cron
OPEN      (bookings accepted Mon–Fri)
    ↓  Friday 4:55 PM cron — expiry warning to HODs
    ↓  Friday 5:00 PM cron — portal closes
CLOSING   (5-min grace — pending approvals auto-expire)
    ↓  Friday 5:05 PM cron — archive begins
CLOSED
    ↓  Archive cron completes
ARCHIVED  (all data moved, fresh week ready)
```

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   CLIENT (React + Vite)                     │
│  Public Pages · Protected Pages · Portal Countdown          │
│  Tailwind · FullCalendar.js · Recharts · React Query        │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTPS / REST
┌─────────────────────────▼──────────────────────────────────┐
│                EXPRESS.JS API SERVER                         │
│  optionalAuth/verifyToken → RBAC → WindowGuard →           │
│  Validate → Controller → Service Layer                      │
└──────┬──────────────────┬─────────────────┬───────────────┘
       │                  │                 │
┌──────▼──────┐  ┌────────▼──────┐  ┌──────▼───────┐
│  MongoDB    │  │    Redis       │  │   BullMQ     │
│  Atlas      │  │  Portal Status │  │  Job Queue   │
│  (Replica   │  │  + Avail Cache │  │  Email +     │
│   Set)      │  │  + Sessions    │  │  Crons +     │
│             │  │                │  │  Archive     │
└─────────────┘  └───────────────┘  └──────┬───────┘
                                           │
                               ┌───────────▼──────────┐
                               │   Worker Process      │
                               │   (Separate Node.js)  │
                               │   Emails + Cron Jobs  │
                               └──────────────────────┘
```

**WindowGuard middleware** — sits between RBAC and controller on all booking endpoints:
```js
export const windowGuard = async (req, res, next) => {
  if (req.user?.adminType === 'super_admin' && req.body?.isEmergency) return next();
  const status = await redis.get('portal:status');
  if (status !== 'open') {
    const nextOpen = await redis.get('portal:next_open');
    return ApiResponse.error(res, `Portal closed. Next opening: ${nextOpen}`, 403);
  }
  // Validate date is within current week Mon–Fri
  if (req.body?.date) {
    const window = await WeeklyPortalWindow.findOne({ status: 'open' });
    const bookingDate = new Date(req.body.date);
    if (bookingDate < window.weekStartDate || bookingDate > window.weekEndDate) {
      return ApiResponse.error(res, 'Date must be within current booking week (Mon–Fri)', 400);
    }
  }
  next();
};
```

---

## 5. Tech Stack

### Backend
| Tool | Purpose |
|---|---|
| Node.js 20 LTS + Express 4 | API server |
| MongoDB 7 + Mongoose | Primary DB with transactions (replica set required) |
| Redis (ioredis) | Portal status + availability cache + BullMQ backend |
| BullMQ | Async jobs — notifications, archive trigger |
| JWT | Access token (15 min) + refresh token (7 days) |
| bcryptjs | Password hashing |
| Joi | Request validation |
| express-rate-limit | Global + tighter limit on booking endpoints |
| Nodemailer + Resend | Email (3000 free emails/month) |
| Winston | Structured JSON logging |
| node-cron | 6 cron jobs — portal lifecycle + reminders + waitlist expiry |
| csv-parser + multer | Bulk timetable CSV upload |
| Cloudinary | Resource images — upload + CDN |
| Jest + Supertest | Automated testing |

### Frontend
| Tool | Purpose |
|---|---|
| React 18 (Vite) | UI framework |
| Tailwind CSS | Styling |
| React Router v6 | Routing with role guards |
| FullCalendar.js | Timetable view + campus calendar |
| Recharts | Analytics charts |
| Axios | HTTP client + token refresh interceptor |
| TanStack Query | Server state + caching |
| Zustand | Auth state + portal status store |
| React Hot Toast | Toast notifications |
| date-fns | Date/time + countdown calculation |
| Lucide React | Icons |
| Framer Motion | Countdown animation, portal-open animation |

### DevOps
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local: API + Worker + Redis + MongoDB replica set |
| GitHub Actions | CI — tests on every push |
| Render | API server + background worker |
| Vercel | React frontend |
| MongoDB Atlas M0 | Managed MongoDB (replica set built-in) |
| Upstash Redis | Managed Redis — `noeviction` policy required |
| Cloudinary | Image CDN |
| Sentry | Error tracking — frontend + backend |


---

## 6. Page Designs & UI Structure

---

### 6.1 Landing Page (Public — matches Image 3 prototype)

```
┌──────────────────────────────────────────────────────────────┐
│ NAVBAR: Logo | Home | Features | How It Works | 🔔 🌙 [Login] │
│ PORTAL BANNER: "🔒 Portal opens Sunday 12:00 PM" / "🟢 Open" │
├──────────────────────────────────────────────────────────────┤
│ HERO (2-col)                                                  │
│ LEFT: "Smart Campus Resource Booking" + subtitle              │
│       [Get Started]  [View Demo]                              │
│       "Trusted by 500+ Universities" + avatar group           │
│ RIGHT: Campus photo + floating "Booking Confirmed" card       │
├──────────────────────────────────────────────────────────────┤
│ RESOURCE TYPES GRID — "Engineered for Every Resource"         │
│ [Smart Classrooms (large)] [Specialized Labs]                │
│                            [Auditoriums] [Sports Facilities] │
├──────────────────────────────────────────────────────────────┤
│ FEATURE CARDS (3): Conflict-free · Live Availability · Sync  │
├──────────────────────────────────────────────────────────────┤
│ HOW IT WORKS: 1.Browse → 2.Book → 3.Approve → 4.Use          │
├──────────────────────────────────────────────────────────────┤
│ CTA BAND (dark blue): "Ready to transform your campus?"      │
│ [Get Started Now]  [Contact Support]                         │
├──────────────────────────────────────────────────────────────┤
│ FOOTER: Logo | Privacy Policy | ToS | Campus Map | Support   │
└──────────────────────────────────────────────────────────────┘
```

---

### 6.2 Dashboard Page (matches Image 1 prototype — role-aware)

```
┌──────────────┬────────────────────────────────────┬──────────────┐
│   SIDEBAR    │        MAIN CONTENT                 │ RIGHT PANEL  │
│              │                                     │              │
│ Logo         │  Welcome back, [Name].              │ Notifications│
│ Dashboard ◀  │  Here is what's happening...        │ (N New)      │
│ Resources    │                                     │              │
│ My Bookings  │  PORTAL STATUS BANNER:              │ Mini Calendar│
│ Calendar     │  ┌─────────────────────────────┐   │              │
│ Analytics    │  │ 🟢 OPEN · Closes Fri 5:00 PM │   │ Today's      │
│              │  │    3d 14h remaining           │   │ Schedule     │
│ [+New Booking│  └─────────────────────────────┘   │              │
│  ]           │  — OR (when closed) —               │ Elite Booker │
│              │  ┌─────────────────────────────┐   │ (gamification│
│ Settings     │  │ 🔒 CLOSED                   │   │  card)       │
│ Support      │  │ Opens Sun 12:00 PM           │   │              │
│              │  │ ⏱ 01d : 04h : 22m : 10s    │   │              │
│              │  └─────────────────────────────┘   │              │
│              │                                     │              │
│              │  KPI CARDS (4 columns):             │              │
│              │  Upcoming | Pending | Today | Wait  │              │
│              │                                     │              │
│              │  RECENT ACTIVITY FEED               │              │
│              │  ✅ Room 402 Confirmed              │              │
│              │  🔔 Waitlist Alert [Claim Spot]     │              │
│              │  ❌ Request Expired                 │              │
│              │                                     │              │
│              │  QUICK ACCESS CARDS                 │              │
│              │  [Browse Resources] [Open Calendar] │              │
└──────────────┴────────────────────────────────────┴──────────────┘
```

**Portal Status Banner** — key new component on dashboard:
- GREEN: Static text "Portal open · Closes Friday 5:00 PM · Xd Yh remaining"
- RED: Live countdown timer `01d : 04h : 22m : 10s` ticking every second
- "Add to Calendar" link → generates Google Calendar event for next portal open

**KPI Cards (role-aware):**
| Card | CR/TnP/Faculty | Admin |
|---|---|---|
| 1 | Upcoming Bookings (this week) | Total Resources |
| 2 | Pending Requests | Pending Approvals |
| 3 | Today's Bookings | Today's Bookings |
| 4 | Waitlist Entries | Users Online |

**Recent Activity types:**
- `✅ Room 402 Confirmed` — with time slot card shown inline
- `🔔 Waitlist Alert` — "Claim Spot" button (15-min countdown)
- `✅ Booking Completed` — auto-archived
- `⏳ Request Expired` — portal closed before admin reviewed
- `❌ Request Rejected` — reason shown inline

**Elite Booker card (right panel — from Image 1):**
Level 1–10 + progress bar + "You've saved X hours of waiting time this month" + badges

---

### 6.3 Available Resources Page (matches Image 2 prototype)

```
┌──────────────┬─────────────┬────────────────────────────────┐
│   SIDEBAR    │   FILTERS   │  Available Resources            │
│              │             │  Week: Mon 10 – Fri 14 Nov 2025│
│              │ Resource    │                   [Grid][List] │
│              │ Type:       │  DATE TABS:                    │
│              │ ☑ Classroom │  [Mon 10][Tue 11][Wed 12]      │
│              │ ☐ Labs      │  [Thu 13][Fri 14]              │
│              │ ☐ Halls     │  (disabled when portal closed) │
│              │ ☐ Studios   │  ─────────────────────────── │
│              │             │  RESOURCE CARDS:               │
│              │ Building    │  ┌───────────────────────────┐ │
│              │ [All ▼]     │  │[img]  Lab    cap:45       │ │
│              │             │  │Advanced Physics Lab        │ │
│              │ Department  │  │📍 Science Tower A, Lvl 4  │ │
│              │ [All ▼]     │  │● Available  [Book Now]  ♡ │ │
│              │             │  └───────────────────────────┘ │
│              │ Capacity    │  ┌───────────────────────────┐ │
│              │ [slider]    │  │[img]  Hall   cap:120      │ │
│              │             │  │Newton Hall                 │ │
│              │ Amenities   │  │📍 Engineering Hub, Lvl 1  │ │
│ [+New Booking│ □ Projector │  │● Booked     [Waitlist]  ♡ │ │
│  ]           │ □ AC        │  └───────────────────────────┘ │
└──────────────┴─────────────┴────────────────────────────────┘
```

**Date Filter Tabs (Mon–Fri):**
- When portal is OPEN: all 5 tabs active; selecting a day shows availability for that date
- When portal is CLOSED: tabs are greyed out with tooltip "Browse only — opens Sunday 12 PM"
- Availability shown per date is timetable-aware (vacant/non-vacant/occupied)

**Top tabs:** Browse (default) | Trending (most booked this week) | History (previously accessed)

**Resource status badges:**
- `● Available` (green) → "Book Now"
- `● Booked` (orange) → "Waitlist"
- `● Non-Vacant` (blue) → "Request" (CR/Faculty only)
- `● Maintenance` (red) → No action
- `● Under Approval` (yellow) → Pending badge

---

### 6.4 Resource Detail Page

```
┌──────────────┬────────────────────────────────────────────────┐
│  SIDEBAR     │  ← Back       CSE Lab 1    [Lab]  Cap: 40   ♡  │
│              │  [Image Gallery — 3 photos]                     │
│              │  Amenities: [Projector][AC][Computers]          │
│              │  📍 CSE Block, Level 2                          │
│              │  ─────────────────────────────────────────────  │
│              │  DATE: [Mon 10][Tue 11][Wed 12][Thu 13][Fri 14] │
│              │  ─────────────────────────────────────────────  │
│              │  TIMETABLE CALENDAR (FullCalendar — day grid)   │
│              │  08:00 [🟩 Vacant — click to book]              │
│              │  09:00 [🟦 DSA · CSE-3A · Dr. Sharma]          │
│              │  10:00 [🟦 DBMS · CSE-2B · Dr. Gupta]          │
│              │  11:00 [🟩 Vacant]                              │
│              │  14:00 [🟥 Booked — Priya Sharma]               │
│              │  15:00 [🟩 Vacant]                              │
│              │  ─────────────────────────────────────────────  │
│              │  Legend: 🟩 Vacant  🟦 Timetable  🟥 Booked     │
│              │  Click slot → booking modal (if portal open)    │
└──────────────┴────────────────────────────────────────────────┘
```

Slot click behavior:
- 🟩 + CR/TnP/Faculty + portal open → InstantBookingModal
- 🟦 + CR/TnP/Faculty + portal open → ApprovalForm (shows which class occupies)
- 🟥 → WaitlistPrompt
- Any slot + Public → "Login to book" prompt
- Any slot + portal CLOSED → "Portal closed — opens Sunday 12 PM" tooltip

---

### 6.5 Booking Modal Flows

**Flow A — Instant Booking (Vacant Classroom)**
```
┌──────────────────────────────────────┐
│  Book: CSE Room 101                  │
│  📅 Tuesday, 11 Nov 2025  ⏰ 11–12  │
│  ──────────────────────────────────  │
│  Purpose: [input — required]         │
│  No. of People: [number]             │
│  ⚡ Instant — no approval needed     │
│  [Cancel]      [Confirm Booking]     │
└──────────────────────────────────────┘
→ ✅ "Room booked! Check My Bookings."
```

**Flow B — Approval Required (Non-Vacant / Lab / Special)**
```
┌─────────────────────────────────────────┐
│  Request: CSE Lab 1                     │
│  📅 Monday, 10 Nov  ⏰ 09:00–11:00     │
│  ───────────────────────────────────── │
│  ⚠️ Scheduled class: DSA · CSE-3A      │
│     Approval from CSE HOD required.    │
│  ───────────────────────────────────── │
│  Event / Purpose: [input — required]   │
│  Organizing Body: [input — required]   │
│  Expected Attendees: [number]          │
│  Faculty In-Charge: [input]            │
│  Priority: [Low] [Medium] [High]       │
│  Notes: [textarea]                     │
│  ───────────────────────────────────── │
│  Auto-attached: Name · Dept · Email   │
│  Routes to: Dr. Patel (CSE HOD)        │
│  [Cancel]       [Submit Request]       │
└─────────────────────────────────────────┘
→ 📬 "Request submitted — CSE HOD notified"
```

**Flow C — Multi-Room Booking**
```
┌──────────────────────────────────────────┐
│  Multi-Room Booking Request              │
│  [+ Add Room] (max 5)                    │
│  CSE Room 101 · Mon 10 · 10:00–11:00    │
│  CSE Room 102 · Mon 10 · 10:00–11:00    │
│  ──────────────────────────────────────  │
│  Purpose · Organizing Body · Notes...   │
│  ⚠️ Each room evaluated individually   │
│  [Cancel]   [Submit All Requests]        │
└──────────────────────────────────────────┘
```

---

### 6.6 My Bookings Page

Status tabs: All | Upcoming | Pending | Approved | Rejected | Expired | Archived

Booking card statuses:
- 🟡 Pending Approval — [View Details] [Cancel Request]
- 🟢 Approved — [View Details] [Cancel]
- 🔵 Booked (instant) — [View Details] [Cancel]
- ✅ Completed
- 🔴 Rejected — reason shown inline
- ⚫ Cancelled
- ⏳ Expired — "Portal closed before admin reviewed"
- 📦 Archived — previous week, read-only

---

### 6.7 Admin — Booking Requests Page

Requests table: Applicant | Resource | Date | Priority | Status | Actions

Priority badge: 🔴 High · 🟡 Medium · 🟢 Low

Actions per row: [View Full Details] [✅ Approve] [❌ Reject]

**Reject Modal:**
```
┌─────────────────────────────────────┐
│  Reject: CSE Lab 1 — Alex Rivera    │
│  Rejection Reason (min 20 chars):   │
│  [                               ]  │
│  This will be sent to requester.    │
│  [Cancel]   [Confirm Rejection]     │
└─────────────────────────────────────┘
```

**Portal expiry warning banner (Thursday/Friday):**
`⚠️ 3 requests will auto-expire at Friday 5:00 PM if not reviewed.`

---

### 6.8 Admin — Analytics Page

KPI row: Total Bookings | Utilization % | Approval Rate | Cancel Rate | Avg HOD Response Time

Charts:
- Booking Trends (line — daily)
- Department-wise Usage (bar)
- Peak Hours (heatmap — hour × day of week)
- Most Requested Rooms (horizontal bar)
- Approval Rate (donut)
- **Weekly Portal Rush Analysis** (unique metric) — bookings in first 30 min after Sunday 12 PM

---

### 6.9 Campus Calendar Page

FullCalendar timeGridWeek | Mon–Fri only (Sat–Sun greyed)

Color coding:
- 🟢 Approved | 🟡 Pending | 🔴 Rejected | 🔵 Timetable | 🟣 Maintenance

Click event → booking detail popover
Click empty slot → opens booking modal (CR/Faculty + portal open)


---

## 7. Database Schema

### User
```js
{
  _id: ObjectId,
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['cr_faculty', 'admin'] },
  adminType: { type: String, enum: ['super_admin', 'hod', 'department_admin', null], default: null },
  department: String,
  designation: {
    type: String,
    enum: ['CR', 'Club Head', 'Event Head', 'TnP Officer',
           'Faculty', 'HOD', 'Lab Admin', 'Dept Admin']
  },
  isApproved: Boolean,   // CR/Faculty: true on register; Admin: false until super admin approves
  gamification: {
    level: { type: Number, default: 1 },
    totalBookings: { type: Number, default: 0 },
    onTimeCheckIns: { type: Number, default: 0 },
    hoursSaved: { type: Number, default: 0 },
    badges: [String]
  },
  savedResources: [ObjectId],
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Resource
```js
{
  _id: ObjectId,
  name: String,
  type: {
    type: String,
    enum: ['classroom', 'lab', 'auditorium', 'sports_court',
           'meeting_room', 'conference_room', 'studio', 'study_room']
  },
  department: String,
  building: String,
  floor: String,
  capacity: Number,
  amenities: [String],
  images: [String],
  requiresApprovalAlways: Boolean,  // Labs, auditoriums, meeting rooms → always true
  status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
  createdBy: ObjectId,
  createdAt: Date
}
```

### Timetable
```js
// Weekly repeating schedule — one doc per scheduled class per room.
// Source of truth for room vacancy. Updates MUST invalidate Redis cache.
{
  _id: ObjectId,
  resourceId: ObjectId (ref: Resource),
  dayOfWeek: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
  startTime: String,     // "09:00"
  endTime: String,       // "10:00"
  subject: String,
  classSection: String,  // "CSE-3A"
  facultyName: String,
  semester: Number,
  academicYear: String,  // "2025-26"
  effectiveFrom: Date,   // Supports mid-semester changes without deleting old data
  isActive: Boolean
}
// Indexes
TimetableSchema.index({ resourceId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 });
TimetableSchema.index({ resourceId: 1, isActive: 1 });
```

### WeeklyPortalWindow
```js
// One doc per week. Tracks the complete lifecycle of each booking window.
{
  _id: ObjectId,
  weekStartDate: Date,        // Monday 00:00 UTC
  weekEndDate: Date,          // Friday 17:00 UTC
  portalOpensAt: Date,        // Sunday 12:00 PM
  portalClosesAt: Date,       // Friday 5:00 PM
  roleOpenTimes: {
    faculty: Date,            // Sunday 11:45 AM (15-min head start, configurable)
    cr_faculty: Date          // Sunday 12:00 PM
  },
  status: {
    type: String,
    enum: ['upcoming', 'open', 'closing', 'closed', 'archived'],
    default: 'upcoming'
  },
  stats: {
    totalBookingsMade: { type: Number, default: 0 },
    bookingsInFirst30Min: { type: Number, default: 0 },  // Sunday rush metric
    totalRequests: { type: Number, default: 0 },
    approvedRequests: { type: Number, default: 0 },
    rejectedRequests: { type: Number, default: 0 },
    expiredRequests: { type: Number, default: 0 }
  },
  createdAt: Date
}
```

### Booking
```js
{
  _id: ObjectId,
  portalWindowId: ObjectId (ref: WeeklyPortalWindow),  // Every booking tied to a window
  resourceIds: [ObjectId],   // Array — supports multi-room booking
  userId: ObjectId (ref: User),
  // DATE-SPECIFIC as specified — not just time-specific
  date: Date,                // Exact date e.g. 2025-11-10
  dayOfWeek: String,         // Derived + stored for fast day-level queries
  startTime: String,         // "09:00"
  endTime: String,           // "11:00"
  bookingType: { type: String, enum: ['instant', 'approval_required'] },
  status: {
    type: String,
    enum: ['approved','pending','rejected','cancelled','completed','expired','archived'],
    default: 'pending'
  },
  assignedApproverId: ObjectId,
  approvedBy: ObjectId,
  rejectedBy: ObjectId,
  rejectionReason: String,
  formData: {
    eventName: String,
    organizingBody: String,
    expectedAttendees: Number,
    facultyInCharge: String,
    priority: { type: String, enum: ['low','medium','high'], default: 'medium' },
    additionalNotes: String
  },
  isEmergency: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },
  version: { type: Number, default: 0 },
  createdAt: Date,
  updatedAt: Date
}
// Indexes
BookingSchema.index({ resourceIds: 1, date: 1, startTime: 1, endTime: 1, status: 1 });
BookingSchema.index({ userId: 1, portalWindowId: 1 });
BookingSchema.index({ assignedApproverId: 1, status: 1 });
BookingSchema.index({ date: 1, dayOfWeek: 1 });
```

### BookingArchive
```js
// Identical structure to Booking — moved here by Friday 5:05 PM cron.
// NEVER deleted — analytics run against this collection for historical data.
{
  ...BookingFields,
  archivedAt: Date,
  archiveReason: { type: String, enum: ['week_closed', 'manual'] }
}
```

### ApprovalRouting
```js
{
  _id: ObjectId,
  department: String,
  resourceType: { type: String, enum: [...resourceTypes, 'all'] },
  bookingType: { type: String, enum: ['non_vacant', 'approval_required', 'all'] },
  approverId: ObjectId (ref: User),
  configuredBy: ObjectId (ref: User),
  updatedAt: Date
}
```

### Waitlist
```js
{
  _id: ObjectId,
  resourceId: ObjectId,
  date: Date,
  startTime: String,
  endTime: String,
  userId: ObjectId,
  position: Number,
  status: { type: String, enum: ['waiting','offered','confirmed','expired','withdrawn'] },
  offerExpiresAt: Date,
  portalWindowId: ObjectId,   // Waitlist tied to current week — cleared on archive
  createdAt: Date
}
```

### Notification
```js
{
  _id: ObjectId,
  userId: ObjectId,
  type: {
    type: String,
    enum: [
      'portal_opening_soon', 'portal_now_open', 'portal_closed',
      'booking_instant_confirmed', 'booking_pending_submitted',
      'booking_approved', 'booking_rejected', 'booking_expired', 'booking_cancelled',
      'admin_new_request', 'admin_expiry_warning',
      'reminder_1hr', 'waitlist_offered', 'waitlist_expired',
      'resource_added', 'maintenance_alert'
    ]
  },
  channel: { type: String, enum: ['email', 'in_app'] },
  isRead: { type: Boolean, default: false },
  status: { type: String, enum: ['queued', 'sent', 'failed'] },
  metadata: Object,
  scheduledFor: Date,
  sentAt: Date,
  createdAt: Date
}
```

### ActivityLog
```js
{
  _id: ObjectId,
  actorId: ObjectId,
  actorName: String,
  actorRole: String,
  action: {
    type: String,
    enum: ['booking_created','booking_approved','booking_rejected','booking_cancelled',
           'booking_expired','resource_added','resource_updated','timetable_updated',
           'user_registered','portal_opened','portal_closed','archive_completed']
  },
  targetId: ObjectId,
  targetType: String,
  description: String,
  createdAt: Date
}
```

---

## 8. API Design

### Auth  `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /register/cr | Public | Register as CR / TnP / Faculty |
| POST | /register/admin | Public | Register as admin (pending super admin) |
| POST | /login | Public | Login any role |
| POST | /refresh | Public | Rotate access token |
| POST | /logout | Auth | Invalidate refresh token |
| GET | /me | Auth | Current user + gamification stats |

### Portal  `/api/portal`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /status | **Public** | Portal status + open/close times |
| GET | /current-week | **Public** | Current WeeklyPortalWindow details |
| POST | /override-open | Super Admin | Emergency portal open |
| POST | /override-close | Super Admin | Emergency portal close |

### Resources  `/api/resources`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | / | **Public** | List resources (filterable) |
| GET | /trending | **Public** | Most booked this week |
| GET | /:id | **Public** | Resource detail |
| GET | /:id/availability | **Public** | Timetable-aware availability for a date |
| GET | /:id/timetable | **Public** | Full weekly timetable |
| POST | / | Super Admin | Create resource |
| PUT | /:id | Super Admin | Update resource |
| PATCH | /:id/status | Super Admin | Set maintenance / inactive |
| POST | /save/:id | Auth | Save/unsave to wishlist |

### Timetable  `/api/timetable`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /:resourceId | **Public** | Get timetable |
| POST | / | Super Admin | Add entry (auto-invalidates cache) |
| PUT | /:id | Super Admin | Update entry (auto-invalidates cache) |
| DELETE | /:id | Super Admin | Remove entry (auto-invalidates cache) |
| POST | /bulk | Super Admin | Bulk CSV upload |

### Bookings  `/api/bookings`
*All booking endpoints pass through WindowGuard middleware*
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /instant | CR/TnP/Faculty | Book vacant slot — no approval |
| POST | /request | CR/TnP/Faculty | Submit approval-required form |
| POST | /multi-room | CR/TnP/Faculty | Multi-room booking |
| GET | /my | Auth | My bookings — current week |
| GET | /my/all | Auth | All bookings including archived |
| GET | /:id | Auth | Single booking detail |
| DELETE | /:id | Auth | Cancel own booking |

### Admin  `/api/admin`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /requests | Admin | Requests for their dept (dept-filtered) |
| GET | /requests/:id | Admin | Full request detail |
| PATCH | /requests/:id/approve | Admin | Approve |
| PATCH | /requests/:id/reject | Admin | Reject with mandatory reason |
| GET | /routing | Super Admin | View routing config |
| POST | /routing | Super Admin | Create routing rule |
| PUT | /routing/:id | Super Admin | Update routing rule |
| GET | /users | Super Admin | All users |
| PATCH | /users/:id/approve | Super Admin | Approve admin account |
| GET | /analytics/overview | Admin | KPI summary |
| GET | /analytics/utilization | Admin | Resource utilization |
| GET | /analytics/peak-times | Admin | Peak hours heatmap data |
| GET | /analytics/portal-rush | Admin | Sunday 12 PM rush analysis |
| GET | /activity | Admin | Recent activity timeline |

### Waitlist  `/api/waitlist`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | / | Auth | Join waitlist |
| GET | /my | Auth | My waitlist entries |
| DELETE | /:id | Auth | Withdraw |
| POST | /:id/confirm | Auth | Confirm offered slot (15-min window) |

### Notifications  `/api/notifications`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | / | Auth | My notifications (paginated) |
| PATCH | /:id/read | Auth | Mark as read |
| PATCH | /read-all | Auth | Mark all as read |


---

## Phase 1 — Scaffold & Auth

**Goal:** Express server + MongoDB + auth for CR/Faculty and Admin roles.

### Step 1.1 — Init
```bash
mkdir campusbook-server && cd campusbook-server
npm init -y
npm install express mongoose dotenv bcryptjs jsonwebtoken joi cors helmet
npm install ioredis bullmq nodemailer winston express-rate-limit csv-parser multer cloudinary
npm install -D nodemon jest supertest
```

### Step 1.2 — Folder Structure
```
server/src/
├── config/          db.js · redis.js · env.js
├── models/          User · Resource · Timetable · WeeklyPortalWindow
│                    Booking · BookingArchive · ApprovalRouting
│                    Waitlist · Notification · ActivityLog
├── routes/          auth · portal · resource · timetable
│                    booking · admin · waitlist · notification
├── controllers/     one per route file
├── services/        availability · booking · routing · waitlist
│                    gamification · notification
├── middleware/      auth · optionalAuth · rbac · deptFilter
│                    windowGuard · validate · rateLimit
├── queues/          notification.queue.js · notification.worker.js
├── jobs/            portalWindow.cron.js · reminder.cron.js
│                    waitlistExpiry.cron.js
├── validators/      auth · booking · timetable
├── utils/           apiResponse · errors · timeUtils · permissions
└── app.js
server.js      (API entry)
worker.js      (Worker + all crons entry)
scripts/seed.js
```

### Step 1.3 — Registration Flows

**CR / TnP / Faculty:**
```js
// role: 'cr_faculty', adminType: null, isApproved: true
// designation: from body ('CR' / 'TnP Officer' / 'Faculty' / etc.)
// Returns access + refresh token immediately
```

**Admin:**
```js
// role: 'admin', adminType: from body ('hod' / 'department_admin')
// isApproved: false — super admin must approve
// Returns: { message: 'Account pending super admin approval' }
// Queues notification to super admin email
```

**Super Admin seed:**
```js
// scripts/seed.js
const existingSA = await User.findOne({ adminType: 'super_admin' });
if (!existingSA) {
  await User.create({
    name: 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL,
    password: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10),
    role: 'admin', adminType: 'super_admin', isApproved: true
  });
}
// Also seed: test resources, timetable entries, HOD accounts, routing rules,
// and a WeeklyPortalWindow for current week with status: 'open'
```

### Step 1.4 — Middleware Stack
```
Request
  → cors → helmet → rateLimit(global: 100/15min)
  → router
      → optionalAuth (public routes — sets req.user if token present, passes if not)
      → verifyToken (protected routes — blocks if no token)
      → authorize('cr_faculty' | 'admin') — RBAC
      → deptFilter (admin routes — forces filter to own dept)
      → windowGuard (booking routes — checks portal:status in Redis)
      → rateLimit(booking: 10/min per user)
      → validate(joiSchema)
      → controller
```

### Step 1.5 — Designation Permission Map
```js
// src/utils/permissions.js
const PERMISSIONS = {
  'CR':          ['classroom'],
  'Club Head':   ['classroom'],
  'Event Head':  ['classroom'],
  'TnP Officer': ['classroom','lab','meeting_room','conference_room','sports_court'],
  'Faculty':     ['classroom','lab','meeting_room','conference_room',
                  'auditorium','studio','sports_court']
};
export const canBook = (designation, resourceType) =>
  (PERMISSIONS[designation] || []).includes(resourceType);
```

**Advance to Phase 2 when:** All registration flows work. Login returns correct role/designation/adminType. RBAC blocks CR from admin routes. Token refresh rotates correctly.

---

## Phase 2 — Timetable Management

**Goal:** Store weekly timetable per room. Every timetable update invalidates Redis cache for that resource across all dates of the current booking week.

### Step 2.1 — Timetable CRUD with Cache Invalidation
```js
// PUT /api/timetable/:id — update a timetable entry
const updated = await Timetable.findByIdAndUpdate(id, body, { new: true });

// Invalidate ALL current-week date caches for this resource
// because the timetable repeats weekly — any day could be affected
const window = await WeeklyPortalWindow.findOne({ status: 'open' });
if (window) {
  const weekDates = getWeekDates(window.weekStartDate); // ['2025-11-10'...'2025-11-14']
  const keys = weekDates.map(d => `avail:${updated.resourceId}:${d}`);
  await redis.del(...keys);
}
await ActivityLog.create({ action: 'timetable_updated', ... });
```

### Step 2.2 — Bulk CSV Upload
```
POST /api/timetable/bulk (multipart/form-data, file: timetable.csv)
CSV: resourceName, dayOfWeek, startTime, endTime, subject, section, faculty, semester

Logic:
1. Parse CSV (csv-parser)
2. Validate each row (Joi)
3. Upsert: findOneAndUpdate({ resourceId, dayOfWeek, startTime }, data, { upsert: true })
4. After all upserts: bulk-invalidate Redis for all affected resources
5. Return { inserted, updated, errors }
```

**Advance to Phase 3 when:** Bulk upload works with a sample CSV. Verify via `redis-cli KEYS "avail:*"` that cache is invalidated on timetable update.

---

## Phase 3 — Weekly Portal Window Engine

**Goal:** Fully automate the weekly lifecycle via 6 cron jobs running in the Worker process.

### All 6 Cron Jobs

```js
// worker.js — all crons run here (separate from API server)

// CRON 1: Sunday 11:55 AM — Pre-generate next week's window + warm cache
cron.schedule('55 11 * * 0', async () => {
  const nextMon = getNextMonday();
  const nextFri = getNextFriday(nextMon);
  await WeeklyPortalWindow.findOneAndUpdate(
    { weekStartDate: nextMon },
    {
      weekStartDate: nextMon, weekEndDate: nextFri,
      portalOpensAt: getSunday12PM(),
      portalClosesAt: getFriday5PM(nextFri),
      roleOpenTimes: { faculty: getSunday1145AM(), cr_faculty: getSunday12PM() },
      status: 'upcoming'
    },
    { upsert: true }
  );
  await prewarmAvailabilityCache(nextMon, nextFri); // warm Redis for Mon–Fri
  logger.info('Next week portal window pre-generated');
});

// CRON 2: Sunday 12:00 PM — Open portal
cron.schedule('0 12 * * 0', async () => {
  await WeeklyPortalWindow.findOneAndUpdate(
    { status: 'upcoming' }, { status: 'open' }, { sort: { weekStartDate: 1 } }
  );
  await redis.set('portal:status', 'open');
  await redis.set('portal:next_close', getFriday5PM().toISOString());
  await notificationQueue.add('portal_now_open', { type: 'portal_now_open' });
  await ActivityLog.create({ action: 'portal_opened', description: 'Weekly portal opened' });
  logger.info('Portal opened for week');
});

// CRON 3: Friday 4:55 PM — Warn HODs of expiring pending requests
cron.schedule('55 16 * * 5', async () => {
  const pending = await Booking.find({ status: 'pending' }).populate('assignedApproverId');
  const byApprover = groupBy(pending, b => b.assignedApproverId._id.toString());
  for (const [approverId, reqs] of Object.entries(byApprover)) {
    await notificationQueue.add('admin_expiry_warning', {
      approverId, count: reqs.length, expiresAt: getFriday5PM().toISOString()
    });
  }
  logger.info(`Expiry warnings sent to ${Object.keys(byApprover).length} admins`);
});

// CRON 4: Friday 5:00 PM — Close portal + auto-expire pending bookings
cron.schedule('0 17 * * 5', async () => {
  await redis.set('portal:status', 'closed');
  await redis.set('portal:next_open', getSunday12PM().toISOString());

  const window = await WeeklyPortalWindow.findOneAndUpdate(
    { status: 'open' }, { status: 'closing' }, { new: true }
  );

  // Auto-expire all pending bookings for this window
  await Booking.updateMany(
    { status: 'pending', portalWindowId: window._id },
    { status: 'expired', updatedAt: new Date() }
  );

  // Notify requesters whose bookings expired
  const expired = await Booking.find({ status: 'expired', portalWindowId: window._id });
  for (const b of expired) {
    await notificationQueue.add('booking_expired', { bookingId: b._id, userId: b.userId });
  }

  // Update window stats
  const stats = await computeWindowStats(window._id);
  await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
    'stats.expiredRequests': stats.expired, ...stats
  });

  await ActivityLog.create({ action: 'portal_closed', description: 'Weekly portal closed' });
  logger.info(`Portal closed. ${expired.length} requests auto-expired.`);
});

// CRON 5: Friday 5:05 PM — Archive this week's bookings to BookingArchive
cron.schedule('5 17 * * 5', async () => {
  const window = await WeeklyPortalWindow.findOne({ status: 'closing' });
  const bookings = await Booking.find({ portalWindowId: window._id });

  if (bookings.length > 0) {
    await BookingArchive.insertMany(
      bookings.map(b => ({ ...b.toObject(), archivedAt: new Date(), archiveReason: 'week_closed' }))
    );
    await Booking.deleteMany({ portalWindowId: window._id });
  }

  // Clear waitlist entries for this week
  await Waitlist.deleteMany({ portalWindowId: window._id });

  await WeeklyPortalWindow.findByIdAndUpdate(window._id, { status: 'archived' });
  await ActivityLog.create({ action: 'archive_completed',
    description: `Week ${window.weekStartDate.toDateString()} archived` });
  logger.info(`Archive complete. ${bookings.length} bookings archived.`);
});

// CRON 6: Every 15 min — 1-hour booking reminders
cron.schedule('*/15 * * * *', async () => {
  const in60 = new Date(Date.now() + 60 * 60 * 1000);
  const today = getTodayDateString();
  const upcoming = await Booking.find({
    status: 'approved', date: { $gte: startOfDay(today), $lt: endOfDay(today) },
    startTime: { $gte: currentTimeString(), $lte: timeString(in60) },
    reminderSent: false
  });
  for (const b of upcoming) {
    await notificationQueue.add('reminder_1hr', { bookingId: b._id });
    await Booking.findByIdAndUpdate(b._id, { reminderSent: true });
  }
});
```

### Portal Status API
```js
// GET /api/portal/status — Public
const status = await redis.get('portal:status') || 'closed';
const window = await WeeklyPortalWindow.findOne({ status: { $in: ['open','upcoming'] } });
return ApiResponse.success(res, {
  status,
  currentWeek: window ? {
    weekStartDate: window.weekStartDate,
    weekEndDate: window.weekEndDate,
    portalClosesAt: window.portalClosesAt,
    portalOpensAt: window.portalOpensAt
  } : null,
  nextOpen: await redis.get('portal:next_open'),
  nextClose: await redis.get('portal:next_close')
});
```

**Advance to Phase 4 when:** Run all 6 crons manually via test triggers. Verify portal:status in Redis changes correctly. Verify BookingArchive receives records and Booking collection is cleared. Verify pending bookings expire at cron 4.

---

## Phase 4 — Resource Management & Availability

**Goal:** Timetable-aware, date-specific, 3-state slot classification. Timetable changes reflect immediately (cache invalidated on update).

### Availability Computation (Core Logic)
```js
// src/services/availability.service.js
export const getResourceAvailability = async (resourceId, dateString) => {
  const cacheKey = `avail:${resourceId}:${dateString}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const dayOfWeek = getDayOfWeek(new Date(dateString));

  const [timetableSlots, activeBookings] = await Promise.all([
    Timetable.find({ resourceId, dayOfWeek, isActive: true }),
    Booking.find({
      resourceIds: resourceId,
      date: { $gte: startOfDay(dateString), $lt: endOfDay(dateString) },
      status: { $in: ['approved', 'pending'] }
    })
  ]);

  const allSlots = generateTimeSlots('08:00', '22:00', 60);

  const result = allSlots.map(slot => {
    const tEntry = timetableSlots.find(t =>
      slotsOverlap(slot.start, slot.end, t.startTime, t.endTime)
    );
    const bEntry = activeBookings.find(b =>
      slotsOverlap(slot.start, slot.end, b.startTime, b.endTime)
    );

    if (bEntry) return { ...slot, status: 'occupied', bookingId: bEntry._id };
    if (tEntry) return { ...slot, status: 'non_vacant',
      timetableEntry: { subject: tEntry.subject, classSection: tEntry.classSection,
                        facultyName: tEntry.facultyName } };
    return { ...slot, status: 'vacant' };
  });

  await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5-min TTL
  return result;
};

// Helper
export const slotsOverlap = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;
// HH:MM string comparison works correctly for time ordering
```

### Cache Invalidation Points
| Event | Cache Keys Invalidated |
|---|---|
| New booking created | `avail:<resourceId>:<date>` |
| Booking cancelled | `avail:<resourceId>:<date>` |
| Booking approved | `avail:<resourceId>:<date>` |
| Booking rejected | `avail:<resourceId>:<date>` |
| Timetable entry updated/deleted | `avail:<resourceId>:*` (all week dates) |
| Resource set to maintenance | `avail:<resourceId>:*` (all week dates) |

---

## Phase 5 — Booking Engine

**Goal:** Transaction-safe instant + approval bookings. Both pass through WindowGuard first.

### Instant Booking (Vacant Classroom)
```js
export const createInstantBooking = async (bookingData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const dayOfWeek = getDayOfWeek(new Date(bookingData.date));

    // Re-verify INSIDE transaction (prevents TOCTOU race condition)
    const [timetableConflict, bookingConflict] = await Promise.all([
      Timetable.findOne({
        resourceId: bookingData.resourceId, dayOfWeek,
        startTime: { $lt: bookingData.endTime },
        endTime: { $gt: bookingData.startTime }, isActive: true
      }).session(session),
      Booking.findOne({
        resourceIds: bookingData.resourceId,
        date: { $gte: startOfDay(bookingData.date), $lt: endOfDay(bookingData.date) },
        startTime: { $lt: bookingData.endTime },
        endTime: { $gt: bookingData.startTime },
        status: { $in: ['approved', 'pending'] }
      }).session(session)
    ]);

    if (timetableConflict) throw new ConflictError('Slot now non-vacant — use request flow');
    if (bookingConflict) throw new ConflictError('Slot just booked — join waitlist');

    const window = await WeeklyPortalWindow.findOne({ status: 'open' }).session(session);

    const booking = await Booking.create([{
      portalWindowId: window._id,
      resourceIds: [bookingData.resourceId],
      userId, date: new Date(bookingData.date), dayOfWeek,
      startTime: bookingData.startTime, endTime: bookingData.endTime,
      purpose: bookingData.purpose, attendees: bookingData.attendees,
      bookingType: 'instant', status: 'approved'
    }], { session });

    await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
      $inc: { 'stats.totalBookingsMade': 1 }
    }).session(session);

    await session.commitTransaction();

    await invalidateAvailabilityCache(bookingData.resourceId, bookingData.date);
    await notificationQueue.add('booking_instant_confirmed', { bookingId: booking[0]._id });
    await updateGamification(userId, 'booking_created');
    return booking[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
```

### Approval Booking (Non-Vacant / Lab / Special)
```js
export const createApprovalBooking = async (bookingData, formData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bookingConflict = await Booking.findOne({
      resourceIds: bookingData.resourceId,
      date: { $gte: startOfDay(bookingData.date), $lt: endOfDay(bookingData.date) },
      startTime: { $lt: bookingData.endTime },
      endTime: { $gt: bookingData.startTime },
      status: { $in: ['approved', 'pending'] }
    }).session(session);
    if (bookingConflict) throw new ConflictError('Slot already has active booking/request');

    // Check designation permission
    const [user, resource] = await Promise.all([
      User.findById(userId).session(session),
      Resource.findById(bookingData.resourceId).session(session)
    ]);
    if (!canBook(user.designation, resource.type))
      throw new ForbiddenError(`${user.designation} cannot request ${resource.type}`);

    // Routing lookup
    const routing = await ApprovalRouting.findOne({
      department: resource.department,
      $or: [{ resourceType: resource.type }, { resourceType: 'all' }]
    }).session(session);
    if (!routing) throw new AppError('No approver configured. Contact super admin.', 500);

    const window = await WeeklyPortalWindow.findOne({ status: 'open' }).session(session);
    const dayOfWeek = getDayOfWeek(new Date(bookingData.date));

    const booking = await Booking.create([{
      portalWindowId: window._id,
      resourceIds: [bookingData.resourceId],
      userId, date: new Date(bookingData.date), dayOfWeek,
      startTime: bookingData.startTime, endTime: bookingData.endTime,
      bookingType: 'approval_required', status: 'pending',
      formData, assignedApproverId: routing.approverId
    }], { session });

    await WeeklyPortalWindow.findByIdAndUpdate(window._id, {
      $inc: { 'stats.totalRequests': 1 }
    }).session(session);

    await session.commitTransaction();

    await invalidateAvailabilityCache(bookingData.resourceId, bookingData.date);
    await notificationQueue.add('booking_pending_submitted', { bookingId: booking[0]._id });
    await notificationQueue.add('admin_new_request', {
      bookingId: booking[0]._id, approverId: routing.approverId
    });
    await ActivityLog.create({ action: 'booking_created', actorId: userId });
    return booking[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
```

### Multi-Room Booking
```js
// Each room processed independently — mixed results possible
export const createMultiRoomBooking = async (resourceIds, bookingData, formData, userId) => {
  const results = await Promise.allSettled(
    resourceIds.map(id => createApprovalBooking({ ...bookingData, resourceId: id }, formData, userId))
  );
  return results.map((r, i) => ({
    resourceId: resourceIds[i],
    status: r.status === 'fulfilled' ? 'submitted' : 'failed',
    bookingId: r.value?._id,
    reason: r.reason?.message
  }));
};
```

**Write the concurrent booking Jest test HERE before moving to Phase 6.**

---

## Phase 6 — Approval Routing System

### Approve
```js
booking.status = 'approved';
booking.approvedBy = req.user._id;
await booking.save();
await invalidateAvailabilityCache(booking.resourceIds[0], booking.date);
await WeeklyPortalWindow.findByIdAndUpdate(booking.portalWindowId,
  { $inc: { 'stats.approvedRequests': 1 } });
await notificationQueue.add('booking_approved', { bookingId: booking._id });
await ActivityLog.create({ action: 'booking_approved', ... });
```

### Reject (Mandatory Reason — Joi enforced)
```js
const { reason } = await Joi.object({
  reason: Joi.string().min(20).required()
}).validateAsync(req.body);

booking.status = 'rejected';
booking.rejectedBy = req.user._id;
booking.rejectionReason = reason;
await booking.save();
await WeeklyPortalWindow.findByIdAndUpdate(booking.portalWindowId,
  { $inc: { 'stats.rejectedRequests': 1 } });
await triggerWaitlistCascade(booking);  // Slot now free
await notificationQueue.add('booking_rejected', { bookingId: booking._id, reason });
await ActivityLog.create({ action: 'booking_rejected', ... });
```

---

## Phase 7 — Notification System

### All 15 Notification Types
| Type | Recipient | Trigger |
|---|---|---|
| `portal_opening_soon` | All users | Sunday 11:00 AM cron |
| `portal_now_open` | All users | Sunday 12:00 PM cron |
| `portal_closed` | All users | Friday 5:00 PM cron |
| `booking_instant_confirmed` | Requester | Instant booking created |
| `booking_pending_submitted` | Requester | Approval booking submitted |
| `admin_new_request` | HOD/Admin | New request routed to them |
| `admin_expiry_warning` | HOD/Admin | Friday 4:55 PM — pending requests expiring |
| `booking_approved` | Requester | HOD approved |
| `booking_rejected` | Requester | HOD rejected (with reason) |
| `booking_expired` | Requester | Friday 5 PM auto-expire |
| `booking_cancelled` | Requester | User cancelled their own booking |
| `reminder_1hr` | Requester | 1 hour before booking start |
| `waitlist_offered` | Waitlist user | Slot opened — 15-min claim window |
| `waitlist_expired` | Waitlist user | 15-min window passed |
| `maintenance_alert` | All users | Resource set to maintenance |

---

## Phase 8 — Waitlist System

```js
// Join waitlist — tied to current week's portal window
const window = await WeeklyPortalWindow.findOne({ status: 'open' });
const position = await Waitlist.countDocuments({
  resourceId, date, startTime, endTime,
  status: { $in: ['waiting', 'offered'] }
}) + 1;
await Waitlist.create({ resourceId, date, startTime, endTime, userId,
  position, status: 'waiting', portalWindowId: window._id });

// Cascade on cancellation / rejection
export const triggerWaitlistCascade = async ({ resourceId, date, startTime, endTime }) => {
  const next = await Waitlist.findOneAndUpdate(
    { resourceId, date, startTime, endTime, status: 'waiting' },
    { status: 'offered', offerExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    { sort: { position: 1 }, new: true }
  );
  if (next) await notificationQueue.add('waitlist_offered', { waitlistId: next._id, userId: next.userId });
};

// Expiry cron (every 5 min)
cron.schedule('*/5 * * * *', async () => {
  const expired = await Waitlist.find({ status: 'offered', offerExpiresAt: { $lt: new Date() } });
  for (const offer of expired) {
    await Waitlist.findByIdAndUpdate(offer._id, { status: 'expired' });
    await notificationQueue.add('waitlist_expired', { userId: offer.userId });
    await triggerWaitlistCascade(offer); // cascade to next in line
  }
});
```

---

## Phase 9 — Analytics & Gamification

### Analytics Aggregations

All historical queries run against `BookingArchive`. Current-week queries run against `Booking`.

**Portal Rush Analysis (unique metric):**
```js
// Bookings made in first 30 min after Sunday 12 PM — shows hotly contested resources
await WeeklyPortalWindow.aggregate([
  { $project: {
    weekStartDate: 1,
    'stats.bookingsInFirst30Min': 1,
    'stats.totalBookingsMade': 1,
    rushRatio: { $divide: ['$stats.bookingsInFirst30Min', { $max: ['$stats.totalBookingsMade', 1] }] }
  }},
  { $sort: { weekStartDate: -1 } }, { $limit: 12 }
]);
```

**HOD Response Time:**
```js
await BookingArchive.aggregate([
  { $match: { status: { $in: ['approved','rejected'] }, bookingType: 'approval_required' } },
  { $group: {
    _id: '$assignedApproverId',
    avgResponseHours: { $avg: { $divide: [{ $subtract: ['$updatedAt','$createdAt'] }, 3600000] } }
  }},
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'approver' } }
]);
```

### Gamification
```js
const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300];
const BADGES = {
  frequent_booker: 10,  // 10+ bookings
  punctual: 5,          // 5+ on-time check-ins
  team_player: 3        // 3+ multi-room bookings
};
export const updateGamification = async (userId, action) => {
  const inc = {};
  if (action === 'booking_created')    inc['gamification.totalBookings'] = 1;
  if (action === 'on_time_checkin')    inc['gamification.onTimeCheckIns'] = 1;
  if (action === 'early_cancellation') inc['gamification.hoursSaved'] = 1;
  const user = await User.findByIdAndUpdate(userId, { $inc: inc }, { new: true });
  const newLevel = LEVEL_THRESHOLDS.findLastIndex(t => user.gamification.totalBookings >= t) + 1;
  const newBadges = Object.entries(BADGES)
    .filter(([, threshold]) => user.gamification.totalBookings >= threshold)
    .map(([badge]) => badge)
    .filter(b => !user.gamification.badges.includes(b));
  if (newLevel !== user.gamification.level || newBadges.length > 0) {
    await User.findByIdAndUpdate(userId, {
      'gamification.level': Math.min(newLevel, 10),
      $addToSet: { 'gamification.badges': { $each: newBadges } }
    });
  }
};
```

---

## Phase 10 — Frontend Build Order

### Zustand Stores

**authStore.js:**
```js
{ user, role, designation, adminType, department, accessToken, refreshToken,
  setAuth, logout, setTokens }
```

**portalStore.js:**
```js
{ status,           // 'open' | 'closed' | null
  nextOpen,         // ISO string
  nextClose,        // ISO string
  currentWeek,      // { weekStartDate, weekEndDate }
  selectedDate,     // Currently selected date on resources page
  setPortalData, setSelectedDate }
```

### Countdown Hook
```js
export const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
};
```

### Build Week-by-Week

**Week 1 — Core Shell**
- Vite + Tailwind + React Router setup
- LandingPage (Image 3 prototype)
- LoginPage + RegisterPage (CR/Faculty tab + Admin tab)
- Zustand auth + portal stores
- Axios + token refresh interceptor
- Sidebar + Topbar (role-aware nav)
- Route guards (PublicRoute, CRFacultyRoute, AdminRoute)

**Week 2 — Portal + Resources**
- Portal status API + portalStore hydration
- PortalStatusBanner (open/closed + countdown)
- CountdownTimer component (live `dd:hh:mm:ss`)
- AvailableResourcesPage (Image 2 — filters, grid, status badges)
- WeekDateTabs (Mon–Fri date selector — disabled when portal closed)
- ResourceDetailPage (FullCalendar day grid, 3-color slots)

**Week 3 — Booking Flows**
- BookingModal (flow A: instant, flow B: approval, flow C: multi-room)
- InstantBookingForm + ApprovalForm + MultiRoomBooking
- WaitlistPrompt + confirm flow
- Booking endpoints disabled when portal closed (grey buttons + tooltip)
- Toast notifications for all outcomes

**Week 4 — User Pages**
- DashboardPage (Image 1 — KPI cards, activity feed, right panel)
- MyBookingsPage (status tabs including Expired and Archived)
- CampusCalendar (FullCalendar week — Mon–Fri only, color-coded)
- NotificationsPage (paginated, mark-as-read)
- EliteBookerCard + gamification profile

**Week 5 — Admin Pages**
- BookingRequestsPage (table, Approve/Reject, RejectModal, expiry warning banner)
- ApprovalRoutingPage (routing config for super admin)
- ManageResourcesPage + ManageTimetablePage + ManageUsersPage
- AnalyticsPage (Recharts: line, bar, heatmap, donut, portal rush chart)

**Week 6 — Polish**
- Dark mode (CSS vars + Tailwind `dark:`)
- Trending + History tabs on Resources
- Framer Motion: countdown animation, portal-open celebration
- Loading skeletons for all data-dependent pages
- Mobile responsiveness pass
- Error states + empty states for all pages

---

## Phase 11 — Testing

### Priority Tests
| Test | Importance |
|---|---|
| Concurrent instant booking → exactly 1 wins, 1 gets 409 | ⭐⭐⭐ Critical |
| WindowGuard blocks booking when `portal:status = closed` | ⭐⭐⭐ Portal |
| WindowGuard blocks booking for date outside current week | ⭐⭐⭐ Portal |
| Vacant slot → instant, status = approved | ⭐⭐⭐ Core path |
| Non-vacant slot → approval, correct approverId | ⭐⭐⭐ Routing |
| CR cannot request lab → 403 | ⭐⭐ RBAC |
| HOD sees only own dept requests | ⭐⭐ Dept isolation |
| Cron 4: pending bookings → expired on Friday 5 PM | ⭐⭐ Portal lifecycle |
| Cron 5: archive moves to BookingArchive, clears Booking | ⭐⭐ Archive |
| Cancel → waitlist cascade fires | ⭐⭐ Waitlist |
| Reject reason < 20 chars → 400 | ⭐ Validation |

### Concurrent Booking + Portal Tests
```js
describe('Booking Engine', () => {
  it('blocks booking when portal is closed', async () => {
    await redis.set('portal:status', 'closed');
    const res = await request(app).post('/api/bookings/instant')
      .set('Authorization', `Bearer ${crToken}`).send(validPayload);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('closed');
  });

  it('blocks booking for date outside current week', async () => {
    await redis.set('portal:status', 'open');
    const outOfRange = addDays(currentWeekMonday, 8); // next week
    const res = await request(app).post('/api/bookings/instant')
      .set('Authorization', `Bearer ${crToken}`)
      .send({ ...validPayload, date: outOfRange });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('current week');
  });

  it('only one booking wins when two users book simultaneously', async () => {
    await redis.set('portal:status', 'open');
    const payload = { resourceId: testRoom._id, date: currentWeekMonday,
      startTime: '10:00', endTime: '11:00', purpose: 'Test' };
    const [r1, r2] = await Promise.all([
      request(app).post('/api/bookings/instant')
        .set('Authorization', `Bearer ${cr1Token}`).send(payload),
      request(app).post('/api/bookings/instant')
        .set('Authorization', `Bearer ${cr2Token}`).send(payload)
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  });
});
```

---

## Phase 12 — Dockerize & Deploy

### docker-compose.yml
```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    command: ["--replSet", "rs0"]
    volumes: ["mongo_data:/data/db"]
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok"]
      interval: 10s
      retries: 5

  mongo-init:
    image: mongo:7
    depends_on: { mongo: { condition: service_healthy } }
    command: >
      mongosh --host mongo --eval
      "try{rs.status()}catch(e){rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]})}"
    restart: on-failure

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: .
    ports: ["5000:5000"]
    env_file: .env
    environment:
      MONGODB_URI: mongodb://mongo:27017/campusbook?replicaSet=rs0
      REDIS_URL: redis://redis:6379
    depends_on: [mongo-init, redis]
    command: npm run dev

  worker:
    build: .
    env_file: .env
    environment:
      MONGODB_URI: mongodb://mongo:27017/campusbook?replicaSet=rs0
      REDIS_URL: redis://redis:6379
    depends_on: [mongo-init, redis]
    command: node worker.js     # Runs: BullMQ worker + all 6 cron jobs

volumes:
  mongo_data:
```

### GitHub Actions CI
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: ["27017:27017"]
        options: "--replSet rs0"
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: sleep 5 && npx mongosh --host localhost --eval "rs.initiate()"
      - run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/campusbook_test?replicaSet=rs0
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test_secret
          JWT_REFRESH_SECRET: test_refresh_secret
```

### Production Deployment
| Service | Platform | Notes |
|---|---|---|
| API Server | Render Web Service | `node server.js` |
| Worker + Crons | Render Background Worker | `node worker.js` (all 6 crons + BullMQ worker) |
| MongoDB | Atlas M0 | Replica set built-in — transactions work |
| Redis | Upstash Redis | **Set `maxmemory-policy: noeviction`** — portal:status key must never be evicted |
| Frontend | Vercel | `VITE_API_URL` = Render backend URL |
| Images | Cloudinary | Free tier, CDN |
| Errors | Sentry | Both server.js and main.jsx |

---

## Resume Bullets & README Template

### Resume Bullets
```
• Built CampusBook, a timetable-aware campus resource booking platform (MERN stack)
  with a weekly portal window system: opens Sunday 12 PM, closes Friday 5 PM, with
  5 cron jobs automating the full lifecycle — pre-generation, open notification,
  HOD expiry warnings, pending-request auto-expiry, and archive to BookingArchive.

• Implemented transaction-safe concurrent booking using MongoDB sessions and replica
  sets, guaranteeing correctness during the Sunday 12 PM rush — verified with a Jest
  test asserting exactly one 201 and one 409 from two simultaneous API calls to the
  same vacant slot.

• Designed timetable-aware, date-specific availability — each slot classified as
  vacant / timetable-occupied / system-booked per date using stored college timetable
  data, cached in Redis with targeted invalidation on booking changes and timetable edits.

• Built configurable department-based approval routing (super admin assigns HOD per
  dept+resource type), designation-level permission enforcement (CR/TnP/Faculty have
  different resource access), mandatory rejection reasons (Joi min 20 chars), and
  auto-expiry of un-reviewed requests at Friday 5 PM with HOD warning notifications.

• Architected async notification pipeline (BullMQ + Redis, 15 event types) decoupling
  all email delivery from request lifecycle; cascading waitlist with 15-min offer
  windows; gamification layer (10 levels, 3 badge types, hours-saved tracking).

• Containerized 5-service system with Docker Compose; CI/CD via GitHub Actions with
  concurrent booking, portal window, and RBAC tests as mandatory quality gates.
```

### README Must-Have Sections
1. Problem Statement (3 lines)
2. Live Demo + Loom walkthrough (2 min)
3. System Architecture diagram
4. Weekly Portal Window timeline diagram
5. Role + Booking Decision Matrix table
6. Tech Stack table
7. Local setup: `docker-compose up && npm run seed` (two commands, fully running)
8. API docs: Postman collection link
9. Test output screenshot (show all tests green including concurrent booking tests)
10. Deployment links (Vercel frontend + Render backend)

---

## Full Feature Changelog (v1 → v4)

| Feature | v1 | v2 | v3 | v4 |
|---|---|---|---|---|
| Student role | ❌ | ❌ | ✅ | ❌ Removed per request |
| Public (no login) | ✅ | ✅ | ✅ | ✅ |
| CR/Faculty/TnP (designation-based perms) | ✅ | ✅ | ✅ | ✅ Designation matrix |
| Admin sub-types (HOD/Dept) | ✅ | ✅ | ✅ | ✅ |
| Timetable awareness | ✅ | ✅ | ✅ | ✅ + cache invalidation on update |
| Date-specific bookings | ✅ | ✅ | ✅ | ✅ + dayOfWeek stored |
| Weekly portal window (Sun 12PM–Fri 5PM) | ❌ | ❌ | ❌ | ✅ Full lifecycle |
| WeeklyPortalWindow model | ❌ | ❌ | ❌ | ✅ |
| WindowGuard middleware | ❌ | ❌ | ❌ | ✅ |
| 6 cron jobs (portal lifecycle) | ❌ | ❌ | ❌ | ✅ |
| Archive not delete (BookingArchive) | ❌ | ❌ | ❌ | ✅ |
| Pending auto-expire at Friday 5PM | ❌ | ❌ | ❌ | ✅ |
| HOD expiry warning (Friday 4:55PM) | ❌ | ❌ | ❌ | ✅ |
| Emergency override (super admin) | ❌ | ❌ | ❌ | ✅ |
| Portal countdown timer (frontend) | ❌ | ❌ | ❌ | ✅ |
| Portal rush analytics | ❌ | ❌ | ❌ | ✅ |
| Role-priority stagger (Faculty early) | ❌ | ❌ | ❌ | ✅ Configurable |
| Multi-room booking | ❌ | ❌ | ✅ | ✅ |
| Mandatory rejection reason (min 20) | ❌ | ❌ | ✅ | ✅ |
| Designation-level resource perms | ❌ | ❌ | ❌ | ✅ |
| Gamification | ❌ | ❌ | ✅ | ✅ |
| Resource images (Cloudinary) | ❌ | ❌ | ✅ | ✅ |
| Dark mode | ❌ | ❌ | ✅ | ✅ |
| Waitlist (week-tied) | ✅ | ✅ | ✅ | ✅ |
| BullMQ async notifications (15 types) | ✅ | ✅ | ✅ | ✅ |
| Docker + CI/CD | ✅ | ✅ | ✅ | ✅ |

---

*Estimated build time: 8–9 weeks at 2–3 hours/day.*
*Build order: Phase 1 → 2 → 3 (portal engine — do NOT skip) → 4 → 5 → write tests → 6 → 7 → 8 → 9 → 10 → 11 → 12*
*Phase 3 must be complete before Phase 5. The booking engine depends on the portal window being operational.*
*Non-negotiable: Write concurrent booking test + WindowGuard test before Phase 6. These are your strongest resume talking points.*

