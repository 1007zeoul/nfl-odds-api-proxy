const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/nfl-odds', async (req, res) => {
  try {
    const { books, book, regions = 'us', markets = 'h2h,spreads,totals', oddsFormat = 'american' } = req.query;

    // Normalize bookmaker list
    const bookmakerList = (books || book || 'draftkings,fanduel,betmgm,caesars,bet365')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .join(',');

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
