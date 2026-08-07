import { Component, output, input, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../shared/components/button.component';
import { DialogComponent } from '../../shared/components/dialog.component';
import { signalForm } from '../../core/forms';
import {
  EMPTY_PROPERTY_FORM,
  PROPERTY_TYPE_OPTIONS,
  RENTAL_MODEL_OPTIONS,
  type PropertyFormValue,
} from './property-form.model';

const inputClasses =
  'block w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50 dark:placeholder-surface-500';

const selectClasses =
  'block w-full appearance-none rounded-md border border-surface-300 bg-white px-3 py-2 pr-8 text-sm text-surface-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50';

const labelClasses = 'block text-sm font-medium text-surface-700 dark:text-surface-300';
const errorClasses = 'text-sm text-destructive-600 dark:text-destructive-400';

@Component({
    selector: 'app-property-form',
    imports: [ReactiveFormsModule, TranslatePipe, ButtonComponent, DialogComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-dialog [open]="open()" [title]="'PROPERTIES.ADD_TITLE' | translate" (close)="close.emit()">
      <form [formGroup]="form.raw" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Name -->
        <div class="space-y-1.5">
          <label for="prop-name" [class]="labelClasses">{{ 'PROPERTIES.FORM.NAME' | translate }}</label>
          <input id="prop-name" formControlName="name" [class]="inputClasses"
            [placeholder]="'PROPERTIES.FORM.NAME_PLACEHOLDER' | translate" />
          @if (controlTouched('name') && form.errors()['name']) { <p [class]="errorClasses">{{ form.errors()['name'][0] }}</p> }
        </div>

        <!-- Property Type -->
        <div class="space-y-1.5">
          <label for="prop-type" [class]="labelClasses">{{ 'PROPERTIES.FORM.TYPE' | translate }}</label>
          <div class="relative">
            <select id="prop-type" formControlName="propertyType" [class]="selectClasses">
              <option value="" disabled>{{ 'PROPERTIES.FORM.TYPE_PLACEHOLDER' | translate }}</option>
              @for (opt of propertyTypeOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
            <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          @if (controlTouched('propertyType') && form.errors()['propertyType']) { <p [class]="errorClasses">{{ form.errors()['propertyType'][0] }}</p> }
        </div>

        <!-- Rental Model -->
        <div class="space-y-1.5">
          <label for="prop-rental" [class]="labelClasses">{{ 'PROPERTIES.FORM.RENTAL_MODEL' | translate }}</label>
          <div class="relative">
            <select id="prop-rental" formControlName="rentalModel" [class]="selectClasses">
              <option value="" disabled>{{ 'PROPERTIES.FORM.RENTAL_MODEL_PLACEHOLDER' | translate }}</option>
              @for (opt of rentalModelOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
            <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          @if (controlTouched('rentalModel') && form.errors()['rentalModel']) { <p [class]="errorClasses">{{ form.errors()['rentalModel'][0] }}</p> }
        </div>

        <!-- Address -->
        <div class="space-y-1.5">
          <label for="prop-address" [class]="labelClasses">{{ 'PROPERTIES.FORM.ADDRESS' | translate }}</label>
          <input id="prop-address" formControlName="address" [class]="inputClasses"
            [placeholder]="'PROPERTIES.FORM.ADDRESS_PLACEHOLDER' | translate" />
          @if (controlTouched('address') && form.errors()['address']) { <p [class]="errorClasses">{{ form.errors()['address'][0] }}</p> }
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <button appBtn variant="secondary" type="button" (click)="close.emit()">
            {{ 'PROPERTIES.FORM.CANCEL' | translate }}
          </button>
          <button appBtn variant="primary" type="submit" [disabled]="form.invalid()">
            {{ 'PROPERTIES.FORM.SUBMIT' | translate }}
          </button>
        </div>
      </form>
    </app-dialog>
  `
})
export class PropertyFormComponent {
  readonly open = input(true);
  readonly close = output<void>();
  readonly saved = output<PropertyFormValue>();

  protected readonly propertyTypeOptions = PROPERTY_TYPE_OPTIONS;
  protected readonly rentalModelOptions = RENTAL_MODEL_OPTIONS;
  protected readonly labelClasses = labelClasses;
  protected readonly inputClasses = inputClasses;
  protected readonly selectClasses = selectClasses;
  protected readonly errorClasses = errorClasses;

  protected readonly form = signalForm(
    new FormGroup({
      name: new FormControl(EMPTY_PROPERTY_FORM.name, [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ]),
      propertyType: new FormControl(EMPTY_PROPERTY_FORM.propertyType, [
        Validators.required,
      ]),
      rentalModel: new FormControl(EMPTY_PROPERTY_FORM.rentalModel, [
        Validators.required,
      ]),
      address: new FormControl(EMPTY_PROPERTY_FORM.address, [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(200),
      ]),
    }),
  );

  protected controlTouched(name: string): boolean {
    return this.form.raw.get(name)?.touched ?? false;
  }

  protected onSubmit(): void {
    if (this.form.invalid()) {
      this.form.markAllTouched();
      return;
    }
    this.saved.emit(this.form.raw.getRawValue() as unknown as PropertyFormValue);
    this.form.raw.reset();
    this.close.emit();
  }
}
