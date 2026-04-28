import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useMemo, useState, type MouseEvent } from 'react';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type {
  StudentAgendaAppointment,
  StudentAgendaAppointmentStatus,
  StudentScheduleBlock,
} from '@/content/types';
import { classNames } from '@/lib/classNames';

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const dayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
const detailDateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
const mediumDateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

type CalendarViewMode = 'day' | 'week' | 'month';
type AgendaTone = 'accepted' | 'block' | 'cancelled' | 'completed' | 'proposal' | 'reschedule';
type AgendaEvent =
  | {
      dateKey: string;
      id: string;
      source: 'appointment';
      statusLabel: string;
      subtitle: string;
      timeLabel: string;
      title: string;
      tone: AgendaTone;
    }
  | {
      blockId: string;
      blockStatus: StudentScheduleBlock['status'];
      dateKey: string;
      id: string;
      source: 'schedule-block';
      statusLabel: string;
      subtitle: string;
      timeLabel: string;
      title: string;
      tone: 'block';
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
    case 'RECHAZADA':
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
    case 'RECHAZADA':
      return 'Rechazada';
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
        source: 'appointment',
        statusLabel: getStatusLabel(appointment.status),
        subtitle: `${appointment.patientName} | ${appointment.siteName}`,
        timeLabel: `${timeFormatter.format(startAt)} - ${timeFormatter.format(endAt)}`,
        title: appointment.appointmentType,
        tone: getTone(appointment.status),
      } satisfies AgendaEvent;
    })
    .filter((event) => event.dateKey >= startKey && event.dateKey <= endKey);

  const blockEvents: AgendaEvent[] = scheduleBlocks.flatMap((block) => {
    const makeBlockEvent = (dateKey: string) =>
      ({
        blockId: block.id,
        blockStatus: block.status,
        dateKey,
        id: `${block.id}-${dateKey}`,
        source: 'schedule-block',
        statusLabel: block.status === 'active' ? 'Bloqueo' : 'Bloqueo inactivo',
        subtitle: block.reason ?? 'Horario reservado',
        timeLabel: `${block.startTime} - ${block.endTime}`,
        title: 'Bloqueo de horario',
        tone: 'block',
      }) satisfies AgendaEvent;

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

function isInactiveBlockEvent(event: AgendaEvent) {
  return event.source === 'schedule-block' && event.blockStatus === 'inactive';
}

export function StudentAgendaCalendar({
  addBlockLabel,
  appointments,
  emptyDayMessage = 'No hay citas ni bloqueos visibles para este dia.',
  emptyWeekMessage = 'Sin movimientos',
  onAddBlock,
  scheduleBlocks,
  onSelectScheduleBlock,
  showBlockLegend = true,
}: {
  addBlockLabel?: string;
  appointments: StudentAgendaAppointment[];
  emptyDayMessage?: string;
  emptyWeekMessage?: string;
  onAddBlock?: () => void;
  scheduleBlocks: StudentScheduleBlock[];
  onSelectScheduleBlock?: (blockId: string) => void;
  showBlockLegend?: boolean;
}) {
  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    const saved = localStorage.getItem('agenda-view-mode');
    return saved === 'day' || saved === 'week' || saved === 'month' ? saved : 'week';
  });

  const handleViewModeChange = (mode: CalendarViewMode) => {
    localStorage.setItem('agenda-view-mode', mode);
    setSelectedDayDetailsKey(null);
    setSelectedWeekDetailsOpen(false);
    setViewMode(mode);
  };
  const [selectedDateKey, setSelectedDateKey] = useState(() => getTodayDateKey());
  const [selectedDayDetailsKey, setSelectedDayDetailsKey] = useState<string | null>(null);
  const [selectedWeekDetailsOpen, setSelectedWeekDetailsOpen] = useState(false);
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
  const selectedDayDetailsEvents = selectedDayDetailsKey
    ? eventsByDate[selectedDayDetailsKey] ?? []
    : [];
  const selectedDayDetailsDate = selectedDayDetailsKey
    ? fromDateKey(selectedDayDetailsKey)
    : null;
  const rangeLabel = useMemo(() => {
    if (viewMode === 'day') {
      return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      }).format(selectedDate);
    }
    if (viewMode === 'week') {
      const startDate = visibleDays[0];
      const endDate = visibleDays[visibleDays.length - 1];
      return `${mediumDateFormatter.format(startDate)} - ${mediumDateFormatter.format(endDate)}`;
    }
    return monthFormatter.format(selectedDate);
  }, [selectedDate, viewMode, visibleDays]);
  const selectedAgendaDetailsEvents = selectedWeekDetailsOpen ? events : selectedDayDetailsEvents;
  const selectedAgendaDetailsTitle = selectedWeekDetailsOpen
    ? `Semana ${rangeLabel}`
    : selectedDayDetailsDate
      ? detailDateFormatter.format(selectedDayDetailsDate)
      : '';
  const shouldShowAgendaDetails =
    (selectedWeekDetailsOpen || selectedDayDetailsDate !== null) && selectedAgendaDetailsEvents.length > 0;

  const stepCalendar = (direction: 'next' | 'previous') => {
    const factor = direction === 'next' ? 1 : -1;
    setSelectedDayDetailsKey(null);
    setSelectedWeekDetailsOpen(false);
    setSelectedDateKey(
      toDateKey(viewMode === 'month' ? addMonths(selectedDate, factor) : addDays(selectedDate, viewMode === 'week' ? factor * 7 : factor)),
    );
  };

  const closeDetailsPanel = () => {
    setSelectedDayDetailsKey(null);
    setSelectedWeekDetailsOpen(false);
  };

  const handleMonthDaySelect = (dateKey: string, dayEvents: AgendaEvent[]) => {
    setSelectedDateKey(dateKey);
    setSelectedWeekDetailsOpen(false);
    setSelectedDayDetailsKey(dayEvents.length > 0 ? dateKey : null);
  };

  const handleWeekSelect = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setSelectedDayDetailsKey(null);
    setSelectedWeekDetailsOpen(events.length > 0);
  };

  const handleBlockClick = (
    event: MouseEvent<HTMLElement>,
    agendaEvent: AgendaEvent,
  ) => {
    if (agendaEvent.source !== 'schedule-block' || !onSelectScheduleBlock) {
      return;
    }

    event.stopPropagation();
    onSelectScheduleBlock(agendaEvent.blockId);
  };

  return (
    <SurfaceCard
      className="student-agenda-calendar relative flex h-full min-h-0 w-full flex-col overflow-hidden border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.98)_100%)] shadow-none"
      paddingClassName="p-1.5 sm:p-2"
    >
      <div className="flex h-full min-h-0 flex-col gap-1.5 sm:gap-2">
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-slate-200/70 pb-1.5 sm:gap-2 sm:pb-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 xl:flex-nowrap">
            <div className="inline-flex shrink-0 rounded-full border border-slate-200/80 bg-white/90 p-0.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              {(['day', 'week', 'month'] as const).map((option) => (
                <button
                  key={option}
                  className={classNames(
                    'rounded-full px-2 py-0.5 text-[0.62rem] font-semibold transition duration-200 sm:px-2.5 sm:text-[0.66rem]',
                    viewMode === option
                      ? 'bg-brand-gradient text-white shadow-[0_12px_24px_-18px_rgba(0,100,124,0.55)]'
                      : 'text-ink-muted hover:text-ink',
                  )}
                  type="button"
                  onClick={() => handleViewModeChange(option)}
                >
                  {option === 'day' ? 'Dia' : option === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:flex-none">
              <button
                aria-label="Periodo anterior"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-ink transition duration-200 hover:border-primary/20 hover:bg-white sm:h-8 sm:w-8"
                type="button"
                onClick={() => stepCalendar('previous')}
              >
                <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
              <button
                className="inline-flex shrink-0 rounded-full border border-slate-200/90 bg-white/95 px-2 py-0.5 text-[0.66rem] font-semibold text-ink transition duration-200 hover:border-primary/20 hover:bg-white sm:px-2.5 sm:py-1 sm:text-[0.72rem]"
                type="button"
                onClick={() => {
                  closeDetailsPanel();
                  setSelectedDateKey(getTodayDateKey());
                }}
              >
                Hoy
              </button>
              <button
                aria-label="Periodo siguiente"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-ink transition duration-200 hover:border-primary/20 hover:bg-white sm:h-8 sm:w-8"
                type="button"
                onClick={() => stepCalendar('next')}
              >
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
              <span className="max-w-full truncate rounded-full border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[0.66rem] font-semibold text-ink shadow-[0_10px_22px_-24px_rgba(15,23,42,0.3)] sm:px-2.5 sm:py-1 sm:text-[0.72rem]">
                {rangeLabel}
              </span>
            </div>
            {onAddBlock ? (
              <button
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-3.5 text-[0.76rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                type="button"
                onClick={onAddBlock}
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{addBlockLabel ?? 'Agregar bloqueo'}</span>
              </button>
            ) : null}
          </div>
          <div className="flex max-h-[1.2rem] w-full flex-nowrap items-center justify-between gap-[0.1rem] overflow-hidden text-[0.48rem] font-semibold uppercase tracking-normal text-ink-muted sm:max-h-[1.6rem] sm:flex-wrap sm:justify-start sm:gap-1 sm:text-[0.5rem] sm:tracking-[0.08em]">
            {[
              ['Pendiente', 'proposal'],
              ['Aceptada', 'accepted'],
              ['Finalizada', 'completed'],
              ['Cancelada', 'cancelled'],
              ['Reprogramacion', 'reschedule'],
              ...(showBlockLegend ? [['Bloqueo', 'block']] : []),
            ].map(([label, tone]) => (
              <span
                key={label}
                className="inline-flex shrink-0 items-center gap-[0.1rem] rounded-full border border-slate-200/70 bg-white/78 px-px py-px sm:gap-1 sm:px-1.5 sm:py-0.5"
              >
                <span className={classNames('h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2', getToneClasses(tone as AgendaTone).dot)} />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div
          className={classNames(
            'min-h-0 flex-1 overflow-hidden',
            viewMode === 'month'
              ? 'grid h-full grid-cols-7 grid-rows-6 gap-0.5 sm:gap-1'
              : viewMode === 'week'
                ? 'grid h-full grid-rows-7 gap-0.5 sm:grid-cols-7 sm:grid-rows-none sm:gap-1'
                : 'admin-scrollbar space-y-1.5 overflow-y-auto pr-1',
          )}
        >
          {visibleDays.map((day) => {
            const dayKey = toDateKey(day);
            const dayEvents = eventsByDate[dayKey] ?? [];

            if (viewMode === 'day') {
              return dayEvents.length > 0 ? (
                dayEvents.map((event) => {
                  const tone = getToneClasses(event.tone);
                  const content = (
                    <>
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
                    </>
                  );

                  return event.source === 'schedule-block' ? (
                    <button
                      key={event.id}
                      aria-label={`Gestionar bloqueo ${event.timeLabel}`}
                      className={classNames(
                    'w-full rounded-[0.9rem] border px-2.5 py-2 text-left transition duration-200 hover:border-primary/30 hover:shadow-[0_14px_30px_-28px_rgba(15,23,42,0.42)]',
                        tone.card,
                        isInactiveBlockEvent(event) && 'opacity-70',
                      )}
                      data-testid={`student-agenda-block-event-${event.blockId}`}
                      type="button"
                      onClick={(nativeEvent) => handleBlockClick(nativeEvent, event)}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      key={event.id}
                      className={classNames('rounded-[0.9rem] border px-2.5 py-2', tone.card)}
                    >
                      {content}
                    </div>
                  );
                })
              ) : (
                <div
                  key={dayKey}
                  className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[0.84rem] text-ink-muted"
                >
                  {emptyDayMessage}
                </div>
              );
            }

            if (viewMode === 'week') {
              return (
                <div
                  key={dayKey}
                  className={classNames(
                    'grid min-h-0 cursor-pointer grid-cols-[2.35rem_minmax(0,1fr)] overflow-hidden rounded-[0.78rem] border px-1 py-0.5 shadow-[0_10px_24px_-28px_rgba(15,23,42,0.25)] sm:flex sm:flex-col sm:px-1.5 sm:py-1',
                    dayKey === selectedDateKey
                      ? 'border-primary/45 bg-[linear-gradient(180deg,rgba(22,78,99,0.08)_0%,rgba(255,255,255,0.96)_100%)]'
                      : 'border-slate-200/85 bg-white/72',
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleWeekSelect(dayKey)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleWeekSelect(dayKey);
                    }
                  }}
                >
                  <div
                    className="flex h-full shrink-0 flex-col items-start justify-center pr-1 text-left sm:mb-1 sm:h-auto sm:w-full sm:justify-start sm:pr-0"
                  >
                    <p className="max-w-full truncate text-[0.46rem] font-bold uppercase tracking-[0.08em] text-ink-muted sm:text-[0.54rem] sm:tracking-[0.1em]">
                      {dayFormatter.format(day).replace('.', '')}
                    </p>
                    <p className="font-headline text-[0.72rem] font-extrabold tracking-tight text-ink sm:text-sm">
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden sm:space-y-1">
                    {dayEvents.length > 0 ? (
                      <>
                        {dayEvents.slice(0, 2).map((event) => {
                          const tone = getToneClasses(event.tone);
                          const content = (
                            <>
                              <p className="truncate text-[0.52rem] font-semibold sm:text-[0.62rem]">{event.title}</p>
                              <p className="hidden truncate text-[0.5rem] opacity-80 sm:block sm:text-[0.56rem]">{event.subtitle}</p>
                              <div className="mt-px flex items-center gap-1 text-[0.5rem] font-semibold sm:mt-0.5 sm:text-[0.58rem]">
                                <span className={classNames('h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2', tone.dot)} />
                                {event.timeLabel}
                              </div>
                            </>
                          );

                          return event.source === 'schedule-block' ? (
                            <button
                              key={event.id}
                              aria-label={`Gestionar bloqueo ${event.timeLabel}`}
                              className={classNames(
                                'w-full rounded-[0.58rem] border px-1.5 py-0.5 text-left transition duration-200 hover:border-primary/30 hover:shadow-[0_14px_30px_-28px_rgba(15,23,42,0.42)] sm:rounded-[0.68rem] sm:py-1',
                                tone.card,
                                isInactiveBlockEvent(event) && 'opacity-70',
                              )}
                              data-testid={`student-agenda-block-event-${event.blockId}`}
                              type="button"
                              onClick={(nativeEvent) => handleBlockClick(nativeEvent, event)}
                            >
                              {content}
                            </button>
                          ) : (
                            <div
                              key={event.id}
                              className={classNames('rounded-[0.58rem] border px-1.5 py-0.5 sm:rounded-[0.68rem] sm:py-1', tone.card)}
                            >
                              {content}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 ? (
                          <p className="truncate text-[0.5rem] font-semibold text-ink-muted sm:text-[0.54rem]">
                            +{dayEvents.length - 2} mas
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex h-full items-center rounded-[0.62rem] border border-dashed border-slate-200 bg-white/88 px-1.5 py-0.5 text-[0.52rem] font-medium text-ink-muted sm:block sm:rounded-[0.72rem] sm:py-2 sm:text-center sm:text-[0.62rem]">
                        {emptyWeekMessage}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={dayKey}
                className={classNames(
                  'flex min-h-0 flex-col overflow-hidden rounded-[0.68rem] border px-0.5 py-0.5 text-left transition duration-200 sm:px-1',
                  dayKey === selectedDateKey
                    ? 'border-primary/45 bg-[linear-gradient(180deg,rgba(22,78,99,0.08)_0%,rgba(255,255,255,0.96)_100%)]'
                    : 'border-slate-200/85 bg-white/72 hover:border-primary/25 hover:bg-white',
                  day.getMonth() !== selectedDate.getMonth() && 'opacity-55',
                )}
                role="button"
                tabIndex={0}
                onClick={() => handleMonthDaySelect(dayKey, dayEvents)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleMonthDaySelect(dayKey, dayEvents);
                  }
                }}
              >
                <div className="mb-0.5 flex shrink-0 items-center justify-between">
                  <span
                    className={classNames(
                      'inline-flex h-4.5 w-4.5 items-center justify-center rounded-full text-[0.66rem] font-bold sm:h-4.5 sm:w-4.5 sm:text-[0.64rem] xl:h-5 xl:w-5 xl:text-[0.68rem]',
                      dayKey === todayDateKey ? 'bg-brand-gradient text-white' : 'text-ink',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 ? (
                    <span className="rounded-full bg-slate-100 px-1 py-px text-[0.46rem] font-semibold uppercase tracking-[0.06em] text-ink-muted sm:text-[0.48rem]">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </div>
                <div className="min-h-0 space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 1).map((event) =>
                    event.source === 'schedule-block' ? (
                      <button
                        key={event.id}
                        aria-label={`Gestionar bloqueo ${event.timeLabel}`}
                        className={classNames(
                          'w-full truncate rounded-[0.5rem] px-1 py-px text-left text-[0.5rem] font-semibold leading-3 transition duration-200 sm:text-[0.5rem] xl:px-1 xl:py-px xl:text-[0.52rem]',
                          getToneClasses(event.tone).pill,
                          isInactiveBlockEvent(event) && 'opacity-70',
                        )}
                        data-testid={`student-agenda-block-event-${event.blockId}`}
                        type="button"
                        onClick={(nativeEvent) => handleBlockClick(nativeEvent, event)}
                      >
                        {event.timeLabel} | Bloqueo
                      </button>
                    ) : (
                      <div
                        key={event.id}
                        className={classNames(
                          'truncate rounded-[0.5rem] px-1 py-px text-[0.5rem] font-semibold leading-3 sm:text-[0.5rem] xl:px-1 xl:py-px xl:text-[0.52rem]',
                          getToneClasses(event.tone).pill,
                        )}
                      >
                        {event.timeLabel} | {event.title}
                      </div>
                    ),
                  )}
                  {dayEvents.length > 1 ? (
                    <p className="text-[0.48rem] font-semibold leading-3 text-ink-muted sm:text-[0.48rem]">
                      +{dayEvents.length - 1} mas
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {shouldShowAgendaDetails ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/18 px-3 py-4 backdrop-blur-[1px]">
          <button
            aria-label="Cerrar informacion de agenda"
            className="absolute inset-0"
            type="button"
            onClick={closeDetailsPanel}
          />
          <div
            aria-labelledby="student-agenda-day-details-title"
            aria-modal="true"
            className="relative z-10 w-full max-w-[20rem] overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white shadow-[0_22px_64px_-28px_rgba(15,23,42,0.48)]"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
              <div className="min-w-0">
                <p
                  className="truncate text-[0.78rem] font-extrabold text-ink sm:text-sm"
                  id="student-agenda-day-details-title"
                >
                  {selectedAgendaDetailsTitle}
                </p>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:text-[0.64rem]">
                  {selectedAgendaDetailsEvents.length} movimiento{selectedAgendaDetailsEvents.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                aria-label="Cerrar informacion de agenda"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ghost transition duration-150 hover:bg-slate-100 hover:text-ink"
                type="button"
                onClick={closeDetailsPanel}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="admin-scrollbar max-h-[18rem] space-y-2 overflow-y-auto px-3 py-2.5">
              {selectedAgendaDetailsEvents.map((event) => {
                const tone = getToneClasses(event.tone);
                const eventTimeLabel = selectedWeekDetailsOpen
                  ? `${mediumDateFormatter.format(fromDateKey(event.dateKey))} · ${event.timeLabel}`
                  : event.timeLabel;

                return (
                  <div
                    key={event.id}
                    className={classNames('rounded-[0.82rem] border px-2.5 py-2', tone.card)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[0.72rem] font-bold sm:text-[0.82rem]">
                          {event.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[0.62rem] leading-4 opacity-80 sm:text-[0.72rem]">
                          {event.subtitle}
                        </p>
                      </div>
                      <span className={classNames('shrink-0 rounded-full px-1.5 py-0.5 text-[0.54rem] font-semibold sm:text-[0.6rem]', tone.pill)}>
                        {event.statusLabel}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 text-[0.62rem] font-semibold sm:text-[0.7rem]">
                        <span className={classNames('h-1.5 w-1.5 rounded-full', tone.dot)} />
                        <span className="truncate">{eventTimeLabel}</span>
                      </p>
                      {event.source === 'schedule-block' && onSelectScheduleBlock ? (
                        <button
                          className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[0.58rem] font-bold text-primary ring-1 ring-slate-200 transition duration-150 hover:bg-white sm:text-[0.64rem]"
                          type="button"
                          onClick={() => {
                            closeDetailsPanel();
                            onSelectScheduleBlock(event.blockId);
                          }}
                        >
                          Gestionar
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
