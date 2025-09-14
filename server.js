const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Normalize bookmaker list
const normalizeBooks = (booksParam, bookParam) =>
  (booksParam || bookParam || 'draftkings,fanduel,betmgm,caesars,bet365,thescore')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .join(',');

// Core NFL odds (moneyline, spreads, totals)
app.get('/nfl-odds', async (req, res) => {
  try {
    const {
      books,
      book,
      regions = 'us',
      markets = 'h2h,spreads,totals',
      oddsFormat = 'american'
    } = req.query;

    const bookmakerList = normalizeBooks(books, book);

    const response = await axios.get(
      'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds',
      {
        params: {
          apiKey: process.env.ODDS_API_KEY,
          regions,
          markets,
          oddsFormat,
          bookmakers: bookmakerList
        }
      }
    );

    res.set('Cache-Control', 'public, max-age=60');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching NFL odds:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch NFL odds.' });
  }
});

// Player props endpoint
app.get('/nfl-props', async (req, res) => {
  try {
    const {
      books,
      book,
      regions = 'us',
      markets = 'player_pass_yds,player_pass_tds,player_rush_yds,player_recv_yds,player_receptions,player_anytime_td',
      oddsFormat = 'american'
    } = req.query;

    const bookmakerList = normalizeBooks(books, book);

    const response = await axios.get(
      'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds',
      {
        params: {
          apiKey: process.env.ODDS_API_KEY,
          regions,
          markets,
          oddsFormat,
          bookmakers: bookmakerList
        }
      }
    );

    res.set('Cache-Control', 'public, max-age=60');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching NFL props:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch NFL props.' });
  }
});

// Healthcheck
app.get('/', (_req, res) => {
  res.send('NFL Odds Proxy API is running. Endpoints: /nfl-odds, /nfl-props');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
