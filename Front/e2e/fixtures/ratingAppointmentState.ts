import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type RatingAppointmentState = {
  createdAt: string;
  endAt: string;
  endTime: string;
  id: string;
  source: 'early' | 'fallback';
  startAt: string;
  startDate: string;
  startTime: string;
};

const STATE_PATH = resolve(
  process.cwd(),
  'e2e/fixtures/.rating-appointment.json',
);

export function saveRatingAppointmentState(state: RatingAppointmentState) {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function loadRatingAppointmentState() {
  if (!existsSync(STATE_PATH)) {
    return null;
  }

  try {
    return JSON.parse(
      readFileSync(STATE_PATH, 'utf8'),
    ) as RatingAppointmentState;
  } catch {
    return null;
  }
}

export function clearRatingAppointmentState() {
  if (existsSync(STATE_PATH)) {
    unlinkSync(STATE_PATH);
  }
}
