# TimeTrack — Personal Office Time Tracker

A mobile-first time tracking app built with Next.js 14, SQLite (`better-sqlite3`), and Tailwind CSS.  
All data is stored locally — no cloud, no Docker, no manual database setup required.

---

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser (works great on mobile too).

The SQLite database is automatically created at `data/time_tracker.db` on first run.

---

## Prerequisites

- **Node.js 18+** (required for Next.js 14)
- **npm 8+**
- Python 3 + `make` + a C++ compiler — needed to build `better-sqlite3`

  Most systems already have these. If `npm install` fails on the `better-sqlite3` step:

  ```bash
  # macOS — install Xcode command line tools:
  xcode-select --install

  # Ubuntu/Debian:
  sudo apt-get install -y python3 make g++

  # Windows — install windows-build-tools:
  npm install --global windows-build-tools
  ```

---

## Features

| Feature | Description |
|---|---|
| ⏱️ Punch In / Punch Out | One-tap clock in/out with confirmation dialog |
| ☕ Break Tracking | Start and end multiple breaks per session |
| 🔴 Live Timer | Session duration updates every second |
| 📊 Daily Summary | Worked / Break / Net time for today |
| 📋 Session History | All sessions grouped by date |
| 🔔 Toast Notifications | Feedback on every action |
| 📱 Mobile-first UI | Large touch-friendly controls, sticky action bar |

---

## Project Structure

```
time-tracker/
├── app/
│   ├── api/
│   │   ├── status/route.js      # GET — current session + break state
│   │   ├── session/route.js     # POST — punch_in / punch_out
│   │   ├── break/route.js       # POST — start / end break
│   │   └── history/route.js     # GET — session history + today
│   ├── globals.css              # Tailwind + CSS variables (dark theme)
│   ├── layout.js                # Root layout with fonts + Toaster
│   └── page.js                  # Main app — live timer, state polling
│
├── components/
│   ├── StatusCard.jsx           # Live status display + animated timer
│   ├── PunchControls.jsx        # Punch In / Punch Out button + dialog
│   ├── BreakControls.jsx        # Take a Break / End Break button
│   ├── DailySummary.jsx         # Today's worked / break / net stats
│   ├── SessionHistory.jsx       # Past sessions grouped by date
│   └── ui/
│       ├── button.jsx           # Shadcn-style Button (CVA variants)
│       ├── card.jsx             # Card / CardHeader / CardContent etc.
│       ├── badge.jsx            # Badge (working / break / off variants)
│       ├── dialog.jsx           # Radix Dialog (confirmation modal)
│       ├── toast.jsx            # Radix Toast primitives
│       └── toaster.jsx          # Toast renderer (used in layout)
│
├── db/
│   ├── database.js              # SQLite connection + auto schema init
│   └── queries.js               # All DB query functions
│
├── lib/
│   ├── utils.js                 # formatDuration, calcSessionMs, etc.
│   ├── cn.js                    # Tailwind class merge utility
│   └── use-toast.js             # Toast state manager
│
├── data/
│   └── time_tracker.db          # SQLite file (auto-created, git-ignored)
│
├── next.config.js               # Webpack externals for better-sqlite3
├── tailwind.config.js           # Dark theme + custom fonts
├── postcss.config.js
└── package.json
```

---

## Database Schema

```sql
CREATE TABLE sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  punch_in_time   DATETIME NOT NULL,
  punch_out_time  DATETIME,               -- NULL while active
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE breaks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL,
  break_start   DATETIME NOT NULL,
  break_end     DATETIME,                 -- NULL while on break
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

---

## API Reference

| Method | Endpoint | Body / Query | Description |
|---|---|---|---|
| `GET` | `/api/status` | — | Active session, break state, all breaks |
| `POST` | `/api/session` | `{ action: "punch_in" }` | Start a new session |
| `POST` | `/api/session` | `{ action: "punch_out", sessionId }` | End active session |
| `POST` | `/api/break` | `{ action: "start", sessionId }` | Start a break |
| `POST` | `/api/break` | `{ action: "end", breakId }` | End active break |
| `GET` | `/api/history?type=today` | — | Today's sessions with breaks |
| `GET` | `/api/history?type=recent` | — | Last 30 sessions with breaks |

---

## Tech Stack

- **Next.js 14** — App Router, API Routes
- **React 18** — Client components, `useState` / `useEffect`
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** patterns — Radix UI primitives (Dialog, Toast)
- **better-sqlite3** — Fast synchronous SQLite driver
- **lucide-react** — Icons
- **class-variance-authority** — Component variant system
