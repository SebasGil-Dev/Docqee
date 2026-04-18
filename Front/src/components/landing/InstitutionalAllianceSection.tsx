import { CheckCircle2, Mail, Phone, Send } from 'lucide-react';
import { useState } from 'react';

import type {
  InstitutionalAllianceContent,
  InstitutionalAllianceInterestValue,
} from '@/content/types';
import { ApiError } from '@/lib/apiClient';
import { classNames } from '@/lib/classNames';
import { submitInstitutionalAllianceRequest } from '@/lib/institutionalAllianceApi';

import { SectionHeading } from '../ui/SectionHeading';
import { SurfaceCard } from '../ui/SurfaceCard';

type InstitutionalAllianceSectionProps = {
  content: InstitutionalAllianceContent;
};

type InstitutionalAllianceFormValues = {
  additionalMessage: string;
  authorizeDataProcessing: boolean;
  city: string;
  contactName: string;
  contactRole: string;
  institutionalEmail: string;
  interestType: InstitutionalAllianceInterestValue | '';
  phone: string;
  universityName: string;
};

type InstitutionalAllianceFormField =
  | 'additionalMessage'
  | 'authorizeDataProcessing'
  | 'city'
  | 'contactName'
  | 'contactRole'
  | 'institutionalEmail'
  | 'interestType'
  | 'phone'
  | 'universityName';

type InstitutionalAllianceFormErrors = Partial<
  Record<InstitutionalAllianceFormField | 'general', string>
>;

const initialFormValues: InstitutionalAllianceFormValues = {
  additionalMessage: '',
  authorizeDataProcessing: false,
  city: '',
  contactName: '',
  contactRole: '',
  institutionalEmail: '',
  interestType: '',
  phone: '',
  universityName: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fieldClassName =
  'h-12 w-full rounded-2xl border border-slate-200/85 bg-white px-4 text-sm text-ink shadow-[0_18px_40px_-28px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const textareaClassName =
  'min-h-[8.25rem] w-full rounded-[1.45rem] border border-slate-200/85 bg-white px-4 py-3 text-sm text-ink shadow-[0_18px_40px_-28px_rgba(15,23,42,0.38)] transition duration-300 placeholder:text-ghost/80 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const labelClassName = 'text-sm font-semibold text-ink';
const errorClassName = 'text-xs font-medium text-rose-700';

function validateForm(values: InstitutionalAllianceFormValues) {
  const errors: InstitutionalAllianceFormErrors = {};

  if (!values.universityName.trim()) {
    errors.universityName = 'Ingresa el nombre de la universidad.';
  }

  if (!values.city.trim()) {
    errors.city = 'Ingresa la ciudad.';
  }

  if (!values.contactName.trim()) {
    errors.contactName = 'Ingresa el nombre del contacto.';
  }

  if (!values.contactRole.trim()) {
    errors.contactRole = 'Ingresa el cargo del contacto.';
  }

  if (!values.institutionalEmail.trim()) {
    errors.institutionalEmail = 'Ingresa el correo institucional.';
  } else if (!emailPattern.test(values.institutionalEmail.trim())) {
    errors.institutionalEmail = 'Ingresa un correo institucional válido.';
  }

  if (!values.phone.trim()) {
    errors.phone = 'Ingresa el teléfono.';
  }

  if (!values.interestType) {
    errors.interestType = 'Selecciona el tipo de interés.';
  }

  if (!values.authorizeDataProcessing) {
    errors.authorizeDataProcessing =
      'Debes autorizar el tratamiento de datos personales.';
  }

  return errors;
}

export function InstitutionalAllianceSection({
  content,
}: InstitutionalAllianceSectionProps) {
  const [values, setValues] = useState<InstitutionalAllianceFormValues>(initialFormValues);
  const [errors, setErrors] = useState<InstitutionalAllianceFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'error' | 'success' | null>(null);

  function updateField<K extends keyof InstitutionalAllianceFormValues>(
    field: K,
    nextValue: InstitutionalAllianceFormValues[K],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      delete nextErrors.general;
      return nextErrors;
    });

    if (statusTone) {
      setStatusTone(null);
      setStatusMessage(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatusTone('error');
      setStatusMessage('Revisa los campos obligatorios antes de enviar la solicitud.');
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setStatusTone(null);
    setStatusMessage(null);

    try {
      const trimmedAdditionalMessage = values.additionalMessage.trim();
      const response = await submitInstitutionalAllianceRequest({
        authorizeDataProcessing: values.authorizeDataProcessing,
        city: values.city.trim(),
        contactName: values.contactName.trim(),
        contactRole: values.contactRole.trim(),
        institutionalEmail: values.institutionalEmail.trim(),
        interestType: values.interestType as InstitutionalAllianceInterestValue,
        phone: values.phone.trim(),
        universityName: values.universityName.trim(),
        ...(trimmedAdditionalMessage
          ? { additionalMessage: trimmedAdditionalMessage }
          : {}),
      });

      setValues(initialFormValues);
      setStatusTone('success');
      setStatusMessage(response.message);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'No pudimos enviar la solicitud en este momento.';

      setErrors({ general: message });
      setStatusTone('error');
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="scroll-mt-28 bg-surface-low/70 py-20 sm:scroll-mt-32 sm:py-24 lg:flex lg:min-h-[calc(100svh-5.25rem)] lg:items-center lg:scroll-mt-20 lg:py-[clamp(1.4rem,2.6svh,2.35rem)] xl:min-h-[calc(100svh-5.75rem)] xl:py-[clamp(1.65rem,2.9svh,2.7rem)]"
      id="vinculacion"
    >
      <div className="landing-shell mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-[clamp(1.35rem,2.4vw,2.35rem)]">
          <div className="space-y-5 lg:space-y-6">
            <SectionHeading
              align="center"
              title={content.title}
              titleClassName="text-[clamp(1.8rem,7vw,2.6rem)] leading-[1.05] sm:text-[clamp(2.1rem,5vw,2.9rem)] lg:text-[clamp(2.15rem,2.6vw,3rem)]"
            />

            <div className="space-y-3">
              <p className="text-sm font-semibold leading-7 text-ink sm:text-base">
                {content.leadQuestion}
              </p>
              <p className="text-sm leading-7 text-ink-muted sm:text-base">
                {content.description}
              </p>
            </div>

            <div className="grid gap-3">
              {content.benefits.map((benefit) => (
                <SurfaceCard
                  key={benefit}
                  className="bg-white/85 px-5 py-4 shadow-none ring-1 ring-slate-200/75"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </span>
                    <p className="text-sm leading-6 text-ink-muted">{benefit}</p>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </div>

          <SurfaceCard className="bg-surface-card px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="font-headline text-[1.45rem] font-extrabold tracking-tight text-ink">
                  {content.formTitle}
                </h3>
                <p className="text-sm leading-6 text-ink-muted">{content.formDescription}</p>
              </div>

              {statusMessage ? (
                <div
                  className={classNames(
                    'rounded-[1.3rem] border px-4 py-3 text-sm font-medium',
                    statusTone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700',
                  )}
                  role={statusTone === 'error' ? 'alert' : 'status'}
                >
                  {statusMessage}
                </div>
              ) : null}

              <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className={labelClassName} htmlFor="alliance-university-name">
                      Nombre de la universidad
                    </label>
                    <input
                      id="alliance-university-name"
                      className={fieldClassName}
                      placeholder="Ej. Universidad de Colombia"
                      type="text"
                      value={values.universityName}
                      onChange={(event) => updateField('universityName', event.target.value)}
                    />
                    {errors.universityName ? (
                      <p className={errorClassName}>{errors.universityName}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className={labelClassName} htmlFor="alliance-city">
                      Ciudad
                    </label>
                    <input
                      id="alliance-city"
                      className={fieldClassName}
                      placeholder="Ej. Bogotá D. C."
                      type="text"
                      value={values.city}
                      onChange={(event) => updateField('city', event.target.value)}
                    />
                    {errors.city ? <p className={errorClassName}>{errors.city}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <label className={labelClassName} htmlFor="alliance-contact-name">
                      Nombre del contacto
                    </label>
                    <input
                      id="alliance-contact-name"
                      className={fieldClassName}
                      placeholder="Ej. María Gómez"
                      type="text"
                      value={values.contactName}
                      onChange={(event) => updateField('contactName', event.target.value)}
                    />
                    {errors.contactName ? (
                      <p className={errorClassName}>{errors.contactName}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className={labelClassName} htmlFor="alliance-contact-role">
                      Cargo del contacto
                    </label>
                    <input
                      id="alliance-contact-role"
                      className={fieldClassName}
                      placeholder="Ej. Coordinación académica"
                      type="text"
                      value={values.contactRole}
                      onChange={(event) => updateField('contactRole', event.target.value)}
                    />
                    {errors.contactRole ? (
                      <p className={errorClassName}>{errors.contactRole}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className={labelClassName} htmlFor="alliance-institutional-email">
                      Correo institucional
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" />
                      <input
                        id="alliance-institutional-email"
                        className={classNames(fieldClassName, 'pl-11')}
                        placeholder="nombre@universidad.edu.co"
                        type="email"
                        value={values.institutionalEmail}
                        onChange={(event) =>
                          updateField('institutionalEmail', event.target.value)
                        }
                      />
                    </div>
                    {errors.institutionalEmail ? (
                      <p className={errorClassName}>{errors.institutionalEmail}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className={labelClassName} htmlFor="alliance-phone">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost" />
                      <input
                        id="alliance-phone"
                        className={classNames(fieldClassName, 'pl-11')}
                        placeholder="Ej. 300 123 4567"
                        type="tel"
                        value={values.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                      />
                    </div>
                    {errors.phone ? <p className={errorClassName}>{errors.phone}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClassName} htmlFor="alliance-interest-type">
                    Tipo de interés
                  </label>
                  <select
                    id="alliance-interest-type"
                    className={fieldClassName}
                    value={values.interestType}
                    onChange={(event) =>
                      updateField(
                        'interestType',
                        event.target.value as InstitutionalAllianceInterestValue | '',
                      )
                    }
                  >
                    <option value="">Selecciona una opción</option>
                    {content.interestOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.interestType ? (
                    <p className={errorClassName}>{errors.interestType}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className={labelClassName} htmlFor="alliance-additional-message">
                    Mensaje adicional <span className="text-ghost">(opcional)</span>
                  </label>
                  <textarea
                    id="alliance-additional-message"
                    className={textareaClassName}
                    placeholder="Comparte contexto adicional sobre la solicitud institucional."
                    value={values.additionalMessage}
                    onChange={(event) => updateField('additionalMessage', event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="flex items-start gap-3 rounded-[1.3rem] border border-slate-200/80 bg-surface-low/65 px-4 py-3 text-sm leading-6 text-ink-muted"
                    htmlFor="alliance-authorize-data-processing"
                  >
                    <input
                      id="alliance-authorize-data-processing"
                      checked={values.authorizeDataProcessing}
                      className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
                      type="checkbox"
                      onChange={(event) =>
                        updateField('authorizeDataProcessing', event.target.checked)
                      }
                    />
                    <span>
                      Autorizo el tratamiento de mis datos personales para ser contactado
                      por el equipo de Docqee.
                    </span>
                  </label>
                  {errors.authorizeDataProcessing ? (
                    <p className={errorClassName}>{errors.authorizeDataProcessing}</p>
                  ) : null}
                </div>

                <button
                  className="inline-flex min-h-[3.35rem] items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-ambient transition duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting ? 'Enviando solicitud...' : content.submitLabel}
                  </span>
                </button>
              </form>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}
