import {
  CalendarDays,
  Clock3,
  PencilLine,
  Power,
  PowerOff,
  Repeat,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { AdminDropdownField } from '@/components/admin/AdminDropdownField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminTextField } from '@/components/admin/AdminTextField';
import { Seo } from '@/components/ui/Seo';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { studentContent } from '@/content/studentContent';
import type {
  StudentScheduleBlock,
  StudentScheduleBlockFormErrors,
  StudentScheduleBlockFormValues,
} from '@/content/types';
import { classNames } from '@/lib/classNames';
import { useStudentModuleStore } from '@/lib/studentModuleStore';

const dayOptions = [
  { id: '1', label: 'Lunes' },
  { id: '2', label: 'Martes' },
  { id: '3', label: 'Miercoles' },
  { id: '4', label: 'Jueves' },
  { id: '5', label: 'Viernes' },
  { id: '6', label: 'Sabado' },
  { id: '7', label: 'Domingo' },
] as const;

const blockTypeOptions = [
  { id: 'ESPECIFICO', label: 'Especifico' },
  { id: 'RECURRENTE', label: 'Recurrente' },
] as const;

const initialFormValues: StudentScheduleBlockFormValues = {
  dayOfWeek: '',
  endTime: '',
  reason: '',
  recurrenceEndDate: '',
  recurrenceStartDate: '',
  specificDate: '',
  startTime: '',
  type: 'ESPECIFICO',
};

function getInitialFormValues(block?: StudentScheduleBlock | null): StudentScheduleBlockFormValues {
  if (!block) {
    return initialFormValues;
  }

  return {
    dayOfWeek: block.dayOfWeek ? String(block.dayOfWeek) : '',
    endTime: block.endTime,
    reason: block.reason ?? '',
    recurrenceEndDate: block.recurrenceEndDate ?? '',
    recurrenceStartDate: block.recurrenceStartDate ?? '',
    specificDate: block.specificDate ?? '',
    startTime: block.startTime,
    type: block.type,
  };
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function validateScheduleBlock(values: StudentScheduleBlockFormValues): StudentScheduleBlockFormErrors {
  const errors: StudentScheduleBlockFormErrors = {};

  if (!values.startTime) {
    errors.startTime = 'La hora de inicio es obligatoria.';
  }

  if (!values.endTime) {
    errors.endTime = 'La hora de finalizacion es obligatoria.';
  }

  if (values.startTime && values.endTime && values.endTime <= values.startTime) {
    errors.endTime = 'La hora final debe ser posterior a la inicial.';
  }

  if (values.type === 'ESPECIFICO' && !values.specificDate) {
    errors.specificDate = 'Selecciona la fecha del bloqueo especifico.';
  }

  if (values.type === 'RECURRENTE' && !values.dayOfWeek) {
    errors.dayOfWeek = 'Selecciona el dia de la semana.';
  }

  if (values.type === 'RECURRENTE' && !values.recurrenceStartDate) {
    errors.recurrenceStartDate = 'Selecciona la fecha de inicio de la recurrencia.';
  }

  if (
    values.type === 'RECURRENTE' &&
    values.recurrenceStartDate &&
    values.recurrenceEndDate &&
    values.recurrenceEndDate < values.recurrenceStartDate
  ) {
    errors.recurrenceEndDate =
      'La fecha final debe ser igual o posterior a la fecha inicial.';
  }

  return errors;
}

function formatScheduleLabel(block: StudentScheduleBlock) {
  if (block.type === 'ESPECIFICO') {
    return `${formatDateLabel(block.specificDate)} · ${block.startTime} - ${block.endTime}`;
  }

  const dayLabel = dayOptions.find((option) => option.id === String(block.dayOfWeek))?.label ?? 'Dia recurrente';
  const startDate = formatDateLabel(block.recurrenceStartDate);
  const endDate = block.recurrenceEndDate ? ` hasta ${formatDateLabel(block.recurrenceEndDate)}` : '';

  return `${dayLabel} · ${block.startTime} - ${block.endTime} · desde ${startDate}${endDate}`;
}

export function StudentAgendaPage() {
  const {
    errorMessage,
    isLoading,
    scheduleBlocks,
    toggleScheduleBlockStatus,
    upsertScheduleBlock,
  } = useStudentModuleStore();
  const [values, setValues] = useState<StudentScheduleBlockFormValues>(initialFormValues);
  const [errors, setErrors] = useState<StudentScheduleBlockFormErrors>({});
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const activeBlocksCount = useMemo(
    () => scheduleBlocks.filter((block) => block.status === 'active').length,
    [scheduleBlocks],
  );
  const recurrentBlocksCount = useMemo(
    () => scheduleBlocks.filter((block) => block.type === 'RECURRENTE').length,
    [scheduleBlocks],
  );

  const handleFieldChange = (
    field: keyof StudentScheduleBlockFormValues,
    nextValue: string,
  ) => {
    setValues((currentValues) => {
      if (field === 'type') {
        return {
          ...currentValues,
          dayOfWeek: '',
          recurrenceEndDate: '',
          recurrenceStartDate: '',
          specificDate: '',
          type: nextValue as StudentScheduleBlockFormValues['type'],
        };
      }

      return {
        ...currentValues,
        [field]: nextValue,
      };
    });
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setSaveMessage(null);
  };

  const handleEdit = (block: StudentScheduleBlock) => {
    setEditingBlockId(block.id);
    setValues(getInitialFormValues(block));
    setErrors({});
    setSaveMessage(null);
  };

  const handleReset = () => {
    setEditingBlockId(null);
    setValues(initialFormValues);
    setErrors({});
  };

  const handleSubmit = () => {
    const nextErrors = validateScheduleBlock(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    void (async () => {
      const scheduleBlock = await upsertScheduleBlock(values, editingBlockId ?? undefined);

      if (!scheduleBlock) {
        return;
      }

      setSaveMessage(
        editingBlockId
          ? 'El bloqueo de agenda se actualizo correctamente.'
          : 'El bloqueo de agenda se agrego correctamente.',
      );
      handleReset();
    })();
  };

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-3 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={studentContent.agendaPage.meta.description}
        noIndex
        title={studentContent.agendaPage.meta.title}
      />
      <AdminPageHeader
        className="gap-3"
        description={studentContent.agendaPage.description}
        descriptionClassName="text-sm leading-6 sm:text-base"
        title={studentContent.agendaPage.title}
        titleClassName="text-[2rem] sm:text-[2.35rem]"
      />
      {saveMessage ? (
        <SurfaceCard
          className="border border-emerald-200 bg-emerald-50/90 text-sm font-medium text-emerald-800"
          paddingClassName="p-3.5"
        >
          <p role="status">
            <span className="font-semibold">
              {studentContent.agendaPage.successNoticePrefix}
            </span>{' '}
            {saveMessage}
          </p>
        </SurfaceCard>
      ) : null}
      {errorMessage ? (
        <SurfaceCard
          className="border border-rose-200 bg-rose-50/90 text-sm font-medium text-rose-800"
          paddingClassName="p-3.5"
        >
          <p role="alert">{errorMessage}</p>
        </SurfaceCard>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 2xl:gap-4">
        <SurfaceCard className="min-w-0 overflow-hidden bg-brand-gradient text-white" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/12 text-white ring-1 ring-white/18">
              <CalendarDays aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-white">
                {activeBlocksCount}
              </p>
              <p className="text-sm font-semibold text-white/90">Bloqueos activos</p>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-0">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary ring-1 ring-primary/10">
              <Repeat aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-headline text-[1.55rem] font-extrabold tracking-tight text-ink">
                {recurrentBlocksCount}
              </p>
              <p className="text-sm font-semibold text-ink-muted">Bloqueos recurrentes</p>
            </div>
          </div>
        </SurfaceCard>
      </div>
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4">
              <div className="space-y-4">
                <div>
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                    {editingBlockId ? 'Editar bloqueo' : 'Nuevo bloqueo'}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Define franjas no disponibles para evitar propuestas de cita en esos horarios.
                  </p>
                </div>
                <AdminDropdownField
                  error={errors.type}
                  icon={Repeat}
                  id="student-schedule-type"
                  label="Tipo de bloqueo"
                  name="studentScheduleType"
                  options={blockTypeOptions.map((option) => ({
                    id: option.id,
                    label: option.label,
                  }))}
                  placeholder="Selecciona un tipo"
                  value={values.type}
                  onChange={(value) => handleFieldChange('type', value as StudentScheduleBlockFormValues['type'])}
                />
                {values.type === 'ESPECIFICO' ? (
                  <AdminTextField
                    error={errors.specificDate}
                    icon={CalendarDays}
                    id="student-schedule-specific-date"
                    label="Fecha especifica"
                    name="studentScheduleSpecificDate"
                    placeholder=""
                    type="date"
                    value={values.specificDate}
                    onChange={(value) => handleFieldChange('specificDate', value)}
                  />
                ) : (
                  <>
                    <AdminDropdownField
                      error={errors.dayOfWeek}
                      icon={Repeat}
                      id="student-schedule-day-of-week"
                      label="Dia de la semana"
                      name="studentScheduleDayOfWeek"
                      options={dayOptions.map((option) => ({
                        id: option.id,
                        label: option.label,
                      }))}
                      placeholder="Selecciona un dia"
                      value={values.dayOfWeek}
                      onChange={(value) => handleFieldChange('dayOfWeek', value)}
                    />
                    <AdminTextField
                      error={errors.recurrenceStartDate}
                      icon={CalendarDays}
                      id="student-schedule-recurrence-start"
                      label="Fecha de inicio"
                      name="studentScheduleRecurrenceStart"
                      placeholder=""
                      type="date"
                      value={values.recurrenceStartDate}
                      onChange={(value) => handleFieldChange('recurrenceStartDate', value)}
                    />
                    <AdminTextField
                      error={errors.recurrenceEndDate}
                      icon={CalendarDays}
                      id="student-schedule-recurrence-end"
                      label="Fecha final opcional"
                      name="studentScheduleRecurrenceEnd"
                      placeholder=""
                      type="date"
                      value={values.recurrenceEndDate}
                      onChange={(value) => handleFieldChange('recurrenceEndDate', value)}
                    />
                  </>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminTextField
                    error={errors.startTime}
                    icon={Clock3}
                    id="student-schedule-start-time"
                    label="Hora de inicio"
                    name="studentScheduleStartTime"
                    placeholder=""
                    type="time"
                    value={values.startTime}
                    onChange={(value) => handleFieldChange('startTime', value)}
                  />
                  <AdminTextField
                    error={errors.endTime}
                    icon={Clock3}
                    id="student-schedule-end-time"
                    label="Hora de finalizacion"
                    name="studentScheduleEndTime"
                    placeholder=""
                    type="time"
                    value={values.endTime}
                    onChange={(value) => handleFieldChange('endTime', value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-ink" htmlFor="student-schedule-reason">
                    Motivo opcional
                  </label>
                  <textarea
                    className="min-h-[5.5rem] w-full rounded-[1.4rem] border border-slate-200 bg-surface px-4 py-3 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                    id="student-schedule-reason"
                    placeholder="Describe brevemente la razon del bloqueo."
                    value={values.reason}
                    onChange={(event) => handleFieldChange('reason', event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {editingBlockId ? (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition duration-300 hover:bg-slate-100"
                      type="button"
                      onClick={handleReset}
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      <span>{studentContent.agendaPage.actionLabels.cancelEdit}</span>
                    </button>
                  ) : null}
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
                    disabled={isLoading}
                    type="button"
                    onClick={handleSubmit}
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    <span>
                      {editingBlockId
                        ? studentContent.agendaPage.actionLabels.save
                        : studentContent.agendaPage.actionLabels.add}
                    </span>
                  </button>
                </div>
              </div>
            </SurfaceCard>
            <SurfaceCard className="border border-slate-200/80 bg-white shadow-none" paddingClassName="p-4">
              <div className="space-y-3.5">
                <div>
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-ink">
                    Bloqueos registrados
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Activa, inactiva o ajusta cada bloqueo segun la operacion de tu agenda.
                  </p>
                </div>
                {scheduleBlocks.length > 0 ? (
                  <div className="space-y-3">
                    {scheduleBlocks.map((block) => (
                      <div
                        key={block.id}
                        data-testid={`student-schedule-block-${block.id}`}
                        className="flex flex-col gap-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3.5 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">
                              {formatScheduleLabel(block)}
                            </p>
                            <p className="text-sm text-ink-muted">
                              {block.reason ?? 'Sin motivo especificado.'}
                            </p>
                          </div>
                          <AdminStatusBadge entity="teacher" status={block.status} />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-slate-200 transition duration-200 hover:bg-slate-100"
                            type="button"
                            onClick={() => handleEdit(block)}
                          >
                            <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            className={classNames(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                              block.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-primary/10 text-primary hover:bg-primary/15',
                            )}
                            type="button"
                            onClick={() => {
                              void toggleScheduleBlockStatus(block.id);
                            }}
                          >
                            {block.status === 'active' ? (
                              <PowerOff aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <Power aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {block.status === 'active' ? 'Inactivar' : 'Activar'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
                    {studentContent.agendaPage.emptyState}
                  </div>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  );
}
