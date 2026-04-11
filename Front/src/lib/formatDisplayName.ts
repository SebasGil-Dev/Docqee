function formatNamePart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es-CO')
    .split('-')
    .map((part) =>
      part.length > 0
        ? `${part.charAt(0).toLocaleUpperCase('es-CO')}${part.slice(1)}`
        : part,
    )
    .join('-');
}

export function formatDisplayName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(formatNamePart)
    .join(' ');
}
