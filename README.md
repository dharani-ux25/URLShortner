# URL Shortener — Express + Tailwind + PostgreSQL (Neon-ready)

A minimal URL shortener app built with **Node.js + Express**, **Tailwind CSS** (CDN), and **Postgres** (works with Neon).  
Includes: shorten URLs, redirect to original, view stats, and manage links via a simple SPA.

## Features
- Create short links (optional custom alias)
- Redirect `/r/:code` to original URL (increments hit counter)
- Simple stats endpoint
- Plain SPA frontend served by Express (uses Tailwind via CDN)
- Ready to deploy to Vercel / Render / Railway / Heroku (use `DATABASE_URL` env var)

## Quick start (local)
1. Install dependencies:
```bash
cd url-shortener-express
npm install
```

2. Create a Postgres database (locally or with Neon). Run the SQL in `migrations/init.sql` to create the table.

3. Copy `.env.example` to `.env` and set `DATABASE_URL`, and optionally `PORT`:
```
DATABASE_URL=postgres://user:pass@host:5432/dbname
PORT=3000
BASE_URL=http://localhost:3000
```

4. Start the server:
```bash
npm run dev
```

Server serves the SPA at `/` and exposes API under `/api`. Redirects are under `/r/:code`.

## Deployment
- Set `DATABASE_URL` in your deployment platform (Neon provides a connection string).
- If deploying to Vercel, use the "Dockerfile" or deploy the server as a Node service (Render or Railway are simpler for full Node servers).

## Files overview
- `server.js` — main Express server
- `db.js` — Postgres connection (pg Pool)
- `migrations/init.sql` — SQL to create table
- `public/` — frontend SPA (index.html, app.js)
- `.env.example` — example env variables

## Notes
This project is intentionally minimal and educational. For production hardening, add:
- Rate limiting, validation, authentication (if needed)
- Proper analytics and GDPR handling
- Input sanitization and URL normalization
