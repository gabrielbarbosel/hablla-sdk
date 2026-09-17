import { describe, it, expect } from 'vitest';
import { phoneVariants, matchesPhone, brazilianPhoneVariants, phoneIdentity } from './phone';

describe('phoneVariants (Brazilian 9th digit)', () => {
    it('drops the 9 from a 13-digit number', () => {
        const v = phoneVariants('5551999596516');
        expect(v.digits).toBe('5551999596516');
        expect(v.alternate).toBe('555199596516');
    });

    it('inserts the 9 into a 12-digit number', () => {
        const v = phoneVariants('555199596516');
        expect(v.digits).toBe('555199596516');
        expect(v.alternate).toBe('5551999596516');
    });
});

describe('matchesPhone', () => {
    it('matches either shape', () => {
        const v = phoneVariants('5551999596516');
        expect(matchesPhone('55 51 99959-6516', v)).toBe(true);
        expect(matchesPhone('555199596516', v)).toBe(true);
        expect(matchesPhone('5551000000000', v)).toBe(false);
    });
});

describe('brazilianPhoneVariants', () => {
    it('prefixes 55 to a 10-digit landline and an 11-digit mobile', () => {
        expect(brazilianPhoneVariants('5132345678')?.digits).toBe('555132345678');
        expect(brazilianPhoneVariants('(51) 99959-6516')?.digits).toBe('5551999596516');
    });

    it('accepts 12 and 13 digits that start with 55', () => {
        expect(brazilianPhoneVariants('555199596516')).toEqual(phoneVariants('555199596516'));
        expect(brazilianPhoneVariants('+55 51 99959-6516')).toEqual(phoneVariants('5551999596516'));
    });

    it('rejects 12 and 13 digits without the 55 prefix', () => {
        expect(brazilianPhoneVariants('445199596516')).toBeUndefined();
        expect(brazilianPhoneVariants('4451999596516')).toBeUndefined();
    });

    it('treats 11 digits starting with 55 as a national number with area code 55', () => {
        expect(brazilianPhoneVariants('55991234567')?.digits).toBe('5555991234567');
    });

    it('rejects every other digit count', () => {
        expect(brazilianPhoneVariants('123456789')).toBeUndefined();
        expect(brazilianPhoneVariants('55519995965161')).toBeUndefined();
        expect(brazilianPhoneVariants('')).toBeUndefined();
    });
});

describe('phoneIdentity', () => {
    it('is the 13-digit form for both shapes of the same line', () => {
        expect(phoneIdentity(phoneVariants('5551999596516'))).toBe('5551999596516');
        expect(phoneIdentity(phoneVariants('555199596516'))).toBe('5551999596516');
    });
});
