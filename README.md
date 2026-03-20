# Bukarrum

Multi-tenant SaaS booking platform for creative studios (recording rooms, rehearsal spaces, photo studios, etc.).

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Auth, PostgreSQL, Storage, Row Level Security)
- **Tailwind CSS + shadcn/ui** (UI components)
- **Fintoc** (Chilean bank transfer payments)
- **Resend** (Transactional email)

## Features

- Studio owner signup/login via Supabase Auth
- Studio onboarding (name, slug, description, logo)
- Room management (create/edit/delete with photos, hourly rate, capacity)
- Weekly availability settings per room
- Public booking page at `/book/[studio-slug]` (no auth required)
- Real-time slot availability checking
- Double-booking prevention via PostgreSQL exclusion constraint + server-side check
- Fintoc payment integration (Chilean bank transfers)
- Automatic booking confirmation via Fintoc webhook
- Transactional emails via Resend (confirmation, cancellation)
- Admin bookings view with manual confirm/cancel controls

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Landing page
│   ├── login/page.tsx               # Studio owner login
│   ├── signup/page.tsx              # Studio owner signup
│   ├── auth/callback/route.ts       # Supabase auth callback
│   ├── dashboard/
│   │   ├── layout.tsx               # Protected dashboard layout
│   │   ├── page.tsx                 # Overview + onboarding
│   │   ├── rooms/page.tsx           # Room management
│   │   ├── availability/page.tsx    # Weekly availability
│   │   └── bookings/page.tsx        # Bookings list
│   ├── book/[slug]/page.tsx         # Public booking page
│   └── api/
│       ├── bookings/route.ts        # POST: create booking + Fintoc link
│       ├── bookings/slots/route.ts  # GET: booked slots for a date
│       ├── bookings/notify/route.ts # POST: send status emails
│       └── fintoc/webhook/route.ts  # Fintoc payment webhook
├── components/
│   ├── dashboard/                   # Admin UI components
│   └── booking/                     # Public booking UI
├── lib/
│   ├── supabase/                    # Supabase client + types
│   ├── email.ts                     # Resend email helpers
│   └── utils.ts                     # cn() utility
└── middleware.ts                    # Auth protection for /dashboard
supabase/
└── migrations/001_initial_schema.sql
```

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd bukarrum-v1
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local` (see `.env.example` for descriptions).

### 3. Supabase setup

1. Create a new project at https://supabase.com
2. Run the migration in the Supabase SQL editor:
   - Copy contents of `supabase/migrations/001_initial_schema.sql` and run it
3. Enable Email auth in **Authentication > Providers > Email**
4. Copy your project URL and API keys to `.env.local`

### 4. Resend setup

1. Create an account at https://resend.com
2. Verify your sending domain (or use `onboarding@resend.dev` for testing)
3. Create an API key and add it to `.env.local`

### 5. Fintoc setup

1. Create an account at https://fintoc.com
2. Get your secret key from the developer dashboard
3. Configure a webhook pointing to `https://yourdomain.com/api/fintoc/webhook`
4. Add the secret key and webhook secret to `.env.local`

### 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Fintoc Webhook (local development)

Use ngrok to expose your local server:

```bash
ngrok http 3000
```

Then set the Fintoc webhook URL to `https://<ngrok-url>/api/fintoc/webhook`.

## Database Schema

| Table        | Description                                                                 |
|--------------|-----------------------------------------------------------------------------|
| studios      | Studio profiles owned by auth users                                         |
| rooms        | Bookable spaces within a studio                                             |
| availability | Weekly open hours per room (day_of_week 0=Sunday through 6=Saturday)       |
| bookings     | Client bookings with status: pending -> confirmed / cancelled               |

**Double-booking prevention:** PostgreSQL `EXCLUDE USING gist` constraint on overlapping `tstzrange` intervals for the same room + status in `(pending, confirmed)`.

**Row Level Security:** All tables have RLS enabled. Studio owners can only read/write their own data. Public booking creation uses service role key (server-side API route only).

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

Set all environment variables in Vercel dashboard under Settings > Environment Variables.
