import {
  CalendarDays,
  Clock3,
  PencilLine,
  Plus,
  Power,
  PowerOff,
  Repeat,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { AdminConfirmationDialog } from '@/components/admin/AdminConfirmationDialog';
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
import { StudentAgendaCalendar } from './StudentAgendaCalendar';

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

function StudentAgendaDialogFrame({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Cerrar ventana"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />
      <div
        aria-describedby={description ? 'student-agenda-dialog-description' : undefined}
        aria-labelledby="student-agenda-dialog-title"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-white shadow-[0_34px_90px_-36px_rgba(15,23,42,0.55)]"
        role="dialog"
      >
        <div className="absolute right-4 top-4">
          <button
            aria-label="Cerrar ventana"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
          <div className="space-y-1.5">
            <h2
              className="font-headline text-[1.35rem] font-extrabold tracking-tight text-ink"
              id="student-agenda-dialog-title"
            >
              {title}
            </h2>
            {description ? (
              <p
                className="pr-10 text-[0.86rem] leading-6 text-ink-muted"
                id="student-agenda-dialog-description"
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function StudentAgendaPage() {
  const {
    appointments,
    deleteScheduleBlock,
    isLoading,
    scheduleBlocks,
    toggleScheduleBlockStatus,
    upsertScheduleBlock,
  } = useStudentModuleStore();
  const [values, setValues] = useState<StudentScheduleBlockFormValues>(initialFormValues);
  const [errors, setErrors] = useState<StudentScheduleBlockFormErrors>({});
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock =
    scheduleBlocks.find((block) => block.id === selectedBlockId) ?? null;

  useEffect(() => {
    if (selectedBlockId && !selectedBlock) {
      setSelectedBlockId(null);
      setIsDeleteDialogOpen(false);
    }
  }, [selectedBlock, selectedBlockId]);

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

  const handleOpenCreateDialog = () => {
    setEditingBlockId(null);
    setValues(initialFormValues);
    setErrors({});
    setSaveMessage(null);
    setIsBlockDialogOpen(true);
  };

  const handleEdit = (block: StudentScheduleBlock) => {
    setEditingBlockId(block.id);
    setValues(getInitialFormValues(block));
    setErrors({});
    setSaveMessage(null);
    setSelectedBlockId(null);
    setIsDeleteDialogOpen(false);
    setIsBlockDialogOpen(true);
  };

  const handleReset = () => {
    setEditingBlockId(null);
    setValues(initialFormValues);
    setErrors({});
  };

  const handleCloseBlockDialog = () => {
    handleReset();
    setIsBlockDialogOpen(false);
  };

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setIsDeleteDialogOpen(false);
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
      handleCloseBlockDialog();
    })();
  };

  const handleToggleSelectedBlock = () => {
    if (!selectedBlock) {
      return;
    }

    void (async () => {
      const nextStatus = await toggleScheduleBlockStatus(selectedBlock.id);

      if (!nextStatus) {
        return;
      }

      setSaveMessage(
        nextStatus === 'active'
          ? 'El bloqueo de agenda se activo correctamente.'
          : 'El bloqueo de agenda se inactivo correctamente.',
      );
      setSelectedBlockId(null);
    })();
  };

  const handleDeleteSelectedBlock = () => {
    if (!selectedBlock) {
      return;
    }

    void (async () => {
      const wasDeleted = await deleteScheduleBlock(selectedBlock.id);

      if (!wasDeleted) {
        return;
      }

      setSaveMessage('El bloqueo de agenda se elimino correctamente.');
      setSelectedBlockId(null);
      setIsDeleteDialogOpen(false);
      if (editingBlockId === selectedBlock.id) {
        handleReset();
        setIsBlockDialogOpen(false);
      }
    })();
  };

  return (
    <div className="mx-auto flex h-full max-w-[88rem] min-h-0 flex-col gap-2 overflow-hidden 2xl:max-w-[96rem]">
      <Seo
        description={studentContent.agendaPage.meta.description}
        noIndex
        title={studentContent.agendaPage.meta.title}
      />
      <AdminPageHeader
        action={
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-3.5 py-2.5 text-[0.84rem] font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
            type="button"
            onClick={handleOpenCreateDialog}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            <span>{studentContent.agendaPage.actionLabels.add}</span>
          </button>
        }
        className="gap-2"
        description={studentContent.agendaPage.description}
        descriptionClassName="text-sm leading-5 sm:text-[0.95rem]"
        headingAlign="center"
        title={studentContent.agendaPage.title}
        titleClassName="text-[1.8rem] sm:text-[2.1rem]"
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
      <AdminPanelCard className="flex-1" panelClassName="bg-[#f4f8ff]">
        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2.5 sm:px-3.5 sm:py-3">
          <StudentAgendaCalendar
            appointments={appointments}
            scheduleBlocks={scheduleBlocks}
            onSelectScheduleBlock={handleSelectBlock}
          />
        </div>
      </AdminPanelCard>
      {isBlockDialogOpen ? (
        <StudentAgendaDialogFrame
          description="Define franjas no disponibles para evitar propuestas de cita en esos horarios."
          onClose={handleCloseBlockDialog}
          title={editingBlockId ? 'Editar bloqueo' : 'Agregar bloqueo'}
        >
          <div className="space-y-3">
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
              onChange={(value) =>
                handleFieldChange('type', value as StudentScheduleBlockFormValues['type'])
              }
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
                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
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
              <label className="block text-[0.84rem] font-semibold text-ink" htmlFor="student-schedule-reason">
                Motivo opcional
              </label>
              <textarea
                className="min-h-[4.4rem] w-full rounded-[1.1rem] border border-slate-200 bg-surface px-3 py-2.25 text-[0.84rem] text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                id="student-schedule-reason"
                placeholder="Describe brevemente la razon del bloqueo."
                value={values.reason}
                onChange={(event) => handleFieldChange('reason', event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-ink-muted transition duration-200 hover:bg-slate-200"
                type="button"
                onClick={handleCloseBlockDialog}
              >
                {editingBlockId ? studentContent.agendaPage.actionLabels.cancelEdit : 'Cancelar'}
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110"
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
        </StudentAgendaDialogFrame>
      ) : null}
      {selectedBlock ? (
        <StudentAgendaDialogFrame
          description="Gestiona el estado del bloqueo o elimina la franja si ya no la necesitas."
          onClose={() => setSelectedBlockId(null)}
          title="Gestionar bloqueo"
        >
          <div className="space-y-4">
            <SurfaceCard
              className="border border-slate-200/80 bg-slate-50 shadow-none"
              paddingClassName="p-3.5"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-[0.9rem] font-semibold text-ink">
                    {formatScheduleLabel(selectedBlock)}
                  </p>
                  <AdminStatusBadge entity="teacher" status={selectedBlock.status} />
                </div>
                <p className="text-[0.82rem] text-ink-muted">
                  {selectedBlock.reason ?? 'Sin motivo especificado.'}
                </p>
              </div>
            </SurfaceCard>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 bg-white px-3.5 py-3 text-[0.82rem] font-semibold text-primary transition duration-200 hover:bg-slate-50"
                type="button"
                onClick={() => handleEdit(selectedBlock)}
              >
                <PencilLine aria-hidden="true" className="h-4 w-4" />
                <span>Editar</span>
              </button>
              <button
                className={classNames(
                  'inline-flex items-center justify-center gap-2 rounded-[1.2rem] px-3.5 py-3 text-[0.82rem] font-semibold transition duration-200',
                  selectedBlock.status === 'active'
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'bg-primary/10 text-primary hover:bg-primary/15',
                )}
                type="button"
                onClick={handleToggleSelectedBlock}
              >
                {selectedBlock.status === 'active' ? (
                  <PowerOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Power aria-hidden="true" className="h-4 w-4" />
                )}
                <span>{selectedBlock.status === 'active' ? 'Inactivar' : 'Activar'}</span>
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-rose-50 px-3.5 py-3 text-[0.82rem] font-semibold text-rose-700 transition duration-200 hover:bg-rose-100"
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </StudentAgendaDialogFrame>
      ) : null}
      <AdminConfirmationDialog
        confirmLabel="Si, eliminar bloqueo"
        description="Este bloqueo dejara de aparecer en la agenda y ya no reservara esa franja horaria."
        isOpen={isDeleteDialogOpen && !!selectedBlock}
        isSubmitting={isLoading}
        title="Eliminar bloqueo"
        tone="danger"
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSelectedBlock}
      />
    </div>
  );
}
