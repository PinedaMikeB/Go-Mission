const SPREADSHEET_ID = 'REPLACE_WITH_SPREADSHEET_ID';
const SHEET_NAME = 'Meetings';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Meeting Logger');
}

function logMeeting(payload) {
  validateConfig_();
  validatePayload_(payload);
  const fileInfo = getDriveFileInfo_(payload.driveUrl);

  const sheet = getOrCreateSheet_();
  const row = [
    new Date(),
    payload.meetingTitle || '',
    payload.participants || '',
    payload.notes || '',
    payload.driveUrl,
    fileInfo.fileId,
    fileInfo.fileName,
    fileInfo.mimeType,
    fileInfo.sizeMb
  ];

  sheet.appendRow(row);
  return {
    ok: true,
    driveUrl: payload.driveUrl,
    fileName: fileInfo.fileName
  };
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Meeting Title',
      'Participants',
      'Notes',
      'Drive URL',
      'Drive File ID',
      'File Name',
      'Mime Type',
      'Size (MB)'
    ]);
  }

  return sheet;
}

function validateConfig_() {
  if (SPREADSHEET_ID === 'REPLACE_WITH_SPREADSHEET_ID') {
    throw new Error('Set SPREADSHEET_ID in Code.gs');
  }
}

function validatePayload_(payload) {
  if (!payload) {
    throw new Error('Missing payload');
  }
  if (!payload.driveUrl || String(payload.driveUrl).trim() === '') {
    throw new Error('Missing Drive file URL');
  }
}

function getDriveFileInfo_(driveUrl) {
  const fileId = extractDriveFileId_(driveUrl);

  if (!fileId) {
    return {
      fileId: '',
      fileName: 'Unknown',
      mimeType: '',
      sizeMb: ''
    };
  }

  try {
    const file = DriveApp.getFileById(fileId);
    const sizeMb = Math.round((file.getSize() / (1024 * 1024)) * 100) / 100;
    return {
      fileId: fileId,
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      sizeMb: sizeMb
    };
  } catch (error) {
    return {
      fileId: fileId,
      fileName: 'Access denied or not found',
      mimeType: '',
      sizeMb: ''
    };
  }
}

function extractDriveFileId_(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const directIdMatch = text.match(/^[a-zA-Z0-9_-]{20,}$/);
  if (directIdMatch) return text;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/
  ];

  for (let i = 0; i < patterns.length; i += 1) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}
