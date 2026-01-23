# Google Cloud & OAuth2 Setup Guide for Gmail

Follow these steps exactly to generate the `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` needed for your `.env` file.

## Phase 1: Google Cloud Console Setup

1.  **Go to Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com/)
2.  **Create a New Project**:
    *   Click the project dropdown (top left) -> **New Project**.
    *   Give it a name (e.g., "Chat Analytics Email") and click **Create**.
3.  **Enable Gmail API**:
    *   Go to **APIs & Services** -> **Library**.
    *   Search for "**Gmail API**", click it, and click **Enable**.
4.  **Configure OAuth Consent Screen**:
    *   Go to **APIs & Services** -> **OAuth consent screen**.
    *   Select **External** and click **Create**.
    *   **App Information**: Fill in "App name" and "User support email".
    *   **Developer Contact Info**: Enter your email.
    *   Click **Save and Continue** (skip Scopes and Test Users for now, but make sure your own email is added as a **Test User** if the app is in "Testing" mode).
5.  **Create Credentials**:
    *   Go to **APIs & Services** -> **Credentials**.
    *   Click **+ Create Credentials** -> **OAuth client ID**.
    *   **Application type**: Select **Web application**.
    *   **Name**: "Nodemailer Client".
    *   **Authorized redirect URIs**: Add `https://developers.google.com/oauthplayground`.
    *   Click **Create**.
    *   **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately. Put these in your `.env` file.

---

## Phase 2: Generate Refresh Token (OAuth2 Playground)

1.  **Go to OAuth2 Playground**: [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground/)
2.  **Configure Settings**:
    *   Click the **Settings icon** (gear icon in the top right).
    *   Check "**Use your own OAuth credentials**".
    *   Enter your **OAuth Client ID** and **OAuth Client Secret** from Phase 1.
    *   Click **Close**.
3.  **Step 1: Select & Authorize APIs**:
    *   In the list on the left, find **Gmail API v1**.
    *   Select `https://mail.google.com/`.
    *   Click **Authorize APIs**.
    *   Log in with the **same Gmail account** you put in `MAIL_USER`.
    *   If you see a "Google hasn't verified this app" screen, click **Advanced** -> **Go to [App Name] (unsafe)**.
4.  **Step 2: Exchange Authorization Code**:
    *   Click **Exchange authorization code for tokens**.
5.  **Step 3: Get Refresh Token**:
    *   The **Refresh token** will appear in the "Refresh token" field.
    *   Copy this value and put it in your `.env` file as `REFRESH_TOKEN`.

---

## Phase 3: Update .env and Verify

1.  Update your `BE/.env` file:
    ```env
    MAIL_USER=your-email@gmail.com
    CLIENT_ID=your-client-id
    CLIENT_SECRET=your-client-secret
    REFRESH_TOKEN=your-refresh-token
    ```
2.  Run the debug script to confirm:
    ```bash
    npx ts-node -r tsconfig-paths/register src/utils/debug-email.ts
    ```
