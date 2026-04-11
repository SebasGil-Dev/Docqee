import { describe, expect, it } from 'vitest';

import { formatDisplayName } from '@/lib/formatDisplayName';

describe('formatDisplayName', () => {
  it('convierte cada palabra a formato de nombre propio', () => {
    expect(formatDisplayName('  jONathan   estiben acevedo lopez  ')).toBe(
      'Jonathan Estiben Acevedo Lopez',
    );
  });

  it('mantiene palabras compuestas con guion en formato legible', () => {
    expect(formatDisplayName('ana-maria DEL rio')).toBe('Ana-Maria Del Rio');
  });
});
