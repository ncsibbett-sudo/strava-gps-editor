# Strava GPS Route Editor - Backend API

This directory contains serverless functions for Strava OAuth authentication.

## Endpoints

### POST /api/auth/exchange

Exchange Strava authorization code for access/refresh tokens.

**Request:**
```json
{
  "code": "authorization_code_from_strava"
}
```

**Response:**
```json
{
  "accessToken": "access_token",
  "refreshToken": "refresh_token",
  "expiresAt": 1234567890000,
  "athlete": {
    "id": 12345,
    "username": "athlete_username",
    "firstname": "John",
    "lastname": "Doe",
    "profile": "https://..."
  }
}
```

### POST /api/auth/refresh

Refresh expired access token using refresh token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token",
  "expiresAt": 1234567890000
}
```

## Environment Variables

Required environment variables (set in Vercel):

- `STRAVA_CLIENT_ID` - Your Strava API Client ID
- `STRAVA_CLIENT_SECRET` - Your Strava API Client Secret

## Local Development

For local testing, you can use Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Set environment variables in `.env`:
```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
```

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Set environment variables in Vercel dashboard or via CLI:

```bash
vercel env add STRAVA_CLIENT_ID
vercel env add STRAVA_CLIENT_SECRET
```

## Security

- All endpoints use CORS to allow frontend access
- Client secret is never exposed to the frontend
- Tokens are only exchanged via secure HTTPS
- No GPS data is ever transmitted to or stored on the backend
