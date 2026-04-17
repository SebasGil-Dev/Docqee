import { Clock3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { classNames } from '@/lib/classNames';

type AdminTimePickerFieldProps = {
  containerClassName?: string;
  disabled?: boolean;
  error?: string | undefined;
  id: string;
  label: string;
  min?: string | undefined;
  name: string;
  onChange: (value: string) => void;
  value: string;
};

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parseTime(value: string) {
  const [hStr = '', mStr = ''] = value.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) {
    return { hour: 12, minute: 0, period: 'AM' as const };
  }

  const period = h < 12 ? 'AM' : ('PM' as const);
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const minute = Math.round(m / 5) * 5 >= 60 ? 55 : Math.round(m / 5) * 5;

  return { hour, minute, period };
}

function toValue(hour: number, minute: number, period: 'AM' | 'PM'): string {
  const h24 =
    period === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toTotalMinutes(h24: number, minute: number) {
  return h24 * 60 + minute;
}

function toH24(hour: number, period: 'AM' | 'PM') {
  return period === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
}

function parseMinTotal(min: string | undefined): number {
  if (!min) return -Infinity;
  const [hStr = '0', mStr = '0'] = min.split(':');
  return parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
}

function findFirstValidMinute(
  hour: number,
  period: 'AM' | 'PM',
  minTotal: number,
): number {
  const h24 = toH24(hour, period);
  for (const m of MINUTES) {
    if (toTotalMinutes(h24, m) > minTotal) return m;
  }
  return MINUTES[0] ?? 0;
}

function formatDisplay(value: string): string {
  if (!value) return '--:-- --';
  const parsed = parseTime(value);
  return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`;
}

export function AdminTimePickerField({
  containerClassName,
  disabled = false,
  error,
  id,
  label,
  min,
  name,
  onChange,
  value,
}: AdminTimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const minTotal = parseMinTotal(min);

  const parsed = value ? parseTime(value) : null;
  const [selHour, setSelHour] = useState(parsed?.hour ?? 12);
  const [selMinute, setSelMinute] = useState(parsed?.minute ?? 0);
  const [selPeriod, setSelPeriod] = useState<'AM' | 'PM'>(parsed?.period ?? 'AM');

  useEffect(() => {
    if (value) {
      const p = parseTime(value);
      setSelHour(p.hour);
      setSelMinute(p.minute);
      setSelPeriod(p.period);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function isPeriodDisabled(period: 'AM' | 'PM') {
    if (minTotal === -Infinity) return false;
    if (period === 'AM') {
      return HOURS.every((h) =>
        MINUTES.every((m) => toTotalMinutes(toH24(h, 'AM'), m) <= minTotal),
      );
    }
    return false;
  }

  function isHourDisabled(hour: number, period: 'AM' | 'PM') {
    if (minTotal === -Infinity) return false;
    const h24 = toH24(hour, period);
    return MINUTES.every((m) => toTotalMinutes(h24, m) <= minTotal);
  }

  function isMinuteDisabled(minute: number) {
    if (minTotal === -Infinity) return false;
    const h24 = toH24(selHour, selPeriod);
    return toTotalMinutes(h24, minute) <= minTotal;
  }

  function handlePeriodClick(period: 'AM' | 'PM') {
    if (isPeriodDisabled(period)) return;
    let nextHour = selHour;
    let nextMinute = selMinute;

    if (isHourDisabled(nextHour, period)) {
      const firstValidHour = HOURS.find((h) => !isHourDisabled(h, period));
      if (!firstValidHour) return;
      nextHour = firstValidHour;
    }

    const h24 = toH24(nextHour, period);
    if (toTotalMinutes(h24, nextMinute) <= minTotal) {
      nextMinute = findFirstValidMinute(nextHour, period, minTotal);
    }

    setSelPeriod(period);
    setSelHour(nextHour);
    setSelMinute(nextMinute);
    onChange(toValue(nextHour, nextMinute, period));
  }

  function handleHourClick(hour: number) {
    if (isHourDisabled(hour, selPeriod)) return;
    let nextMinute = selMinute;
    const h24 = toH24(hour, selPeriod);
    if (toTotalMinutes(h24, nextMinute) <= minTotal) {
      nextMinute = findFirstValidMinute(hour, selPeriod, minTotal);
    }
    setSelHour(hour);
    setSelMinute(nextMinute);
    onChange(toValue(hour, nextMinute, selPeriod));
  }

  function handleMinuteClick(minute: number) {
    if (isMinuteDisabled(minute)) return;
    setSelMinute(minute);
    onChange(toValue(selHour, minute, selPeriod));
  }

  const cellBase =
    'flex h-8 w-full items-center justify-center rounded-[0.65rem] text-[0.78rem] font-semibold transition duration-150';
  const cellActive = 'bg-primary text-white shadow-[0_10px_24px_-16px_rgba(22,78,99,0.9)]';
  const cellEnabled = 'text-ink hover:bg-slate-100 cursor-pointer';
  const cellDisabled = 'text-slate-300 cursor-not-allowed line-through';

  return (
    <div className={classNames('admin-time-picker space-y-1.5', containerClassName)}>
      <label
        className="block text-sm font-semibold text-ink"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative" ref={rootRef}>
        <input name={name} type="hidden" value={value} />
        <Clock3
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-[1] h-4.5 w-4.5 -translate-y-1/2 text-ghost"
        />
        <button
          aria-controls={`${id}-picker`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-invalid={Boolean(error)}
          className={classNames(
            'w-full rounded-2xl border bg-surface py-3 pl-11 pr-4 text-left text-sm text-ink transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
            disabled ? 'cursor-not-allowed text-ghost' : '',
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
              : 'border-slate-200 focus-visible:border-primary',
            !value && 'text-ghost/80',
          )}
          disabled={disabled}
          id={id}
          type="button"
          onClick={() => {
            if (!disabled) setIsOpen((c) => !c);
          }}
        >
          {value ? formatDisplay(value) : '--:-- --'}
        </button>

        {isOpen ? (
          <div
            className="absolute bottom-[calc(100%+0.35rem)] left-1/2 z-20 w-[min(18rem,calc(100%+2rem))] -translate-x-1/2 overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white/98 p-2.5 shadow-[0_-20px_46px_-28px_rgba(15,23,42,0.32),0_20px_46px_-32px_rgba(15,23,42,0.22)] backdrop-blur"
            id={`${id}-picker`}
            role="dialog"
          >
            <p className="mb-2 px-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-primary/70">
              Selecciona la hora
            </p>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              {/* Hours */}
              <div>
                <p className="mb-1 text-center text-[0.65rem] font-bold uppercase tracking-wide text-ink-muted">
                  Hora
                </p>
                <div className="admin-scrollbar max-h-[13rem] space-y-0.5 overflow-y-auto pr-0.5">
                  {HOURS.map((h) => {
                    const isDisabled = isHourDisabled(h, selPeriod);
                    const isSelected = selHour === h;

                    return (
                      <button
                        key={h}
                        className={classNames(
                          cellBase,
                          isDisabled ? cellDisabled : isSelected ? cellActive : cellEnabled,
                        )}
                        disabled={isDisabled}
                        type="button"
                        onClick={() => handleHourClick(h)}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <p className="mb-1 text-center text-[0.65rem] font-bold uppercase tracking-wide text-ink-muted">
                  Min
                </p>
                <div className="admin-scrollbar max-h-[13rem] space-y-0.5 overflow-y-auto pr-0.5">
                  {MINUTES.map((m) => {
                    const isDisabled = isMinuteDisabled(m);
                    const isSelected = selMinute === m;

                    return (
                      <button
                        key={m}
                        className={classNames(
                          cellBase,
                          isDisabled ? cellDisabled : isSelected ? cellActive : cellEnabled,
                        )}
                        disabled={isDisabled}
                        type="button"
                        onClick={() => handleMinuteClick(m)}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AM / PM */}
              <div className="flex flex-col gap-1 pt-[1.35rem]">
                {(['AM', 'PM'] as const).map((period) => {
                  const isDisabled = isPeriodDisabled(period);
                  const isSelected = selPeriod === period;

                  return (
                    <button
                      key={period}
                      className={classNames(
                        'flex h-8 w-12 items-center justify-center rounded-[0.65rem] text-[0.78rem] font-bold transition duration-150',
                        isDisabled
                          ? 'cursor-not-allowed text-slate-300 line-through'
                          : isSelected
                            ? 'bg-primary text-white shadow-[0_10px_24px_-16px_rgba(22,78,99,0.9)]'
                            : 'cursor-pointer text-ink hover:bg-slate-100',
                      )}
                      disabled={isDisabled}
                      type="button"
                      onClick={() => handlePeriodClick(period)}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
