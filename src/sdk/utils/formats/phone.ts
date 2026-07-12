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
