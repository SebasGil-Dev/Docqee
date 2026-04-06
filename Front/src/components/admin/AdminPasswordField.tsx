import { Eye, EyeOff, KeyRound } from 'lucide-react';
import type { Ref } from 'react';

import { classNames } from '@/lib/classNames';

type AdminPasswordFieldProps = {
  containerClassName?: string;
  disabled?: boolean;
  error?: string | undefined;
  helpText?: string | undefined;
  hidePasswordLabel: string;
  id: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement> | undefined;
  label: string;
  name: string;
  onBlur?: (() => void) | undefined;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  placeholder: string;
  showPassword: boolean;
  showPasswordLabel: string;
  value: string;
};

export function AdminPasswordField({
  containerClassName,
  disabled = false,
  error,
  helpText,
  hidePasswordLabel,
  id,
  inputClassName,
  inputRef,
  label,
  name,
  onBlur,
  onChange,
  onToggleVisibility,
  placeholder,
  showPassword,
  showPasswordLabel,
  value,
}: AdminPasswordFieldProps) {
  const toggleLabel = showPassword ? hidePasswordLabel : showPasswordLabel;

  return (
    <div className={classNames('space-y-1.5', containerClassName)}>
      <label className="block text-sm font-semibold text-ink" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <KeyRound
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost"
        />
        <input
          ref={inputRef}
          aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
          aria-invalid={Boolean(error)}
          className={classNames(
            'w-full rounded-2xl border bg-surface py-3 pl-11 pr-12 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
            inputClassName,
            disabled ? 'cursor-not-allowed text-ghost' : '',
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
              : 'border-slate-200 focus-visible:border-primary',
          )}
          disabled={disabled}
          id={id}
          name={name}
          placeholder={placeholder}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          aria-label={toggleLabel}
          aria-pressed={showPassword}
          className="absolute inset-y-0 right-3 flex items-center text-ghost transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:text-primary"
          disabled={disabled}
          type="button"
          onClick={onToggleVisibility}
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" className="h-4.5 w-4.5" />
          ) : (
            <Eye aria-hidden="true" className="h-4.5 w-4.5" />
          )}
        </button>
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
