# English Learning App — Frontend

The client-side of an AI-powered English learning tool built for Brazilian Portuguese speakers. Users look up words and sentences, get slang-aware translations, and manage a personal vocabulary list.

> **Backend repo:** [english_learning_app_backend](https://github.com/GabCaiado/english_learning_app_backend)

---

## Overview

This Next.js app is the primary interface for learners. It communicates with the FastAPI backend to display translations, flag slang, show formality levels, and let users save and review vocabulary over time.

---

## Features

- **Word & sentence lookup** — real-time translation with slang and formality metadata
- **Dashboard** — protected area for logged-in users
- **Vocabulary manager** — browse and manage saved words (`/words`)
- **Revision queue** — spaced repetition review interface (`/revisions`, in progress)
- **User profile** — account settings (`/profile`)
- **Admin panel** — translation feedback review (`/admin/feedback`)
- **Authentication** — email/password login via Supabase Auth; all dashboard routes are JWT-guarded

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Component System | shadcn/ui (New York style) over Radix UI primitives |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Auth | Supabase Auth (JWT) |
| API Client | Custom typed client — `lib/api.ts` |

---

## Project Structure

```
english_learning_app_frontend/
├── app/
│   ├── layout.tsx              # Root layout — mounts AuthProvider
│   ├── (dashboard)/            # Route group for protected pages
│   │   ├── dashboard/
│   │   ├── words/
│   │   ├── revisions/
│   │   ├── profile/
│   │   └── admin/feedback/
│   └── login/
├── components/                 # Shared UI components (shadcn/ui)
├── lib/
│   └── api.ts                  # Typed API client for backend calls
├── middleware.ts                # Auth route guard — redirects unauthenticated users to /login
└── public/
```

---

## Routing & Auth

The app uses the **Next.js App Router** with a `(dashboard)` route group. All routes inside that group are protected by `middleware.ts`, which validates the Supabase JWT on every request. Unauthenticated users are redirected to `/login`.

```
/login                  → public
/(dashboard)/dashboard  → protected
/(dashboard)/words      → protected
/(dashboard)/revisions  → protected
/(dashboard)/profile    → protected
/admin/feedback         → protected (admin only)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running instance of the [backend](https://github.com/GabCaiado/english_learning_app_backend)
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/GabCaiado/english_learning_app_frontend.git
cd english_learning_app_frontend
npm install
```

### Environment Variables

Create a `.env.local` file at the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running Locally

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

---

## API Integration

All backend calls go through `lib/api.ts`, which is a typed wrapper around `fetch`. It automatically attaches the Supabase JWT from the current session to every request.

Main endpoints consumed:

| Endpoint | Usage |
|---|---|
| `GET /translate/word/{word}` | Word lookup page |
| `POST /translate/sentence` | Sentence analysis |
| `GET /words` | Vocabulary list |
| `POST /words` | Save a word |
| `POST /translation_feedback` | Submit a correction |

---

## Project Status

| Feature | Status |
|---|---|
| Auth (login / session / guard) | Done |
| Word & sentence lookup UI | Done |
| Vocabulary list (`/words`) | Done |
| Admin feedback panel | Done |
| Spaced repetition UI (`/revisions`) | Scaffolded |
