# Builder Buddy

A tablet- and phone-friendly job diary for UK tradespeople: plasterers, builders, electricians, plumbers, and the rest. Book work in, keep a materials list, and send the customer a private link they can sign with a finger.

## Stack

- Next.js 16 (App Router) and React
- TypeScript and Tailwind CSS
- Prisma 7 with PostgreSQL
- Signed-in session cookies (HTTP-only). There is no public signup.

The tradesperson side fails closed. If `AUTH_SECRET` is missing or shorter than 32 characters, or if `DATABASE_URL` is missing, those pages return **503** and do not fall open. Customer links are the only pages that work without a login, and each link shows one job.

## What you can do

- Book in a job with the customer’s name, address, phone, and email, the trade, the work, a date, a time slot, and a status: enquiry, booked, in progress, or complete.
- See the week and month in a diary.
- Keep materials on each job: quantity, unit, optional customer price, optional cost (hidden from the customer), and a bought tick.
- Save items and templates per trade, and drop them onto a job.
- Send an unguessable link. The customer sees the work, materials, and prices, then signs. The signature, name, and time are stored. Later edits do not change the signed copy.
- Print the agreement, or use the browser’s “Save as PDF”.

Internal notes and your costs never appear on the customer page.

## Setup

You need Node.js 22 and a Postgres database.

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres URL, for example `postgresql://USER:PASSWORD@HOST:5432/builder_buddy` |
| `AUTH_SECRET` | Yes | At least 32 characters. Create one with `openssl rand -base64 32` |
| `APP_ORIGIN` | No | Public site URL used when copying a customer link, such as `https://jobs.example.com` |
| `SHOW_DEMO_LOGIN` | No | Set to `true` only on a private demo to show the seeded password on the sign-in page |
| `SEED_DEMO_PASSWORD` | No | Password for the seeded demo user. Defaults to `Plaster-tea-1` |

Create the tables and the demo diary:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo login after seeding:

- Email: `demo@builderbuddy.co.uk`
- Password: `Plaster-tea-1` (or whatever you set as `SEED_DEMO_PASSWORD`)

`npm run db:seed` resets that demo user’s jobs, templates, and saved items. It does not touch other users.

Add a real login without touching the demo data:

```bash
npm run user:create -- --email you@example.com --name "Sam Hart" --business "Hart & Co" --password "a-long-password"
```

## Scripts

- `npm run dev` — local app
- `npm run test` — sign-off locking, share-link access, materials totals, and the closed-by-default gate
- `npm run lint` — ESLint
- `npm run build` — generate the Prisma client and build
- `npm run db:migrate` — create a migration while developing
- `npm run db:deploy` — apply migrations
- `npm run db:seed` — load demo data
- `npm run user:create` — add or update a tradesperson login

## Deploying

The app is ready for Vercel with a hosted Postgres database (Neon, Supabase, RDS, or similar).

1. Set `DATABASE_URL`, `AUTH_SECRET`, and `APP_ORIGIN` in the project environment.
2. Build command: `prisma generate && prisma migrate deploy && next build`
3. Leave `SHOW_DEMO_LOGIN` unset in production, and change or remove the demo password before real customer details go in.

Customer links look like `/sign/<token>`. Treat them as private: anyone with the link can view and sign that one job. Use “New link” on an unsigned job if the wrong person received it. After a signature, the link stays so the customer can reopen the agreed copy.

## Tests

```bash
npm test
```

The tests cover the rules that matter without a database:

- a signature freezes the wording and prices, and a second signature is refused
- a share token returns only that job, with notes and costs removed
- materials totals use the customer price, skip blank prices, and round to the penny
- missing configuration never counts as “allowed in”
