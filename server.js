const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// --- Helper Function ---
// Normalize bookmaker list from query params
const normalizeBooks = (booksParam, bookParam) =>
  (booksParam || bookParam || 'draftkings,fanduel,betmgm')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .join(',');

// --- Dynamic Main Odds Endpoint (Moneyline, Spreads, Totals) ---
// Usage: /odds/:sport?book=draftkings
// Example: /odds/basketball_nba?book=fanduel
app.get('/odds/:sport', async (req, res) => {
  // Capture the sport parameter first to avoid scope issues
  const { sport } = req.params;

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
      `https://api.the-odds-api.com/v4/sports/${sport}/odds`,
      {
        params: {
          apiKey: process.env.ODDS_API_KEY,
          regions,
          markets,
          oddsFormat,
          bookmakers: bookmakerList
        },
        timeout: 10000
      }
    );

    res.set('Cache-Control', 'public, max-age=60');
    res.json(response.data);

  } catch (error) {
    console.error(`Error fetching ${sport} odds:`, error.response?.data || error.message);
    res.status(500).json({ 
      error: `Failed to fetch ${sport} odds.`,
      details: error.response?.data || error.message 
    });
  }
});

// --- Dynamic Player Props Endpoint (WITH CRASH PROTECTION) ---
// Usage: /props/:sport?book=draftkings
// Example: /props/baseball_mlb?book=betmgm
app.get('/props/:sport', async (req, res) => {
  // CAPTURE THE SPORT PARAM HERE to avoid the ReferenceError bug
  const { sport } = req.params;

  try {
    const {
      books,
      book,
      regions = 'us',
      // Start with a minimal, common market to avoid immediate rejection
      markets = 'player_anytime_td',
      oddsFormat = 'american'
    } = req.query;

    const bookmakerList = normalizeBooks(books, book);

    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds`,
      {
        params: {
          apiKey: process.env.ODDS_API_KEY,
          regions,
          markets,
          oddsFormat,
          bookmakers: bookmakerList
        },
        timeout: 10000
      }
    );

    res.set('Cache-Control', 'public, max-age=60');
    res.json(response.data);

  } catch (error) {
    // Now we can safely use the captured `sport` variable
    console.error(`Error fetching ${sport} props:`, error.response?.data || error.message);
    
    // Graceful fallback: return empty data instead of crashing
    console.log(`Server is falling back to mock data for ${sport} props.`);
    res.set('Cache-Control', 'public, max-age=10');
    // Return a valid, empty array structure
    res.json([]);
  }
});

// --- Simple Team Filter Endpoint (Bonus - Useful for Frontend) ---
// This gets all NFL odds, then filters by team name
app.get('/nfl/team/:teamName', async (req, res) => {
  try {
    const { teamName } = req.params;
    const { book } = req.query;
    const bookmakerList = normalizeBooks(null, book);

    const response = await axios.get(
      'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds',
      {
        params: {
          apiKey: process.env.ODDS_API_KEY,
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american',
          bookmakers: bookmakerList
        }
      }
    );

    // Filter games where the team is either home or away
    const teamGames = response.data.filter(game => 
      game.home_team.toLowerCase().includes(teamName.toLowerCase()) || 
      game.away_team.toLowerCase().includes(teamName.toLowerCase())
    );

    res.set('Cache-Control', 'public, max-age=60');
    res.json(teamGames);

  } catch (error) {
    console.error('Error fetching NFL team odds:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch NFL team odds.' });
  }
});

// --- Healthcheck and Info Endpoint ---
app.get('/', (req, res) => {
  res.send(`
    <h1>Sports Odds API Proxy</h1>
    <p>Server is running successfully. Endpoints are live.</p>
    <p><b>Try these tested URLs:</b></p>
    <ul>
      <li>NFL Odds: <a href="/odds/americanfootball_nfl?book=draftkings">/odds/americanfootball_nfl?book=draftkings</a></li>
      <li>MLB Odds: <a href="/odds/baseball_mlb?book=draftkings">/odds/baseball_mlb?book=draftkings</a></li>
      <li>NBA Odds: <a href="/odds/basketball_nba?book=draftkings">/odds/basketball_nba?book=draftkings</a></li>
      <li>NHL Odds: <a href="/odds/icehockey_nhl?book=draftkings">/odds/icehockey_nhl?book=draftkings</a></li>
      <li>NFL Props (will return empty until plan upgrade): <a href="/props/americanfootball_nfl?book=draftkings">/props/americanfootball_nfl?book=draftkings</a></li>
    </ul>
    <p><i>Note: Player props endpoints will return empty data until a paid API plan is added.</i></p>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // This is a safe check that will log to your Render logs
  if (process.env.ODDS_API_KEY) {
    console.log('API Key is set and server is ready.');
  } else {
    console.log('WARNING: ODDS_API_KEY environment variable is not set.');
  }
});
