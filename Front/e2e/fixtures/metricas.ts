import { test } from '@playwright/test';

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export async function medirAccion<T>(
  testId: string,
  accion: string,
  callback: () => Promise<T>,
): Promise<T> {
  return test.step(`Metrica accion real: ${testId} | ${accion}`, async () => {
    const start = Date.now();

    try {
      return await callback();
    } finally {
      const elapsed = formatSeconds(Date.now() - start);
      const message = `METRICA_E2E | ${testId} | ${accion} | ${elapsed}`;

      console.log(message);
      test.info().annotations.push({
        description: `${accion}: ${elapsed}`,
        type: `metrica-${testId}`,
      });
    }
  });
}
