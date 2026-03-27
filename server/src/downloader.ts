/**
 * downloader.ts
 * Utility to download files from Webex and save them to a local directory.
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function downloadWebexFile(token: string, fileUrl: string, relativeDir: string): Promise<string> {
  const baseDir = path.resolve(__dirname, '../../downloads', relativeDir);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const response = await axios({
    method: 'GET',
    url: fileUrl,
    responseType: 'stream',
    headers: { Authorization: `Bearer ${token}` }
  });

  let filename = path.basename(fileUrl);
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches !== null && matches[1]) { 
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  if (!filename || filename.length < 1) {
    filename = `file_${Date.now()}`;
  }

  const filePath = path.join(baseDir, filename);
  const writer = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    let error: Error | null = null;
    writer.on('error', (err) => {
      error = err;
      writer.close();
      reject(err);
    });
    writer.on('close', () => {
      if (!error) {
        resolve(filePath);
      }
    });
  });
}

export async function saveJson(relativeDir: string, data: any, filename: string): Promise<string> {
  const baseDir = path.resolve(__dirname, '../../downloads', relativeDir);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  const filePath = path.join(baseDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}
