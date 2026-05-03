# VisitflowPlanner

Route planning application for enterprise use with Microsoft Azure AD authentication, Azure Maps integration, and customer visit management.

## Structure

```
VisitflowPlanner/
├── frontend/   # Next.js 15 (App Router, shadcn/ui, NextAuth.js)
└── backend/    # Express.js API (port 8081)
```

## Getting started

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run server
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

**Ports:** backend on `8081`, frontend on `3000`.
