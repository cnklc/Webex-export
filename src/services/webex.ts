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

/**
 * Handles Webex API limits (429) and transient errors.
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Handle Rate Limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '15', 10);
        console.warn(`Webex API Limiti (429) aşıldı. ${retryAfter} saniye bekleniyor...`);
        await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
        continue;
      }

      // Handle transient Server Errors with exponential backoff
      if (response.status >= 500) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`Webex Sunucu Hatası (${response.status}). ${delay}ms sonra yeniden deneniyor...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      const delay = Math.pow(2, i) * 1000;
      console.warn(`Webex Ağ Hatası. ${delay}ms sonra yeniden deneniyor...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  if (lastError) throw lastError;
  throw new Error('Webex API çağrısı başarısız oldu (Maksimum deneme sayısına ulaşıldı)');
}

export const WebexService = {
  async getMe(token: string): Promise<WebexPerson> {
    const response = await fetchWithRetry(`${BASE_URL}/people/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Geçersiz Webex Token');
      throw new Error('Kullanıcı profili alınamadı');
    }
    return response.json();
  },

  async *getRoomsPaged(token: string): AsyncGenerator<WebexRoom[]> {
    let nextUrl: string | null = `${BASE_URL}/rooms?max=1000`;

    while (nextUrl) {
      const response: Response = await fetchWithRetry(nextUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Alanlar alınamadı');
      
      const data = await response.json();
      yield data.items;

      const linkHeader: string | null = response.headers.get('Link');
      const nextMatch: RegExpMatchArray | null = linkHeader ? linkHeader.match(/<([^>]+)>;[^>]*rel="next"/) : null;
      nextUrl = nextMatch ? nextMatch[1] : null;
    }
  },

  async getRooms(token: string): Promise<WebexRoom[]> {
    let rooms: WebexRoom[] = [];
    for await (const items of this.getRoomsPaged(token)) {
      rooms = [...rooms, ...items];
    }
    return rooms;
  },

  async *getMessagesPaged(token: string, roomId: string): AsyncGenerator<WebexMessage[]> {
    let nextUrl: string | null = `${BASE_URL}/messages?roomId=${roomId}&max=1000`;

    while (nextUrl) {
      const response: Response = await fetchWithRetry(nextUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Mesajlar alınamadı');
      
      const data = await response.json();
      yield data.items;

      const linkHeader = response.headers.get('Link');
      const nextMatch = linkHeader ? linkHeader.match(/<([^>]+)>;[^>]*rel="next"/) : null;
      nextUrl = nextMatch ? nextMatch[1] : null;
    }
  },

  async getMessages(token: string, roomId: string): Promise<WebexMessage[]> {
    let messages: WebexMessage[] = [];
    for await (const items of this.getMessagesPaged(token, roomId)) {
      messages = [...messages, ...items];
    }
    return messages;
  },

  async downloadFile(token: string, fileUrl: string): Promise<Blob> {
    const response = await fetchWithRetry(fileUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Dosya indirilemedi');
    return response.blob();
  }
};
