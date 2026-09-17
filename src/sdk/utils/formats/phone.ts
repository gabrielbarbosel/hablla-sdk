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

/** Where the local number starts in the `55` form (country code plus area code). */
const LOCAL_NUMBER_START = 4;

/** The digit a mobile line carries in front of its local number. */
const NINTH_DIGIT = '9';

/** First digit of the local number of a mobile line given without the 9th digit. */
const MOBILE_FIRST_DIGITS = ['6', '7', '8', '9'];

/** First digit of the local number of a landline. */
const LANDLINE_FIRST_DIGITS = ['2', '3', '4', '5'];

/**
 * {@link PhoneVariants} of a Brazilian phone: 10 or 11 digits get the `55` prefix, 12 or
 * 13 digits must already start with `55`, and the local number decides the rest. A mobile
 * line (local number starting with 6-9, or the 9th digit already in place) has both
 * shapes; a landline (2-5) has a single one, so no 9th digit is ever invented for it.
 * So `55991234567` (area code 55, 11 digits) becomes `5555991234567`, while
 * `5133334444` stays `555133334444`.
 *
 * @returns The variants, or `undefined` when the value is not a valid Brazilian phone.
 */
export const brazilianPhoneVariants = (value: unknown): PhoneVariants | undefined => {
    const digits = withCountryCode(toDigits(value));

    if (digits === undefined) {
        return undefined;
    }

    const localFirstDigit = digits[LOCAL_NUMBER_START]!;

    if (digits.length === CANONICAL_PHONE_LENGTH) {
        return localFirstDigit === NINTH_DIGIT ? phoneVariants(digits) : undefined;
    }

    if (MOBILE_FIRST_DIGITS.includes(localFirstDigit)) {
        return phoneVariants(digits);
    }

    return LANDLINE_FIRST_DIGITS.includes(localFirstDigit) ? { digits, alternate: digits } : undefined;
};

/** The number in its `55` form, or `undefined` when its digit count is not a Brazilian one. */
const withCountryCode = (digits: string): string | undefined => {
    if (NATIONAL_PHONE_LENGTHS.includes(digits.length)) {
        return BRAZIL_COUNTRY_CODE + digits;
    }

    return INTERNATIONAL_PHONE_LENGTHS.includes(digits.length) && digits.startsWith(BRAZIL_COUNTRY_CODE) ? digits : undefined;
};

/**
 * Canonical identity of a phone: the 13-digit mobile form when there is one, and the
 * number as given for a landline (which has no 9th-digit form). The single key used to
 * compare phones for repetition, exclusion and fingerprints, and the phone a created
 * person is stored with.
 */
export const phoneIdentity = (variants: PhoneVariants): string => (variants.digits.length === CANONICAL_PHONE_LENGTH
    ? variants.digits
    : variants.alternate);
