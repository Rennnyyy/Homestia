import {
  Component,
  inject,
  input,
  signal,
  computed,
  output,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmButtonDirective } from '@spartan-ng/helm/button';
import { HlmInputDirective } from '@spartan-ng/helm/input';
import { HlmSelectDirective } from '../../shared/ui/select/src';
import { LayoutService } from '../../core/layout';
import { signalForm } from '../../core/forms';
import { EnumService, RoomService } from '../../core/state';
import { RoomFormComponent } from './room-form.component';
import {
  EMPTY_PROPERTY_FORM,
  EMPTY_ROOM_FORM,
  PROPERTY_TYPE_OPTIONS,
  RENTAL_MODEL_OPTIONS,
  ROOM_BASED_RENTAL_MODELS,
  propertyToFormValue,
  roomToFormValue,
  formValueToCreatePayload,
  roomFormToCreatePayload,
  type PropertyFormValue,
  type RoomFormValue,
} from './property-form.model';
import type { Property, Room, CreatePropertyPayload, CreateRoomPayload } from '../../core/api';

const labelClasses = 'block text-sm font-medium text-surface-700 dark:text-surface-300';

/** Which phase the mobile wizard is in. */
type WizardStep = 'property' | 'rooms' | 'review';

@Component({
  selector: 'app-property-create',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    HlmButtonDirective,
    HlmInputDirective,
    HlmSelectDirective,
    RoomFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <!-- ─── DESKTOP: full accordion view ─── -->
    @if (!layout.isMobile()) {
      <div class="mx-auto max-w-3xl space-y-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-surface-500">
          <button class="text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors" (click)="cancel()">{{ 'PROPERTIES.TITLE' | translate }}</button>
          <span>/</span>
          <span class="text-surface-900 dark:text-surface-50 font-medium">{{ breadcrumbName() }}</span>
        </nav>

        <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ isEditing() ? ('PROPERTIES.EDIT_TITLE' | translate) : ('PROPERTIES.ADD_TITLE' | translate) }}</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400">{{ 'PROPERTIES.CREATE_SUBTITLE' | translate }}</p>

        <div class="space-y-1">
          <!-- Property accordion item -->
          <details open class="group rounded-lg border border-surface-200 dark:border-surface-700">
            <summary class="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800 [&::-webkit-details-marker]:hidden">
              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 9.5 12 3l9 6.5M5 20V10.5L12 5l7 5.5V20H5Z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {{ 'PROPERTIES.ACCORDION.PROPERTY_DETAILS' | translate }}
              </span>
              <svg
                class="h-4 w-4 text-surface-400 transition-transform group-open:rotate-180"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </summary>
            <div class="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
              <form [formGroup]="propertyForm.raw" class="space-y-4">
                <!-- Name -->
                <div class="space-y-1.5">
                  <label for="prop-name-d" [class]="labelClasses">{{ 'PROPERTIES.ROOM.NAME' | translate }}</label>
                  <input id="prop-name-d" formControlName="name" hlmInput [placeholder]="'PROPERTIES.FORM.NAME_PLACEHOLDER' | translate" />
                </div>

                <!-- Property Type -->
                <div class="space-y-1.5">
                  <label for="prop-type-d" [class]="labelClasses">{{ 'PROPERTIES.FORM.TYPE' | translate }}</label>
                  <div class="relative">
                    <select id="prop-type-d" formControlName="propertyType" hlmSelect>
                      <option value="" disabled>{{ 'PROPERTIES.FORM.SELECT_TYPE' | translate }}</option>
                      @for (opt of propertyTypeOptions(); track opt.value) {
                        <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                      }
                    </select>
                    <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>

                <!-- Rental Model (shown after property type is selected) -->
                @if (propertyForm.value()['propertyType']) {
                  <div class="space-y-1.5">
                    <label for="prop-rental-d" [class]="labelClasses">{{ 'PROPERTIES.FORM.RENTAL_MODEL' | translate }}</label>
                    <div class="relative">
                      <select id="prop-rental-d" formControlName="rentalModel" hlmSelect>
                        <option value="" disabled>{{ 'PROPERTIES.FORM.SELECT_MODEL' | translate }}</option>
                        @for (opt of rentalModelOptions(); track opt.value) {
                          <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                        }
                      </select>
                      <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                }
              </form>
            </div>
          </details>

          <!-- Rooms accordion items (only if room-based rental model) -->
          @if (needsRooms()) {
            @for (room of rooms(); track room._key; let i = $index) {
              <details open class="group rounded-lg border border-surface-200 dark:border-surface-700">
                <summary class="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800 [&::-webkit-details-marker]:hidden">
                  <span class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M15 10v4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {{ room.value.name || ('PROPERTIES.ROOM.LABEL' | translate:{ number: i + 1 }) }}
                  </span>
                  <svg
                    class="h-4 w-4 text-surface-400 transition-transform group-open:rotate-180"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                  >
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <div class="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
                  <app-room-form
                    [index]="i"
                    [heading]="('PROPERTIES.ROOM.LABEL' | translate:{ number: i + 1 }) + ' / ' + rooms().length"
                    [removable]="true"
                    [(value)]="rooms()[i].value"
                    (remove)="removeRoom(i)"
                  />
                </div>
              </details>
            }

            <!-- Add room button (outside accordion) -->
            <div class="mt-2">
              <button hlmBtn variant="secondary" size="sm" (click)="addRoom()">
                {{ 'PROPERTIES.ACCORDION.ADD_ROOM' | translate }}
              </button>
            </div>
          }
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between gap-3">
          <!-- Delete (edit mode only) -->
          <div>
            @if (isEditing()) {
              @if (!deleteConfirming()) {
                <button hlmBtn variant="destructive" size="sm" (click)="deleteConfirming.set(true)">
                  {{ 'PROPERTIES.DELETE.BUTTON' | translate }}
                </button>
              } @else {
                <div class="flex items-center gap-2">
                  <span class="text-sm text-destructive-600 dark:text-destructive-400">{{ 'PROPERTIES.DELETE.CONFIRM' | translate }}</span>
                  <button hlmBtn variant="destructive" size="sm" (click)="confirmDelete()">
                    {{ 'PROPERTIES.DELETE.CONFIRM_YES' | translate }}
                  </button>
                  <button hlmBtn variant="secondary" size="sm" (click)="deleteConfirming.set(false)">
                    {{ 'PROPERTIES.DELETE.CONFIRM_NO' | translate }}
                  </button>
                </div>
              }
            }
          </div>
          <div class="flex gap-3">
            <button hlmBtn variant="secondary" (click)="cancel()">{{ 'PROPERTIES.FORM.CANCEL' | translate }}</button>
            <button hlmBtn variant="primary" (click)="save()">{{ isEditing() ? ('PROPERTIES.FORM.SAVE_CHANGES' | translate) : ('PROPERTIES.WIZARD.SAVE' | translate) }}</button>
          </div>
        </div>
      </div>
    }
    <!-- ═══ END DESKTOP ═══ -->

    <!-- ─── MOBILE: edit mode → direct accordion ─── -->
    @if (layout.isMobile() && isEditing()) {
      <div class="mx-auto max-w-lg space-y-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-surface-500">
          <button class="text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors" (click)="cancel()">{{ 'PROPERTIES.TITLE' | translate }}</button>
          <span>/</span>
          <span class="text-surface-900 dark:text-surface-50 font-medium">{{ breadcrumbName() }}</span>
        </nav>

        <div class="space-y-1">
          <!-- Property accordion item -->
          <details class="group rounded-lg border border-surface-200 dark:border-surface-700">
            <summary class="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800 [&::-webkit-details-marker]:hidden">
              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 9.5 12 3l9 6.5M5 20V10.5L12 5l7 5.5V20H5Z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {{ 'PROPERTIES.ACCORDION.PROPERTY_DETAILS' | translate }}
              </span>
              <svg class="h-4 w-4 text-surface-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </summary>
            <div class="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
              <form [formGroup]="propertyForm.raw" class="space-y-4">
                <div class="space-y-1.5">
                  <label for="prop-name-e" [class]="labelClasses">{{ 'PROPERTIES.ROOM.NAME' | translate }}</label>
                  <input id="prop-name-e" formControlName="name" hlmInput />
                </div>
                <div class="space-y-1.5">
                  <label for="prop-type-e" [class]="labelClasses">{{ 'PROPERTIES.FORM.TYPE' | translate }}</label>
                  <div class="relative">
                    <select id="prop-type-e" formControlName="propertyType" hlmSelect>
                      @for (opt of propertyTypeOptions(); track opt.value) {
                        <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                      }
                    </select>
                    <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label for="prop-rental-e" [class]="labelClasses">{{ 'PROPERTIES.FORM.RENTAL_MODEL' | translate }}</label>
                  <div class="relative">
                    <select id="prop-rental-e" formControlName="rentalModel" hlmSelect>
                      @for (opt of rentalModelOptions(); track opt.value) {
                        <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                      }
                    </select>
                    <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </form>
            </div>
          </details>

          <!-- Room accordion items -->
          @if (needsRooms()) {
            @for (room of rooms(); track room._key; let i = $index) {
              <details class="group rounded-lg border border-surface-200 dark:border-surface-700">
                <summary class="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800 [&::-webkit-details-marker]:hidden">
                  <span class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M15 10v4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {{ room.value.name || ('PROPERTIES.ROOM.LABEL' | translate:{ number: i + 1 }) }}
                  </span>
                  <svg class="h-4 w-4 text-surface-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <div class="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
                  <app-room-form
                    [index]="i"
                    [heading]="('PROPERTIES.ROOM.LABEL' | translate:{ number: i + 1 }) + ' / ' + rooms().length"
                    [removable]="true"
                    [(value)]="rooms()[i].value"
                    (remove)="removeRoom(i)"
                  />
                </div>
              </details>
            }
            <div class="mt-2">
              <button hlmBtn variant="secondary" size="sm" (click)="addRoom()">{{ 'PROPERTIES.ACCORDION.ADD_ROOM' | translate }}</button>
            </div>
          }
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <div class="flex justify-end gap-3">
            <button hlmBtn variant="secondary" (click)="cancel()">{{ 'PROPERTIES.FORM.CANCEL' | translate }}</button>
            <button hlmBtn variant="primary" (click)="save()">{{ 'PROPERTIES.FORM.SAVE_CHANGES' | translate }}</button>
          </div>
          @if (!deleteConfirming()) {
            <button hlmBtn variant="destructive" size="sm" (click)="deleteConfirming.set(true)" class="self-center">
              {{ 'PROPERTIES.DELETE.PROPERTY_BUTTON' | translate }}
            </button>
          } @else {
            <div class="flex items-center justify-center gap-2">
              <span class="text-sm text-destructive-600 dark:text-destructive-400">{{ 'PROPERTIES.DELETE.CONFIRM' | translate }}</span>
              <button hlmBtn variant="destructive" size="sm" (click)="confirmDelete()">{{ 'PROPERTIES.DELETE.CONFIRM_YES' | translate }}</button>
              <button hlmBtn variant="secondary" size="sm" (click)="deleteConfirming.set(false)">{{ 'PROPERTIES.DELETE.CONFIRM_NO' | translate }}</button>
            </div>
          }
        </div>
      </div>
    }

    <!-- ─── MOBILE: create mode → step-by-step wizard ─── -->
    @if (layout.isMobile() && !isEditing()) {
      <div class="mx-auto max-w-lg space-y-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-surface-500">
          <button class="text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors" (click)="cancel()">{{ 'PROPERTIES.TITLE' | translate }}</button>
          <span>/</span>
          <span class="text-surface-900 dark:text-surface-50 font-medium">{{ breadcrumbName() }}</span>
        </nav>

        <!-- Step indicator -->
        <div class="flex items-center justify-center gap-2">
          @for (s of wizardSteps(); track s.key; let i = $index) {
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors"
              [class.bg-primary-500.text-white]="i === currentStepIndex()"
              [class.bg-primary-100.text-primary-700]="i < currentStepIndex()"
              [class.bg-surface-200.text-surface-500]="i > currentStepIndex()"
            >
              @if (i < currentStepIndex()) { ✓ } @else { {{ i + 1 }} }
            </div>
            @if (i < wizardSteps().length - 1) {
              <div
                class="h-0.5 w-6 transition-colors"
                [class.bg-primary-300]="i < currentStepIndex()"
                [class.bg-surface-200]="i >= currentStepIndex()"
              ></div>
            }
          }
        </div>
        <p class="text-center text-sm text-surface-500">{{ wizardSteps()[currentStepIndex()].labelKey | translate }}</p>

        <!-- ── STEP: Property ── -->
        @if (currentStep() === 'property') {
          <form [formGroup]="propertyForm.raw" class="space-y-4">
            <!-- Name -->
            <div class="space-y-1.5">
              <label for="prop-name-m" [class]="labelClasses">{{ 'PROPERTIES.ROOM.NAME' | translate }}</label>
              <input id="prop-name-m" formControlName="name" hlmInput [placeholder]="'PROPERTIES.FORM.NAME_PLACEHOLDER' | translate" />
            </div>

            <!-- Property Type -->
            <div class="space-y-1.5">
              <label for="prop-type-m" [class]="labelClasses">{{ 'PROPERTIES.FORM.TYPE' | translate }}</label>
              <div class="relative">
                <select id="prop-type-m" formControlName="propertyType" hlmSelect>
                  <option value="" disabled>{{ 'PROPERTIES.FORM.SELECT_TYPE' | translate }}</option>
                  @for (opt of propertyTypeOptions(); track opt.value) {
                    <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                  }
                </select>
                <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            <!-- Rental Model (shown after property type is selected) -->
            @if (propertyForm.value()['propertyType']) {
              <div class="space-y-1.5">
                <label for="prop-rental-m" [class]="labelClasses">{{ 'PROPERTIES.FORM.RENTAL_MODEL' | translate }}</label>
                <div class="relative">
                  <select id="prop-rental-m" formControlName="rentalModel" hlmSelect>
                    <option value="" disabled>{{ 'PROPERTIES.FORM.SELECT_MODEL' | translate }}</option>
                    @for (opt of rentalModelOptions(); track opt.value) {
                      <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                    }
                  </select>
                  <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            }

            <!-- Room Count (shown when room-based rental model is selected) -->
            @if (showRoomCount()) {
              <div class="space-y-1.5">
                <label for="room-count-m" [class]="labelClasses">{{ 'PROPERTIES.FORM.ROOM_COUNT_LABEL' | translate }}</label>
                <input
                  id="room-count-m"
                  type="number"
                  hlmInput
                  [value]="pendingRoomCount()"
                  (input)="pendingRoomCount.set(+$any($event.target).value)"
                  min="1"
                  max="50"
                  class="w-32"
                />
              </div>
            }
          </form>
        }

        <!-- ── STEP: Per-Room Forms ── -->
        @if (currentStep() === 'rooms') {
          <div class="space-y-4">
            <p class="text-sm text-surface-600 dark:text-surface-400">
              {{ 'PROPERTIES.WIZARD.ROOM_PROGRESS' | translate:{ current: currentRoomIndex() + 1, total: rooms().length } }}
            </p>
            <app-room-form
              [index]="currentRoomIndex()"
              [heading]="('PROPERTIES.ROOM.LABEL' | translate:{ number: currentRoomIndex() + 1 }) + ' / ' + rooms().length"
              [removable]="false"
              [(value)]="rooms()[currentRoomIndex()].value"
            />
          </div>
        }

        <!-- ── STEP: Review (accordion) ── -->
        @if (currentStep() === 'review') {
          <div class="space-y-4">
            <p class="text-sm text-surface-600 dark:text-surface-400">{{ 'PROPERTIES.WIZARD.REVIEW_TITLE' | translate }}</p>

            <div class="space-y-1">
              <!-- Property accordion item -->
              <details open class="group rounded-lg border border-surface-200 dark:border-surface-700">
                <summary class="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800 [&::-webkit-details-marker]:hidden">
                  <span class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 9.5 12 3l9 6.5M5 20V10.5L12 5l7 5.5V20H5Z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {{ 'PROPERTIES.ACCORDION.PROPERTY_DETAILS' | translate }}
                  </span>
                  <svg
                    class="h-4 w-4 text-surface-400 transition-transform group-open:rotate-180"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                  >
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <div class="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
                  <form [formGroup]="propertyForm.raw" class="space-y-4">
                    <div class="space-y-1.5">
                      <label for="prop-name-r" [class]="labelClasses">{{ 'PROPERTIES.ROOM.NAME' | translate }}</label>
                      <input id="prop-name-r" formControlName="name" hlmInput />
                    </div>
                    <div class="space-y-1.5">
                      <label for="prop-type-r" [class]="labelClasses">{{ 'PROPERTIES.FORM.TYPE' | translate }}</label>
                      <div class="relative">
                        <select id="prop-type-r" formControlName="propertyType" hlmSelect>
                          @for (opt of propertyTypeOptions(); track opt.value) {
                            <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                          }
                        </select>
                        <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                    <div class="space-y-1.5">
                      <label for="prop-rental-r" [class]="labelClasses">{{ 'PROPERTIES.FORM.RENTAL_MODEL' | translate }}</label>
                      <div class="relative">
                        <select id="prop-rental-r" formControlName="rentalModel" hlmSelect>
                          @for (opt of rentalModelOptions(); track opt.value) {
                            <option [value]="opt.value">{{ opt.labelKey | translate }}</option>
                          }
                        </select>
                        <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </form>
                </div>
              </details>

              <!-- Room accordion items -->
              @if (needsRooms()) {
                @for (room of rooms(); track room._key; let i = $index) {
                  <details open class="group rounded-lg border border-surface-200 dark:border-surface-700">
                    <summary class="flex w-full cursor-pointer items-center justify-between px-4 py-3 font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:text-surface-50 dark:hover:bg-surface-800 [&::-webkit-details-marker]:hidden">
                      <span class="flex items-center gap-2">
                        <svg class="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M15 10v4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {{ room.value.name || ('PROPERTIES.ROOM.LABEL' | translate:{ number: i + 1 }) }}
                      </span>
                      <svg
                        class="h-4 w-4 text-surface-400 transition-transform group-open:rotate-180"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                      >
                        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </summary>
                    <div class="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
                      <app-room-form
                        [index]="i"
                        [heading]="('PROPERTIES.ROOM.LABEL' | translate:{ number: i + 1 })"
                        [removable]="true"
                        [(value)]="rooms()[i].value"
                        (remove)="removeRoom(i)"
                      />
                    </div>
                  </details>
                }
                <div class="mt-2">
                  <button hlmBtn variant="secondary" size="sm" (click)="addRoom()">{{ 'PROPERTIES.ACCORDION.ADD_ROOM' | translate }}</button>
                </div>
              }
            </div>
          </div>
        }

        <!-- ── Mobile navigation buttons ── -->
        <div class="flex justify-between gap-3">
          @if (canGoBack()) {
            <button hlmBtn variant="secondary" (click)="goBack()">
              {{ 'PROPERTIES.WIZARD.BACK' | translate }}
            </button>
          }
          @if (!canGoBack()) {
            <div></div>
          }
          @if (currentStep() !== 'review') {
            <button hlmBtn variant="primary" (click)="goNext()" [disabled]="!canAdvance()">
              {{ currentStep() === 'rooms' && currentRoomIndex() < rooms().length - 1 ? ('PROPERTIES.WIZARD.NEXT_ROOM' | translate) : ('PROPERTIES.WIZARD.CONTINUE' | translate) }}
            </button>
          }
          @if (currentStep() === 'review') {
            <div class="flex flex-col gap-3">
              <button hlmBtn variant="primary" (click)="save()">
                {{ isEditing() ? ('PROPERTIES.FORM.SAVE_CHANGES' | translate) : ('PROPERTIES.WIZARD.SAVE' | translate) }}
              </button>
              @if (isEditing()) {
                @if (!deleteConfirming()) {
                  <button hlmBtn variant="destructive" size="sm" (click)="deleteConfirming.set(true)" class="self-center">
                    {{ 'PROPERTIES.DELETE.PROPERTY_BUTTON' | translate }}
                  </button>
                } @else {
                  <div class="flex items-center justify-center gap-2">
                    <span class="text-sm text-destructive-600 dark:text-destructive-400">{{ 'PROPERTIES.DELETE.CONFIRM' | translate }}</span>
                    <button hlmBtn variant="destructive" size="sm" (click)="confirmDelete()">
                      {{ 'PROPERTIES.DELETE.CONFIRM_YES' | translate }}
                    </button>
                    <button hlmBtn variant="secondary" size="sm" (click)="deleteConfirming.set(false)">
                      {{ 'PROPERTIES.DELETE.CONFIRM_NO' | translate }}
                    </button>
                  </div>
                }
              }
            </div>
          }
        </div>

        <!-- Step dots (mobile bottom) -->
        <div class="flex justify-center gap-1.5">
          @for (s of wizardSteps(); track s.key; let i = $index) {
            <div
              class="h-2 w-2 rounded-full transition-colors"
              [class.bg-primary-500]="i === currentStepIndex()"
              [class.bg-primary-300]="i < currentStepIndex()"
              [class.bg-surface-300]="i > currentStepIndex()"
            ></div>
          }
        </div>
      </div>
    }
  `,
})
export class PropertyCreateComponent {
  readonly layout = inject(LayoutService);
  readonly enumService = inject(EnumService);
  readonly roomService = inject(RoomService);

  /** Pre-fill property data (edit mode). When absent, the form starts empty (create mode). */
  readonly initialProperty = input<Property | undefined>(undefined);

  /** Whether we are editing an existing property. */
  protected readonly isEditing = computed(() => !!this.initialProperty());

  /** Breadcrumb name: the property name or "New Property". */
  protected readonly breadcrumbName = computed(() =>
    this.propertyForm.value()['name'] || (this.isEditing() ? 'Unnamed Property' : 'New Property'),
  );

  /** Emitted when the user cancels. */
  readonly cancelled = output<void>();
  /** Emitted when the user saves, with the API-ready payload. */
  readonly saved = output<CreatePropertyPayload>();
  /** Emitted when the user confirms deletion. */
  readonly deleted = output<void>();

  /** Emitted with room payloads — parent creates rooms first, then the property. */
  readonly roomsToCreate = output<CreateRoomPayload[]>();

  // ── Delete confirmation state ──
  protected readonly deleteConfirming = signal(false);

  // ── Style tokens ──
  protected readonly labelClasses = labelClasses;

  /** Property type select options — loaded from backend, falls back to hardcoded. */
  protected readonly propertyTypeOptions = computed(() => {
    const fromBackend = this.enumService.propertyTypes();
    if (fromBackend.length === 0) return PROPERTY_TYPE_OPTIONS;
    return fromBackend.map(e => ({
      value: e.key,
      labelKey: PROPERTY_TYPE_OPTIONS.find(o => o.value === e.key)?.labelKey ?? `Unknown value (${e.key})`,
    }));
  });

  /** Rental model select options — loaded from backend, falls back to hardcoded. */
  protected readonly rentalModelOptions = computed(() => {
    const fromBackend = this.enumService.rentalModels();
    if (fromBackend.length === 0) return RENTAL_MODEL_OPTIONS;
    return fromBackend.map(e => ({
      value: e.key,
      labelKey: RENTAL_MODEL_OPTIONS.find(o => o.value === e.key)?.labelKey ?? `Unknown value (${e.key})`,
    }));
  });

  // ── Property form ──
  protected readonly propertyForm = signalForm(
    new FormGroup({
      name: new FormControl(EMPTY_PROPERTY_FORM.name),
      address: new FormControl(EMPTY_PROPERTY_FORM.address),
      propertyType: new FormControl(EMPTY_PROPERTY_FORM.propertyType),
      rentalModel: new FormControl(EMPTY_PROPERTY_FORM.rentalModel),
    }),
  );

  /** Monotonic counter — ignore stale async responses when user switches properties rapidly. */
  private loadToken = 0;

  constructor() {
    // Pre-fill form when editing an existing property
    effect(() => {
      const property = this.initialProperty();
      if (property) {
        this.propertyForm.raw.patchValue(propertyToFormValue(property));
        // Clear rooms immediately — prevent flicker from previous property
        this.rooms.set([]);
        this.pendingDeletions.set([]);
        // Bump token to ignore stale async responses
        const token = ++this.loadToken;
        // Load each room individually by its IRI from the property's segmentedInto.
        // This uses the backend's own authoritative linking — no filtering ambiguity.
        const roomIris: string[] = (property.segmentedInto ?? [])
          .map(ref => typeof ref === 'string' ? ref : (ref as { iri: string }).iri)
          .filter((iri): iri is string => !!iri);
        if (roomIris.length === 0) return;
        Promise.all(
          roomIris.map(iri => this.roomService.getByIri(iri)),
        ).then(results => {
          if (token !== this.loadToken) return;
          const loaded: Room[] = results.filter((r): r is Room => r !== null);
          this.rooms.set(
            loaded.map(r => ({
              _key: r.iri,
              value: roomToFormValue(r),
              iri: r.iri,
            })),
          );
          this.pendingDeletions.set([]);
        });
      }
    });
  }

  // ── Rooms state ──
  /** Each room tracked with a stable unique key plus its current value. */
  protected readonly rooms = signal<{ _key: string; value: RoomFormValue; iri?: string }[]>([]);

  /** IRIs of backend-loaded rooms marked for deletion by the user. */
  protected readonly pendingDeletions = signal<string[]>([]);

  /** Whether the selected rental model requires rooms, OR existing rooms exist (edit mode). */
  protected readonly needsRooms = computed(() =>
    ROOM_BASED_RENTAL_MODELS.has(this.propertyForm.value()['rentalModel'] as string) ||
    (this.isEditing() && this.rooms().length > 0),
  );

  /** Whether to show the room count input (property type AND room-based rental model selected). */
  protected readonly showRoomCount = computed(() =>
    !!this.propertyForm.value()['propertyType'] &&
    ROOM_BASED_RENTAL_MODELS.has(this.propertyForm.value()['rentalModel'] as string),
  );

  // ── Mobile wizard state ──
  protected readonly currentStepIndex = signal(0);
  protected readonly currentRoomIndex = signal(0);
  protected readonly pendingRoomCount = signal(1);

  protected readonly wizardSteps = computed(() => {
    const steps: { key: WizardStep; labelKey: string }[] = [
      { key: 'property', labelKey: 'PROPERTIES.WIZARD.STEP_PROPERTY' },
    ];
    if (this.needsRooms()) {
      steps.push({ key: 'rooms', labelKey: 'PROPERTIES.WIZARD.STEP_ROOMS' });
    }
    steps.push({ key: 'review', labelKey: 'PROPERTIES.WIZARD.STEP_REVIEW' });
    return steps;
  });

  protected readonly currentStep = computed(() => this.wizardSteps()[this.currentStepIndex()].key);

  protected canGoBack(): boolean {
    if (this.currentStepIndex() === 0) return false;
    const step = this.currentStep();
    if (step === 'rooms' && this.currentRoomIndex() > 0) return true;
    return true;
  }

  protected canAdvance(): boolean {
    return true;
  }

  protected goBack(): void {
    const step = this.currentStep();
    if (step === 'rooms' && this.currentRoomIndex() > 0) {
      this.currentRoomIndex.update(i => i - 1);
      return;
    }
    if (step === 'review' && this.needsRooms()) {
      this.currentStepIndex.set(this.wizardSteps().findIndex(s => s.key === 'rooms'));
      this.currentRoomIndex.set(this.rooms().length - 1);
      return;
    }
    this.currentStepIndex.update(i => Math.max(0, i - 1));
  }

  protected goNext(): void {
    const step = this.currentStep();

    if (step === 'property') {
      // If room-based rental model → initialize rooms and go to rooms step
      if (this.needsRooms()) {
        const count = this.pendingRoomCount();
        this.rooms.set(
          Array.from({ length: count }, () => ({
            _key: crypto.randomUUID(),
            value: { ...EMPTY_ROOM_FORM },
          })),
        );
        this.currentRoomIndex.set(0);
        this.currentStepIndex.set(this.wizardSteps().findIndex(s => s.key === 'rooms'));
        return;
      }
      // Otherwise skip to review
      this.rooms.set([]);
      this.currentStepIndex.set(this.wizardSteps().findIndex(s => s.key === 'review'));
      return;
    }

    if (step === 'rooms') {
      if (this.currentRoomIndex() < this.rooms().length - 1) {
        this.currentRoomIndex.update(i => i + 1);
        return;
      }
      // All rooms done → go to review
      this.currentStepIndex.set(this.wizardSteps().findIndex(s => s.key === 'review'));
      return;
    }
  }

  // ── Room management (desktop) ──
  protected addRoom(): void {
    this.rooms.update(list => [
      ...list,
      { _key: crypto.randomUUID(), value: { ...EMPTY_ROOM_FORM } },
    ]);
  }

  protected removeRoom(index: number): void {
    const room = this.rooms()[index];
    // If this room has a backend IRI, mark it for deletion
    if (room?.iri) {
      this.pendingDeletions.update(list => [...list, room.iri!]);
    }
    this.rooms.update(list => list.filter((_, i) => i !== index));
  }

  // ── Cancel / Save / Delete ──
  protected cancel(): void {
    this.cancelled.emit();
  }

  protected async save(): Promise<void> {
    const formValue = this.propertyForm.value() as unknown as PropertyFormValue;
    const propertyTypeIri = this.enumService.iriByKey(this.enumService.propertyTypes(), formValue.propertyType, 'property-types');
    const rentalModelIri = this.enumService.iriByKey(this.enumService.rentalModels(), formValue.rentalModel, 'rental-models');

    if (this.isEditing()) {
      // ── Edit mode: property update + room reconciliation ──
      const propertyIri = this.initialProperty()!.iri;

      // Delete rooms marked for removal
      const deletions = this.pendingDeletions();
      await Promise.all(deletions.map(iri => this.roomService.deleteAsync(iri).catch(() => {})));

      // Update existing rooms that have an IRI
      const updates = this.rooms().filter(r => r.iri).map(async room => {
        const furnishingIri = this.enumService.iriByKey(
          this.enumService.furnishingStatuses(), room.value.furnishingStatus, 'furnishing-statuses',
        );
        const statusIri = this.enumService.iriByKey(
          this.enumService.roomStatuses(), room.value.roomStatus, 'room-statuses',
        );
        await this.roomService.updateAsync(room.iri!, {
          name: room.value.name,
          furnishingStatus: furnishingIri,
          roomStatus: statusIri,
        }).catch(() => {});
      });
      await Promise.all(updates);

      // Create new rooms (no IRI)
      const creations = this.rooms().filter(r => !r.iri).map(async room => {
        const furnishingIri = this.enumService.iriByKey(
          this.enumService.furnishingStatuses(), room.value.furnishingStatus, 'furnishing-statuses',
        );
        const statusIri = this.enumService.iriByKey(
          this.enumService.roomStatuses(), room.value.roomStatus, 'room-statuses',
        );
        await this.roomService.createAsync(
          roomFormToCreatePayload(room.value, furnishingIri, statusIri, propertyIri),
        ).catch(() => {});
      });
      await Promise.all(creations);

      const payload = formValueToCreatePayload(formValue, propertyTypeIri, rentalModelIri);
      this.saved.emit(payload);
      return;
    }

    // ── Create mode: original logic ──
    // Emit room payloads first (parent creates property, then rooms with isPartOf)
    if (this.needsRooms() && this.rooms().length > 0) {
      const roomPayloads = this.rooms().map(r => {
        const furnishingIri = this.enumService.iriByKey(this.enumService.furnishingStatuses(), r.value.furnishingStatus, 'furnishing-statuses');
        const statusIri = this.enumService.iriByKey(this.enumService.roomStatuses(), r.value.roomStatus, 'room-statuses');
        return roomFormToCreatePayload(r.value, furnishingIri, statusIri, '');
      });
      this.roomsToCreate.emit(roomPayloads);
    }

    const payload = formValueToCreatePayload(formValue, propertyTypeIri, rentalModelIri);
    this.saved.emit(payload);
  }

  protected confirmDelete(): void {
    this.deleteConfirming.set(false);
    this.deleted.emit();
  }
}
