import JSZip from 'jszip';

export const addRoomToZip = (zip: JSZip, roomTitle: string, messages: any[], files: { name: string, blob: Blob }[]) => {
  const roomFolderName = roomTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const folder = zip.folder(roomFolderName);

  if (folder) {
    folder.file('messages.json', JSON.stringify(messages, null, 2));
    
    if (files.length > 0) {
      const attachmentsFolder = folder.folder('attachments');
      if (attachmentsFolder) {
        files.forEach(file => {
          attachmentsFolder.file(file.name, file.blob);
        });
      }
    }
  }
};

export const createRoomZip = async (roomTitle: string, messages: any[], files: { name: string, blob: Blob }[]) => {
  const zip = new JSZip();
  addRoomToZip(zip, roomTitle, messages, files);
  return zip.generateAsync({ type: 'blob' });
};

export const createBulkZip = async (roomsData: { roomTitle: string, messages: any[], files: { name: string, blob: Blob }[] }[]) => {
  const zip = new JSZip();
  
  roomsData.forEach(data => {
    addRoomToZip(zip, data.roomTitle, data.messages, data.files);
  });

  return zip.generateAsync({ type: 'blob' });
};
