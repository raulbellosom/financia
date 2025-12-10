# Financia Email Server

This is a dedicated Node.js server for handling email communications for the Financia application.
It uses `nodemailer` to send emails via SMTP (configured for Ionos).

## Setup

1.  Install dependencies:

    ```bash
    npm install
    ```

2.  Configure environment variables:
    Copy `.env.example` to `.env` and fill in your Ionos SMTP credentials.

    ```
    SMTP_HOST=smtp.ionos.com
    SMTP_PORT=587
    SMTP_USER=your-email@ionos.com
    SMTP_PASS=your-password
    ```

3.  Run the server:

    ```bash
    npm start
    ```

    For development:

    ```bash
    npm run dev
    ```

    For production (using PM2):

    ```bash
    npm run start:pm2
    ```

    Other PM2 commands:

    ```bash
    npm run stop:pm2      # Stop the server
    npm run restart:pm2   # Restart the server
    npm run logs:pm2      # View logs
    ```

## API Endpoints

### POST /send-verification

Sends a verification email to a user.

**Body:**

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "verificationLink": "https://financia.app/verify?token=..."
}
```

### POST /resend-verification

Resends the verification email.

**Body:**

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "verificationLink": "https://financia.app/verify?token=..."
}
```

### POST /send-password-reset

Sends a password reset email.

**Body:**

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "resetLink": "https://financia.app/reset-password?token=..."
}
```

## Integration Plan

1.  **Frontend**: When a user registers, the frontend (or Appwrite Function) should generate a verification token.
2.  **Trigger**: Call this email server's `/send-verification` endpoint with the user's email and the generated link.
3.  **Verification**: The link should point to a page that validates the token and updates the `verified_email` field in the `users_info` collection in Appwrite.

## Future Improvements

- Add authentication middleware to protect these endpoints (e.g., API Key).
- Add more email templates (Password Reset, Welcome, etc.).
