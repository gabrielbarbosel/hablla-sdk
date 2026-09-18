/**
 * The body variables of a dispatch's template: where each value comes from, the
 * reformatting the operator asked for it, and what each one becomes in the campaign body.
 * Pure, and the single source both the preview and the send read, so the screen never
 * shows a value the campaign will not send.
 */

import type { CustomFieldValue } from './types';
import { capitalizeWords, firstName } from '../../../utils';

/**
 * Reformatting an operator may ask for on one variable. Nothing is applied unless it is
 * listed: the value of an audience column or of a typed literal travels as it was given.
 */
export const VARIABLE_FORMATS = ['firstName', 'capitalize', 'upperCase'] as const;

/** One reformatting step; see {@link VARIABLE_FORMATS}. */
export type VariableFormat = (typeof VARIABLE_FORMATS)[number];

/**
 * Where one body variable takes its value, in template order. A `personField` variable is
 * a value per person — the audience column the app mapped to that custom field, written to
 * the person and read back by the campaign; a `literal` is the text the operator typed,
 * the same for everyone, sent in the campaign body and stored on nobody.
 */
export type TemplateVariable =
    | { kind: 'personField'; fieldId: string; formats: readonly VariableFormat[] }
    | { kind: 'literal'; value: string; formats: readonly VariableFormat[] };

/** The reformatting steps applied in the order the operator listed them. */
export function formatVariableValue(value: string, formats: readonly VariableFormat[]): string {
    return formats.reduce((formatted, format) => applyFormat(formatted, format), value);
}

/** The custom fields the `personField` variables bind, in template order and without repeats. */
export function boundFieldIds(variables: readonly TemplateVariable[]): string[] {
    return [...new Set(variables.flatMap((variable) => (variable.kind === 'personField' ? [variable.fieldId] : [])))];
}

/**
 * The row's custom-field values with the reformatting of the variable bound to each field
 * applied, so what is written to the person is exactly what the campaign will send. A
 * field no variable binds travels untouched.
 */
export function formatBoundFields(customFields: Readonly<Record<string, string>>, variables: readonly TemplateVariable[]): Record<string, string> {
    const formatted = { ...customFields };

    for (const variable of variables) {
        if (variable.kind === 'personField' && Object.prototype.hasOwnProperty.call(formatted, variable.fieldId)) {
            formatted[variable.fieldId] = formatVariableValue(formatted[variable.fieldId]!, variable.formats);
        }
    }

    return formatted;
}

/**
 * The campaign's `variables.body`, in template order: a person-field expression for a
 * `personField` variable, which Hablla resolves per person, and the formatted text itself
 * for a `literal`.
 */
export function campaignBodyVariables(variables: readonly TemplateVariable[]): string[] {
    return variables.map((variable) => (variable.kind === 'personField'
        ? `{{person.custom_fields.${variable.fieldId}}}`
        : formatVariableValue(variable.value, variable.formats)));
}

/**
 * The campaign's `properties…examples.body` flags, one per variable by position. Every
 * variable is `false`: a person field is a token the campaign reads, never an expression
 * to evaluate, and a literal is already the final text.
 */
export function bodyExpressionFlags(variables: readonly TemplateVariable[]): Record<string, boolean> {
    return Object.fromEntries(variables.map((_variable, index) => [`${index}_is_expression`, false]));
}

/** Custom-field values of a contact in the shape the person routes take, in field order. */
export function toCustomFieldValues(customFields: Readonly<Record<string, string>>): CustomFieldValue[] {
    return Object.entries(customFields).map(([customField, value]) => ({ custom_field: customField, value }));
}

/** One reformatting step. */
function applyFormat(value: string, format: VariableFormat): string {
    switch (format) {
        case 'firstName':
            return firstName(value);
        case 'capitalize':
            return capitalizeWords(value);
        case 'upperCase':
            return value.toLocaleUpperCase('pt-BR');
    }
}
