# AI Career Quiz Platform

A comprehensive quiz web application built with Next.js, TypeScript, Prisma, and PostgreSQL. Features a strict progression system where users must complete topics sequentially and pass final exams to earn certificates.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your .env file (copy from .env.example and add your DATABASE_URL)
cp .env.example .env

# 3. Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# 4. Seed the database with sample data
npx tsx prisma/seed.ts

# 5. Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- 🎓 **3 AI Career Tracks**: AI Marketing Intelligence, AI Data Analyst, AI Product & Automation Strategist
- 📚 **24 Topics**: 8 topics per course covering comprehensive curriculum
- ✅ **Strict Progression**: Topic N+1 unlocks only after completing Topic N with 100% quiz completion
- 📝 **Rich Question Bank**: 40-80 MCQ questions per topic with detailed explanations
- ⏱️ **Interactive Quiz Interface**: Real-time timer, question navigation, mark for review
- 🏆 **Final Syllabus Quiz**: 50-100 questions from all topics after course completion
- 🎖️ **Certificate System**: Auto-generated certificates for 70%+ final quiz scores
- 📊 **Progress Dashboard**: Track completion across all courses
- 🔐 **Authentication**: Email/password + Google OAuth via NextAuth
- 📱 **Responsive Design**: Mobile-friendly interface with TailwindCSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **State Management**: Redux Toolkit
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Credentials + Google OAuth) + Prisma Adapter
- **Password Hashing**: bcryptjs
- **Validation**: Zod

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud: Supabase/Neon/Railway)
- npm or yarn package manager
- Google OAuth credentials (optional, for Google sign-in)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd quiz-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Local PostgreSQL
   DATABASE_URL="postgresql://username:password@localhost:5432/quiz_db"

   # OR Supabase (add pgbouncer parameter)
   DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

   # OR Supabase Transaction Pooler (port 6543)
   DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres"

   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"

   # Optional: Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Email Verification (Node SMTP)
   EMAIL_SERVER_HOST="smtp.your-provider.com"
   EMAIL_SERVER_PORT="587"
   EMAIL_SERVER_SECURE="false"
   EMAIL_SERVER_USER="your-smtp-username"
   EMAIL_SERVER_PASSWORD="your-smtp-password"
   EMAIL_FROM="Quiz App <no-reply@yourdomain.com>"
   ```

   Generate a secure secret for NEXTAUTH_SECRET:

   **Linux/Mac:**

   ```bash
   openssl rand -base64 32
   ```

   **Windows PowerShell:**

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to database
   npx prisma db push

   # Seed the database with courses, topics, and questions
   npx tsx prisma/seed.ts
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
quiz-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeding script
│   └── data/
│       ├── courses.ts         # Course and topic structure
│       ├── questions-marketing.ts
│       ├── questions-data-analyst.ts
│       └── questions-product-strategist.ts
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── courses/       # Course data endpoints
│   │   │   ├── quiz/          # Quiz endpoints
│   │   │   └── progress/      # User progress endpoint
│   │   ├── courses/           # Course pages
│   │   ├── quiz/              # Quiz pages
│   │   ├── dashboard/         # User dashboard
│   │   ├── auth/              # Auth pages (signin/signup)
│   │   └── page.tsx           # Homepage
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── Providers.tsx
│   ├── store/
│   │   ├── store.ts           # Redux store
│   │   └── slices/
│   │       ├── quizSlice.ts
│   │       └── userSlice.ts
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   └── auth.ts            # NextAuth configuration
│   └── types/
│       └── index.ts           # TypeScript interfaces
└── package.json
```

## Database Models

- **User**: Authentication and profile
- **Account/Session**: NextAuth session management
- **Course**: AI career tracks
- **Topic**: Course modules (8 per course)
- **Question**: MCQ questions with difficulty levels
- **TopicProgress**: User completion tracking
- **QuizAttempt**: Quiz history and scores
- **Certificate**: Auto-generated for passing final quizzes

## Key Features Explained

### Lock/Unlock Logic

- Topics are ordered sequentially (order: 1, 2, 3...)
- Topic N+1 is locked until Topic N quiz is completed
- Server-side validation prevents API manipulation
- Client-side UI shows locked state with 🔒 indicator

### Quiz System

- **Topic Quizzes**: Questions specific to one topic
- **Final Quiz**: Mixed questions from all course topics
- Automatic shuffling for variety
- Balanced difficulty (30% easy, 50% medium, 20% hard in final quiz)
- Detailed explanations for each answer

### Progression Flow

1. User signs up/logs in
2. Selects a course
3. Completes Topic 1 quiz
4. Topic 2 unlocks automatically
5. Repeats until all topics completed
6. Final quiz unlocks
7. Scores 70%+ → Certificate generated

## API Endpoints

| Endpoint                     | Method | Description                     |
| ---------------------------- | ------ | ------------------------------- |
| `/api/auth/register`         | POST   | User registration               |
| `/api/auth/[...nextauth]`    | \*     | NextAuth handlers               |
| `/api/courses`               | GET    | List all courses                |
| `/api/courses/[courseId]`    | GET    | Course details with lock status |
| `/api/quiz/topic/[topicId]`  | GET    | Fetch topic quiz questions      |
| `/api/quiz/final/[courseId]` | GET    | Fetch final quiz questions      |
| `/api/quiz/submit`           | POST   | Submit quiz answers             |
| `/api/progress`              | GET    | User progress across courses    |
| `/api/payment/create-order`  | POST   | Create Razorpay order           |
| `/api/payment/verify`        | POST   | Verify Razorpay signature       |
| `/api/payment/webhook`       | POST   | Handle Razorpay webhook events  |

## Payment System (Multi-Gateway)

The platform features an intelligent, multi-gateway payment system that automatically routes users to the appropriate provider based on their geographic location:

- **India (INR)**: Routed to **Razorpay**.
- **International (USD, EUR, GBP, AUD, CAD)**: Routed to **Cashfree**.

### Key Features
- **Auto-Currency Detection**: Uses the visitor's IP address to detect their country and display localized pricing before they click "Buy".
- **Dynamic Routing**: A single "Buy" button adapts its behavior, loading either the Razorpay modal or the Cashfree SDK.
- **Localized Pricing**: Supports fixed pricing for major currencies:
  - 🇮🇳 INR: ₹1,495
  - 🇺🇸 USD: $12
  - 🇪🇺 EUR: €11
  - 🇬🇧 GBP: £10
  - 🇦🇺 AUD: $18
  - 🇨🇦 CAD: $16
- **Global Webhook Handling**: A unified webhook receiver (`/api/payment/webhook`) verifies authenticity regardless of the source.
- **Unified DB Schema**: All transactions are tracked in a single `Payment` table with a `provider` flag.

### Prerequisites & Setup

#### Razorpay (India)
Required environment variables:
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `COURSE_PRICE_INR`

#### Cashfree (International)
Get credentials at [Cashfree Merchant Dashboard](https://merchant.cashfree.com/merchants/pg):
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`
- `CASHFREE_ENV` (sandbox/production)
- `NEXT_PUBLIC_CASHFREE_ENV` (sandbox/production)

#### Zoho Invoice Automation
Both gateways are integrated with Zoho Invoice for automatic receipting.
- `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_ORGANIZATION_ID`

## Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npx prisma studio          # Open Prisma Studio GUI
npx prisma db push         # Push schema changes
npx prisma generate        # Regenerate Prisma client
npx tsx prisma/seed.ts     # Reseed database
```

## Environment Variables

| Variable                      | Description                                        | Required |
| ----------------------------- | -------------------------------------------------- | -------- |
| `DATABASE_URL`                | PostgreSQL connection string                       | Yes      |
| `NEXTAUTH_SECRET`             | Secret for JWT signing                             | Yes      |
| `NEXTAUTH_URL`                | Application URL                                    | Yes      |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID                             | No       |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth client secret                         | No       |
| `EMAIL_SERVER_HOST`           | SMTP host for verification emails                  | Yes      |
| `EMAIL_SERVER_PORT`           | SMTP port (587 for TLS, 465 for SSL)               | Yes      |
| `EMAIL_SERVER_SECURE`         | `true` for SSL (usually 465), else `false`         | Yes      |
| `EMAIL_SERVER_USER`           | SMTP username                                      | Yes      |
| `EMAIL_SERVER_PASSWORD`       | SMTP password or app password                      | Yes      |
| `EMAIL_FROM`                  | Sender address shown in verification email         | Yes      |
| `RAZORPAY_KEY_ID`             | Razorpay API key ID (server use)                   | No       |
| `RAZORPAY_KEY_SECRET`         | Razorpay API key secret (server use)               | No       |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID exposed to frontend checkout       | No       |
| `COURSE_PRICE_INR`            | Checkout amount for course unlock in INR           | Yes      |
| `RAZORPAY_WEBHOOK_SECRET`     | Razorpay webhook secret for signature verification | No       |
| `CASHFREE_APP_ID`             | Cashfree App ID (server use)                       | No       |
| `CASHFREE_SECRET_KEY`         | Cashfree Secret Key (server use)                   | No       |
| `CASHFREE_ENV`                | Cashfree environment (sandbox/production)          | No       |
| `NEXT_PUBLIC_CASHFREE_ENV`    | Cashfree environment exposed to frontend           | No       |
| `ZOHO_CLIENT_ID`              | Zoho OAuth client ID                               | No       |
| `ZOHO_CLIENT_SECRET`          | Zoho OAuth client secret                           | No       |
| `ZOHO_REFRESH_TOKEN`          | Zoho refresh token                                 | No       |
| `ZOHO_ORGANIZATION_ID`        | Zoho organization ID                               | No       |

## Troubleshooting

### Database Connection Issues

**Local PostgreSQL:**

- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists: `createdb quiz_db`

**Supabase:**

- Add `?pgbouncer=true&connection_limit=1` to connection string
- Use Transaction Pooler (port 6543) instead of Direct Connection (port 5432)
- Check if project is paused (free tier pauses after inactivity)
- Verify password has no unescaped special characters

**Error: Module not found '@next-auth/prisma-adapter':**

```bash
npm install @next-auth/prisma-adapter
```

### Authentication Issues

- Verify NEXTAUTH_SECRET is set and is a valid base64 string
- Clear browser cookies and try again
- Check Google OAuth credentials if using Google sign-in
- Ensure NEXTAUTH_URL matches your actual URL
- For email/password signup, ensure SMTP variables are set and valid

## Email Verification Testing

Use one of the options below for local testing.

1. Mailtrap (recommended for local testing)

- Create a Mailtrap inbox and copy SMTP credentials
- Set `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`
- Set `EMAIL_SERVER_SECURE` to `false` for port 587
- Set `EMAIL_FROM` to any sender format like `Quiz App <no-reply@example.com>`

2. Gmail SMTP (personal testing)

- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `false`
- User: your full Gmail address
- Password: Gmail app password (not your normal account password)

3. Verification flow test checklist

- Start app with `npm run dev`
- Open signup page and create a new account with a real email
- Confirm success message appears after submit
- Open mailbox (or Mailtrap inbox) and click verification link
- Confirm redirect to sign-in with verified indicator
- Sign in with same credentials and verify login succeeds
- Try sign-in before verification on a fresh account and verify it is blocked

### Seeding Errors

- Run `npx prisma generate` first
- Then run `npx prisma db push`
- Delete all data: `npx prisma db push --force-reset`
- Re-run seed script: `npx tsx prisma/seed.ts`

### Build Errors

- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Run `npx prisma generate`
- Try `npm run dev` again

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checking: `npm run build`
5. Submit a pull request

## License

MIT License - feel free to use for your projects!

## Future Enhancements

- [ ] Expand question bank to 40-80 per topic (currently ~150 total)
- [ ] PDF certificate download
- [ ] Leaderboards
- [ ] Social sharing
- [ ] Course recommendations
- [ ] Email notifications
- [ ] Mobile app (React Native)

## Support

For issues or questions, please open a GitHub issue or contact the maintainers.

---

**Built with ❤️ for aspiring AI professionals**
