export const PHONE_NUMBER_MAX_DIGITS = 10;
export const PHONE_NUMBER_DIGITS_MESSAGE =
  'El numero de celular debe tener 10 digitos.';

export function normalizePhoneNumberInput(value: string) {
  return value.replace(/\D/g, '').slice(0, PHONE_NUMBER_MAX_DIGITS);
}
