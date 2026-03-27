/**
 * teams.ts
 * Microsoft Graph API Connector for Teams Migration.
 */
import axios from 'axios';

interface TeamsConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export async function getTeamsAccessToken(config: TeamsConfig): Promise<string> {
  const { tenantId, clientId, clientSecret } = config;
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(url, params);
  return response.data.access_token;
}

export async function createMigrationChannel(token: string, teamId: string, channelName: string) {
  const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`;
  const payload = {
    displayName: channelName,
    description: 'Migrated from Webex',
    '@microsoft.graph.channelCreationMode': 'migration'
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function addMigrationMessage(token: string, teamId: string, channelId: string, message: any) {
  const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`;
  
  // Teams Migration API requires very specific payload for back-dated messages
  const response = await axios.post(url, message, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function completeMigration(token: string, teamId: string, channelId: string) {
  const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/completeMigration`;
  await axios.post(url, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
