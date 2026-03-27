import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Webex Endpoints
app.post('/api/webex/rooms', async (req, res) => {
  const { token } = req.body;
  try {
    const response = await axios.get('https://webexapis.com/v1/rooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Internal Server Error' });
  }
});

app.post('/api/webex/messages', async (req, res) => {
  const { token, roomId, max = 100 } = req.body;
  try {
    const response = await axios.get(`https://webexapis.com/v1/messages?roomId=${roomId}&max=${max}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Internal Server Error' });
  }
});

import { getTeamsAccessToken, createMigrationChannel, addMigrationMessage, completeMigration } from './teams.js';
import { formatTeamsMigrationMessage } from './normalize.js';

// Teams Migration Endpoint
app.post('/api/teams/migrate', async (req, res) => {
  const { 
    webexToken, 
    roomId, 
    teamsConfig, 
    teamId, 
    channelName,
    options 
  } = req.body;

  try {
    // 1. Get Teams Token
    const teamsToken = await getTeamsAccessToken(teamsConfig);

    // 2. Fetch Webex Messages
    const webexResponse = await axios.get(`https://webexapis.com/v1/messages?roomId=${roomId}&max=100`, {
      headers: { Authorization: `Bearer ${webexToken}` }
    });
    const messages = webexResponse.data.items.reverse(); // Migration API requires chronological order

    // 3. Create Migration Channel
    const channel = await createMigrationChannel(teamsToken, teamId, channelName);
    const channelId = channel.id;

    // 4. Migrate Messages
    const results = [];
    for (const msg of messages) {
      const teamsMsg = formatTeamsMigrationMessage(msg);
      try {
        const result = await addMigrationMessage(teamsToken, teamId, channelId, teamsMsg);
        results.push({ id: msg.id, status: 'success', teamsId: result.id });
      } catch (err: any) {
        results.push({ id: msg.id, status: 'error', error: err.response?.data || err.message });
      }
    }

    // 5. Complete Migration (Remove Lock)
    await completeMigration(teamsToken, teamId, channelId);

    res.json({ 
      message: 'Migration completed', 
      channelId,
      results 
    });
  } catch (error: any) {
    console.error('Migration Error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Migration failed', 
      error: error.response?.data || error.message 
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
