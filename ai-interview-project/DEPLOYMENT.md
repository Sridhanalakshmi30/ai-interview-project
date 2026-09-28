# Deployment

This deployment serves the frontend and `/api` on one HTTPS domain, with Python 3.12,
a single Uvicorn worker, and MySQL on a private Docker network. Voice checks are
disabled; the interview sends browser speech transcripts only. `av` is therefore
not required for this deployment. Legacy voice routes return HTTP 410.

## Deploy on a server with Docker Compose

1. Point your domain's DNS records to the server and allow inbound ports 80 and 443.
2. Copy `.env.example` to `.env` in the project directory. Set `SITE_ADDRESS` to the
   domain only (no scheme or path), and set two different strong database passwords.
3. Copy `backend/.env.example` to `backend/.env` and set the Groq API key. Compose
   supplies the database connection settings and allowed HTTPS origin.
4. Run `docker compose up -d --build`. Caddy obtains and renews HTTPS certificates.
5. Check `docker compose logs backend` for successful database startup, then test
   `https://YOUR_DOMAIN/api/health` and a full interview in Chrome or Edge.

The frontend image builds `dist`; its Caddy configuration forwards `/api` to Python.
Backend and database ports are not published. Database and certificate data live
in persistent volumes. Back up the database volume; do not delete it during upgrades.
The health endpoint only confirms the API process is responding, not Groq availability.

## Existing databases

Run `backend/db/migrations/002_access_tokens.sql` against the interview database
before deploying this update. Fresh installs include the table in `schema.sql`.
Apply earlier consent and proctoring migrations if they have not already been applied.
Old candidates and sessions have no tokens and are deliberately inaccessible through
the public API. Start with a new resume upload; do not add an unauthenticated token
recovery endpoint.

## Access tokens

Resume upload returns a random candidate token used for consent and interview start.
Interview start returns a separate random session token required for all interview
and proctoring requests. Only SHA-256 token hashes are stored in MySQL. The frontend
keeps tokens in sessionStorage and sends them in Authorization headers, never URLs.
Tokens are bearer credentials: anyone possessing one can act on its scoped resource.
They survive backend restarts, have no automatic expiry, and may be revoked by deleting
the corresponding `interview_access_tokens` row. Closing the browser tab loses access;
there is no account recovery or recruiter login in this version.

## Secrets and release checks

Deploy source from Git. Never copy your local `.env`, Windows `venv`, uploads, or logs
into an image; Docker ignore files exclude these. Configure server secrets separately.
If a ZIP containing real secrets has been shared, rotate those secrets.
Before public launch, test two independent candidates to confirm cross-session access
is rejected; then test microphone permission, speech, submit, finish, quit, and reports.
Also configure host-level request limits for public resume uploads and test concurrent
interviews against your server capacity and Groq quota. Docker images and public HTTPS
must be validated on the target host; local builds do not establish production readiness.
