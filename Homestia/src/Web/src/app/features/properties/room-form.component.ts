import { Component, inject, input, output, model, effect, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmInputDirective } from '@spartan-ng/helm/input';
import { HlmButtonDirective } from '@spartan-ng/helm/button';
import { HlmSelectDirective } from '../../shared/ui/select/src';
import { signalForm } from '../../core/forms';
import { EnumService } from '../../core/state';
import {
  EMPTY_ROOM_FORM,
  FURNISHING_STATUS_OPTIONS,
  ROOM_STATUS_OPTIONS,
  type RoomFormValue,
} from './property-form.model';

const labelClasses = 'block text-sm font-medium text-surface-700 dark:text-surface-300';

@Component({
  selector: 'app-room-form',
  imports: [ReactiveFormsModule, TranslatePipe, HlmInputDirective, HlmButtonDirective, HlmSelectDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="space-y-4 rounded-lg border border-surface-200 p-4 dark:border-surface-700">
      <!-- Room heading -->
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-50">
          {{ heading() }}
        </h3>
        @if (removable()) {
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            class="h-8 text-destructive-500 hover:text-destructive-700"
            (click)="remove.emit()"
          >
            ✕
          </button>
        }
      </div>

      <form [formGroup]="form.raw" class="space-y-3">
        <!-- Room Name -->
        <div class="space-y-1.5">
          <label [for]="nameId()" [class]="labelClasses">{{ 'PROPERTIES.ROOM.NAME' | translate }}</label>
          <input
            [id]="nameId()"
            formControlName="name"
            hlmInput
            [placeholder]="'PROPERTIES.ROOM.NAME_PLACEHOLDER' | translate"
          />
        </div>

        <!-- Furnishing Status -->
        <div class="space-y-1.5">
          <label [for]="furnishingId()" [class]="labelClasses">{{ 'PROPERTIES.ROOM.FURNISHING_STATUS' | translate }}</label>
          <div class="relative">
            <select
              [id]="furnishingId()"
              formControlName="furnishingStatus"
              hlmSelect
            >
              <option value="" disabled>{{ 'PROPERTIES.ROOM.FURNISHING_PLACEHOLDER' | translate }}</option>
              @for (opt of furnishingOptions(); track opt.value) {
                <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
              }
            </select>
            <svg
              class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <!-- Room Status -->
        <div class="space-y-1.5">
          <label [for]="statusId()" [class]="labelClasses">{{ 'PROPERTIES.ROOM.ROOM_STATUS' | translate }}</label>
          <div class="relative">
            <select
              [id]="statusId()"
              formControlName="roomStatus"
              hlmSelect
            >
              <option value="" disabled>{{ 'PROPERTIES.ROOM.ROOM_STATUS_PLACEHOLDER' | translate }}</option>
              @for (opt of statusOptions(); track opt.value) {
                <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
              }
            </select>
            <svg
              class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class RoomFormComponent {
  readonly enumService = inject(EnumService);

  /** 0-based index for generating unique IDs. */
  readonly index = input(0);
  /** Label shown as the card heading, e.g. "Room 1 / 3". */
  readonly heading = input('Room');
  /** Whether a remove button is shown (hidden during step-by-step wizard). */
  readonly removable = input(false);
  /** Emitted when the user clicks the remove button. */
  readonly remove = output<void>();

  /** Two-way bindable room value — updated live as the user types. */
  readonly value = model<RoomFormValue>({ ...EMPTY_ROOM_FORM });

  /** Furnishing status options — loaded from backend, falls back to hardcoded. */
  protected readonly furnishingOptions = computed(() => {
    const fromBackend = this.enumService.furnishingStatuses();
    if (fromBackend.length === 0) return FURNISHING_STATUS_OPTIONS;
    return fromBackend.map(e => ({
      value: e.key,
      labelKey: FURNISHING_STATUS_OPTIONS.find(o => o.value === e.key)?.labelKey ?? `Unknown value (${e.key})`,
    }));
  });

  /** Room status options — loaded from backend, falls back to hardcoded. */
  protected readonly statusOptions = computed(() => {
    const fromBackend = this.enumService.roomStatuses();
    if (fromBackend.length === 0) return ROOM_STATUS_OPTIONS;
    return fromBackend.map(e => ({
      value: e.key,
      labelKey: ROOM_STATUS_OPTIONS.find(o => o.value === e.key)?.labelKey ?? `Unknown value (${e.key})`,
    }));
  });

  protected readonly labelClasses = labelClasses;

  protected readonly nameId = () => `room-name-${this.index()}`;
  protected readonly furnishingId = () => `room-furnishing-${this.index()}`;
  protected readonly statusId = () => `room-status-${this.index()}`;

  protected readonly form = signalForm(
    new FormGroup({
      name: new FormControl(''),
      furnishingStatus: new FormControl(''),
      roomStatus: new FormControl(''),
    }),
  );

  constructor() {
    // Sync form changes back to the parent via model signal
    this.form.raw.valueChanges.subscribe(v => {
      this.value.set(v as RoomFormValue);
    });

    // When parent sets a new value, patch the form (skip initial empty)
    effect(() => {
      const v = this.value();
      const current = this.form.raw.getRawValue() as RoomFormValue;
      if (JSON.stringify(v) !== JSON.stringify(current)) {
        this.form.raw.patchValue(v, { emitEvent: false });
      }
    });
  }

  /** Whether the form is valid. */
  get valid(): boolean {
    return this.form.raw.valid;
  }
}
