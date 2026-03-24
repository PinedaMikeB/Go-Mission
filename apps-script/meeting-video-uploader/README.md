# Meeting Logger (Free)

This is a simple Google Apps Script web app that lets you:

1. Upload your Zoom video directly to Google Drive (manually).
2. Paste the Drive link into a simple web page.
3. Log the meeting in Google Sheets.

## Files

- `Code.gs`: server logic (Sheets + Drive metadata lookup).
- `Index.html`: logger page (HTML + JavaScript).

## Setup

1. Create a Google Sheet.
3. Open [script.new](https://script.new) and create a new Apps Script project.
4. Add two files in the Apps Script editor:
   - `Code.gs` (paste from this folder)
   - `Index.html` (paste from this folder)
5. In `Code.gs`, replace:
   - `REPLACE_WITH_SPREADSHEET_ID`
6. Click **Deploy** -> **New deployment** -> **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone with the link** (or your org only)
7. Upload your meeting video to Google Drive.
8. Open the web app URL and paste the Drive file link.

## Sheet Columns

The script logs:

- Timestamp
- Meeting Title
- Participants
- Notes
- Drive URL
- Drive File ID
- File Name
- Mime Type
- Size (MB)

## Notes

- This works with large files (for example 1 GB+) because Drive handles the upload.
- The app logs metadata and link only. It does not transcribe video yet.
