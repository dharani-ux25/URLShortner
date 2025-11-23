require('dotenv').config();

const express = require('express');
const path = require('path');
const pool = require('./db');
const crypto = require('crypto');
const validUrl = require('valid-url');
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_COOKIE = 'token';

// helpers
function genCode(len=6){
  return crypto.randomBytes(len).toString('base64url').slice(0,len);
}

function authMiddleware(req, res, next){
  const token = req.cookies[JWT_COOKIE] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// API: create short link
app.post('/api/shorten', async (req, res) => {
  try {
    const { url, alias } = req.body;
    if (!url || !validUrl.isWebUri(url)) return res.status(400).json({ error: 'Invalid URL' });

    let code = alias ? alias.replace(/[^a-zA-Z0-9_-]/g,'') : genCode(6);

    // Ensure code uniqueness
    let exists = await pool.query('SELECT id FROM links WHERE short_code = $1', [code]);
    if (exists.rowCount > 0) {
      if (alias) return res.status(409).json({ error: 'Alias already in use' });
      // otherwise retry small number of times
      let tries = 0;
      while (exists.rowCount > 0 && tries < 5) {
        code = genCode(6);
        const r = await pool.query('SELECT id FROM links WHERE short_code = $1', [code]);
        if (r.rowCount === 0) break;
        tries++;
      }
    }

    const result = await pool.query(
      'INSERT INTO links (original_url, short_code, created_at, hits) VALUES ($1,$2,NOW(),0) RETURNING id, short_code',
      [url, code]
    );
    const short = `${BASE_URL}/r/${result.rows[0].short_code}`;
    res.json({ short, code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: list links (public)
app.get('/api/links', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, original_url, short_code, hits, created_at FROM links ORDER BY created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: stats for a code (public)
app.get('/api/stats/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const r = await pool.query('SELECT id, original_url, short_code, hits, created_at FROM links WHERE short_code = $1', [code]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    const link = r.rows[0];
    const clicks = await pool.query('SELECT ip, user_agent, referrer, created_at FROM clicks WHERE link_id = $1 ORDER BY created_at DESC LIMIT 200', [link.id]);
    res.json({ ...link, clicks: clicks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Redirect route with click logging
app.get('/r/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const r = await pool.query('SELECT id, original_url, hits FROM links WHERE short_code = $1', [code]);
    if (r.rowCount === 0) return res.status(404).send('Not found');
    const row = r.rows[0];
    const original = row.original_url;
    // increment hits
    await pool.query('UPDATE links SET hits = hits + 1 WHERE id = $1', [row.id]);

    // log click (non-blocking)
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';
    const ref = req.get('Referrer') || req.get('Referer') || null;
    pool.query('INSERT INTO clicks (link_id, ip, user_agent, referrer, created_at) VALUES ($1,$2,$3,$4,NOW())', [row.id, ip, ua, ref])
      .catch(e => console.error('click log error', e));

    res.redirect(original);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- AUTH ---

// Register (create admin) - only allow if no users exist OR allow env override
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) return res.status(400).json({ error: 'Email and password (min 6) required' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'User exists' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (email, password_hash, role, created_at) VALUES ($1,$2,$3,NOW())', [email, hash, 'admin']);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(JWT_COOKIE, token, { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(JWT_COOKIE);
  res.json({ ok: true });
});

// Admin APIs (protected)
app.get('/api/admin/links', authMiddleware, async (req, res) => {
  try {
    // return links + click counts
    const links = await pool.query('SELECT id, original_url, short_code, hits, created_at FROM links ORDER BY created_at DESC LIMIT 500');
    res.json(links.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/link/:id/clicks', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const clicks = await pool.query('SELECT id, ip, user_agent, referrer, created_at FROM clicks WHERE link_id = $1 ORDER BY created_at DESC LIMIT 1000', [id]);
    res.json(clicks.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback to SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
//