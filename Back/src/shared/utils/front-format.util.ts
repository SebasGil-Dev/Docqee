import { slugify } from './text.util';

export function normalizeText(value: string) {
  return value.trim();
}

export function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

export function buildCityFrontId(cityName: string) {
  return `city-${slugify(cityName)}`;
}

export function buildLocalityFrontId(cityName: string, localityName: string) {
  return `locality-${slugify(cityName)}-${slugify(localityName)}`;
}

export function buildDocumentTypeFrontId(code: string) {
  return `document-${code.toLowerCase()}`;
}

export function extractNumericId(value: string) {
  const match = value.match(/(\d+)(?!.*\d)/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

export function generateTemporaryPassword() {
  const randomChunk = Math.random().toString(36).slice(2, 8);
  return `Docqee!${randomChunk}9A`;
}

export function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
