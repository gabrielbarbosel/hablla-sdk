/**
 * Phone-format helpers. They respect the Brazilian mobile format (the 9th-digit
 * rule) but stay generic — they work for any BR number, not for any one feature.
 * Built on top of the string primitives.
 */
import { toDigits } from '../primitives/string';

/**
 * The two digit shapes that denote the same Brazilian mobile line: the number as
 * given plus its 9th-digit counterpart. A 13-digit form drops the extra 9; a
 * shorter form inserts it after the area code.
 */
export interface PhoneVariants {
    digits: string;
    alternate: string;
}

/** Builds the {@link PhoneVariants} for a raw phone value. */
export const phoneVariants = (value: unknown): PhoneVariants => {
    const digits = toDigits(value);
    const alternate = digits.length === 13
        ? digits.slice(0, 4) + digits.slice(5)
        : digits.slice(0, 4) + '9' + digits.slice(4);
    return { digits, alternate };
};

/** True when a stored phone matches either shape of the variants. */
export const matchesPhone = (candidate: unknown, variants: PhoneVariants): boolean => {
    const value = toDigits(candidate);
    return value === variants.digits || value === variants.alternate;
};

/** Country calling code of Brazil. */
export const BRAZIL_COUNTRY_CODE = '55';

/** Digit counts of a Brazilian number given without the country code (landline, mobile). */
const NATIONAL_PHONE_LENGTHS = [10, 11];

/** Digit counts of a Brazilian number given with the country code. */
const INTERNATIONAL_PHONE_LENGTHS = [12, 13];

/** Digit count of the 9th-digit form of a Brazilian mobile number with country code. */
const CANONICAL_PHONE_LENGTH = 13;

/**
 * {@link PhoneVariants} of a Brazilian phone, deciding only by digit count: 10 or 11
 * digits get the `55` prefix; 12 or 13 digits must already start with `55`; any other
 * count is invalid. So `55991234567` (area code 55, 11 digits) becomes `5555991234567`.
 *
 * @returns The variants, or `undefined` when the value is not a valid Brazilian phone.
 */
export const brazilianPhoneVariants = (value: unknown): PhoneVariants | undefined => {
    const digits = toDigits(value);

    if (NATIONAL_PHONE_LENGTHS.includes(digits.length)) {
        return phoneVariants(BRAZIL_COUNTRY_CODE + digits);
    }

    if (INTERNATIONAL_PHONE_LENGTHS.includes(digits.length) && digits.startsWith(BRAZIL_COUNTRY_CODE)) {
        return phoneVariants(digits);
    }

    return undefined;
};

/**
 * Canonical identity of a phone: its 13-digit form. The single key used to compare
 * phones for repetition, exclusion and fingerprints.
 */
export const phoneIdentity = (variants: PhoneVariants): string => (variants.digits.length === CANONICAL_PHONE_LENGTH
    ? variants.digits
    : variants.alternate);
