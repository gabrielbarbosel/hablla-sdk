import { describe, it, expect } from 'vitest';
import { isEmail, deriveEmail } from './email';

describe('isEmail', () => {
    it('accepts anything with an @', () => {
        expect(isEmail('a@b.com')).toBe(true);
    });

    it('rejects values without @ and nullish', () => {
        expect(isEmail('not-an-email')).toBe(false);
        expect(isEmail(null)).toBe(false);
    });
});

describe('deriveEmail', () => {
    const rule = { separator: '+', domain: 'contas.xp' };

    it('joins a single account', () => {
        expect(deriveEmail('123', rule)).toBe('123@contas.xp');
    });

    it('joins multiple accounts split on any non-alphanumeric run', () => {
        expect(deriveEmail('123, 456; 789', rule)).toBe('123+456+789@contas.xp');
    });

    it('returns null when there is no account', () => {
        expect(deriveEmail('   ', rule)).toBeNull();
        expect(deriveEmail(null, rule)).toBeNull();
    });
});
