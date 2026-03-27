import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';

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
import { downloadWebexFile, saveJson } from './downloader.js';

async function getWebexEmail(token: string): Promise<string> {
  try {
    const response = await axios.get('https://webexapis.com/v1/people/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.emails[0];
  } catch (error) {
    console.error('Failed to fetch Webex email:', error);
    return 'unknown_user';
  }
}

// Webex Download All Endpoint
app.post('/api/webex/download-all', async (req, res) => {
  const { token } = req.body;
  
  try {
    // 1. Fetch rooms
    const roomsResponse = await axios.get('https://webexapis.com/v1/rooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const rooms = roomsResponse.data.items;

    const userEmail = await getWebexEmail(token);
    const report = [];

    for (const room of rooms) {
      const roomId = room.id;
      const roomTitle = room.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const relativeDir = path.join(userEmail, `${roomTitle}_${roomId}`);
      
      // 2. Fetch messages for the room
      const msgResponse = await axios.get(`https://webexapis.com/v1/messages?roomId=${roomId}&max=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const messages = msgResponse.data.items;

      // 3. Save messages JSON
      await saveJson(relativeDir, messages, 'messages.json');

      // 4. Download attachments
      let downloadedCount = 0;
      for (const msg of messages) {
        if (msg.files && msg.files.length > 0) {
          for (const fileUrl of msg.files) {
            try {
              await downloadWebexFile(token, fileUrl, relativeDir);
              downloadedCount++;
            } catch (err) {
              console.error(`Error downloading ${fileUrl}:`, err);
            }
          }
        }
      }

      report.push({
        room: room.title,
        roomId: roomId,
        messagesCount: messages.length,
        attachmentsCount: downloadedCount,
        path: relativeDir
      });
    }

    res.json({ message: 'Bulk download completed', report });
  } catch (error: any) {
    res.status(500).json({ message: 'Bulk download failed', error: error.message });
  }
});

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

    const userEmail = await getWebexEmail(webexToken);
    const relativeDir = path.join(userEmail, roomId);

    // 3. Create Migration Channel
    const channel = await createMigrationChannel(teamsToken, teamId, channelName);
    const channelId = channel.id;

    // 4. Migrate Messages
    const results = [];
    for (const msg of messages) {
      // Local Download Option
      if (options?.downloadLocal && msg.files && msg.files.length > 0) {
        for (const fileUrl of msg.files) {
          try {
            await downloadWebexFile(webexToken, fileUrl, relativeDir);
            console.log(`Downloaded file from message ${msg.id}`);
          } catch (err: any) {
             console.error(`Failed to download file from message ${msg.id}: ${err.message}`);
          }
        }
      }

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
