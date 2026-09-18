import { describe, it, expect } from 'vitest';
import { boundFieldIds, bodyExpressionFlags, campaignBodyVariables, formatBoundFields, formatVariableValue } from './template-variables';
import { habllaId } from './__fixtures__/builders';

const NAME_FIELD = habllaId('c1');
const DATE_FIELD = habllaId('c2');

describe('formatVariableValue', () => {
    it('sends the value untouched when no format was asked for', () => {
        expect(formatVariableValue('ana paula souza', [])).toBe('ana paula souza');
    });

    it('takes only the first name', () => {
        expect(formatVariableValue('ana paula souza', ['firstName'])).toBe('ana');
    });

    it('capitalizes every word', () => {
        expect(formatVariableValue('ANA PAULA SOUZA', ['capitalize'])).toBe('Ana Paula Souza');
    });

    it('upper-cases in pt-BR', () => {
        expect(formatVariableValue('álvaro', ['upperCase'])).toBe('ÁLVARO');
    });

    it('applies the steps in the order they were listed', () => {
        expect(formatVariableValue('ana paula souza', ['firstName', 'capitalize'])).toBe('Ana');
        expect(formatVariableValue('ana paula souza', ['capitalize', 'firstName'])).toBe('Ana');
    });
});

describe('boundFieldIds', () => {
    it('lists the person fields in template order, without repeats', () => {
        const variables = [
            { kind: 'personField', fieldId: DATE_FIELD, formats: [] },
            { kind: 'literal', value: 'hoje', formats: [] },
            { kind: 'personField', fieldId: NAME_FIELD, formats: [] },
        ] as const;

        expect(boundFieldIds([...variables])).toEqual([DATE_FIELD, NAME_FIELD]);
    });
});

describe('formatBoundFields', () => {
    it('formats the bound field and leaves every other field untouched', () => {
        const formatted = formatBoundFields(
            { [NAME_FIELD]: 'ana paula souza', [DATE_FIELD]: '10/09' },
            [{ kind: 'personField', fieldId: NAME_FIELD, formats: ['firstName', 'capitalize'] }],
        );

        expect(formatted).toEqual({ [NAME_FIELD]: 'Ana', [DATE_FIELD]: '10/09' });
    });

    it('writes nothing for a field the row does not carry', () => {
        expect(formatBoundFields({}, [{ kind: 'personField', fieldId: NAME_FIELD, formats: ['capitalize'] }])).toEqual({});
    });

    it('leaves the record untouched when no variable asks for a format', () => {
        expect(formatBoundFields({ [NAME_FIELD]: 'ana' }, [{ kind: 'personField', fieldId: NAME_FIELD, formats: [] }])).toEqual({ [NAME_FIELD]: 'ana' });
    });
});

describe('campaignBodyVariables', () => {
    it('turns a person field into its token and sends a literal as text, in template order', () => {
        expect(campaignBodyVariables([
            { kind: 'personField', fieldId: NAME_FIELD, formats: [] },
            { kind: 'literal', value: 'terça-feira', formats: [] },
        ])).toEqual([`{{person.custom_fields.${NAME_FIELD}}}`, 'terça-feira']);
    });

    it('formats the literal once, since it is the same for everyone', () => {
        expect(campaignBodyVariables([{ kind: 'literal', value: 'ana paula', formats: ['capitalize'] }])).toEqual(['Ana Paula']);
    });

    it('is empty for a template without variables', () => {
        expect(campaignBodyVariables([])).toEqual([]);
    });
});

describe('bodyExpressionFlags', () => {
    it('declares every variable as not an expression, by position', () => {
        expect(bodyExpressionFlags([
            { kind: 'personField', fieldId: NAME_FIELD, formats: [] },
            { kind: 'literal', value: 'x', formats: [] },
        ])).toEqual({ '0_is_expression': false, '1_is_expression': false });
    });

    it('is empty for a template without variables', () => {
        expect(bodyExpressionFlags([])).toEqual({});
    });
});
