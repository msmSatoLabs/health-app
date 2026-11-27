import { describe, expect, it } from '@jest/globals';
import { cleanCode, isCodeComplete, isDeleteConfirmed, looksLikeEmail, newPasswordProblem } from './logic';

describe('newPasswordProblem', () => {
  it('accepts a long enough matching password', () => {
    expect(newPasswordProblem('secret1', 'secret1')).toBeNull();
  });
  it('rejects short passwords', () => {
    expect(newPasswordProblem('abc', 'abc')).toMatch(/at least 6/);
  });
  it('rejects mismatched confirmation', () => {
    expect(newPasswordProblem('secret1', 'secret2')).toMatch(/don't match/);
  });
  it('rejects reusing the current password when changing it', () => {
    expect(newPasswordProblem('secret1', 'secret1', 'secret1')).toMatch(/different/);
    expect(newPasswordProblem('secret2', 'secret2', 'secret1')).toBeNull();
  });
});

describe('reset codes', () => {
  it('strips spaces and other characters from pasted codes', () => {
    expect(cleanCode(' 123 456 ')).toBe('123456');
    expect(cleanCode('12-34-56')).toBe('123456');
  });
  it('needs 6 to 10 digits', () => {
    expect(isCodeComplete('12345')).toBe(false);
    expect(isCodeComplete('123456')).toBe(true);
    expect(isCodeComplete('12345678')).toBe(true);
    expect(isCodeComplete('12345678901')).toBe(false);
  });
});

describe('looksLikeEmail', () => {
  it('spots obvious typos', () => {
    expect(looksLikeEmail('sam@school.edu')).toBe(true);
    expect(looksLikeEmail(' sam@school.edu ')).toBe(true);
    expect(looksLikeEmail('sam@school')).toBe(false);
    expect(looksLikeEmail('sam school.edu')).toBe(false);
  });
});

describe('isDeleteConfirmed', () => {
  it('needs the word DELETE, any case', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(isDeleteConfirmed(' delete ')).toBe(true);
    expect(isDeleteConfirmed('delet')).toBe(false);
    expect(isDeleteConfirmed('')).toBe(false);
  });
});
