# Register sync protocol

Primary source: Google Sheets "Job Application Register"
Spreadsheet ID: `1o4yIRbZKUEkE8NJgxjBoOZ2_zHHYrgjNROxOXjzpB-E`

Repository: `sanadzadeh/Jobs` (main)
Published snapshot: `data/Job Application Register.xlsx`
Live dashboard: `index.html`, auto-loader: `xlsx-loader.js`
Immutable November 2026 snapshot: `dashboard-old/`

## Rule for every assistant-managed register change

1. Update the Google Sheets register, preserving column formulas, validation and filters.
2. Verify the edited rows and ensure the filter covers the last populated row.
3. Export the **whole native Google Sheets workbook** to XLSX using Drive files.export or its full raw export; do not rebuild a partial workbook from values.
4. Replace `data/Job Application Register.xlsx` in this repository, using a Git blob with base64 encoding and a commit on `main`; verify the blob SHA/size and the commit.
5. Check the dashboard's Reload register option, which fetches the latest committed workbook with cache bypass.
6. Report both the Google Sheets change and GitHub snapshot update, and **never** claim synchronisation if step 4 fails.

This protocol covers updates performed by the assistant in the job-search workflow. It does not watch changes made directly in Google Sheets outside ChatGPT. Instant external-change synchronisation would require a separate authorised Google-to-GitHub integration.

**Privacy:** This repository is public. The committed Excel file, including tabs and any notes, contact details or application documents, is publicly accessible. Do not commit secrets or credentials.
