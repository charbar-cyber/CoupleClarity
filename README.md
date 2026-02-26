# CoupleClarity

A relationship coaching web application with AI-powered communication tools. Helps couples improve their emotional communication, resolve conflicts constructively, and build stronger connections.

## Features

- **Emotional Message Transformation** — Rewrites emotionally charged messages into empathetic, constructive communication using "I" statements
- **Conflict Resolution Tools** — Structured conflict threads with AI-mediated insights and resolution strategies
- **Journal & Reflection** — Private and shared journal entries with AI-powered emotional analysis
- **Emotion Tracking** — Real-time emotion sharing between partners with pattern analysis over time
- **Communication Exercises** — Guided exercises for active listening, empathy building, and appreciation sharing
- **AI Therapy Sessions** — AI-generated therapy session scripts based on journal entries and conflict history
- **Love Language Analysis** — Personalized love language insights based on questionnaire responses
- **Partner Dashboard** — Real-time updates via WebSocket for partner activity, emotions, and milestones

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing), TanStack Query
- **Backend:** Express 4, TypeScript, Passport.js (session auth)
- **AI:** OpenAI GPT-4o + Anthropic Claude (user-selectable)
- **Real-time:** WebSocket (ws) for partner notifications
- **Testing:** Vitest + Supertest

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5000)
npm run dev
```

The app runs on port 5000 with no additional configuration required. Register an account and start using it immediately.

## Environment Variables

All environment variables are optional for local development:

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Production only | Session encryption key. Auto-generated default in dev. |
| `OPENAI_API_KEY` | No | Enables AI message transformation, journal analysis, emotion patterns, avatar generation |
| `ANTHROPIC_API_KEY` | No | Enables alternative Claude AI model for message transformation and analysis |
| `MAILGUN_API_KEY` | No | Email notifications (invite links, password reset) |
| `MAILGUN_DOMAIN` | No | Mailgun sending domain |
| `MAILGUN_FROM_EMAIL` | No | Sender email address |

Without AI API keys, the app still fully functions — AI features return sensible defaults instead of generated content.

## Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build for production (Vite + esbuild)
npm run start    # Run production build
npm run test     # Run test suite
npm run check    # TypeScript type check
```

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/charbar-cyber/CoupleClarity)

Or deploy manually:

1. Fork this repo
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Render will auto-detect settings from `render.yaml`
5. Optionally add `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` in the Environment tab

## Project Structure

```
├── client/src/          # React frontend
│   ├── components/      # UI components (shadcn/ui based)
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities, API client
├── server/              # Express backend
│   ├── routes/          # Domain route modules
│   │   ├── emotions.ts
│   │   ├── user-profile.ts
│   │   ├── partnerships.ts
│   │   ├── messages.ts
│   │   ├── exercises.ts
│   │   ├── journal.ts
│   │   ├── check-ins.ts
│   │   ├── notifications.ts
│   │   ├── avatars.ts
│   │   └── therapy-sessions.ts
│   ├── routes.ts        # Route orchestrator + WebSocket
│   ├── auth.ts          # Passport.js authentication
│   ├── openai.ts        # OpenAI integration
│   ├── anthropic.ts     # Anthropic Claude integration
│   └── storage.ts       # Data storage layer
├── shared/              # Shared types and schemas (Drizzle + Zod)
└── vitest.config.ts     # Test configuration
```

## Storage

The app currently uses **in-memory storage** — all data resets when the server restarts. This makes it easy to run locally with zero setup. The schema is defined with Drizzle ORM and can be connected to PostgreSQL (e.g., Neon) for persistent storage by implementing the `IStorage` interface in `server/storage.ts`.

## License

MIT
