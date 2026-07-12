import { describe, it, expect } from 'vitest';
import { customFieldKeys } from './hablla';

describe('customFieldKeys', () => {
    it('keeps only cf_<24-hex> keys', () => {
        const record = { cf_6a0c721a0c96ad8935ad4086: '1', cf_short: '2', phone: '3', name: '4' };
        expect(customFieldKeys(record)).toEqual(['cf_6a0c721a0c96ad8935ad4086']);
    });
});
