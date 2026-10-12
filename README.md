# Secret Santa - Free Family Exchange Coordinator

A complete, free Secret Santa web app for families. No sign-up fees, no per-email costs, no locked features.

**Live Demo:** Deploy to Vercel free tier (see below)

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript (strict mode), Tailwind CSS
- **Backend:** Next.js Server Actions & Route Handlers
- **Database:** PostgreSQL via Neon (free tier on Vercel Marketplace)
- **ORM:** Drizzle ORM with auto-migrations
- **Auth:** Passwordless magic links via signed JWT tokens + httpOnly cookies
- **Email:** Configurable (Gmail SMTP, Gmail API, Resend, or console logging)
- **Validation:** Zod
- **Testing:** Vitest (derangement algorithm)

## Features

### For Hosts
- ✅ Create families with optional budget/exchange date
- ✅ Generate unique 6-character join codes (no ambiguous characters)
- ✅ Regenerate or disable codes while family is open
- ✅ Manage participants (remove before locking)
- ✅ Draw Secret Santa assignments with conflict-free algorithm
- ✅ View all member exclusions
- ✅ Retry failed assignment emails
- ✅ Day-of reveal page with animated reveals
- ✅ Complete event when done

### For Members
- ✅ Join families with invite code + display name
- ✅ Passwordless magic link sign-in
- ✅ Manage personal wishlist (title, URL, notes, reorder)
- ✅ View all family members' wishlists
- ✅ Set exclusions (symmetric) with notification emails
- ✅ See own Secret Santa match after draw
- ✅ Read-only access after family is completed

### Security & Quality
- ✅ 15-min expiring magic link tokens (hashed in DB)
- ✅ CSRF-safe mutations
- ✅ Secure httpOnly cookies (SameSite=Lax)
- ✅ Server-side membership enforcement on every request
- ✅ No user enumeration in login responses
- ✅ Derangement algorithm handles impossible cases gracefully
- ✅ Email failures logged and retriable

## Setup Guide

### 1. Prerequisites

- Node.js 18+ (or 20+)
- A Gmail account with 2FA enabled
- (Optional) Neon PostgreSQL account

### 2. Local Development

#### Clone & Install

```bash
cd /Users/drewbowman/Sites/SecretSanta
npm install
```

#### Set Up Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

#### Configure Gmail App Password

Gmail SMTP is the default email provider. To set it up:

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select **Mail** and **Windows Computer** (or other device)
3. Google generates a 16-character password. Copy it.
4. In `.env.local`, set:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

**Note:** If using Gmail API (OAuth2), refresh tokens expire after 6 months of inactivity in Testing mode. Production requires additional verification.

#### Set Up Database

We use Neon (free tier). You can also use any PostgreSQL-compatible database.

1. Create a Neon account at [neon.tech](https://neon.tech)
2. Create a project and get the connection string
3. Set `DATABASE_URL` in `.env.local`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/dbname
   ```

#### Run Migrations

```bash
npm run db:generate  # Generate migration files
npm run db:push     # Apply to database
```

#### Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Vercel Deployment

#### Prepare Repository

```bash
git add .
git commit -m "Initial Secret Santa app"
git push origin main
```

#### Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..." → "Project"** and import your GitHub repo
3. Vercel auto-detects Next.js. Click **Deploy**.

#### Add Neon Database (via Marketplace)

1. In Vercel dashboard, go to **Settings → Integrations**
2. Add **"Neon Postgres"** (free tier available)
3. Create a new Neon project or connect existing
4. Vercel auto-populates `DATABASE_URL` environment variable

Alternatively, manually add `DATABASE_URL` to **Vercel Project Settings → Environment Variables**.

#### Environment Variables

Add to Vercel project settings:

```
SESSION_SECRET=<generate a 32-char random string>
APP_URL=https://your-app.vercel.app
HOST_EMAILS=admin@example.com,host@example.com
EMAIL_PROVIDER=gmail-smtp
EMAIL_FROM=your-email@gmail.com
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

For production domains, update `APP_URL`.

#### Run Migrations on Vercel

```bash
# Option 1: Use Vercel CLI
vercel env pull .env.local
npm run db:push

# Option 2: SSH into Vercel deployment (if needed)
vercel ssh
npm run db:push
```

Or use Neon UI dashboard to run SQL directly.

## Free Tier Limits

- **Gmail SMTP:** 500 emails/day (usually sufficient for 100+ family members)
- **Neon Postgres:** 3 GB storage, unlimited connections within Vercel
- **Vercel:** Unlimited serverless functions, 100 GB bandwidth/month free
- **Magic links:** No per-email charge (link generation is server-side)

**Recommendation:** Monitor email sending in production. If you exceed Gmail's daily limit, upgrade to Resend ($20/month for 10,000 emails) or use a company email with higher limits.

## Email Provider Configuration

### Gmail SMTP (Default)
- Requires app password (not your main password)
- Best for small families (< 500 emails/day)

### Gmail API (Optional)
- Requires OAuth2 setup
- Refresh tokens expire after 6 months in Testing mode
- Production requires Google Cloud verification

### Resend (Optional)
- Signup at [resend.com](https://resend.com)
- Free tier: 100 emails/day
- Set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY=...`

### Console (Development)
- Logs emails to console
- Set `EMAIL_PROVIDER=console`
- No email sending

## Database Schema

```sql
-- Users (unique by email)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Families (host creates, members join via code)
CREATE TABLE families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,  -- e.g., ABC123
  status VARCHAR(50) DEFAULT 'open', -- open|locked|day_of|completed
  budget INTEGER,
  exchange_date TIMESTAMP,
  host_user_id INTEGER NOT NULL REFERENCES users(id),
  join_enabled BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Memberships (user + family + display name)
CREATE TABLE memberships (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  display_name VARCHAR(255) NOT NULL,
  is_participant BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Wishlist Items (member's list)
CREATE TABLE wishlist_items (
  id SERIAL PRIMARY KEY,
  membership_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Exclusions (symmetric: A excludes B = B excludes A)
CREATE TABLE exclusions (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id),
  member_a_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  member_b_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  created_by_membership_id INTEGER NOT NULL REFERENCES memberships(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_id, member_a_id, member_b_id)
);

-- Assignments (giver → receiver)
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id),
  giver_membership_id INTEGER NOT NULL REFERENCES memberships(id),
  receiver_membership_id INTEGER NOT NULL REFERENCES memberships(id),
  email_sent_at TIMESTAMP,
  email_error TEXT,
  revealed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Login Tokens (magic link, hashed, single-use)
CREATE TABLE login_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

Run the derangement algorithm tests:

```bash
npm test
```

Tests cover:
- Simple 3-person derangement
- Complex exclusions
- Impossible scenarios
- Edge cases

## Project Structure

```
app/
  ├── page.tsx                      # Landing page (join/host login)
  ├── join/page.tsx                 # Join family flow
  ├── check-email/page.tsx          # Magic link email check
  ├── login/callback/page.tsx       # Login token verification
  ├── host/page.tsx                 # Host dashboard
  ├── families/page.tsx             # Member family list
  ├── f/[familyId]/
  │   ├── page.tsx                  # Family view (members + wishlists)
  │   ├── host/page.tsx             # Host controls (draw names, remove members)
  │   ├── day-of/page.tsx           # Reveal assignments
  │   └── wishlist/page.tsx         # Member wishlist management
  └── api/
      ├── auth/
      │   ├── login/route.ts        # Send magic link
      │   ├── join/route.ts         # Join family
      │   └── logout/route.ts       # Sign out
      └── families/
          ├── route.ts              # List/create families
          ├── [familyId]/route.ts   # Get family details
          ├── [familyId]/draw/route.ts        # Draw assignments
          ├── [familyId]/wishlist/route.ts    # Wishlist CRUD
          ├── [familyId]/exclusions/route.ts  # Exclusion CRUD
          └── [familyId]/reveal/route.ts      # Day-of reveal

lib/
  ├── db/
  │   ├── index.ts                  # Drizzle ORM instance
  │   └── schema.ts                 # Database schema
  ├── auth/
  │   ├── tokens.ts                 # Magic link & JWT
  │   ├── session.ts                # Cookie management
  │   └── guards.ts                 # Authorization helpers
  ├── email/
  │   └── send.ts                   # Email abstraction
  ├── assignment/
  │   └── derangement.ts            # Derangement algorithm
  └── validation/
      └── schemas.ts                # Zod schemas

drizzle/                            # Auto-generated migrations
tests/                              # Vitest tests
```

## Deployment Troubleshooting

### "DATABASE_URL is not set"
Ensure Neon integration is connected and env var is set in Vercel.

### "Gmail authentication failed"
- Double-check app password (not your main password)
- Ensure 2FA is enabled on Gmail
- Regenerate app password if older than 1 month

### "Magic link expired before I clicked"
15-minute expiry is intentional for security. User can request a new link.

### "Emails not sending"
1. Check spam folder
2. In Vercel logs, look for email sending errors
3. Verify `EMAIL_PROVIDER` env var matches your setup
4. Check console if using `EMAIL_PROVIDER=console`

## Optional Enhancements

- Add avatar/profile pictures to members
- Create "undo" for revealed assignments
- Export assignment list (for reference)
- Email reminders (1 week before exchange date)
- Add import/export wishlist from Amazon/Pinterest
- Dark mode toggle

## License

MIT - Free to use and modify

## Support

Reach out via GitHub issues or fork and submit PRs.

---

**Enjoy organizing your family Secret Santa! 🎅**
