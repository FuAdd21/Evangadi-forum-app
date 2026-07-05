# Aiven MySQL Setup

Use this flow when you want the backend to run against an Aiven-managed MySQL database.

## 1. Create the service

1. In Aiven, create a new MySQL service in the region closest to your app users.
2. Keep the default managed backups and TLS enabled.
3. Create a database for the app, for example `evangadi_forum`.
4. Create a dedicated user for the app.

## 2. Download the connection details

From the Aiven service overview, copy:

1. Host
2. Port
3. Username
4. Password
5. Database name
6. CA certificate

## 3. Initialize the schema

Import [backend/db/schema.sql](../backend/db/schema.sql) into the Aiven database.

If you prefer the CLI, run the schema file against the Aiven connection using the MySQL client with SSL enabled.

## 4. Configure the backend

Set these environment variables in Render or your host:

```bash
DATABASE_URL=mysql://your-aiven-user:your-aiven-password@your-aiven-host:3306/your-aiven-database
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=<paste the Aiven CA certificate here>
```

If you prefer split variables, the backend still supports `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and `DB_NAME`.

If you cannot store the CA certificate inline, set `DB_SSL_CA_PATH` to a file path on disk that contains the cert.

## 5. Deploy

Make sure your backend service also has:

1. `JWT_SECRET`
2. `GEMINI_API_KEY`
3. `CORS_ORIGIN` pointing at the Vercel frontend URL
4. `FRONTEND_URL` pointing at the same public frontend URL

Once those are set, restart the backend and verify the `/health` endpoint and a test login.
