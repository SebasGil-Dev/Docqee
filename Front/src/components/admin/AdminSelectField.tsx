import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, Ref } from 'react';

import { classNames } from '@/lib/classNames';

type SelectOption = {
  id: string;
  label: string;
};

type AdminSelectFieldProps = {
  containerClassName?: string;
  disabled?: boolean;
  error?: string | undefined;
  helpText?: string | undefined;
  icon: LucideIcon;
  id: string;
  label: ReactNode;
  labelClassName?: string;
  labelSrText?: string;
  name: string;
  onBlur?: (() => void) | undefined;
  onChange: (value: string) => void;
  onKeyDown?: ((event: ReactKeyboardEvent<HTMLSelectElement>) => void) | undefined;
  options: SelectOption[];
  placeholder: string;
  selectClassName?: string;
  selectRef?: Ref<HTMLSelectElement> | undefined;
  value: string;
};

export function AdminSelectField({
  containerClassName,
  disabled = false,
  error,
  helpText,
  icon: Icon,
  id,
  label,
  labelClassName,
  labelSrText,
  name,
  onBlur,
  onChange,
  onKeyDown,
  options,
  placeholder,
  selectClassName,
  selectRef,
  value,
}: AdminSelectFieldProps) {
  return (
    <div className={classNames('space-y-1.5', containerClassName)}>
      <label
        className={classNames(
          'block text-sm font-semibold text-ink',
          labelClassName,
        )}
        htmlFor={id}
      >
        {label}
        {labelSrText ? <span className="sr-only">{labelSrText}</span> : null}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost"
        />
        <select
          aria-describedby={
            error ? `${id}-error` : helpText ? `${id}-help` : undefined
          }
          aria-invalid={Boolean(error)}
          className={classNames(
            'w-full rounded-2xl border bg-surface py-3 pl-11 pr-4 text-sm text-ink transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
            selectClassName,
            disabled ? 'cursor-not-allowed text-ghost' : '',
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
              : 'border-slate-200 focus-visible:border-primary',
          )}
          disabled={disabled}
          id={id}
          name={name}
          ref={selectRef}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        >
          <option disabled value="">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`}>
          {error}
        </p>
      ) : helpText ? (
        <p className="text-sm text-ink-muted" id={`${id}-help`}>
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
