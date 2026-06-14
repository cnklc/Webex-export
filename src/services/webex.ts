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

const BASE_URL = 'https://webexapis.com/v1';

/**
 * Extracts the original file name from a Content-Disposition header.
 * Falls back to null when the header is absent or unreadable (e.g. when the
 * browser does not expose it for a cross-origin response).
 */
function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;

  // RFC 5987 encoded form: filename*=UTF-8''my%20file.png
  const encodedMatch = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (encodedMatch) {
    try {
      return decodeURIComponent(encodedMatch[1].replace(/["']/g, '').trim());
    } catch {
      // fall through to the plain form
    }
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1].trim() : null;
}

/**
 * Handles Webex API limits (429) and transient errors.
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  let lastError: unknown;
  
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

  async downloadFile(token: string, fileUrl: string): Promise<{ blob: Blob; fileName: string | null }> {
    const response = await fetchWithRetry(fileUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Dosya indirilemedi');

    const fileName = parseContentDispositionFilename(response.headers.get('Content-Disposition'));
    const blob = await response.blob();
    return { blob, fileName };
  }
};
