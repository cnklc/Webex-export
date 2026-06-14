import JSZip from 'jszip';
import type { WebexMessage } from '../services/webex';

interface DownloadedFile {
  name: string;
  blob: Blob;
}

/**
 * Returns a name that is unique within the given set, appending an incrementing
 * suffix before the extension when a collision is found (e.g. "file_1.png").
 */
const uniqueName = (name: string, used: Set<string>): string => {
  if (!used.has(name)) return name;

  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : '';

  let counter = 1;
  let candidate = `${base}_${counter}${ext}`;
  while (used.has(candidate)) {
    counter++;
    candidate = `${base}_${counter}${ext}`;
  }
  return candidate;
};

export const addRoomToZip = (
  zip: JSZip,
  roomTitle: string,
  messages: WebexMessage[],
  files: DownloadedFile[]
) => {
  const roomFolderName = roomTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const folder = zip.folder(roomFolderName);
  if (!folder) return;

  folder.file('messages.json', JSON.stringify(messages, null, 2));

  if (files.length === 0) return;

  const attachmentsFolder = folder.folder('attachments');
  if (!attachmentsFolder) return;

  const usedNames = new Set<string>();
  files.forEach(file => {
    const name = uniqueName(file.name, usedNames);
    usedNames.add(name);
    attachmentsFolder.file(name, file.blob);
  });
};
