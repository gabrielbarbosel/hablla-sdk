import { describe, it, expect } from 'vitest';
import * as utils from '../../sdk/utils';
import * as proxy from './utils-proxy';

describe('utils-proxy', () => {
    it('mirrors every value the utils barrel exports, so no RPO lookup resolves to undefined', () => {
        expect(Object.keys(proxy).sort()).toEqual(Object.keys(utils).sort());
    });
});
