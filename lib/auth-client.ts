'use client';
import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from './auth'; // type-only: серверний код у бандл не тягне

// baseURL за замовчуванням = поточний origin браузера — для форм входу/реєстрації достатньо.
// twoFactorClient: при вході з увімкненою 2FA редіректить на сторінку введення коду.
// inferAdditionalFields: типізує showOnGlobalMap у signUp.email.
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    twoFactorClient({ onTwoFactorRedirect() { window.location.href = '/two-factor'; } }),
  ],
});
