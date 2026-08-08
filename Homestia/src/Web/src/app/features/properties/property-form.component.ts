import { Component, output, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { BrnDialog, BrnDialogOverlay, BrnDialogContent, BrnDialogClose, BrnDialogTitle } from '@spartan-ng/brain/dialog';
import { HlmButtonDirective } from '@spartan-ng/helm/button';
import { HlmInputDirective } from '@spartan-ng/helm/input';
import { HlmSelectDirective } from '../../shared/ui/select/src';
import {
  HlmDialogOverlayDirective,
  HlmDialogContentDirective,
  HlmDialogHeaderDirective,
  HlmDialogFooterDirective,
  HlmDialogTitleDirective,
} from '@spartan-ng/helm/dialog';
import { signalForm } from '../../core/forms';
import {
  EMPTY_PROPERTY_FORM,
  PROPERTY_TYPE_OPTIONS,
  RENTAL_MODEL_OPTIONS,
  type PropertyFormValue,
} from './property-form.model';

const labelClasses = 'block text-sm font-medium text-surface-700 dark:text-surface-300';

@Component({
  selector: 'app-property-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    HlmButtonDirective,
    HlmInputDirective,
    HlmSelectDirective,
    BrnDialog,
    BrnDialogOverlay,
    BrnDialogContent,
    BrnDialogClose,
    BrnDialogTitle,
    HlmDialogOverlayDirective,
    HlmDialogContentDirective,
    HlmDialogHeaderDirective,
    HlmDialogFooterDirective,
    HlmDialogTitleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <brn-dialog
      [state]="dialogState()"
      [closeOnOutsidePointerEvents]="true"
      (closed)="close.emit()"
    >
      <brn-dialog-overlay hlmDialogOverlay />
      <ng-template brnDialogContent>
        <div hlmDialogContent>
          <div hlmDialogHeader>
            <h2 hlmDialogTitle brnDialogTitle>{{ 'PROPERTIES.ADD_TITLE' | translate }}</h2>
          </div>
          <form [formGroup]="form.raw" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Name -->
            <div class="space-y-1.5">
              <label for="prop-name" [class]="labelClasses">{{ 'PROPERTIES.FORM.NAME' | translate }}</label>
              <input id="prop-name" formControlName="name" hlmInput
                [placeholder]="'PROPERTIES.FORM.NAME_PLACEHOLDER' | translate" />
            </div>

            <!-- Property Type -->
            <div class="space-y-1.5">
              <label for="prop-type" [class]="labelClasses">{{ 'PROPERTIES.FORM.TYPE' | translate }}</label>
              <div class="relative">
                <select id="prop-type" formControlName="propertyType" hlmSelect>
                  <option value="" disabled>{{ 'PROPERTIES.FORM.TYPE_PLACEHOLDER' | translate }}</option>
                  @for (opt of propertyTypeOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                  }
                </select>
                <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            <!-- Rental Model -->
            <div class="space-y-1.5">
              <label for="prop-rental" [class]="labelClasses">{{ 'PROPERTIES.FORM.RENTAL_MODEL' | translate }}</label>
              <div class="relative">
                <select id="prop-rental" formControlName="rentalModel" hlmSelect>
                  <option value="" disabled>{{ 'PROPERTIES.FORM.RENTAL_MODEL_PLACEHOLDER' | translate }}</option>
                  @for (opt of rentalModelOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                  }
                </select>
                <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>

            </div>

            <!-- Address -->
            <div hlmDialogFooter>
              <button hlmBtn variant="secondary" brnDialogClose>
                {{ 'PROPERTIES.FORM.CANCEL' | translate }}
              </button>
              <button hlmBtn variant="primary" type="submit" [disabled]="form.invalid()">
                {{ 'PROPERTIES.FORM.SUBMIT' | translate }}
              </button>
            </div>
          </form>
        </div>
      </ng-template>
    </brn-dialog>
  `,
})
export class PropertyFormComponent {
  readonly open = input(true);
  readonly close = output<void>();
  readonly saved = output<PropertyFormValue>();

  protected readonly dialogState = computed(() => (this.open() ? ('open' as const) : ('closed' as const)));

  protected readonly propertyTypeOptions = PROPERTY_TYPE_OPTIONS;
  protected readonly rentalModelOptions = RENTAL_MODEL_OPTIONS;
  protected readonly labelClasses = labelClasses;
  protected readonly errorClasses = errorClasses;

  protected readonly form = signalForm(
    new FormGroup({
      name: new FormControl(EMPTY_PROPERTY_FORM.name),
      propertyType: new FormControl(EMPTY_PROPERTY_FORM.propertyType),
      rentalModel: new FormControl(EMPTY_PROPERTY_FORM.rentalModel),
    }),
  );

  protected onSubmit(): void {
    this.saved.emit(this.form.raw.getRawValue() as unknown as PropertyFormValue);
    this.form.raw.reset();
    this.close.emit();
  }
}
