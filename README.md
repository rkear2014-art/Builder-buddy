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
- On a plastering job, pick a built-in starter when booking in, or add one later. The lists follow a plasterer’s usual services (skim, hardwall, dot and dab, stud walls, Artex, wire mesh, repairs, lime, tape and jointing, cornices, coving, rendering, and screeding). Each list has a short description the customer reads on the sign-off page, and a starting price from Travis Perkins and other UK merchant websites in October 2026. Any plastering business can copy them into its own library and change the prices. Load plastering starter lists adds only the ones that are missing, updates an older saved name instead of making a second copy, and fills a blank price without changing a price already set.
- Send an unguessable link. The customer sees a quotation: a cover, a short letter, the price, and a contract for the works, then signs. The signature, name, and time are stored. Later edits do not change the signed copy. VAT, any deposit, and whether each price is shown are frozen with that copy.
- Open on a dashboard for this business: today, tomorrow, agreements waiting for a signature, follow-ups, and jobs added in the last day, plus this week, this month’s priced work, and recent jobs. **Hide £** is remembered on this device and also hides invoice totals on the dashboard and the Invoices list. There is no “quotes sent” list. Quotes and invoices each have their own list.
- Raise an invoice from a job. It copies the quote lines, can show a deposit already taken, and uses the next number for this business (INV-0001). Record cash, bank transfer, or card. Overdue is worked out from the due date.
- Each quote has a number (Q-0001) and a valid until date. After that date the customer link says Expired and cannot be signed. When the customer opens the link, the job shows a Viewed tick. Your own signed-in views are not counted.
- Put an optional logo, dashboard photos, accent colour, and letterhead (phone, email, address, website, tagline) on the business. The owner sets these on **Business**. A new logo suggests a colour when none has been chosen. The AK Plastering sample can be applied again to replace an older copy: the agreement keeps the full logo, and the dashboard uses a smaller mark on a light tile. A business can keep several dashboard photos. Each visit shows a different one, with a dark overlay so the greeting stays readable, and an optional caption. Use the AK Plastering photos adds any sample photos that are not already stored. With no photo, the dashboard uses a plaster-coloured gradient. With no logo, the agreement shows the business name only. The home-screen icon stays Builder Buddy.
- On Business, the owner can write the covering letter and extra badges, such as Fully insured, and turn VAT on with a rate. VAT stays off until then. A job can ask for a deposit, or show only the overall price.
- On a job, tick a survey checklist, choose a deposit or no deposit, and open the quote in email, WhatsApp, or text. Nothing is sent until you send it from your own app, unless branded email is switched on. You can hide prices, print a job sheet with no prices, and revoke the customer link.
- Add before, during, and after photos on a job. They are made smaller on the tablet before they are saved. The job sheet shows them, and you can turn on a before-and-after section on the customer link. Download or share a photo for Facebook or your website.
- On Business, add a review link, public liability, a workmanship guarantee, and membership badges. They show on quotes, invoices, and customer links. When a job is complete, or an invoice is paid, Ask for a review opens your own email, WhatsApp, or text with that link.
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
| `DATABASE_URL` | Yes | Pooled `postgres://` URL from Prisma Postgres. A `prisma+postgres://` address is only for the Prisma CLI |
| `DIRECT_URL` | On Vercel | Direct `postgres://` URL for migrations. Required when `DATABASE_URL` goes through the pool |
| `AUTH_SECRET` | Yes | At least 32 characters. Create one with `openssl rand -base64 32` |
| `APP_BASE_URL` | No | Public site URL used in every customer link and email, such as `https://app.plastererinredditch.co.uk`. No trailing slash |
| `APP_ORIGIN` | No | Older name for the same URL. Used only when `APP_BASE_URL` is unset |
| `RESEND_API_KEY` | No | Resend API key. Leave unset to keep opening your own email app |
| `RESEND_FROM_EMAIL` | No | From address on a domain verified in Resend, such as `quotes@plastererinredditch.co.uk` |
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

1. In Vercel, set `DATABASE_URL` to the pooled `postgres://` string from Prisma Postgres (the host often contains `pool`). Set `DIRECT_URL` to the direct `postgres://` string from the same database, so migrations do not go through the pool. Do not put a `prisma+postgres://` string in `DATABASE_URL`. Also set `AUTH_SECRET`. Set `APP_BASE_URL` to the public address once you have one (`APP_ORIGIN` still works if that is what you already set).
2. Redeploy after saving those two database strings. The build applies migrations, then checks that the same driver the sign-in page uses can read the database.

### Your own web address

Customer links, share messages, and emails use `APP_BASE_URL`. Until that is set, they use the address of the request.

To use `app.plastererinredditch.co.uk`:

1. In the Vercel project, open **Settings → Domains** and add `app.plastererinredditch.co.uk`.
2. At the DNS host for `plastererinredditch.co.uk`, add this record:

   | Type | Name | Value |
   | --- | --- | --- |
   | CNAME | `app` | `cname.vercel-dns.com` |

3. Wait until Vercel says the domain is valid, then set `APP_BASE_URL` to `https://app.plastererinredditch.co.uk` (no trailing slash) and redeploy.

### Branded email

Quotes, invoices, customer links, and review requests can be sent as HTML email with the logo, colour, and badges. Replies go to the business email, and the from name is the business name on the Business page.

Leave `RESEND_API_KEY` unset and the app keeps opening your own email app instead. The branded option is hidden.

1. In [Resend](https://resend.com), create an API key and add it as `RESEND_API_KEY` on Vercel.
2. In Resend, add the sending domain (for example `plastererinredditch.co.uk`).
3. Resend shows the DNS records to publish, including SPF and DKIM. Add those records exactly as Resend lists them. The DKIM host name is the one Resend gives you.
4. Set `RESEND_FROM_EMAIL` to an address on that domain, such as `quotes@plastererinredditch.co.uk`.
5. On **Business**, use **Send test email**. It goes to the business email.

The build command applies the migrations and then checks that this app can read `SetupLock`, before it builds the site: `prisma generate && prisma migrate deploy && tsx scripts/check-database.ts && next build`

Leave `SHOW_DEMO_LOGIN` unset in production, and change or remove the demo password before real customer details go in.

If the database cannot be read, the sign-in and first-account pages still open. They explain the problem instead of showing a server error. Create your account appears when the database is empty and the setup lock is free.

Customer links look like `/sign/<token>`. Invoice links look like `/invoice/<token>`. Treat them as private: anyone with the link can view that one job or invoice. Use “New link” on an unsigned job if the wrong person received it. After a signature, the quote link stays so the customer can reopen the agreed copy.

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
- a logo upload must be a PNG, JPG, or WebP within 2 MB, plastering starter prices come from Travis Perkins and other UK merchant websites in October 2026, and a blank saved price can be filled without overwriting one already set, and a dashboard photo rotates to a different picture on the next visit
- the home-screen manifest, icons, and service worker keep customer pages and sign-off links off the device cache
