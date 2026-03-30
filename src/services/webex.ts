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
    if (!response.ok) throw new Error('Kullanıcı profili alınamadı');
    return response.json();
  },

  async getRooms(token: string): Promise<WebexRoom[]> {
    const response = await fetch(`${BASE_URL}/rooms?max=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Alanlar alınamadı');
    const data = await response.json();
    return data.items;
  },

  async getMessages(token: string, roomId: string): Promise<WebexMessage[]> {
    let messages: WebexMessage[] = [];
    let nextUrl: string | null = `${BASE_URL}/messages?roomId=${roomId}&max=1000`;

    while (nextUrl) {
      const response: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Mesajlar alınamadı');
      
      const data = await response.json();
      messages = [...messages, ...data.items];

      // Webex pagination uses Link header
      const linkHeader = response.headers.get('Link');
      const nextMatch = linkHeader ? linkHeader.match(/<([^>]+)>;\s*rel="next"/) : null;
      nextUrl = nextMatch ? nextMatch[1] : null;
    }

    return messages;
  },

  async downloadFile(token: string, fileUrl: string): Promise<Blob> {
    const response = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Dosya indirilemedi');
    return response.blob();
  }
};
