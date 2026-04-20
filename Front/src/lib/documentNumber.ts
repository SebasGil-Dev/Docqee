export const DOCUMENT_NUMBER_DIGITS_MESSAGE =
  'El número de documento solo debe contener números';

export function keepOnlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isDigitsOnly(value: string) {
  return /^\d+$/.test(value.trim());
}
