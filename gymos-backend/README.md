# GymOS Backend API

Production-grade multi-tenant SaaS backend for the GymOS Gym Management Platform.

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (Access + Refresh) |
| Password | bcrypt (rounds: 12) |
| Validation | Zod |
| File Upload | Multer + Cloudinary |
| Email | Nodemailer (SMTP) |
| WhatsApp | Twilio WhatsApp API |
| Scheduling | node-cron |
| Logging | Morgan + Winston |
| Security | Helmet, CORS, express-rate-limit |
| PDF | pdfkit |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run in development
```bash
npm run dev
```

### 4. Run in production
```bash
npm start
```

## Project Structure

```
gymos-backend/
├── src/
│   ├── config/          # DB, Cloudinary, Twilio, Nodemailer, Logger
│   ├── models/          # 13 Mongoose models
│   ├── controllers/     # 14 route controllers
│   ├── routes/          # 14 route files
│   ├── middleware/       # auth, role, tenant, validate, error, upload
│   ├── validators/      # 7 Zod schemas
│   ├── utils/           # helpers (tokens, IDs, WhatsApp, email, PDF)
│   ├── jobs/            # 3 cron jobs
│   └── app.js           # Express app
└── server.js            # Entry point
```

## API Base URL

```
Development: http://localhost:5000
Production: https://your-render-app.onrender.com
```

## Key API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Owner registration |
| POST | `/api/auth/login` | Owner login |
| POST | `/api/auth/member/login` | Member login |
| POST | `/api/auth/refresh-token` | Rotate tokens |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset password |

### Gym Management
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/gyms` | Create gym |
| GET | `/api/gyms/:gymId/dashboard` | Dashboard stats |
| GET | `/api/gyms/:gymId/members` | Paginated members |
| POST | `/api/gyms/:gymId/members` | Add member |
| POST | `/api/gyms/:gymId/attendance/mark` | Mark attendance |
| POST | `/api/gyms/:gymId/payments` | Record payment |
| GET | `/api/gyms/:gymId/payments/:id/receipt` | Download PDF receipt |
| GET | `/api/gyms/:gymId/leaderboard` | Points leaderboard |

## Security

- All gym routes protected by **tenant middleware** (cross-tenant prevention)
- Rate limiting: Auth 10/15min, General 100/15min
- Passwords: bcrypt rounds 12
- JWT: 15m access / 7d refresh with rotation
- No `password` or `refreshToken` in any API response

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

## Cron Jobs

| Job | Schedule | Description |
|---|---|---|
| Expiry Reminder | Daily 9:00 AM IST | WhatsApp alerts for expiring members |
| Fee Reminder | Daily 10:00 AM IST | WhatsApp alerts for expired members |
| Streak Reset | Daily 11:59 PM IST | Reset missed streaks, notify members |

Set `ENABLE_CRON=true` in `.env` to enable cron jobs in development.

## Deployment (Render)

1. Connect GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add all environment variables from `.env.example`
5. Set `NODE_ENV=production`
