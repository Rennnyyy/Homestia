import { Component, computed, inject, signal, OnInit, viewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideBuilding, LucidePlus, LucideChevronRight, LucideTrash, LucideDoorOpen, LucideCheck, LucideSparkles, LucideAlertTriangle } from '@lucide/angular';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { AletheiaHttpClient } from '../../shared/services/aletheia-http-client';
import { EntitySyncService } from '../../shared/services/entity-sync.service';
import { DynamicEntityFormComponent } from '../../shared/components/dynamic-entity-form/dynamic-entity-form.component';
import { DynamicEntityTableComponent, type TableAction } from '../../shared/components/dynamic-entity-table/dynamic-entity-table.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { AiAssistantWizardComponent } from '../../shared/components/ai-assistant-wizard/ai-assistant-wizard.component';
import { PropertyEntity, type Property } from '../../entities/property.entity';
import { RoomEntity } from '../../entities/room.entity';
import {
  ShaclValidatorService,
  PROPERTY_SHAPE_IRI,
  ROOM_SHAPE_IRI,
  type ShapeViolation,
} from '../../core/shapes';
import type { AletheiaCollection } from '../../shared/services/aletheia-http-client.models';

type PageMode = 'list' | 'create' | 'edit';
type CreateStep = 'details' | 'room' | 'review';

interface CreateStepDef {
  id: CreateStep;
  labelKey: string;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    LucideBuilding,
    LucidePlus,
    LucideChevronRight,
    LucideTrash,
    LucideDoorOpen,
    LucideCheck,
    LucideSparkles,
    LucideAlertTriangle,
    DynamicEntityFormComponent,
    DynamicEntityTableComponent,
    ConfirmDialogComponent,
    AiAssistantWizardComponent,
    ...HlmAccordionImports,
  ],
  template: `
    <div class="max-w-6xl mx-auto px-6">
      <!-- Header: breadcrumb + actions -->
      <div class="flex items-center properties-header" style="padding: 15px 0 20px 0; min-height: 70px;">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 font-bold text-foreground properties-breadcrumb" style="font-size: 24px; line-height: 1;" [class.creating]="mode() === 'create'">
          <svg lucideBuilding class="size-6"></svg>
          <span class="properties-base-label">{{ 'nav.properties' | transloco }}</span>
          @if (mode() === 'create') {
            <svg lucideChevronRight class="size-6 properties-base-label"></svg>
            <span class="text-foreground">{{ 'nav.properties.createBreadcrumb' | transloco }}</span>
          }
          @if (mode() === 'edit') {
            <svg lucideChevronRight class="size-6"></svg>
            <span class="text-foreground">{{ editingItem()?.['name'] ?? '' }}</span>
          }
        </div>

        <div class="flex-1"></div>

        <!-- Actions (list mode only) -->
        @if (mode() === 'list') {
          <div class="hidden md:flex items-center gap-2 properties-actions">
            <button hlmBtn size="sm" class="ai-magic-button" (click)="openAiWizard()">
              <svg lucideSparkles class="size-4 mr-1"></svg>
              {{ 'ai.assistButton' | transloco }}
            </button>
            <button hlmBtn size="sm" (click)="enterCreate()">
              <svg lucidePlus class="size-4 mr-1"></svg>
              {{ 'nav.properties.create' | transloco }}
            </button>
          </div>
        }
      </div>

      <!-- Create/Edit mode: subtext (desktop only) -->
      @if (mode() === 'create') {
        <p class="hidden md:block" style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.properties.createSubtext' | transloco }}</p>
      }
      @if (mode() === 'edit') {
        <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.properties.editSubtext' | transloco }}</p>
      }

      <!-- Partial AI fill warning: the assistant may have left details blank -->
      @if (aiWarnings().length > 0 && (mode() === 'create' || mode() === 'edit')) {
        <div class="ai-fill-warning">
          <div class="flex items-start gap-2">
            <svg lucideAlertTriangle class="size-6 text-amber-500" style="flex-shrink: 0; margin-top: 2px;"></svg>
            <div class="flex-1">
              <p class="ai-fill-warning-title">{{ 'ai.warningTitle' | transloco }}</p>
              <ul class="ai-fill-warning-list">
                @for (violation of aiWarnings(); track $index) {
                  <li>{{ violation.message | transloco }}</li>
                }
              </ul>
              <p class="ai-fill-warning-hint">{{ 'ai.warningHint' | transloco }}</p>
            </div>
            <button hlmBtn size="sm" variant="outline" class="text-foreground" style="flex-shrink: 0;" (click)="reopenAiWizard()">
              <svg lucideSparkles class="size-4 mr-1"></svg>
              {{ 'ai.askAgain' | transloco }}
            </button>
          </div>
        </div>
      }

      <!-- List mode: table -->
      @if (mode() === 'list') {
        <app-dynamic-entity-table
          [entity]="entity"
          [items]="items()"
          [loading]="loading()"
          [error]="error()"
          [shapeKey]="PROPERTY_SHAPE_KEY"
          [defaultVisibleColumns]="['name', 'address']"
          [emptyMessage]="'nav.properties.empty'"
          [actions]="rowActions"
          (rowClick)="onRowClick($event)"
          (refresh)="refresh()"
        />
        <!-- Delete confirmation dialog for list view -->
        @if (confirmingDelete() && deletingItem()) {
          <app-confirm-dialog
            [title]="'nav.properties.deleteTitle'"
            [message]="'nav.properties.deleteConfirm'"
            [confirmLabel]="'nav.properties.delete'"
            [destructive]="true"
            (confirmed)="onDelete()"
            (cancelled)="confirmingDelete.set(false); deletingItem.set(null)" />
        }
      }

      <!-- Mobile-only Add Property button (below table) -->
      @if (mode() === 'list') {
        <div class="md:hidden flex items-center gap-2" style="margin-top: 24px;">
          <button hlmBtn size="sm" class="ai-magic-button" (click)="openAiWizard()">
            <svg lucideSparkles class="size-4 mr-1"></svg>
            {{ 'ai.assistButton' | transloco }}
          </button>
          <button hlmBtn size="sm" (click)="enterCreate()">
            <svg lucidePlus class="size-4 mr-1"></svg>
            {{ 'nav.properties.create' | transloco }}
          </button>
        </div>
      }

      <!-- Create mode (desktop): form in accordion -->
      @if (mode() === 'create') {
        <div class="hidden md:block">
          <hlm-accordion class="block mt-2 border border-border rounded-lg overflow-hidden">
            <hlm-accordion-item [isOpened]="true">
              <hlm-accordion-trigger [triggerClass]="'border-b border-border py-2 hover:bg-muted/50 hover:no-underline items-center'">
                <div class="flex items-center gap-2 text-foreground">
                  <svg lucideBuilding class="size-[30px] pl-2.5"></svg>
                  <span class="text-lg font-semibold">{{ 'nav.properties.accordionDetails' | transloco }}</span>
                </div>
              </hlm-accordion-trigger>
              <hlm-accordion-content>
                <div class="px-4" style="margin-top: 20px;">
                  <app-dynamic-entity-form
                    [entity]="entity"
                    [mode]="pendingProperty() ? 'edit' : 'create'"
                    [value]="pendingProperty()"
                    [shapeKey]="PROPERTY_SHAPE_KEY"
                    (saved)="onPropertySaved($event)"
                  />
                </div>
              </hlm-accordion-content>
            </hlm-accordion-item>
          </hlm-accordion>

          <!-- Rooms section -->
          @if (rooms().length > 0) {
            <hlm-accordion class="block border border-border rounded-lg overflow-hidden" style="margin-top: 20px;" type="multiple">
              @for (room of rooms(); track room['iri'] ?? $index; let i = $index) {
                <hlm-accordion-item style="border-bottom: 1px solid var(--border);" [class.room-invalid]="roomHasViolations(i)">
                  <hlm-accordion-trigger [triggerClass]="'py-2 hover:bg-muted/50 hover:no-underline items-center'">
                    <div class="flex items-center gap-2 font-semibold text-foreground" style="font-size: 18px; line-height: 1; padding-left: 10px;">
                      <svg lucideDoorOpen class="size-[30px]"></svg>
                      <span>{{ 'nav.properties.roomBreadcrumb' | transloco }}</span>
                      <svg lucideChevronRight class="size-5"></svg>
                      <span>{{ room['name'] || ('nav.properties.roomNew' | transloco) }}</span>
                    </div>
                    <div class="flex-1"></div>
                    <button hlmBtn variant="ghost" size="icon-xs" class="text-destructive" (click)="removeRoom(i); $event.stopPropagation()" title="Remove room" style="margin-right: 8px;">
                      <svg lucideTrash style="width: 30px; height: 30px;"></svg>
                    </button>
                  </hlm-accordion-trigger>
                  <hlm-accordion-content>
                    <div class="px-4" style="margin-top: 15px;">
                      <app-dynamic-entity-form
                        [entity]="RoomEntity"
                        [mode]="'edit'"
                        [value]="room"
                        [shapeKey]="ROOM_SHAPE_KEY" [violations]="violationsForRoom(i)" (saved)="updateRoom(i, $event)" />
                    </div>
                  </hlm-accordion-content>
                </hlm-accordion-item>
              }
            </hlm-accordion>
          }
          <div style="display: flex; justify-content: flex-start; margin-top: 8px;">
            <button hlmBtn variant="default" size="sm" (click)="addRoom()">
              <svg lucidePlus class="size-4 mr-1"></svg>
              {{ 'nav.properties.addRoom' | transloco }}
            </button>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <button hlmBtn variant="outline" class="text-foreground" (click)="exitCreate()">
              {{ 'common.cancel' | transloco }}
            </button>
            <button hlmBtn (click)="formRef()?.save()">
              {{ 'nav.properties.save' | transloco }}
            </button>
          </div>
        </div>
      }

      <!-- Create mode (mobile): stepper wizard -->
      @if (mode() === 'create') {
        <div class="md:hidden">
          <!-- Stepper -->
          <div class="flex items-center justify-center" style="margin-bottom: 24px;">
            @for (step of createSteps; track step.id; let i = $index; let last = $last) {
              <div class="flex items-center">
                <div class="flex items-center gap-1.5"
                     [class.text-primary]="stepIndex(createStep()) >= i"
                     [class.text-muted-foreground]="stepIndex(createStep()) < i">
                  <div class="size-6 rounded-full flex items-center justify-center text-xs font-semibold border"
                       [class.bg-primary]="stepIndex(createStep()) >= i"
                       [class.text-primary-foreground]="stepIndex(createStep()) >= i"
                       [class.border-primary]="stepIndex(createStep()) >= i"
                       [class.border-border]="stepIndex(createStep()) < i">
                    @if (stepIndex(createStep()) > i) {
                      <svg lucideCheck class="size-3.5"></svg>
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>
                  <span class="text-xs font-medium">{{ step.labelKey | transloco }}</span>
                </div>
                @if (!last) {
                  <div class="h-px w-5 mx-2"
                       [class.bg-primary]="stepIndex(createStep()) > i"
                       [class.bg-border]="stepIndex(createStep()) <= i"></div>
                }
              </div>
            }
          </div>

          <!-- Step 1: Property details -->
          <div [class.hidden]="createStep() !== 'details'">
            <div class="border border-border rounded-lg px-4" style="padding-top: 12px;">
              <app-dynamic-entity-form
                #mobileDetailsForm
                [entity]="entity"
                [mode]="'create'"
                [shapeKey]="PROPERTY_SHAPE_KEY"
                (saved)="pendingProperty.set($event)"
              />
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
              <button hlmBtn variant="outline" class="text-foreground" (click)="savePropertyToReview()">
                {{ 'nav.properties.save' | transloco }}
              </button>
              <button hlmBtn (click)="addRoomAndNext()">
                <svg lucidePlus class="size-4 mr-1"></svg>
                {{ 'nav.properties.addRoom' | transloco }}
              </button>
            </div>
          </div>

          <!-- Step 2: Room -->
          <div [class.hidden]="createStep() !== 'room'">
            @if (rooms().length > 0) {
              <div class="border border-border rounded-lg px-4" style="padding-top: 12px;" [class.room-invalid]="roomHasViolations(rooms().length - 1)">
                <div class="flex items-center gap-2 font-semibold text-foreground" style="font-size: 18px; line-height: 1; padding-bottom: 12px;">
                  <svg lucideDoorOpen class="size-6"></svg>
                  <span>{{ 'nav.properties.roomBreadcrumb' | transloco }}</span>
                  <svg lucideChevronRight class="size-5"></svg>
                  <span>{{ rooms()[rooms().length - 1]['name'] || ('nav.properties.roomNew' | transloco) }}</span>
                </div>
                <app-dynamic-entity-form
                  #mobileRoomForm
                  [entity]="RoomEntity"
                  [mode]="'edit'"
                  [value]="rooms()[rooms().length - 1]"
                  [shapeKey]="ROOM_SHAPE_KEY"
                  [violations]="violationsForRoom(rooms().length - 1)"
                  (saved)="updateRoom(rooms().length - 1, $event)" />
              </div>
            }
            <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 24px;">
              <button hlmBtn variant="outline" class="text-foreground" (click)="backToDetails()">
                {{ 'common.cancel' | transloco }}
              </button>
              <div class="flex" style="gap: 8px;">
                <button hlmBtn (click)="nextRoom()">
                  {{ 'nav.properties.nextRoom' | transloco }}
                </button>
                <button hlmBtn (click)="finishToReview()">
                  {{ 'nav.properties.finish' | transloco }}
                </button>
              </div>
            </div>
          </div>

          <!-- Step 3: Review (details + rooms as in edit mode) -->
          <div [class.hidden]="createStep() !== 'review'">
            <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.properties.reviewSubtext' | transloco }}</p>
            @if (pendingProperty()) {
              <div class="border border-border rounded-lg px-4" style="padding-top: 12px;">
                <app-dynamic-entity-form
                  [entity]="entity"
                  [mode]="'edit'"
                  [value]="pendingProperty()"
                  [shapeKey]="PROPERTY_SHAPE_KEY"
                  [violations]="propertyViolations()" />
              </div>
            }
            @if (rooms().length > 0) {
              <hlm-accordion class="block border border-border rounded-lg overflow-hidden" style="margin-top: 20px;" type="multiple">
                @for (room of rooms(); track room['iri'] ?? $index; let i = $index) {
                  <hlm-accordion-item style="border-bottom: 1px solid var(--border);" [isOpened]="openRoomIndices().has(i)" [class.room-invalid]="roomHasViolations(i)">
                    <hlm-accordion-trigger [triggerClass]="'py-2 hover:bg-muted/50 hover:no-underline items-center'">
                      <div class="flex items-center gap-2 font-semibold text-foreground" style="font-size: 18px; line-height: 1; padding-left: 10px;">
                        <svg lucideDoorOpen class="size-[30px]"></svg>
                        <span>{{ 'nav.properties.roomBreadcrumb' | transloco }}</span>
                        <svg lucideChevronRight class="size-5"></svg>
                        <span>{{ room['name'] || ('nav.properties.roomNew' | transloco) }}</span>
                      </div>
                      <div class="flex-1"></div>
                      <button hlmBtn variant="ghost" size="icon-xs" class="text-destructive" (click)="removeRoom(i); $event.stopPropagation()" title="Remove room" style="margin-right: 8px;">
                        <svg lucideTrash style="width: 30px; height: 30px;"></svg>
                      </button>
                    </hlm-accordion-trigger>
                    <hlm-accordion-content>
                      <div class="px-4" style="margin-top: 15px;">
                        <app-dynamic-entity-form
                          [entity]="RoomEntity"
                          [mode]="'edit'"
                          [value]="room"
                          [shapeKey]="ROOM_SHAPE_KEY" [violations]="violationsForRoom(i)" (saved)="updateRoom(i, $event)" />
                      </div>
                    </hlm-accordion-content>
                  </hlm-accordion-item>
                }
              </hlm-accordion>
            }
            <div style="display: flex; justify-content: flex-start; margin-top: 8px;">
              <button hlmBtn variant="default" size="sm" (click)="addRoomInline()">
                <svg lucidePlus class="size-4 mr-1"></svg>
                {{ 'nav.properties.addRoom' | transloco }}
              </button>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
              <button hlmBtn variant="outline" class="text-foreground" (click)="backToDetails()">
                {{ 'common.cancel' | transloco }}
              </button>
              <button hlmBtn (click)="finalSave()">
                {{ 'common.save' | transloco }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Edit mode: form in accordion -->
      @if (mode() === 'edit' && editingItem()) {
        <hlm-accordion class="block mt-2 border border-border rounded-lg overflow-hidden">
          <hlm-accordion-item [isOpened]="true">
            <hlm-accordion-trigger [triggerClass]="'border-b border-border py-2 hover:bg-muted/50 hover:no-underline items-center'">
              <div class="flex items-center gap-2 text-foreground">
                <svg lucideBuilding class="size-[30px] pl-2.5"></svg>
                <span class="text-lg font-semibold">{{ 'nav.properties.accordionDetails' | transloco }}</span>
              </div>
            </hlm-accordion-trigger>
            <hlm-accordion-content>
              <div class="px-4" style="margin-top: 20px;">
                <app-dynamic-entity-form
                  [entity]="entity"
                  [mode]="'edit'"
                  [value]="editingItem()"
                  [shapeKey]="PROPERTY_SHAPE_KEY"
                  (saved)="onPropertySaved($event)"
                />
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>
        </hlm-accordion>

        <!-- Rooms section (edit mode) -->
        @if (rooms().length > 0) {
          <hlm-accordion class="block border border-border rounded-lg overflow-hidden" style="margin-top: 20px;" type="multiple">
            @for (room of rooms(); track room['iri'] ?? $index; let i = $index) {
              <hlm-accordion-item style="border-bottom: 1px solid var(--border);" [class.room-invalid]="roomHasViolations(i)">
                <hlm-accordion-trigger [triggerClass]="'py-2 hover:bg-muted/50 hover:no-underline items-center'">
                  <div class="flex items-center gap-2 font-semibold text-foreground" style="font-size: 18px; line-height: 1; padding-left: 10px;">
                    <svg lucideDoorOpen class="size-[30px]"></svg>
                    <span>{{ 'nav.properties.roomBreadcrumb' | transloco }}</span>
                    <svg lucideChevronRight class="size-5"></svg>
                    <span>{{ room['name'] || ('nav.properties.roomNew' | transloco) }}</span>
                  </div>
                  <div class="flex-1"></div>
                  <button hlmBtn variant="ghost" size="icon-xs" class="text-destructive" (click)="removeRoom(i); $event.stopPropagation()" title="Remove room" style="margin-right: 8px;">
                    <svg lucideTrash style="width: 30px; height: 30px;"></svg>
                  </button>
                </hlm-accordion-trigger>
                <hlm-accordion-content>
                  <div class="px-4" style="margin-top: 15px;">
                    <app-dynamic-entity-form
                      [entity]="RoomEntity"
                      [mode]="'edit'"
                      [value]="room"
                      [shapeKey]="ROOM_SHAPE_KEY" [violations]="violationsForRoom(i)" (saved)="updateRoom(i, $event)" />
                  </div>
                </hlm-accordion-content>
              </hlm-accordion-item>
            }
          </hlm-accordion>
        }
        <div style="display: flex; justify-content: flex-start; margin-top: 8px;">
          <button hlmBtn variant="default" size="sm" (click)="addRoom()">
            <svg lucidePlus class="size-4 mr-1"></svg>
            {{ 'nav.properties.addRoom' | transloco }}
          </button>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
          <button hlmBtn variant="outline" class="text-destructive hover:bg-destructive/10 border-destructive/30" (click)="deletingItem.set(editingItem()); confirmingDelete.set(true)">
            <svg lucideTrash class="size-4 mr-1"></svg>
            {{ 'nav.properties.delete' | transloco }}
          </button>
          <div class="flex-1"></div>
          <button hlmBtn variant="outline" class="text-foreground" (click)="exitCreate()">
            {{ 'common.cancel' | transloco }}
          </button>
          <button hlmBtn (click)="formRef()?.save()">
            {{ 'nav.properties.save' | transloco }}
          </button>
        </div>
      }

      <!-- Delete confirmation dialog -->
      @if (confirmingDelete()) {
        <app-confirm-dialog
          [title]="'nav.properties.deleteTitle'"
          [message]="'nav.properties.deleteConfirm'"
          [confirmLabel]="'nav.properties.delete'"
          [destructive]="true"
          (confirmed)="onDelete()"
          (cancelled)="confirmingDelete.set(false); deletingItem.set(null)" />
      }

      <!-- End edit mode -->

      <!-- AI wizard overlay — launched from the list view -->
      @if (aiWizardOpen()) {
        <app-ai-assistant-wizard
          [textScenarioKey]="AI_SCENARIO_CREATE_TEXT"
          [photosScenarioKey]="AI_SCENARIO_CREATE_PHOTOS"
          [editTextScenarioKey]="AI_SCENARIO_EDIT_TEXT"
          [editPhotosScenarioKey]="AI_SCENARIO_EDIT_PHOTOS"
          [completeTextScenarioKey]="AI_SCENARIO_COMPLETE_TEXT"
          [completePhotosScenarioKey]="AI_SCENARIO_COMPLETE_PHOTOS"
          [intentTextScenarioKey]="AI_SCENARIO_INTENT_TEXT"
          [intentPhotosScenarioKey]="AI_SCENARIO_INTENT_PHOTOS"
          [existingProperties]="aiExistingProperties()"
          [draft]="aiDraft()"
          [draftIri]="aiDraftIri()"
          (proposal)="onAiProposal($event)"
          (editIri)="aiEditIri.set($event)"
          (close)="aiWizardOpen.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    /* A room carrying SHACL violations — red outline. */
    .room-invalid {
      border: 1px solid var(--destructive) !important;
      border-radius: 6px;
      box-shadow: 0 0 0 1px var(--destructive);
    }
    /* The AI assistant entry button — friendly gradient, easy to spot. */
    /* Partial AI fill warning — amber callout with the missing details. */
    .ai-fill-warning {
      border: 1px solid color-mix(in oklch, #f59e0b 45%, transparent);
      background: color-mix(in oklch, #f59e0b 10%, transparent);
      border-radius: 0.9rem;
      padding: 0.9rem 1.1rem;
      margin-bottom: 16px;
    }
    .ai-fill-warning-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
    }
    .ai-fill-warning-list {
      margin: 0.4rem 0 0;
      padding-left: 1.2rem;
      color: var(--muted-foreground);
      font-size: 0.98rem;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .ai-fill-warning-hint {
      font-size: 0.92rem;
      color: var(--muted-foreground);
      margin: 0.4rem 0 0;
    }
    .ai-magic-button {
      background: linear-gradient(135deg, oklch(0.541 0.281 293.009), oklch(0.623 0.214 259.815));
      color: #fff;
      border: none;
      box-shadow: 0 4px 16px -2px rgba(124, 58, 237, 0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
    }
    .ai-magic-button:hover {
      filter: brightness(1.08);
      box-shadow: 0 6px 20px -2px rgba(124, 58, 237, 0.55);
      transform: translateY(-1px);
    }
    .ai-magic-button:active {
      transform: translateY(0);
    }
    @media (max-width: 767px) {
      :host {
        display: block;
        padding-top: 32px;
      }
      .properties-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
        margin-bottom: 32px !important;
        min-height: auto !important;
        padding: 0 !important;
      }
      .properties-breadcrumb {
        gap: 12px !important;
        font-size: 30px !important;
      }
      .properties-breadcrumb svg[lucideBuilding] {
        width: 32px !important;
        height: 32px !important;
        color: var(--primary) !important;
      }
      .properties-breadcrumb svg[lucideChevronRight] {
        width: 32px !important;
        height: 32px !important;
      }
      .properties-actions {
        margin-top: 8px !important;
      }
      /* In create mode on mobile, show only the icon + "New Property" */
      .creating .properties-base-label {
        display: none !important;
      }
    }
  `],
})
export class Properties implements OnInit {
  private readonly aletheia = inject(AletheiaHttpClient);
  private readonly sync = inject(EntitySyncService);
  private readonly validator = inject(ShaclValidatorService);

  readonly entity = PropertyEntity;
  readonly RoomEntity = RoomEntity;
  readonly PROPERTY_SHAPE_KEY = PROPERTY_SHAPE_IRI;
  readonly ROOM_SHAPE_KEY = ROOM_SHAPE_IRI;
  readonly AI_SCENARIO_CREATE_TEXT = 'property.create.text';
  readonly AI_SCENARIO_CREATE_PHOTOS = 'property.create.photos';
  readonly AI_SCENARIO_EDIT_TEXT = 'property.edit.text';
  readonly AI_SCENARIO_EDIT_PHOTOS = 'property.edit.photos';
  readonly AI_SCENARIO_COMPLETE_TEXT = 'property.complete.text';
  readonly AI_SCENARIO_COMPLETE_PHOTOS = 'property.complete.photos';
  readonly AI_SCENARIO_INTENT_TEXT = 'property.intent.text';
  readonly AI_SCENARIO_INTENT_PHOTOS = 'property.intent.photos';
  readonly formRef = viewChild(DynamicEntityFormComponent);
  readonly items = signal<Property[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<PageMode>('list');
  readonly confirmingDelete = signal(false);
  readonly deletingItem = signal<Record<string, unknown> | null>(null);
  readonly aiWizardOpen = signal(false);
  readonly aiEditIri = signal<string | null>(null);
  readonly aiWarnings = signal<ShapeViolation[]>([]);

  /** Existing properties handed to the AI wizard for intent detection and edit picking. */
  readonly aiExistingProperties = computed(() =>
    this.items().map((p) => {
      const record = p as unknown as Record<string, unknown>;
      return {
        ...record,
        iri: (record['iri'] as string) ?? '',
        name: (record['name'] as string) ?? '',
        address: (record['address'] as string) ?? '',
      };
    }),
  );

  /**
   * The in-progress draft handed to the wizard when the user taps "Ask again":
   * the AI completes/corrects it (e.g. "add address …") instead of starting over.
   */
  readonly aiDraft = computed<Record<string, unknown> | null>(() => {
    if (this.mode() === 'edit') {
      return this.editingItem() ? { ...this.editingItem()!, rooms: this.rooms() } : null;
    }
    if (this.mode() === 'create') {
      return this.pendingProperty() ? { ...this.pendingProperty()!, rooms: this.rooms() } : null;
    }
    return null;
  });

  /** The draft's property IRI when "Ask again" continues an existing edit. */
  readonly aiDraftIri = computed<string | null>(() =>
    this.mode() === 'edit' ? ((this.editingItem()?.['iri'] as string) ?? null) : null,
  );

  readonly editingItem = signal<Record<string, unknown> | null>(null);
  readonly rooms = signal<Record<string, unknown>[]>([]);
  readonly originalRooms = signal<Record<string, unknown>[]>([]);
  readonly openRoomIndices = signal<Set<number>>(new Set());

  /** Composite SHACL violations for the property + rooms tree. */
  readonly validationErrors = signal<ShapeViolation[]>([]);

  // ── Mobile create wizard state ──────────────────────────────────────────
  readonly createSteps: CreateStepDef[] = [
    { id: 'details', labelKey: 'nav.properties.stepDetails' },
    { id: 'room', labelKey: 'nav.properties.stepRooms' },
    { id: 'review', labelKey: 'nav.properties.stepReview' },
  ];
  readonly createStep = signal<CreateStep>('details');
  readonly pendingProperty = signal<Record<string, unknown> | null>(null);
  readonly mobileDetailsForm = viewChild<DynamicEntityFormComponent>('mobileDetailsForm');
  readonly mobileRoomForm = viewChild<DynamicEntityFormComponent>('mobileRoomForm');

  readonly rowActions: TableAction[] = [
    { label: 'Edit', icon: 'pencil', action: (item) => this.enterEdit(item) },
    { label: 'Delete', icon: 'trash', action: (item) => { this.deletingItem.set(item); this.confirmingDelete.set(true); } },
  ];

  ngOnInit(): void {
    this.refresh();
  }

  /** Open the AI creation wizard as an overlay over the list view. */
  openAiWizard(): void {
    this.aiWizardOpen.set(true);
  }

  /**
   * The AI wizard produced a proposal. When the AI detected an edit of an
   * existing property, apply it in edit mode; otherwise create a new one.
   * A partial fill is fine — missing details surface as a warning.
   */
  async onAiProposal(data: Record<string, unknown>): Promise<void> {
    this.aiWizardOpen.set(false);
    const iri = this.aiEditIri();
    this.aiEditIri.set(null);
    if (iri) {
      await this.applyAiEditProposal(data, iri);
    } else {
      this.enterCreate();
      await this.applyAiProposal(data);
    }
  }

  /**
   * Applies the AI's validated edit proposal to an existing property: field
   * changes land on editingItem (edit mode) and rooms are refreshed — either
   * from the proposal or from the property's existing segmentation.
   */
  async applyAiEditProposal(data: Record<string, unknown>, iri: string): Promise<void> {
    const existing = this.items().find((p) => p['iri'] === iri);
    if (!existing) {
      // The property is gone — fall back to creating a new one.
      this.enterCreate();
      await this.applyAiProposal(data);
      return;
    }

    const { rooms: proposedRooms, ...propertyData } = data;
    const merged: Record<string, unknown> = { ...existing, ...propertyData, iri };
    for (const [key, value] of Object.entries(merged)) {
      if (typeof value === 'object' && value !== null && 'iri' in value) {
        merged[key] = (value as { iri: string }).iri;
      }
    }
    this.editingItem.set(merged);
    this.originalRooms.set([]);
    this.validationErrors.set([]);
    this.openRoomIndices.set(new Set());
    this.mode.set('edit');

    if (Array.isArray(proposedRooms) && proposedRooms.length > 0) {
      this.rooms.set(proposedRooms.map((room) => ({ ...(room as Record<string, unknown>) })));
      this.originalRooms.set(structuredClone(this.rooms()));
      await this.refreshAiWarnings(data);
      return;
    }

    // No rooms in the proposal — load the existing ones as in enterEdit.
    this.rooms.set([]);
    const children = existing['segmentedInto'];
    if (Array.isArray(children) && children.length > 0) {
      const roomIRIs: string[] = children
        .map((c: unknown) => {
          if (typeof c === 'object' && c !== null && 'iri' in (c as object)) return (c as { iri: string }).iri;
          if (typeof c === 'string') return c;
          return '';
        })
        .filter(Boolean);
      if (roomIRIs.length > 0) {
        const fetches = roomIRIs.map((riri) =>
          this.aletheia.get<Record<string, unknown>>(RoomEntity.entityPath!, riri),
        );
        forkJoin(fetches).subscribe((loadedRooms) => {
          this.rooms.set(loadedRooms as Record<string, unknown>[]);
          this.originalRooms.set(structuredClone(loadedRooms) as Record<string, unknown>[]);
        });
      }
    }
    await this.refreshAiWarnings(data);
  }

  /**
   * Applies the AI's validated create proposal: property fields land in
   * pendingProperty (review) and any rooms populate the room list.
   */
  async applyAiProposal(data: Record<string, unknown>): Promise<void> {
    const { rooms: proposedRooms, ...propertyData } = data;
    this.pendingProperty.set({ ...propertyData });
    this.rooms.set(
      Array.isArray(proposedRooms)
        ? proposedRooms.map((room) => ({ ...(room as Record<string, unknown>) }))
        : [],
    );
    this.createStep.set('review');
    this.mode.set('create');
    await this.refreshAiWarnings(data);
  }

  /**
   * The AI is allowed to fill only part of the form — validate the proposal
   * against the strict shape and surface anything missing as a warning.
   */
  private async refreshAiWarnings(data: Record<string, unknown>): Promise<void> {
    const violations = await this.validator.validate(PROPERTY_SHAPE_IRI, {
      ...data,
      rooms: this.rooms(),
    });
    this.aiWarnings.set(violations);
  }

  /** Lets the user chat / voice again to complete a partial fill. */
  reopenAiWizard(): void {
    this.aiWizardOpen.set(true);
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.list<Property>(this.entity.entityPath!).subscribe({
      next: (res: AletheiaCollection<Property>) => {
        this.items.set(res.items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load properties');
        this.loading.set(false);
      },
    });
  }

  enterCreate(): void {
    this.editingItem.set(null);
    this.rooms.set([]);
    this.pendingProperty.set(null);
    this.createStep.set('details');
    this.openRoomIndices.set(new Set());
    this.validationErrors.set([]);
    this.aiWarnings.set([]);
    this.mode.set('create');
  }

  enterEdit(item: Record<string, unknown>): void {
    const normalized: Record<string, unknown> = { ...item };
    for (const [key, value] of Object.entries(normalized)) {
      if (typeof value === 'object' && value !== null && 'iri' in value) {
        normalized[key] = (value as { iri: string }).iri;
      }
    }
    this.editingItem.set(normalized);
    this.rooms.set([]);
    this.originalRooms.set([]);
    this.validationErrors.set([]);
    this.aiWarnings.set([]);
    this.mode.set('edit');

    // Load existing rooms from segmentedInto (inherited from Segmentation)
    const children = item['segmentedInto'];
    if (Array.isArray(children) && children.length > 0) {
      const roomIRIs: string[] = children.map((c: unknown) => {
        if (typeof c === 'object' && c !== null && 'iri' in (c as object)) return (c as { iri: string }).iri;
        if (typeof c === 'string') return c;
        return '';
      }).filter(Boolean);

      if (roomIRIs.length > 0) {
        const fetches = roomIRIs.map((iri) => this.aletheia.get<Record<string, unknown>>(RoomEntity.entityPath!, iri));
        forkJoin(fetches).subscribe((loadedRooms) => {
          this.rooms.set(loadedRooms as Record<string, unknown>[]);
          this.originalRooms.set(structuredClone(loadedRooms) as Record<string, unknown>[]);
        });
      }
    }
  }

  exitCreate(): void {
    this.editingItem.set(null);
    this.deletingItem.set(null);
    this.confirmingDelete.set(false);
    this.pendingProperty.set(null);
    this.createStep.set('details');
    this.openRoomIndices.set(new Set());
    this.validationErrors.set([]);
    this.aiWarnings.set([]);
    this.mode.set('list');
  }

  onDelete(): void {
    const item = this.deletingItem();
    if (!item?.['iri']) return;
    this.loading.set(true);
    this.error.set(null);

    this.sync.deleteWithChildren({
      parentPath: this.entity.entityPath!,
      parentIRI: item['iri'] as string,
      childPath: RoomEntity.entityPath!,
      children: this.rooms(),
    }).subscribe({
      next: () => {
        this.confirmingDelete.set(false);
        this.deletingItem.set(null);
        this.editingItem.set(null);
        this.rooms.set([]);
        this.mode.set('list');
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to delete property');
        this.loading.set(false);
      },
    });
  }

  /**
   * Validates the property and its rooms through the backend view engine —
   * one JSON document, one POST, before anything is persisted.
   */
  async onPropertySaved(data: Record<string, unknown>): Promise<void> {
    this.validationErrors.set([]);
    const violations = await this.validator.validate(PROPERTY_SHAPE_IRI, {
      ...data,
      rooms: this.rooms(),
    });
    if (violations.length > 0) {
      this.validationErrors.set(violations);
      return;
    }

    if (this.mode() === 'create') this.onCreate(data);
    else this.onUpdate(data);
  }

  onCreate(data: Record<string, unknown>): void {
    this.loading.set(true);
    this.error.set(null);

    this.sync.saveWithChildren({
      parentPath: this.entity.entityPath!,
      parentData: data,
      childPath: RoomEntity.entityPath!,
      childParentField: 'isPartOf',
      children: this.rooms(),
    }).subscribe({
      next: () => {
        this.mode.set('list');
        this.editingItem.set(null);
        this.rooms.set([]);
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to create property');
        this.loading.set(false);
      },
    });
  }

  onUpdate(data: Record<string, unknown>): void {
    const item = this.editingItem();
    if (!item?.['iri']) return;
    this.loading.set(true);
    this.error.set(null);

    this.sync.saveWithChildren({
      parentPath: this.entity.entityPath!,
      parentData: data,
      parentIRI: item['iri'] as string,
      childPath: RoomEntity.entityPath!,
      childParentField: 'isPartOf',
      children: this.rooms(),
      originalChildren: this.originalRooms(),
    }).subscribe({
      next: () => {
        this.mode.set('list');
        this.editingItem.set(null);
        this.rooms.set([]);
        this.originalRooms.set([]);
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to update property');
        this.loading.set(false);
      },
    });
  }

  onRowClick(item: Record<string, unknown>): void {
    this.enterEdit(item);
  }

  addRoom(): void {
    this.rooms.update((r) => [
      ...r,
      { name: '', location: '', roomSize: null, furnishingStatus: '', roomStatus: '' },
    ]);
  }

  removeRoom(index: number): void {
    this.rooms.update((r) => r.filter((_, i) => i !== index));
  }

  updateRoom(index: number, data: Record<string, unknown>): void {
    this.rooms.update((r) => r.map((room, i) => i === index ? { ...room, ...data } : room));
  }

  /** Composite violations scoped to one room, with the `rooms[i].` prefix stripped. */
  violationsForRoom(index: number): ShapeViolation[] {
    const prefix = `rooms[${index}].`;
    return this.validationErrors()
      .filter((violation) => violation.jsonPath.startsWith(prefix))
      .map((violation) => ({ ...violation, jsonPath: violation.jsonPath.slice(prefix.length) }));
  }

  /** True when the room at the given index carries violations — outline it red. */
  roomHasViolations(index: number): boolean {
    const prefix = `rooms[${index}].`;
    return this.validationErrors().some((violation) => violation.jsonPath.startsWith(prefix));
  }

  /** Composite violations scoped to the property itself (no rooms prefix). */
  propertyViolations(): ShapeViolation[] {
    return this.validationErrors().filter((violation) => !violation.jsonPath.startsWith('rooms['));
  }

  // ── Mobile create wizard ─────────────────────────────────────────────────

  stepIndex(id: CreateStep): number {
    return this.createSteps.findIndex((s) => s.id === id);
  }

  /**
   * Validate the details form. On success the form emits `saved`, which
   * stores the payload in `pendingProperty`. Returns whether it passed.
   */
  private async captureDetails(): Promise<boolean> {
    const form = this.mobileDetailsForm();
    if (!form) return false;
    return form.save();
  }

  /** Validate the room form currently shown in the room step. */
  private async captureCurrentRoom(): Promise<boolean> {
    const form = this.mobileRoomForm();
    if (!form) return false;
    return form.save();
  }

  /** Validate the details step, capture the data, then jump to review. */
  async savePropertyToReview(): Promise<void> {
    const ok = await this.captureDetails();
    if (ok) this.createStep.set('review');
  }

  /** Validate the details step, then add a fresh room and move to the room step. */
  async addRoomAndNext(): Promise<void> {
    const ok = await this.captureDetails();
    if (!ok) return;
    this.addRoom();
    this.createStep.set('room');
  }

  /** Validate the current room before appending another one. */
  async nextRoom(): Promise<void> {
    const ok = await this.captureCurrentRoom();
    if (!ok) return;
    this.addRoom();
  }

  /** Validate the current room, then jump to the review step. */
  async finishToReview(): Promise<void> {
    const ok = await this.captureCurrentRoom();
    if (ok) this.createStep.set('review');
  }

  /** Return from the room or review step to the details step. */
  backToDetails(): void {
    this.createStep.set('details');
  }

  /** Add a room directly in the review step and expand its accordion item. */
  addRoomInline(): void {
    const newIndex = this.rooms().length;
    this.addRoom();
    this.openRoomIndices.update((open) => {
      const next = new Set(open);
      next.add(newIndex);
      return next;
    });
  }

  /** Persist the drafted property and its rooms — backend-validated. */
  async finalSave(): Promise<void> {
    const data = this.pendingProperty() ?? {};
    this.validationErrors.set([]);
    const violations = await this.validator.validate(PROPERTY_SHAPE_IRI, {
      ...data,
      rooms: this.rooms(),
    });
    if (violations.length > 0) {
      this.validationErrors.set(violations);
      return;
    }
    this.onCreate(data);
  }
}
