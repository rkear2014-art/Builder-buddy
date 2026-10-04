# Builder Buddy

A tablet- and phone-friendly job diary for plastering. Book work in, keep a materials list, and send the customer a private link they can sign with a finger. Other trades stay in the code and can be switched back on from one list.

## Stack

- Next.js 16 (App Router) and React
- TypeScript and Tailwind CSS
- Prisma 7 with PostgreSQL
- Signed-in session cookies (HTTP-only). There is no public signup.

The tradesperson side fails closed. If `AUTH_SECRET` is missing or shorter than 32 characters, or if `DATABASE_URL` is missing, those pages return **503** and do not fall open. Customer links are the only pages that work without a login, and each link shows one job.

Each business is its own tenant. Jobs, customer details, materials, saved items, templates and signatures belong to that business, and a signed-in user only sees their own business. The first account is the owner of its business.

## What you can do

- Book in a job with the customer’s name, address, phone, and email, the work, a date, a time slot, and a status: enquiry, booked, in progress, or complete. The trade is plastering. A job saved earlier under another trade still opens.
- See the week and month in a diary.
- Keep materials on each job: quantity, unit, optional customer price, optional cost (hidden from the customer), and a bought tick.
- Save items and templates, and add them to a job from a chooser of plastering work. The owner can set a photo on each tile from Library.
- On a plastering job, pick a built-in starter when booking in, or add one later. The lists follow a plasterer’s usual services (skim, hardwall, dot and dab, stud walls, Artex, wire mesh, repairs, lime, tape and jointing, cornices, coving, rendering, and screeding). Prices are left blank, and each list has a short description the customer reads on the sign-off page. Any plastering business can copy them into its own library. Load plastering starter lists adds only the ones that are missing, and updates an older saved name instead of making a second copy.
- Send an unguessable link. The customer sees a quotation: a cover, a short letter, the price, and a contract for the works, then signs. The signature, name, and time are stored. Later edits do not change the signed copy. VAT, any deposit, and whether each price is shown are frozen with that copy.
- Open on a dashboard for this business: today, tomorrow, agreements waiting for a signature, follow-ups, and jobs added in the last day, plus this week, this month’s priced work, and recent jobs. **Hide £** is remembered on this device. There is no invoice list and no “quotes sent” list.
- Put an optional logo, dashboard photos, accent colour, and letterhead (phone, email, address, website, tagline) on the business. The owner sets these on **Business**. A new logo suggests a colour when none has been chosen. The AK Plastering sample can be applied again to replace an older copy: the agreement keeps the full logo, and the dashboard uses a smaller mark on a light tile. A business can keep several dashboard photos. Each visit shows a different one, with a dark overlay so the greeting stays readable, and an optional caption. Use the AK Plastering photos adds any sample photos that are not already stored. With no photo, the dashboard uses a plaster-coloured gradient. With no logo, the agreement shows the business name only. The home-screen icon stays Builder Buddy.
- On Business, the owner can write the covering letter and extra badges, such as Fully insured, and turn VAT on with a rate. VAT stays off until then. A job can ask for a deposit, or show only the overall price.
- On a job, tick a survey checklist, choose a deposit or no deposit, and open the quote in email, WhatsApp, or text. Nothing is sent until you send it from your own app. You can hide prices, print a job sheet with no prices, and revoke the customer link.
- Print the quotation, or use the browser’s “Save as PDF”. Each section starts on its own page.

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
| `DATABASE_URL` | Yes | Postgres URL, for example `postgresql://USER:PASSWORD@HOST:5432/builder_buddy`. Use a `postgres://` address. A `prisma+postgres://` address is only for the Prisma CLI |
| `DIRECT_URL` | No | Direct Postgres URL for migrations when `DATABASE_URL` goes through a pool |
| `AUTH_SECRET` | Yes | At least 32 characters. Create one with `openssl rand -base64 32` |
| `APP_ORIGIN` | No | Public site URL used when copying a customer link, such as `https://jobs.example.com` |
| `SHOW_DEMO_LOGIN` | No | Set to `true` only on a private demo to show the seeded password on the sign-in page |
| `SEED_DEMO_PASSWORD` | No | Password for the seeded demo user. Defaults to `Plaster-tea-1` |
| `SETUP_TOKEN` | No | Extra code for the one-time account page. Leave unset to set up with no code |

Logos are stored in Postgres with the business. There is no extra file service and no extra environment variable. An upload is a PNG, JPG, or WebP up to 2 MB, and it is resized before it is saved.

Create the tables and the demo diary:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On an empty database, the sign-in page offers **Create your account**. That page works only while there are no users. It is checked again on the server, inside a row lock, so two people cannot both claim it. After the first account exists it stays closed, even if that user is later removed. Set `SETUP_TOKEN` if you also want a code on that form. Leave it unset to do this from a tablet.

Demo login after seeding:

- Email: `demo@builderbuddy.co.uk`
- Password: `Plaster-tea-1` (or whatever you set as `SEED_DEMO_PASSWORD`)

`npm run db:seed` resets that demo user’s jobs, templates, and saved items. It does not touch other users.

Add another business (its own jobs, hidden from the others):

```bash
npm run user:create -- --email you@example.com --name "Sam Hart" --business "Hart & Co" --password "a-long-password-1"
```

A new email becomes the owner of a new business and closes first-account setup. The same email updates that person’s name, password, and business name, and leaves their jobs where they are. An invite flow for extra people inside one business is not built yet.

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

1. Set `DATABASE_URL` to the `postgres://` connection string (pooled is fine for the app). Set `DIRECT_URL` to the direct string when you have one, so migrations do not go through the pool. Also set `AUTH_SECRET` and `APP_ORIGIN`.
2. The build command applies the migrations and then checks that this app can read `SetupLock`, before it builds the site: `prisma generate && prisma migrate deploy && tsx scripts/check-database.ts && next build`
3. Leave `SHOW_DEMO_LOGIN` unset in production, and change or remove the demo password before real customer details go in.

If the database cannot be read, the sign-in and first-account pages still open. They explain the problem instead of showing a server error. Create your account appears when the database is empty and the setup lock is free.

Customer links look like `/sign/<token>`. Treat them as private: anyone with the link can view and sign that one job. Use “New link” on an unsigned job if the wrong person received it. After a signature, the link stays so the customer can reopen the agreed copy.

## Install on a phone or tablet

The production site can be added to a home screen. That needs HTTPS, which the live address already has.

**Android (Chrome, including a tablet)**  
Open the site and sign in. Tap **Install app** when it appears at the top. You can also open the Chrome menu and choose **Install app** or **Add to Home screen**. The icon then opens the tradesperson desk on its own, without the browser bar.

**iPhone or iPad (Safari)**  
Open the site in Safari. Tap **Share**, then **Add to Home Screen**. The page says the same thing. Use Safari for this: Chrome on an iPhone cannot add it.

Logging out clears anything the app stored on the device. Customer sign-off links are always loaded from the server. With no connection, a short offline page asks you to try again.

## Tests

```bash
npm test
```

The tests cover the rules that matter without a database:

- a signature freezes the wording, prices, VAT, and deposit, and a second signature is refused
- a share token returns only that job, with notes and costs removed
- materials totals use the customer price, skip blank prices, and round to the penny
- missing configuration never counts as “allowed in”
- first-account setup opens only with zero users, and a second overlapping claim is refused
- a query for one business cannot read another business’s jobs, materials, templates, signatures, or logo
- a logo upload must be a PNG, JPG, or WebP within 2 MB, plastering starter lists leave prices blank, and a dashboard photo rotates to a different picture on the next visit
- the home-screen manifest, icons, and service worker keep customer pages and sign-off links off the device cache
