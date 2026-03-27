/**
 * webex.ts
 * Service to handle direct Webex API calls from the browser.
 */

export interface WebexRoom {
  id: string;
  title: string;
  type: string;
  created: string;
}

export interface WebexMessage {
  id: string;
  roomId: string;
  roomType: string;
  text?: string;
  personId: string;
  personEmail: string;
  created: string;
  files?: string[];
}

export interface WebexPerson {
  id: string;
  emails: string[];
  displayName: string;
}

const BASE_URL = 'https://webexapis.com/v1';

export const WebexService = {
  async getMe(token: string): Promise<WebexPerson> {
    const response = await fetch(`${BASE_URL}/people/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  },

  async getRooms(token: string): Promise<WebexRoom[]> {
    const response = await fetch(`${BASE_URL}/rooms?max=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch rooms');
    const data = await response.json();
    return data.items;
  },

  async getMessages(token: string, roomId: string, max = 100): Promise<WebexMessage[]> {
    const response = await fetch(`${BASE_URL}/messages?roomId=${roomId}&max=${max}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    const data = await response.json();
    return data.items;
  },

  async downloadFile(token: string, fileUrl: string): Promise<Blob> {
    const response = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  }
};
