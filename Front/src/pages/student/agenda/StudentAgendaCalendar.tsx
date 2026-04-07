import { CalendarDays, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { useMemo, useState } from 'react';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type {
  StudentAgendaAppointment,
  StudentAgendaAppointmentStatus,
  StudentScheduleBlock,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

const DEFAULT_SELECTED_DATE_KEY = '2026-04-06';

const dayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const mediumDateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const longDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

type CalendarViewMode = 'day' | 'week' | 'month';
type AgendaTone = 'accepted' | 'block' | 'cancelled' | 'completed' | 'proposal' | 'reschedule';
type AgendaEvent = {
  dateKey: string;
  id: string;
  statusLabel: string;
  subtitle: string;
  timeLabel: string;
  title: string;
  tone: AgendaTone;
};

function fromDateKey(value: string) {
  const [year = 2026, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function startOfWeek(date: Date) {
  const weekday = date.getDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

function getTone(status: StudentAgendaAppointmentStatus): AgendaTone {
  switch (status) {
    case 'ACEPTADA':
      return 'accepted';
    case 'CANCELADA':
      return 'cancelled';
    case 'FINALIZADA':
      return 'completed';
    case 'REPROGRAMACION_PENDIENTE':
      return 'reschedule';
    default:
      return 'proposal';
  }
}

function getToneClasses(tone: AgendaTone) {
  switch (tone) {
    case 'accepted':
      return { card: 'border-emerald-200 bg-emerald-50/80 text-emerald-950', dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-800' };
    case 'cancelled':
      return { card: 'border-rose-200 bg-rose-50/80 text-rose-950', dot: 'bg-rose-500', pill: 'bg-rose-100 text-rose-800' };
    case 'completed':
      return { card: 'border-sky-200 bg-sky-50/80 text-sky-950', dot: 'bg-sky-500', pill: 'bg-sky-100 text-sky-800' };
    case 'reschedule':
      return { card: 'border-violet-200 bg-violet-50/80 text-violet-950', dot: 'bg-violet-500', pill: 'bg-violet-100 text-violet-800' };
    case 'block':
      return { card: 'border-slate-300 bg-slate-100/90 text-slate-900', dot: 'bg-slate-500', pill: 'bg-slate-200 text-slate-800' };
    default:
      return { card: 'border-amber-200 bg-amber-50/80 text-amber-950', dot: 'bg-amber-500', pill: 'bg-amber-100 text-amber-800' };
  }
}

function getStatusLabel(status: StudentAgendaAppointmentStatus) {
  switch (status) {
    case 'ACEPTADA':
      return 'Aceptada';
    case 'CANCELADA':
      return 'Cancelada';
    case 'FINALIZADA':
      return 'Finalizada';
    case 'REPROGRAMACION_PENDIENTE':
      return 'Reprogramacion';
    default:
      return 'Pendiente';
  }
}

function buildEvents(
  appointments: StudentAgendaAppointment[],
  scheduleBlocks: StudentScheduleBlock[],
  startKey: string,
  endKey: string,
) {
  const appointmentEvents: AgendaEvent[] = appointments
    .map((appointment) => {
      const startAt = new Date(appointment.startAt);
      const endAt = new Date(appointment.endAt);
      return {
        dateKey: toDateKey(startAt),
        id: appointment.id,
        statusLabel: getStatusLabel(appointment.status),
        subtitle: `${appointment.patientName} | ${appointment.siteName}`,
        timeLabel: `${timeFormatter.format(startAt)} - ${timeFormatter.format(endAt)}`,
        title: appointment.appointmentType,
        tone: getTone(appointment.status),
      } satisfies AgendaEvent;
    })
    .filter((event) => event.dateKey >= startKey && event.dateKey <= endKey);

  const blockEvents: AgendaEvent[] = scheduleBlocks.flatMap((block) => {
    if (block.status !== 'active') {
      return [];
    }

    const makeBlockEvent = (dateKey: string) => ({
      dateKey,
      id: `${block.id}-${dateKey}`,
      statusLabel: 'Bloqueo',
      subtitle: block.reason ?? 'Horario reservado',
      timeLabel: `${block.startTime} - ${block.endTime}`,
      title: 'Bloqueo de horario',
      tone: 'block' as const,
    });

    if (block.type === 'ESPECIFICO' && block.specificDate) {
      return block.specificDate >= startKey && block.specificDate <= endKey
        ? [makeBlockEvent(block.specificDate)]
        : [];
    }

    if (!block.dayOfWeek || !block.recurrenceStartDate) {
      return [];
    }

    const nextEvents: AgendaEvent[] = [];
    const startDate = fromDateKey(block.recurrenceStartDate > startKey ? block.recurrenceStartDate : startKey);
    const limitKey =
      block.recurrenceEndDate && block.recurrenceEndDate < endKey ? block.recurrenceEndDate : endKey;

    for (let cursor = startDate; toDateKey(cursor) <= limitKey; cursor = addDays(cursor, 1)) {
      const weekday = cursor.getDay() === 0 ? 7 : cursor.getDay();
      if (weekday === block.dayOfWeek) {
        nextEvents.push(makeBlockEvent(toDateKey(cursor)));
      }
    }

    return nextEvents;
  });

  return [...appointmentEvents, ...blockEvents].sort((first, second) =>
    `${first.dateKey}${first.timeLabel}${first.title}`.localeCompare(
      `${second.dateKey}${second.timeLabel}${second.title}`,
    ),
  );
}

export function StudentAgendaCalendar({
  appointments,
  scheduleBlocks,
}: {
  appointments: StudentAgendaAppointment[];
  scheduleBlocks: StudentScheduleBlock[];
}) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedDateKey, setSelectedDateKey] = useState(DEFAULT_SELECTED_DATE_KEY);
  const selectedDate = useMemo(() => fromDateKey(selectedDateKey), [selectedDateKey]);
  const visibleDays = useMemo(() => {
    if (viewMode === 'day') {
      return [selectedDate];
    }

    if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate);
      return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    }

    const monthStart = startOfWeek(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    return Array.from({ length: 42 }, (_, index) => addDays(monthStart, index));
  }, [selectedDate, viewMode]);
  const visibleRange = useMemo(
    () => ({
      end: visibleDays[visibleDays.length - 1] ?? selectedDate,
      start: visibleDays[0] ?? selectedDate,
    }),
    [selectedDate, visibleDays],
  );
  const startKey = toDateKey(visibleRange.start);
  const endKey = toDateKey(visibleRange.end);
  const events = useMemo(
    () => buildEvents(appointments, scheduleBlocks, startKey, endKey),
    [appointments, endKey, scheduleBlocks, startKey],
  );
  const eventsByDate = useMemo(
    () =>
      events.reduce<Record<string, AgendaEvent[]>>((grouped, event) => {
        grouped[event.dateKey] = [...(grouped[event.dateKey] ?? []), event];
        return grouped;
      }, {}),
    [events],
  );
  const selectedDateEvents = eventsByDate[selectedDateKey] ?? [];
  const rangeLabel = useMemo(() => {
    if (viewMode === 'day') {
      return longDateFormatter.format(selectedDate);
    }
    if (viewMode === 'week') {
      const startDate = visibleDays[0];
      const endDate = visibleDays[visibleDays.length - 1];
      return `${mediumDateFormatter.format(startDate)} - ${mediumDateFormatter.format(endDate)}`;
    }
    return monthFormatter.format(selectedDate);
  }, [selectedDate, viewMode, visibleDays]);

  const stepCalendar = (direction: 'next' | 'previous') => {
    const factor = direction === 'next' ? 1 : -1;
    setSelectedDateKey(
      toDateKey(viewMode === 'month' ? addMonths(selectedDate, factor) : addDays(selectedDate, viewMode === 'week' ? factor * 7 : factor)),
    );
  };

  return (
    <SurfaceCard
      className="border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.98)_100%)] shadow-none"
      paddingClassName="p-3 sm:p-3.5"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 border-b border-slate-200/70 pb-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-headline text-[1rem] font-extrabold tracking-tight text-ink sm:text-[1.08rem]">
                Calendario de citas
              </h2>
              <p className="mt-0.5 text-[0.76rem] leading-5 text-ink-muted sm:text-[0.8rem]">
                Organiza tu agenda por dia, semana o mes.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-slate-200/80 bg-white/90 p-1 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              {(['day', 'week', 'month'] as const).map((option) => (
                <button
                  key={option}
                  className={classNames(
                    'rounded-full px-3 py-1.25 text-[0.7rem] font-semibold transition duration-200',
                    viewMode === option
                      ? 'bg-brand-gradient text-white shadow-[0_12px_24px_-18px_rgba(0,100,124,0.55)]'
                      : 'text-ink-muted hover:text-ink',
                  )}
                  type="button"
                  onClick={() => setViewMode(option)}
                >
                  {option === 'day' ? 'Dia' : option === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                aria-label="Periodo anterior"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-ink transition duration-200 hover:border-primary/20 hover:bg-white"
                type="button"
                onClick={() => stepCalendar('previous')}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                className="inline-flex rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-[0.8rem] font-semibold text-ink transition duration-200 hover:border-primary/20 hover:bg-white"
                type="button"
                onClick={() => setSelectedDateKey(DEFAULT_SELECTED_DATE_KEY)}
              >
                Hoy
              </button>
              <button
                aria-label="Periodo siguiente"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-ink transition duration-200 hover:border-primary/20 hover:bg-white"
                type="button"
                onClick={() => stepCalendar('next')}
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
              <span className="rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[0.8rem] font-semibold text-ink shadow-[0_10px_22px_-24px_rgba(15,23,42,0.3)]">
                {rangeLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {[
                ['Pendiente', 'proposal'],
                ['Aceptada', 'accepted'],
                ['Cancelada', 'cancelled'],
                ['Reprogramacion', 'reschedule'],
                ['Bloqueo', 'block'],
              ].map(([label, tone]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/78 px-2.25 py-1"
                >
                  <span className={classNames('h-2.5 w-2.5 rounded-full', getToneClasses(tone as AgendaTone).dot)} />
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div
          className={classNames(
            viewMode === 'month'
              ? 'grid grid-cols-7 gap-1.5'
              : viewMode === 'week'
                ? 'grid gap-1.5 xl:grid-cols-7'
                : 'space-y-2',
          )}
        >
          {visibleDays.map((day) => {
            const dayKey = toDateKey(day);
            const dayEvents = eventsByDate[dayKey] ?? [];

            if (viewMode === 'day') {
              return dayEvents.length > 0 ? (
                dayEvents.map((event) => {
                  const tone = getToneClasses(event.tone);

                  return (
                    <div
                      key={event.id}
                      className={classNames('rounded-[0.95rem] border px-2.5 py-2.5', tone.card)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.84rem] font-semibold">{event.title}</p>
                          <p className="text-[0.72rem] opacity-80">{event.subtitle}</p>
                        </div>
                        <span
                          className={classNames(
                            'rounded-full px-2 py-1 text-[0.64rem] font-semibold',
                            tone.pill,
                          )}
                        >
                          {event.statusLabel}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] font-semibold">
                        <span className={classNames('h-2 w-2 rounded-full', tone.dot)} />
                        {event.timeLabel}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  key={dayKey}
                  className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[0.84rem] text-ink-muted"
                >
                  No hay citas ni bloqueos visibles para este dia.
                </div>
              );
            }

            if (viewMode === 'week') {
              return (
                <div
                  key={dayKey}
                  className={classNames(
                    'rounded-[1rem] border px-2.5 py-2.25 shadow-[0_10px_24px_-28px_rgba(15,23,42,0.25)]',
                    dayKey === selectedDateKey
                      ? 'border-primary/45 bg-[linear-gradient(180deg,rgba(22,78,99,0.08)_0%,rgba(255,255,255,0.96)_100%)]'
                      : 'border-slate-200/85 bg-white/72',
                  )}
                >
                  <button
                    className="mb-2.5 w-full text-left"
                    type="button"
                    onClick={() => setSelectedDateKey(dayKey)}
                  >
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                      {dayFormatter.format(day).replace('.', '')}
                    </p>
                    <p className="font-headline text-base font-extrabold tracking-tight text-ink">
                      {day.getDate()}
                    </p>
                  </button>
                  <div className="space-y-1.5">
                    {dayEvents.length > 0 ? (
                      dayEvents.map((event) => {
                        const tone = getToneClasses(event.tone);

                        return (
                          <div
                            key={event.id}
                            className={classNames('rounded-[0.9rem] border px-2.5 py-2', tone.card)}
                          >
                            <p className="truncate text-[0.72rem] font-semibold">{event.title}</p>
                            <p className="truncate text-[0.64rem] opacity-80">{event.subtitle}</p>
                            <div className="mt-1 flex items-center gap-2 text-[0.66rem] font-semibold">
                              <span className={classNames('h-2 w-2 rounded-full', tone.dot)} />
                              {event.timeLabel}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[0.95rem] border border-dashed border-slate-200 bg-white/88 px-2.5 py-3.5 text-center text-[0.68rem] font-medium text-ink-muted">
                        Sin movimientos
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <button
                key={dayKey}
                className={classNames(
                  'flex min-h-[5.9rem] flex-col rounded-[0.95rem] border px-2 py-1.5 text-left transition duration-200 xl:min-h-[6.2rem]',
                  dayKey === selectedDateKey
                    ? 'border-primary/45 bg-[linear-gradient(180deg,rgba(22,78,99,0.08)_0%,rgba(255,255,255,0.96)_100%)]'
                    : 'border-slate-200/85 bg-white/72 hover:border-primary/25 hover:bg-white',
                  day.getMonth() !== selectedDate.getMonth() && 'opacity-55',
                )}
                type="button"
                onClick={() => setSelectedDateKey(dayKey)}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={classNames(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.82rem] font-bold',
                      dayKey === DEFAULT_SELECTED_DATE_KEY ? 'bg-brand-gradient text-white' : 'text-ink',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {dayEvents.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={classNames(
                        'truncate rounded-[0.72rem] px-2 py-1 text-[0.61rem] font-semibold',
                        getToneClasses(event.tone).pill,
                      )}
                    >
                      {event.timeLabel} | {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 ? (
                    <p className="text-[0.58rem] font-semibold text-ink-muted">
                      +{dayEvents.length - 2} mas
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
        {viewMode !== 'day' ? (
          <div className="rounded-[1.05rem] border border-slate-200/80 bg-white/78 p-3 shadow-[0_12px_24px_-28px_rgba(15,23,42,0.28)]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Detalle del dia
            </p>
            <h3 className="font-headline text-base font-extrabold tracking-tight text-ink sm:text-[1.05rem]">
              {longDateFormatter.format(selectedDate)}
            </h3>
            <div className="mt-2.5 space-y-2">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => {
                  const tone = getToneClasses(event.tone);

                  return (
                    <div
                      key={event.id}
                      className={classNames('rounded-[0.95rem] border px-2.5 py-2.5', tone.card)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.84rem] font-semibold">{event.title}</p>
                          <p className="text-[0.72rem] opacity-80">{event.subtitle}</p>
                        </div>
                        <span
                          className={classNames(
                            'rounded-full px-2 py-1 text-[0.64rem] font-semibold',
                            tone.pill,
                          )}
                        >
                          {event.statusLabel}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] font-semibold">
                        <span className={classNames('h-2 w-2 rounded-full', tone.dot)} />
                        {event.timeLabel}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-[0.84rem] text-ink-muted">
                  No hay movimientos registrados para el dia seleccionado.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
