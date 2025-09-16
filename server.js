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
  (booksParam || bookParam || 'draftkings,fanduel,betmgm,caesars,bet365,thescore')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .join(',');

// --- Dynamic Main Odds Endpoint (Moneyline, Spreads, Totals) ---
// Usage: /odds/:sport?book=draftkings
// Example: /odds/basketball_nba?book=fanduel
app.get('/odds/:sport', async (req, res) => {
  try {
    const { sport } = req.params;
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
    console.error(`Error fetching ${req.params.sport} odds:`, error.response?.data || error.message);
    res.status(500).json({ 
      error: `Failed to fetch ${req.params.sport} odds.`,
      details: error.response?.data || error.message 
    });
  }
});

// --- Dynamic Player Props Endpoint ---
// Usage: /props/:sport?book=draftkings
// Example: /props/baseball_mlb?book=betmgm
app.get('/props/:sport', async (req, res) => {
  try {
    const { sport } = req.params;
    const {
      books,
      book,
      regions = 'us',
      // Common props for major sports
      markets = 'player_pass_yds,player_pass_tds,player_rush_yds,player_recv_yds,player_receptions,player_anytime_td,player_strikeouts,player_hits', 
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
    console.error(`Error fetching ${req.params.sport} props:`, error.response?.data || error.message);
    // If the real API call fails, serve mock data for development
    const mockData = generateMockData(sport, req.query.book);
    res.set('Cache-Control', 'public, max-age=10'); // Short cache for mock data
    return res.json(mockData);
  }
});

// --- Healthcheck and Info Endpoint ---
app.get('/', (req, res) => {
  res.send(`
    <h1>Sports Odds API Proxy</h1>
    <p>Endpoints:</p>
    <ul>
      <li><b>Main Odds:</b> GET /odds/:sport?book=bookname</li>
      <li><b>Player Props:</b> GET /props/:sport?book=bookname</li>
    </ul>
    <p>Example URLs:</p>
    <ul>
      <li>NBA Odds: <a href="/odds/basketball_nba?book=draftkings">/odds/basketball_nba?book=draftkings</a></li>
      <li>MLB Props: <a href="/props/baseball_mlb?book=fanduel">/props/baseball_mlb?book=fanduel</a></li>
      <li>NHL Odds: <a href="/odds/icehockey_nhl?book=betmgm">/odds/icehockey_nhl?book=betmgm</a></li>
    </ul>
  `);
});

// --- Mock Data Function (Fallback for Props) ---
function generateMockData(sport, bookmaker) {
  // ... (Your existing generateMockPropData function would go here)
  // You can enhance it to generate sport-specific mock data based on the 'sport' parameter
  console.log(`Generating MOCK data for ${sport} from ${bookmaker}`);
  return []; // Return empty array for now for the test
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
