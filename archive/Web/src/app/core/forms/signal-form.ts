import { FormGroup, AbstractControl } from '@angular/forms';
import { signal, computed, Signal } from '@angular/core';

/**
 * A thin wrapper around Angular's FormGroup that exposes form state as signals.
 * Mirrors Spartan's philosophy: composable, minimal abstraction over platform primitives.
 *
 * @example
 * ```ts
 * const form = signalForm(new FormGroup({
 *   name: new FormControl('', [Validators.required]),
 * }));
 *
 * // Template:
 * // <form [formGroup]="form.raw">
 * //   <input formControlName="name" />
 * //   @if (form.errors()['name']) { <span>{{ form.errors()['name'][0] }}</span> }
 * // </form>
 * ```
 */
export interface SignalForm<TValue extends Record<string, unknown>> {
  readonly raw: FormGroup;
  readonly value: Signal<TValue>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly dirty: Signal<boolean>;
  readonly errors: Signal<Record<string, string[]>>;
  control: <K extends keyof TValue & string>(name: K) => AbstractControl;
  reset: (value?: Partial<TValue>) => void;
  markAllTouched: () => void;
}

export function signalForm<TValue extends Record<string, unknown>>(
  group: FormGroup,
): SignalForm<TValue> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const initial = group.getRawValue() as TValue;

  const valueSignal = signal<TValue>(initial);
  const validSignal = signal(group.valid);
  const invalidSignal = signal(group.invalid);
  const touchedSignal = signal(group.touched);
  const dirtySignal = signal(group.dirty);
  const errorsSignal = signal<Record<string, string[]>>(buildErrors(group));

  group.valueChanges.subscribe(() => {
    valueSignal.set(group.getRawValue() as TValue);
    validSignal.set(group.valid);
    invalidSignal.set(group.invalid);
    errorsSignal.set(buildErrors(group));
  });

  group.statusChanges.subscribe(() => {
    touchedSignal.set(group.touched);
    dirtySignal.set(group.dirty);
  });

  return {
    raw: group,
    value: valueSignal.asReadonly(),
    valid: validSignal.asReadonly(),
    invalid: invalidSignal.asReadonly(),
    touched: touchedSignal.asReadonly(),
    dirty: dirtySignal.asReadonly(),
    errors: errorsSignal.asReadonly(),
    control: <K extends keyof TValue & string>(name: K): AbstractControl =>
      group.get(name) as AbstractControl,
    reset: (value?: Partial<TValue>) => {
      group.reset(value as Record<string, unknown>);
      valueSignal.set(group.getRawValue() as TValue);
      validSignal.set(group.valid);
      invalidSignal.set(group.invalid);
      touchedSignal.set(group.touched);
      dirtySignal.set(group.dirty);
      errorsSignal.set(buildErrors(group));
    },
    markAllTouched: () => {
      group.markAllAsTouched();
    },
  };
}

function collectErrors(control: AbstractControl): string[] {
  if (!control.errors) return [];
  return Object.entries(control.errors).map(([key, value]) => {
    switch (key) {
      case 'required':
        return 'This field is required';
      case 'email':
        return 'Please enter a valid email';
      case 'minlength':
        return `Minimum length is ${(value as { requiredLength: number }).requiredLength}`;
      case 'maxlength':
        return `Maximum length is ${(value as { requiredLength: number }).requiredLength}`;
      case 'min':
        return `Minimum value is ${(value as { min: number }).min}`;
      case 'max':
        return `Maximum value is ${(value as { max: number }).max}`;
      case 'pattern':
        return 'Invalid format';
      default:
        return (value as { message?: string })?.message ?? key;
    }
  });
}

function buildErrors(group: FormGroup): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [name, control] of Object.entries(group.controls)) {
    const msgs = collectErrors(control);
    if (msgs.length > 0) {
      result[name] = msgs;
    }
  }
  return result;
}
