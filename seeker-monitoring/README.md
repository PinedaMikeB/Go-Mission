# Seeker Monitoring

Live route: `/seeker-monitoring`

Netlify environment variables needed for the seeker intake APIs:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Or instead of `FIREBASE_SERVICE_ACCOUNT_JSON`:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Firestore collection used by this app:

- `goMission_vlogEngagementSeekers`
