const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

app.use(cors());

app.get('/nfl-odds', async (req, res) => {
  try {
    const response = await axios.get('https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds', {
      params: {
        apiKey: ODDS_API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching NFL odds:', error.message);
    res.status(500).json({ error: 'Failed to fetch NFL odds.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
