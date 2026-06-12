// Закрита програма: hosted-інстанс працює через персональне API monobank без
// корпоративного (провайдерського) доступу, тож реєстрацію відкривати для всіх не можна —
// «обмежене коло користувачів» легітимізує персональне API (zero-token-research, питання №4).
// SIGNUPS_CLOSED=1 вимикає реєстрацію і на рівні Better Auth-ендпойнта, і в UI.
export function signupsClosed(): boolean {
  return process.env.SIGNUPS_CLOSED === '1';
}
