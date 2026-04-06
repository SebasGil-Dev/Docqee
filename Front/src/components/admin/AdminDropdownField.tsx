import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { type Ref, useEffect, useMemo, useRef, useState } from 'react';

import { classNames } from '@/lib/classNames';

type SelectOption = {
  id: string;
  label: string;
};

type AdminDropdownFieldProps = {
  containerClassName?: string;
  disabled?: boolean;
  error?: string | undefined;
  helpText?: string | undefined;
  icon: LucideIcon;
  id: string;
  label: string;
  labelClassName?: string;
  name: string;
  onBlur?: (() => void) | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  triggerClassName?: string;
  triggerRef?: Ref<HTMLButtonElement> | undefined;
  value: string;
};

export function AdminDropdownField({
  containerClassName,
  disabled = false,
  error,
  helpText,
  icon: Icon,
  id,
  label,
  labelClassName,
  name,
  onBlur,
  onChange,
  options,
  placeholder,
  triggerClassName,
  triggerRef,
  value,
}: AdminDropdownFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={classNames('space-y-1.5', containerClassName)}>
      <label className={classNames('block text-sm font-semibold text-ink', labelClassName)} htmlFor={id}>
        {label}
      </label>
      <div
        className="relative"
        ref={rootRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsOpen(false);
            onBlur?.();
          }
        }}
      >
        <input name={name} type="hidden" value={value} />
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-[1] h-4.5 w-4.5 -translate-y-1/2 text-ghost"
        />
        <button
          aria-controls={`${id}-menu`}
          aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={Boolean(error)}
          className={classNames(
            'w-full rounded-[1.45rem] border bg-white/98 py-3 pl-11 pr-11 text-left text-sm text-ink shadow-[0_10px_28px_-18px_rgba(15,23,42,0.38)] transition duration-300 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
            triggerClassName,
            disabled ? 'cursor-not-allowed text-ghost' : '',
            error
              ? 'border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200/70'
              : 'border-slate-200/90 focus-visible:border-primary',
          )}
          disabled={disabled}
          id={id}
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen((current) => !current);
            }
          }}
        >
          <span className={classNames(!selectedOption && 'text-ghost')}>
            {selectedOption?.label ?? placeholder}
          </span>
        </button>
        <ChevronDown
          aria-hidden="true"
          className={classNames(
            'pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost transition duration-200',
            isOpen && 'rotate-180 text-primary',
          )}
        />
        {isOpen ? (
          <div
            className="absolute bottom-[calc(100%+0.35rem)] left-1/2 z-20 w-[min(14rem,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white/95 p-1 shadow-[0_-20px_46px_-28px_rgba(15,23,42,0.32),0_20px_46px_-32px_rgba(15,23,42,0.22)] backdrop-blur sm:w-[min(15rem,calc(100%-2.5rem))]"
            id={`${id}-menu`}
            role="listbox"
          >
            <div className="px-2 pb-1 pt-0.5">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-primary/70">
                Selecciona una opcion
              </p>
            </div>
            <div className="admin-scrollbar max-h-[9rem] space-y-0.5 overflow-y-auto pr-0.5">
              {options.map((option) => {
                const isSelected = option.id === value;

                return (
                  <button
                    key={option.id}
                    aria-selected={isSelected}
                    className={classNames(
                      'flex w-full items-center justify-between rounded-[0.8rem] px-2.5 py-1.5 text-left text-[0.76rem] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10',
                      isSelected
                        ? 'bg-primary text-white shadow-[0_14px_30px_-20px_rgba(22,78,99,0.9)]'
                        : 'bg-slate-50/70 text-ink hover:bg-slate-100',
                    )}
                    role="option"
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                      onBlur?.();
                    }}
                  >
                    <span>{option.label}</span>
                    <span
                      className={classNames(
                        'inline-flex h-4.5 w-4.5 items-center justify-center rounded-full',
                        isSelected ? 'bg-white/18 text-white' : 'bg-white text-slate-300',
                      )}
                    >
                      <Check aria-hidden="true" className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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
