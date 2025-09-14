// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ODDS_API = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';

app.use(cors());
app.use(compression());

// --- helpers ---
const normalizeBooks = (booksParam, bookParam) => {
  return (booksParam || bookParam || 'draftkings,fanduel,betmgm,caesars,bet365,thescore')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .join(',');
};

const filterByTeamAndWindow = (data, team, windowHours) => {
  let out = Array.isArray(data) ? data : [];
  if (team) {
    const needles = team.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    out = out.filter(g => {
      const home = (g.home_team || '').toLowerCase();
      const away = (g.away_team || '').toLowerCase();
      return needles.some(n => home.includes(n) || away.includes(n));
    });
  }
  if (windowHours) {
    const now = Date.now();
    const horizon = now + Number(windowHours) * 3600 * 1000;
    out = out.filter(g => {
      const t = Date.parse(g.commence_time);
      return !Number.isNaN(t) && t >= now && t <= horizon;
    });
  }
  return out;
};

const fetchOdds = async (params) => {
  const response = await axios.get(ODDS_API, { params, timeout: 15000 });
  return { data: response.data, headers: response.headers };
};

// --- core markets (moneyline/spreads/totals) ---
app.get('/nfl-odds', async (req, res) => {
  try {
    const {
      books,
      book,
      regions = 'us',
      markets = 'h2h,spreads,totals',
      oddsFormat = 'american',
      team,               // optional: "Philadelphia Eagles,Dallas Cowboys"
      windowHours         // optional: "36" (future games within N hours)
    } = req.query;

    const bookmakers = normalizeBooks(books, book);

    const { data, headers } = await fetchOdds({
      apiKey: process.env.ODDS_API_KEY,
      regions,
      markets,
      oddsFormat,
      bookmakers
    });

    const filtered = filterByTeamAndWindow(data, team, windowHours);

    // caching hints + pass through remaining-requests if present
    res.set('Cache-Control', 'public, max-age=60');
    if (headers['x-requests-remaining']) {
      res.set('X-OddsAPI-Requests-Remaining', headers['x-requests-remaining']);
    }
    return res.json(filtered);
  } catch (error) {
    console.error('Error fetching NFL odds:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch NFL odds.' });
  }
});

// --- player props endpoint ---
app.get('/nfl-props', async (req, res) => {
  try {
    const {
      books,
      book,
      regions = 'us',
      // Default to commonly used NFL prop markets; override with ?markets=... if you need others
      markets = [
        'player_pass_yds',
        'player_pass_tds',
        'player_rush_yds',
        'player_recv_yds',
        'player_receptions',
        'player_anytime_td'
      ].join(','),
      oddsFormat = 'american',
      team,               // optional: "Philadelphia Eagles,Dallas Cowboys"
      windowHours         // optional: "36"
    } = req.query;

    const bookmakers = normalizeBooks(books, book);

    const { data, headers } = await fetchOdds({
      apiKey: process.env.ODDS_API_KEY,
      regions,
      markets,
      oddsFormat,
      bookmakers
    });

    const filtered = filterByTeamAndWindow(data, team, windowHours);

    res.set('Cache-Control', 'public, max-age=60');
    if (headers['x-requests-remaining']) {
      res.set('X-OddsAPI-Requests-Remaining', headers['x-requests-remaining']);
    }
    return res.json(filtered);
  } catch (error) {
    console.error('Error fetching NFL props:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch NFL props.' });
  }
});

// healthcheck / root
app.get('/', (_req, res) => {
  res.send('NFL Odds Proxy API is running. Endpoints: /nfl-odds, /nfl-props');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
