# AutoJudge 🚀
### AI-Powered Code Testing & Grading Platform

---

## Features
- 🤖 **AI Test Generation** — Gemini, Groq (Llama3), HuggingFace, Ollama
- ⚡ **Real-time Grading** — C++, Python, Java, JavaScript, C
- 📄 **PDF Reports** — Full submission report with AI feedback
- 🔍 **Plagiarism Detection** — Token-based code similarity
- 🔐 **Auth** — Google OAuth, GitHub OAuth, Email/JWT
- 📁 **File Upload** — Single files, ZIP archives, folder support
- 🏆 **LeetCode-style** — 500+ test cases, TLE/MLE/RE/AC verdicts

---

## Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/yourname/autojudge
cd autojudge
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 4. Open
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

---

## Environment Variables

### Backend (.env)
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `GEMINI_API_KEY` | Google Gemini API (free at ai.google.dev) |
| `GROQ_API_KEY` | Groq API (free at console.groq.com) |
| `HUGGINGFACE_API_KEY` | HuggingFace (free at huggingface.co) |
| `OLLAMA_BASE_URL` | Local Ollama server (optional) |

### Frontend (.env.local)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (http://localhost:5000) |

---

## Get Free API Keys

| Service | URL | Free Tier |
|---------|-----|-----------|
| Google Gemini | https://ai.google.dev | 60 req/min |
| Groq (Llama3) | https://console.groq.com | 30 req/min |
| HuggingFace | https://huggingface.co/settings/tokens | 1000 req/day |
| Ollama (local) | https://ollama.ai | Unlimited |

---

## Set Up OAuth (Free)

### Google OAuth
1. Go to https://console.cloud.google.com
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add `http://localhost:5000/api/auth/google/callback` to redirect URIs

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Callback URL: `http://localhost:5000/api/auth/github/callback`

---

## Tech Stack
- **Frontend**: Next.js 14, TailwindCSS, Framer Motion, Monaco Editor
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB Atlas (free tier)
- **AI**: Google Gemini + Groq + HuggingFace + Ollama
- **Auth**: Passport.js (Google + GitHub + Local JWT)
- **PDF**: PDFKit
- **Sandbox**: Child process execution with timeouts

---

## Project Structure
```
autojudge/
├── backend/
│   ├── src/
│   │   ├── config/       # DB + Passport config
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, upload, validate
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # Express routes
│   │   ├── services/     # AI, PDF, Sandbox
│   │   └── utils/        # Logger, JWT helpers
│   └── server.js
└── frontend/
    └── src/
        ├── app/          # Next.js pages
        │   ├── auth/     # Login, Register
        │   ├── student/  # Student dashboard, assignments
        │   ├── teacher/  # Teacher dashboard, create
        │   └── practice/ # Public practice problems
        ├── components/   # Reusable UI
        └── lib/          # API client, Zustand store
```
