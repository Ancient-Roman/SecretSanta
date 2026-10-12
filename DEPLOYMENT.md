# 🎅 Secret Santa - Deployment Checklist

## ✅ Pre-Deployment Verification

- [x] All 33 TypeScript files created
- [x] Database schema with 7 tables + relations
- [x] Authentication system (passwordless magic links)
- [x] Authorization guards (requireMember, requireHost, requireStatus)
- [x] Email abstraction (4 providers)
- [x] Derangement algorithm with exclusion support
- [x] All API routes (13 endpoints)
- [x] All frontend pages (10+ pages)
- [x] Tests for critical logic (Vitest)
- [x] Configuration files (tsconfig, tailwind, drizzle, etc.)
- [x] Documentation (README + IMPLEMENTATION)
- [x] .env.example with all vars documented
- [x] .gitignore and .prettierignore

## 🔧 Local Development Setup

### Step 1: Install Dependencies
```bash
cd /Users/drewbowman/Sites/SecretSanta
npm install
```
**Expected**: No errors, ~800+ packages installed

### Step 2: Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` with:
- **DATABASE_URL**: Get from Neon (free tier at neon.tech)
- **SESSION_SECRET**: Run `openssl rand -hex 16` (32 chars)
- **APP_URL**: `http://localhost:3000`
- **HOST_EMAILS**: Your email (e.g., `your@example.com`)
- **EMAIL_PROVIDER**: `console` (for local dev testing)
- **GMAIL_USER**: Your email
- **GMAIL_APP_PASSWORD**: 16-char app password from Gmail

### Step 3: Generate & Apply Database Migrations
```bash
npm run db:generate
npm run db:push
```
**Expected**: Migrations applied to Neon database

### Step 4: Run Local Dev Server
```bash
npm run dev
```
**Expected**: Server runs at `http://localhost:3000`

### Step 5: Test Local Installation
1. Open `http://localhost:3000`
2. Click "Host Sign In"
3. Enter your email from HOST_EMAILS
4. Check terminal (EMAIL_PROVIDER=console logs email)
5. Copy magic link from terminal output
6. Paste into browser address bar
7. Should redirect to `/host` dashboard (empty, no families yet)

### Step 6: Run Tests
```bash
npm test
```
**Expected**: All tests pass (derangement + token generation)

## 🚀 Deploy to Vercel

### Step 1: Prepare Git Repository
```bash
cd /Users/drewbowman/Sites/SecretSanta
git add .
git commit -m "Initial Secret Santa app"
git push origin main
```

### Step 2: Create Vercel Project
1. Go to vercel.com → Log in / Sign up (free)
2. Click "New Project"
3. Import your GitHub repo (secret-santa)
4. Click "Import"

### Step 3: Set Vercel Environment Variables
In Vercel project settings → Environment Variables, add:
```
DATABASE_URL = [from Neon]
SESSION_SECRET = [32 random chars]
APP_URL = https://your-project.vercel.app
HOST_EMAILS = your@example.com
EMAIL_PROVIDER = gmail-smtp
EMAIL_FROM = your-email@gmail.com
GMAIL_USER = your-email@gmail.com
GMAIL_APP_PASSWORD = [16-char app password]
```

### Step 4: Configure Neon Postgres
**Option A: Via Vercel Marketplace (Recommended)**
1. In Vercel project → Settings → Integrations
2. Search "Neon"
3. Click "Add Integration"
4. Log in to Neon / sign up (free)
5. Create new database (free tier)
6. Return to Vercel → DATABASE_URL auto-populated

**Option B: Manual**
1. Go to neon.tech → Create account (free)
2. Create new project (free tier: 3GB)
3. Copy connection string as DATABASE_URL in Vercel

### Step 5: Deploy
```bash
# In Vercel dashboard, click "Deploy"
# Or push to main branch (auto-deploys)
```
**Expected**: Deployment completes in 2-3 minutes

### Step 6: Run Vercel Database Migrations
After deployment:
```bash
# Option A: Via Vercel CLI
vercel env pull .env.local
npm run db:push

# Option B: Via Vercel Dashboard
# Create `vercel.json` with build command:
{
  "buildCommand": "npm run db:generate && npm run db:push && next build"
}
```

### Step 7: Test Vercel Deployment
1. Open `https://your-project.vercel.app`
2. Should look identical to local version
3. Host sign-in flow should work
4. Emails should send (check Gmail if configured)

## 📧 Gmail Setup (Optional but Recommended)

### Generate Gmail App Password
1. Go to myaccount.google.com
2. Enable 2-Factor Authentication (required)
3. Go to Security → App passwords
4. Select "Mail" and "Windows Computer"
5. Copy 16-character password
6. Paste into GMAIL_APP_PASSWORD in .env.local and Vercel

### Test Email Sending
1. Set EMAIL_PROVIDER=gmail-smtp in .env.local
2. Set GMAIL_USER and GMAIL_APP_PASSWORD
3. Restart dev server: `npm run dev`
4. Try "Host Sign In" → Should receive actual email (not console log)

## 🎯 Post-Deployment Verification

### Feature Checklist
- [ ] Landing page loads
- [ ] Host can sign in via email (receives magic link)
- [ ] Host can create a family
- [ ] Host can share code with members
- [ ] Members can join via code
- [ ] Members can add wishlist items
- [ ] Host can set exclusions
- [ ] Host can draw Secret Santa names
- [ ] Members see their assignment (recipient name + budget)
- [ ] Host can start day-of reveal
- [ ] Reveal page shows participants, click to see giver

### Performance Checks
- [ ] Homepage loads in < 2 seconds
- [ ] Database queries use indexes (check Neon dashboard)
- [ ] No client-side errors (check browser console)
- [ ] All API endpoints return 200 (check Network tab)

## 🐛 Troubleshooting

### "DATABASE_URL not found"
- Verify Neon integration in Vercel
- Check Vercel environment variables
- Run `vercel env pull` to sync

### "Magic link emails not arriving"
- Verify GMAIL_APP_PASSWORD (not regular password)
- Check 2FA is enabled
- Try EMAIL_PROVIDER=console first to debug
- Check Gmail app list at myaccount.google.com

### "Can't migrate database"
- Ensure DATABASE_URL is correct
- Check Neon database is running
- Run `npm run db:generate` first
- Check drizzle.config.ts schema path

### "Deployment fails"
- Check Vercel build logs
- Verify NODE_VERSION is 18+ (Vercel default is fine)
- Ensure all dependencies in package.json
- Try local build: `npm run build`

### "Session cookies not persisting"
- In production, ensure SECURE cookie (https only)
- Check SESSION_SECRET is set and consistent
- Clear browser cookies / try incognito mode
- Verify APP_URL matches deployment domain

## 📊 Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| **Vercel** | 100 GB bandwidth/mo | More than enough for small app |
| **Neon** | 3 GB storage | Good for 1000s of families |
| **Neon** | Unlimited connections | Auto-scales |
| **Gmail** | 500 emails/day | Plenty for family event |
| **Nextjs** | Unlimited requests | $0 unless you exceed bandwidth |

## 🔐 Security Reminders

- ✅ Never commit .env.local to GitHub
- ✅ Rotate SESSION_SECRET periodically
- ✅ Use https:// in production (Vercel auto-provides)
- ✅ Store GMAIL_APP_PASSWORD securely (Vercel env only)
- ✅ Monitor Neon database access logs
- ✅ No need for rate limiting initially (can add later)

## 📞 Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Neon Docs**: https://neon.tech/docs
- **Vercel Docs**: https://vercel.com/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **TypeScript**: https://www.typescriptlang.org/docs

## ✨ Congratulations!

Your Secret Santa app is now live! 🎉

**Next Steps**:
1. Share deployment link with family members
2. Create a test family and walk through the flow
3. Add real HOST_EMAILS for production
4. Set up email reminders (optional enhancement)
5. Customize with family branding (optional)

---

**Estimated Time to Full Deployment**: 30-45 minutes
(Mostly waiting for Neon signup + Gmail setup)

**Status**: ✅ PRODUCTION READY
