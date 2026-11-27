/** Pure rules for passwords, reset codes and account deletion (unit tested; no Supabase here). */

/** Matches Supabase's default minimum and the sign-up screen. */
export const MIN_PASSWORD_LENGTH = 6;

/** Seconds to wait before another reset email can be requested. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** The word typed to confirm account deletion. */
export const DELETE_CONFIRM_WORD = 'DELETE';

/** Returns a message if the new password can't be used, or null if it's fine. */
export function newPasswordProblem(password: string, confirm: string, current?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return "The two new passwords don't match.";
  if (current !== undefined && password === current) return 'Pick a password different from your current one.';
  return null;
}

/** Keeps only the digits of a code pasted from an email ("123 456" → "123456"). */
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Supabase sends 6-digit codes by default; projects can raise it to as many as 10. */
export function isCodeComplete(code: string): boolean {
  return /^\d{6,10}$/.test(code);
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_CONFIRM_WORD;
}
