# Setup Guide - AI Career Quiz Platform

## 🚀 Complete Application Overview

You now have a **fully functional AI Quiz Platform** with:

### ✅ Core Features Implemented

- **3 AI Career Courses** (24 topics total)
- **150+ MCQ Questions** with detailed explanations
- **Strict Progression System** - unlock topics sequentially
- **Topic-wise Quizzes** with timer, navigation, mark for review
- **Final Syllabus Quiz** - comprehensive exam after completing all topics
- **Certificate Generation** - automatic for 70%+ final quiz scores
- **User Dashboard** - progress tracking across courses
- **Authentication** - Email/password + Google OAuth
- **Responsive UI** - mobile-friendly design

### Razorpay Payments

The course detail page now includes Razorpay checkout for paid unlocks. After a successful payment, the server verifies the signature, records the payment, and attempts to create and email a Zoho invoice.

The amount sent to Razorpay is taken from the server-side `COURSE_PRICE_INR` setting. For sandbox testing, use Razorpay test keys. For real charges, switch to live keys and set `COURSE_PRICE_INR` to the actual amount you want customers charged.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 18+** installed ([Download](https://nodejs.org/))
- ✅ **npm** or **yarn** package manager
- ✅ **PostgreSQL database** (local or cloud)
- ✅ **Git** (optional, for version control)

---

## 🗃️ Step 1: Database Setup

### Option A: Supabase (Recommended for Beginners - Free)

1. **Create Supabase Account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up with GitHub/Google/Email
2. **Create New Project**
   - Click "New Project"
   - Name: "quiz-app" or any name you prefer
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to you
   - Click "Create new project" (takes ~2 minutes)

3. **Get Connection String**
   - Go to **Project Settings** (gear icon) → **Database**
   - Scroll to **Connection string** section
   - Select **URI** tab
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your actual password
4. **Important: Use Transaction Pooler for Prisma**

   Supabase provides two connection options:

   **Option 1: Transaction Pooler (Recommended)**
   - Port: `6543`
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - Best for: Prisma ORM

   **Option 2: Direct Connection with PgBouncer**
   - Port: `5432`
   - Add `?pgbouncer=true&connection_limit=1` at the end
   - Format: `postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1`

### Option B: Local PostgreSQL

1. **Install PostgreSQL**
   - Download from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
   - During installation, set password for `postgres` user
2. **Create Database**

   ```bash
   # Using psql
   createdb quiz_app

   # Or via SQL
   psql -U postgres
   CREATE DATABASE quiz_app;
   ```

3. **Connection String**
   ```
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/quiz_app"
   ```

### Option C: Other Cloud Providers

**Neon ([neon.tech](https://neon.tech))**:

- Free tier with 0.5GB storage
- Copy connection string directly from dashboard

**Railway ([railway.app](https://railway.app))**:

- $5/month credit for free
- PostgreSQL plugin provides connection string

---

## 🔧 Step 2: Environment Variables

1. **Create `.env` file** in project root (copy from `.env.example`):

```bash
cp .env.example .env
```

2. **Edit `.env` file** with your values:

```env
# Database - Choose one format based on your setup

# Supabase Transaction Pooler (RECOMMENDED):
DATABASE_URL="postgresql://postgres.xxxxx:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres"

# OR Supabase Direct with PgBouncer:
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# OR Local PostgreSQL:
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/quiz_app"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"

# Generate secret (see below)
NEXTAUTH_SECRET="your-generated-secret-here"

# Optional: Google OAuth (leave as-is if not using Google sign-in)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Razorpay payment integration
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="your-razorpay-key-id"
COURSE_PRICE_INR="1495"

# Zoho invoice integration
ZOHO_CLIENT_ID="your-zoho-client-id"
ZOHO_CLIENT_SECRET="your-zoho-client-secret"
ZOHO_REFRESH_TOKEN="your-zoho-refresh-token"
ZOHO_ORGANIZATION_ID="your-zoho-organization-id"
```

3. **Generate `NEXTAUTH_SECRET`**:

**Windows PowerShell:**

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Linux/Mac:**

```bash
openssl rand -base64 32
```

Copy the generated string and paste it as your `NEXTAUTH_SECRET` value.

---

## 📦 Step 3: Install Dependencies

```bash
npm install
```

This installs all required packages including:

- Next.js, React, TypeScript
- Prisma ORM + Client
- NextAuth + Prisma Adapter
- Razorpay for paid course unlocks
- Zoho Invoice for payment invoicing
- Redux Toolkit
- TailwindCSS
- bcryptjs for password hashing

---

## 🗄️ Step 4: Database Initialization

Run these commands in order:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database (creates tables)
npx prisma db push

# 3. Seed database with courses, topics, and 150+ questions
npx tsx prisma/seed.ts
```

**Expected Output:**

```
✅ Cleared existing data
✅ Seeded 3 courses
✅ Seeded 24 topics
✅ Seeded 150+ questions
✅ Database seeded successfully!
```

---

## 🚀 Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📁 Complete File Structure

├── src/
│ ├── app/
│ │ ├── api/
│ │ │ ├── auth/[...nextauth]/route.ts ✅
│ │ │ ├── auth/register/route.ts ✅
│ │ │ ├── courses/route.ts ✅
│ │ │ ├── courses/[courseId]/route.ts ✅
│ │ │ ├── quiz/topic/[topicId]/route.ts ✅
│ │ │ ├── quiz/final/[courseId]/route.ts ✅
│ │ │ ├── quiz/submit/route.ts ✅
│ │ │ └── progress/route.ts ✅
│ │ ├── auth/
│ │ │ ├── signin/page.tsx ✅
│ │ │ └── signup/page.tsx ✅
│ │ ├── courses/
│ │ │ ├── page.tsx ✅
│ │ │ └── [courseSlug]/page.tsx ✅
│ │ ├── quiz/
│ │ │ ├── [topicId]/page.tsx ✅
│ │ │ └── final/[courseId]/page.tsx ✅
│ │ ├── dashboard/page.tsx ✅
│ │ ├── layout.tsx ✅
│ │ ├── globals.css ✅
│ │ └── page.tsx ✅ (Homepage)
│ ├── components/
│ │ ├── Navbar.tsx ✅
│ │ └── Providers.tsx ✅
│ ├── store/
│ │ ├── store.ts ✅
│ │ └── slices/
│ │ ├── quizSlice.ts ✅
│ │ └── userSlice.ts ✅
│ ├── lib/
│ │ ├── prisma.ts ✅
│ │ └── auth.ts ✅
│ ├── types/index.ts ✅
│ └── middleware.ts ✅
├── prisma/
│ ├── schema.prisma ✅
│ ├── seed.ts ✅
│ └── data/
│ ├── courses.ts ✅
│ ├── questions-marketing.ts ✅
│ ├── questions-data-analyst.ts ✅
│ └── questions-product-strategist.ts ✅
├── package.json ✅
├── next.config.js ✅
├── tsconfig.json ✅
├── tailwind.config.ts ✅
├── postcss.config.js ✅
├── .env.example ✅
├── .gitignore ✅
└── README.md ✅

````

## 🔧 Installation Steps

### 1. Install Dependencies
```bash
npm install
````

### 2. Set up PostgreSQL Database

You need a PostgreSQL database. Choose one option:

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL if not already installed
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Start PostgreSQL service
# Windows: Service starts automatically
# Mac: brew services start postgresql

# Create database
createdb quiz_db
```

#### Option B: Use Neon (Free Cloud PostgreSQL)

1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project
4. Copy the connection string

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database - Use your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/quiz_db"
# OR for Neon:
# DATABASE_URL="postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth - Generate a secret key
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth (skip if not using Google login)
# Get credentials from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Generate NEXTAUTH_SECRET:

```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Or use any random string (at least 32 characters)
```

### 4. Set up Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 5. Seed Database with Content

```bash
# Populate database with courses, topics, and questions
npx tsx prisma/seed.ts
```

If you see "✅ Database seeded successfully" - you're ready!

### 6. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser 🎉

## 🎯 Testing the Application

### User Journey Test Flow:

1. **Homepage** (http://localhost:3000)
   - View course overview
   - Click "Sign Up"

2. **Registration** (/auth/signup)
   - Create account with email/password
   - Auto-redirected to dashboard after signup

3. **Dashboard** (/dashboard)
   - View progress across all courses
   - See stats: topics completed, quizzes taken, certificates

4. **Course Selection** (/courses)
   - Browse 3 available courses
   - Click any course to view details

5. **Course Detail Page** (/courses/[slug])
   - See all 8 topics
   - Notice only Topic 1 is unlocked initially
   - Click "Start Quiz" on Topic 1

6. **Topic Quiz** (/quiz/[topicId])
   - Answer MCQ questions
   - Use timer, navigation, mark for review
   - Submit and view detailed results
   - Topic 2 unlocks after completion

7. **Complete All Topics**
   - Progress through topics 1-8
   - Watch as each topic unlocks the next

8. **Final Quiz** (/quiz/final/[courseId])
   - Available after all 8 topics completed
   - 50-100 questions from entire course
   - Score 70%+ to earn certificate

9. **Certificate** (Dashboard)
   - View earned certificates in dashboard
   - Certificate ID stored in database

## 🐛 Troubleshooting

### ❌ Error: "Can't reach database server"

**Problem:** Cannot connect to database

**Solutions:**

1. **Supabase Users:**

   ```env
   # Try Transaction Pooler (port 6543)
   DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres"

   # OR add pgbouncer parameter (port 5432)
   DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
   ```

   - Check if Supabase project is paused (free tier pauses after inactivity)
   - Go to your Supabase dashboard and wake it up
   - Verify password has no unescaped special characters

2. **Local PostgreSQL:**

   ```bash
   # Check if PostgreSQL is running
   # Windows: Open Services app, look for "postgresql"
   # Mac: brew services list

   # Test connection manually
   psql -U postgres -d quiz_app
   ```

---

### ❌ Error: "Module not found: '@next-auth/prisma-adapter'"

**Problem:** Missing dependency

**Solution:**

```bash
npm install @next-auth/prisma-adapter
```

This package is required for NextAuth to work with Prisma.

---

### ❌ Error: "npm error could not determine executable to run"

**Problem:** Wrong command syntax

**Solution:**

```bash
# Wrong:
npx db push

# Correct:
npx prisma db push
```

All Prisma commands need the `prisma` keyword.

---

### ❌ Error: Prisma Schema Validation Failed

**Problem:** Schema issues or old Prisma client

**Solution:**

```bash
# Clean and regenerate
npx prisma generate
npx prisma db push
```

---

### ❌ Error: "Port 3000 is already in use"

**Problem:** Another app is using port 3000

**Solution:**

```bash
# Use a different port
npm run dev -- -p 3001

# Then open: http://localhost:3001
```

---

### ❌ Error: Build/Type Errors

**Problem:** TypeScript compilation issues

**Solution:**

```bash
# Delete build cache and node_modules
rm -rf .next node_modules

# Reinstall everything
npm install
npx prisma generate

# Try again
npm run dev
```

---

### ❌ Authentication Not Working

**Problem:** Invalid NEXTAUTH_SECRET or URL

**Solution:**

```bash
# Check your .env file:
# 1. NEXTAUTH_SECRET must be at least 32 characters
# 2. Generate a new one:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. NEXTAUTH_URL must match your actual URL
NEXTAUTH_URL="http://localhost:3000"

# 4. Clear browser cookies and try again
```

---

### ❌ Seeding Fails

**Problem:** Database constraints or existing data

**Solution:**

```bash
# Reset and reseed
npx prisma db push --force-reset
npx prisma generate
npx tsx prisma/seed.ts
```

⚠️ Warning: `--force-reset` deletes ALL data!

### Google OAuth Not Working

- Make sure you've set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Check redirect URI in Google Console is: http://localhost:3000/api/auth/callback/google
- If not using Google, just skip it - email/password works fine!

## 📊 Database Management

### View Database in Prisma Studio (GUI)

```bash
npx prisma studio
```

Opens at http://localhost:5555 - browse all tables visually

### Reset Database

```bash
# WARNING: Deletes all data!
npx prisma db push --force-reset
npx tsx prisma/seed.ts
```

### Add More Questions

Edit files in `prisma/data/`:

- `questions-marketing.ts`
- `questions-data-analyst.ts`
- `questions-product-strategist.ts`

Then re-seed:

```bash
npx tsx prisma/seed.ts
```

## 🚢 Deploying to Production

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Connect GitHub repo
# - Add environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
# - Vercel will build and deploy
```

### Option 2: Docker

```bash
# Build
docker build -t quiz-app .

# Run
docker run -p 3000:3000 --env-file .env quiz-app
```

### Production Environment Variables

Update NEXTAUTH_URL to your production domain:

```env
NEXTAUTH_URL="https://your-domain.com"
```

## 🔐 Security Notes

- **Never commit `.env` file** to Git (already in .gitignore)
- **Use strong NEXTAUTH_SECRET** in production
- **Enable HTTPS** in production (Vercel does this automatically)
- **Rotate secrets regularly**
- **Validate user inputs** (already implemented with Zod)

## 📈 Next Steps / Future Enhancements

### Immediate Priorities:

1. ✅ **Test complete user flow** (signup → quiz → certificate)
2. ✅ **Verify lock/unlock logic** works correctly
3. ✅ **Check responsive design** on mobile devices

### Future Features:

- [ ] **Expand Question Bank** - currently 150+ questions, target is 960-1920
- [ ] PDF Certificate Download
- [ ] Email notifications (quiz completion, certificate earned)
- [ ] Leaderboards (top performers per course)
- [ ] Social sharing (share certificates on LinkedIn)
- [ ] Course recommendations based on performance
- [ ] Admin panel for managing questions
- [ ] Analytics dashboard (time spent, popular topics)
- [ ] Discussion forums per topic
- [ ] Video explanations for questions

### Performance Optimizations:

- [ ] Implement Redis caching for course data
- [ ] Add image optimization for course thumbnails
- [ ] Lazy load question components
- [ ] Implement pagination for quiz history

## 💡 Tips

### Development Workflow:

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Watch Prisma changes
npx prisma studio

# Terminal 3: Run commands
npx tsx prisma/seed.ts
```

### Quick Database Reset During Development:

```bash
# One-liner to reset and reseed
npx prisma db push --force-reset && npx tsx prisma/seed.ts
```

### Debugging Tips:

- Check browser console for frontend errors
- Check terminal logs for backend/API errors
- Use Prisma Studio to verify database state
- Test API routes directly using Postman or curl

## 📞 Getting Help

If you encounter issues:

1. Check console logs (browser + terminal)
2. Verify `.env` configuration
3. Try resetting database
4. Check README.md for detailed documentation
5. Review API routes in `src/app/api/`

## 🎉 What's Working Right Now

✅ **Authentication System** - Signup, Signin, Google OAuth  
✅ **Course Browsing** - View all courses and topics  
✅ **Topic Quizzes** - Complete interactive quiz interface  
✅ **Final Quizzes** - Comprehensive course exams  
✅ **Progress Tracking** - Real-time completion status  
✅ **Lock/Unlock Logic** - Strict sequential progression  
✅ **Certificate Generation** - Auto-issued for 70%+ scores  
✅ **Dashboard** - Complete progress overview  
✅ **Responsive Design** - Works on all devices

**You have a production-ready MVP!** 🚀

Start testing and enjoy your AI Career Quiz Platform!
