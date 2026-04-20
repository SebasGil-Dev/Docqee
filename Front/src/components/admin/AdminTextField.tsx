import type { LucideIcon } from 'lucide-react';
import type {
  HTMLInputAutoCompleteAttribute,
  HTMLInputTypeAttribute,
  KeyboardEvent as ReactKeyboardEvent,
  Ref,
} from 'react';

import { classNames } from '@/lib/classNames';

type AdminTextFieldProps = {
  autoCapitalize?: string | undefined;
  autoComplete?: HTMLInputAutoCompleteAttribute | undefined;
  autoCorrect?: string | undefined;
  containerClassName?: string;
  disabled?: boolean;
  error?: string | undefined;
  helpText?: string | undefined;
  icon: LucideIcon;
  id: string;
  inputClassName?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  inputRef?: Ref<HTMLInputElement> | undefined;
  label: string;
  labelClassName?: string;
  min?: string | undefined;
  name: string;
  onBlur?: (() => void) | undefined;
  onChange: (value: string) => void;
  onKeyDown?: ((event: ReactKeyboardEvent<HTMLInputElement>) => void) | undefined;
  placeholder: string;
  type?: HTMLInputTypeAttribute;
  value: string;
};

export function AdminTextField({
  autoCapitalize,
  autoComplete,
  autoCorrect,
  containerClassName,
  disabled = false,
  error,
  helpText,
  icon: Icon,
  id,
  inputClassName,
  inputMode,
  inputRef,
  label,
  labelClassName,
  min,
  name,
  onBlur,
  onChange,
  onKeyDown,
  placeholder,
  type = 'text',
  value,
}: AdminTextFieldProps) {
  return (
    <div className={classNames('admin-text-field space-y-1.5', containerClassName)}>
      <label
        className={classNames('admin-text-field__label block text-sm font-semibold text-ink', labelClassName)}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost"
        />
        <input
          ref={inputRef}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
          aria-invalid={Boolean(error)}
          className={classNames(
            'admin-text-field__input w-full rounded-2xl border bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ghost/80 transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
            inputClassName,
            disabled ? 'cursor-not-allowed text-ghost' : '',
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
              : 'border-slate-200 focus-visible:border-primary',
          )}
          disabled={disabled}
          id={id}
          inputMode={inputMode}
          min={min}
          name={name}
          placeholder={placeholder}
          type={type}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
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
