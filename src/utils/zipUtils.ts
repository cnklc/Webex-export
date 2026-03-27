import JSZip from 'jszip';

export const createRoomZip = async (roomTitle: string, messages: any[], files: { name: string, blob: Blob }[]) => {
  const zip = new JSZip();
  const folder = zip.folder(roomTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase());

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

  return zip.generateAsync({ type: 'blob' });
};

export const createBulkZip = async (roomsData: { roomTitle: string, messages: any[], files: { name: string, blob: Blob }[] }[]) => {
  const zip = new JSZip();
  
  roomsData.forEach(data => {
    const roomFolder = zip.folder(data.roomTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase());
    if (roomFolder) {
      roomFolder.file('messages.json', JSON.stringify(data.messages, null, 2));
      
      if (data.files.length > 0) {
        const attachmentsFolder = roomFolder.folder('attachments');
        if (attachmentsFolder) {
          data.files.forEach(file => {
            attachmentsFolder.file(file.name, file.blob);
          });
        }
      }
    }
  });

  return zip.generateAsync({ type: 'blob' });
};
