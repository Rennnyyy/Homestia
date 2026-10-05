import { AletheiaModelService, refIri, type EntityInfo } from '@rennnyyy/aletheia-core';
import {
  ConfirmDialogComponent,
  EntityFormComponent,
  EntityTableComponent,
  ObjectUploadComponent,
  type ColumnConfigs,
  type ObjectUploadItem,
  type TableAction,
} from '@rennnyyy/aletheia-ui';
import { Component, computed, inject, signal, effect, OnInit, viewChildren } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin, lastValueFrom } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HlmButton } from '@rennnyyy/aletheia-ui';
import {
  LucideFileSignature, LucidePlus, LucideChevronRight, LucideTrash,
  LucideCheck, LucideLock, LucideArrowUpRight, LucideSparkles, LucideAlertTriangle,
} from '@lucide/angular';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { AiAssistantWizardComponent } from '../../shared/components/ai-assistant-wizard/ai-assistant-wizard.component';
import { AletheiaHttpClient } from '@rennnyyy/aletheia-core';
import { ShaclValidatorService } from '@rennnyyy/aletheia-core';
import { operationAspectHeaders, queryAspectHeaders } from '@rennnyyy/aletheia-core';
import {
  RENTAL_APPLICATION_SHAPE_IRI, RENTAL_CONTRACT_SHAPE_IRI, RENTAL_DEPOSIT_SHAPE_IRI,
  RENTAL_HANDBACK_SHAPE_IRI, RENTAL_HANDOVER_SHAPE_IRI, RENTAL_NOTICED_SHAPE_IRI,
  RENTAL_TENANCY_SHAPE_IRI, RENTAL_TERMINATED_SHAPE_IRI, TENANT_SHAPE_IRI,
  rentalOperationIriFor, TENANT_OPERATION_IRI, RENTAL_STATE_QUERY_ASPECT_IRI,
  PROPERTY_QUERY_ASPECT_IRI, ROOM_QUERY_ASPECT_IRI, TENANT_QUERY_ASPECT_IRI,
} from '../../core/shapes/shape.model';
import type { ShapeViolation } from '@rennnyyy/aletheia-core';

type PageMode = 'list' | 'create' | 'edit';
type StageStatus = 'done' | 'current' | 'locked';

/** One stage of the rental agreement lifecycle, in workflow order. */
interface StageDef {
  id: number;
  key: string;
  labelKey: string;
  shapeIri: string;
}

/**
 * The rental lifecycle — a sequence of view aspects. Each stage validates
 * against its own backend shape (distinct target class), so a stage only
 * unlocks once the previous stage conforms: Application → Contract → Deposit →
 * Handover → Tenancy → Termination Noticed → Handback → Terminated.
 */
const STAGES: StageDef[] = [
  { id: 0, key: 'application', labelKey: 'enum.rental-stages.application', shapeIri: RENTAL_APPLICATION_SHAPE_IRI },
  { id: 1, key: 'contract', labelKey: 'enum.rental-stages.contract', shapeIri: RENTAL_CONTRACT_SHAPE_IRI },
  { id: 2, key: 'deposit', labelKey: 'enum.rental-stages.deposit', shapeIri: RENTAL_DEPOSIT_SHAPE_IRI },
  { id: 3, key: 'handover', labelKey: 'enum.rental-stages.handover', shapeIri: RENTAL_HANDOVER_SHAPE_IRI },
  { id: 4, key: 'tenancy', labelKey: 'enum.rental-stages.tenancy', shapeIri: RENTAL_TENANCY_SHAPE_IRI },
  { id: 5, key: 'noticed', labelKey: 'enum.rental-stages.noticed', shapeIri: RENTAL_NOTICED_SHAPE_IRI },
  { id: 6, key: 'handback', labelKey: 'enum.rental-stages.handback', shapeIri: RENTAL_HANDBACK_SHAPE_IRI },
  { id: 7, key: 'terminated', labelKey: 'enum.rental-stages.terminated', shapeIri: RENTAL_TERMINATED_SHAPE_IRI },
];

/** Derived lifecycle states, in overview order (top group first). */
const RENTAL_STATES = ['new', 'progressing', 'active', 'ending', 'closed'] as const;
type RentalState = (typeof RENTAL_STATES)[number];

/** i18n label key per state. */
const STATE_LABEL_KEYS: Record<RentalState, string> = {
  new: 'nav.rentals.state.new',
  progressing: 'nav.rentals.state.progressing',
  active: 'nav.rentals.state.active',
  ending: 'nav.rentals.state.ending',
  closed: 'nav.rentals.state.closed',
};

@Component({
  selector: 'app-rentals',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    LucideFileSignature,
    LucidePlus,
    LucideChevronRight,
    LucideTrash,
    LucideCheck,
    LucideLock,
    LucideArrowUpRight,
    LucideSparkles,
    LucideAlertTriangle,
    RouterLink,
    EntityFormComponent,
    EntityTableComponent,
    ObjectUploadComponent,
    ConfirmDialogComponent,
    AiAssistantWizardComponent,
    ...HlmAccordionImports,
  ],
  template: `
    <div class="max-w-6xl mx-auto px-6">
      <!-- Header: breadcrumb + actions -->
      <div class="flex items-center rentals-header" style="padding: 15px 0 20px 0; min-height: 70px;">
        <div class="flex items-center gap-2 font-bold text-foreground rentals-breadcrumb" style="font-size: 24px; line-height: 1;" [class.creating]="mode() === 'create'">
          <svg lucideFileSignature class="size-6"></svg>
          <span class="rentals-base-label">{{ 'nav.rentals' | transloco }}</span>
          @if (mode() === 'create') {
            <svg lucideChevronRight class="size-6 rentals-base-label"></svg>
            <span class="text-foreground">{{ 'nav.rentals.createBreadcrumb' | transloco }}</span>
          }
          @if (mode() === 'edit') {
            <svg lucideChevronRight class="size-6"></svg>
            <span class="text-foreground">{{ editingTenantLabel() }}</span>
          }
        </div>

        <div class="flex-1"></div>

        <div class="hidden md:flex items-center gap-2 rentals-actions">
          <!-- From the list it starts a rental and stands on its first stage; inside the stepper it
               stands on whatever stage is shown — it is never absent, because it is also a place to
               ask. On the Contract stage it has no field to fill (its only field is the uploaded
               document), and it says so rather than pretending. -->
          <button hlmBtn size="sm" class="ai-magic-button" (click)="openAssistant()">
            <svg lucideSparkles class="size-4 mr-1"></svg>
            {{ 'ai.assistButton' | transloco }}
          </button>
          @if (mode() === 'list') {
            <button hlmBtn size="sm" (click)="enterCreate()">
              <svg lucidePlus class="size-4 mr-1"></svg>
              {{ 'nav.rentals.create' | transloco }}
            </button>
          }
        </div>
      </div>

      <!-- Create/Edit subtext -->
      @if (mode() === 'create') {
        <p class="hidden md:block" style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.rentals.createSubtext' | transloco }}</p>
      }
      @if (mode() === 'edit') {
        <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.rentals.editSubtext' | transloco }}</p>
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

      <!-- List mode: tree table — expand a rental to reveal its stages -->
      @if (mode() === 'list') {
        <aletheia-entity-table
          [entity]="entity"
          [items]="displayItems()"
          [loading]="loading()"
          [error]="error()"
          [columns]="tableColumns"
          [emptyMessage]="'nav.rentals.empty' | transloco"
          [loadingMessage]="'table.loading'"
          [actions]="rowActions"
          [expandable]="true"
          [rowDetail]="stageTimeline"
          [groupField]="'__group'"
          [groupLabelField]="'__label'"
          [groupChildrenField]="'__children'"
          (rowClick)="onRowClick($event)"
          (refresh)="refresh()"
        />
        @if (confirmingDelete() && deletingItem()) {
          <aletheia-confirm-dialog
            [title]="'nav.rentals.deleteTitle' | transloco"
            [message]="'nav.rentals.deleteConfirm' | transloco"
            [confirmLabel]="'nav.rentals.delete' | transloco"
            [destructive]="true"
            (confirmed)="onDelete()"
            (cancelled)="confirmingDelete.set(false); deletingItem.set(null)" />
        }
        <!-- Mobile-only Add Rental button (below table) -->
        <div class="md:hidden flex items-center gap-2" style="margin-top: 24px;">
          <button hlmBtn size="sm" class="ai-magic-button" (click)="openAssistant()">
            <svg lucideSparkles class="size-4 mr-1"></svg>
            {{ 'ai.assistButton' | transloco }}
          </button>
          <button hlmBtn size="sm" (click)="enterCreate()">
            <svg lucidePlus class="size-4 mr-1"></svg>
            {{ 'nav.rentals.create' | transloco }}
          </button>
        </div>
      }

      <!-- Create/Edit mode: the accordion-in-accordion vertical stepper -->
      @if (mode() === 'create' || mode() === 'edit') {
        <hlm-accordion type="multiple" class="block mt-2 border border-border rounded-lg overflow-hidden">
          @for (stage of stages; track stage.id) {
            <hlm-accordion-item
              style="border-bottom: 1px solid var(--border);"
              [isOpened]="stageStatus(stage.id) === 'current'"
              [class.stage-invalid]="stageHasViolations(stage.id)">
              <hlm-accordion-trigger [triggerClass]="'py-2 hover:bg-muted/50 hover:no-underline items-center'">
                <div class="flex items-center gap-2.5 font-semibold text-foreground" style="font-size: 17px; line-height: 1; padding-left: 10px;">
                  <span class="size-6 rounded-full inline-flex items-center justify-center shrink-0"
                    [class.bg-emerald-500/90]="stageStatus(stage.id) === 'done'"
                    [class.bg-primary]="stageStatus(stage.id) === 'current'"
                    [class.bg-muted]="stageStatus(stage.id) === 'locked'">
                    @if (stageStatus(stage.id) === 'done') {
                      <svg lucideCheck class="size-3.5 text-white"></svg>
                    } @else if (stageStatus(stage.id) === 'current') {
                      <span class="size-1.5 rounded-full bg-primary-foreground"></span>
                    } @else {
                      <svg lucideLock class="size-3 text-muted-foreground"></svg>
                    }
                  </span>
                  <span>{{ stage.labelKey | transloco }}</span>
                  <span class="text-xs font-normal"
                    [class.text-emerald-600]="stageStatus(stage.id) === 'done'"
                    [class.text-primary]="stageStatus(stage.id) === 'current'"
                    [class.text-muted-foreground]="stageStatus(stage.id) === 'locked'">
                    ({{ statusLabelKey(stageStatus(stage.id)) | transloco }})
                  </span>
                </div>
              </hlm-accordion-trigger>
              <hlm-accordion-content>
                <div class="px-4" style="margin-top: 15px;">
                  @if (stageStatus(stage.id) === 'locked') {
                    <p class="text-sm text-muted-foreground" style="margin-bottom: 8px;">{{ 'nav.rentals.stageLockHint' | transloco }}</p>
                  } @else {
                    @if (stage.id === 0) {
                      <!-- Application: property, room and tenant render as global EntityRef
                           selects; the viewing date replaces the application date. The tenant
                           quick-create form and the property/room manage links are projected
                           into their fields via fieldFooters. -->
                      <aletheia-entity-form
                        [entity]="entity"
                        [mode]="'edit'"
                        [value]="workingRental()"
                        #stageForm
                        [fieldNames]="['property', 'unit', 'tenant', 'viewingDate']"
                        [shapeKey]="stage.shapeIri"
                        [violations]="stageViolationsFor(stage.id)"
                        [createActions]="{ Tenant: { labelKey: 'nav.rentals.addTenant' } }"
                        [fieldDependencies]="{ Unit: { dependsOn: 'property', via: 'isPartOf' } }"
                        [queryAspects]="applicationQueryAspects"
                        [fieldFooters]="{ Tenant: tenantCreateForm }"
                        [fieldActions]="{ Property: propertyManageLink, Unit: unitManageLink }"
                        [reloadActions]="{ Tenant: tenantReloadKey() }"
                        (createRequested)="onCreateRequested($event)" />
                    } @else if (stage.id === 1) {
                      <!-- Contract: a single field — the uploaded object-bearing documents.
                            The generic object-upload renders the list, upload, download, and
                           delete; changes flow back into workingRental.rentalDocuments. -->
                      <aletheia-object-upload
                        [route]="'rental-documents'"
                        [documents]="contractDocuments()"
                        [labelKey]="'fields.rental.rentalDocuments'"
                        (changed)="onContractDocumentsChanged($event)"
                        (removed)="onContractDocumentRemoved($event)" />
                    } @else {
                      <aletheia-entity-form
                        [entity]="entity"
                        [mode]="'edit'"
                        [value]="workingRental()"
                        #stageForm
                        [shapeKey]="stage.shapeIri"
                        [violations]="stageViolationsFor(stage.id)" />
                    }
                    <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                      <button hlmBtn size="sm" (click)="saveStage(stage.id)" [disabled]="savingStage()">
                        {{ 'nav.rentals.continueStage' | transloco }}
                      </button>
                    </div>
                  }
                </div>
              </hlm-accordion-content>
            </hlm-accordion-item>
          }
        </hlm-accordion>

        <!-- Mobile-only assistant button: the header row is desktop-only. -->
        <div class="md:hidden flex items-center gap-2" style="margin-top: 16px;">
          <button hlmBtn size="sm" class="ai-magic-button" (click)="openAssistant()">
            <svg lucideSparkles class="size-4 mr-1"></svg>
            {{ 'ai.assistButton' | transloco }}
          </button>
        </div>

        <!-- Footer actions — every stage persists on its own "Save & Continue",
             so the only global actions here are Delete (edit mode) and Cancel. -->
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; padding-bottom: 32px;">
          @if (mode() === 'edit') {
            <button hlmBtn variant="outline" class="text-destructive hover:bg-destructive/10 border-destructive/30" (click)="deletingItem.set(editingItem()); confirmingDelete.set(true)">
              <svg lucideTrash class="size-4 mr-1"></svg>
              {{ 'nav.rentals.delete' | transloco }}
            </button>
            <div class="flex-1"></div>
          }
          <button hlmBtn variant="outline" class="text-foreground" (click)="exitCreate()">
            {{ 'common.cancel' | transloco }}
          </button>
        </div>
      }

      <!-- Row detail template: the rental's stage timeline (tree expansion) -->
      <ng-template #stageTimeline let-rental>
        <div class="flex flex-col gap-1">
          <p class="text-xs font-medium text-muted-foreground mb-1">{{ 'nav.rentals.stages' | transloco }}</p>
          @for (stage of rental['__stages']; track stage.key) {
            <div class="flex items-center gap-2.5 py-0.5 text-sm">
              <span class="size-5 rounded-full inline-flex items-center justify-center shrink-0"
                [class.bg-emerald-500/90]="stage.status === 'done'"
                [class.bg-primary]="stage.status === 'current'"
                [class.bg-muted]="stage.status === 'locked'">
                @if (stage.status === 'done') {
                  <svg lucideCheck class="size-3 text-white"></svg>
                } @else if (stage.status === 'current') {
                  <span class="size-1.5 rounded-full bg-primary-foreground"></span>
                } @else {
                  <svg lucideLock class="size-3 text-muted-foreground"></svg>
                }
              </span>
              <span class="text-foreground"
                [class.font-semibold]="stage.status === 'current'"
                [class.text-muted-foreground]="stage.status === 'locked'">
                {{ stage.labelKey | transloco }}
              </span>
              <span class="ml-auto text-xs"
                [class.text-emerald-600]="stage.status === 'done'"
                [class.text-primary]="stage.status === 'current'"
                [class.text-muted-foreground]="stage.status === 'locked'">
                {{ statusLabelKey(stage.status) | transloco }}
              </span>
            </div>
          }
        </div>
      </ng-template>

      <!-- Application-stage "New / Edit" jump buttons — the SDK form renders them
           behind the field's value via [fieldActions]. The semantics are the ones
           the form's old [manage] config had: the property link edits the selected
           property or creates a new one, and the room link is only offered once a
           property is chosen. -->
      <ng-template #propertyManageLink let-value>
        <div class="flex shrink-0 items-center gap-1.5">
          @if (value) {
            <a [routerLink]="'/properties'" [queryParams]="propertyManageParams(value)"
              class="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="{{ 'entityRefSelect.edit' | transloco }}">
              <svg lucideArrowUpRight class="size-3.5 text-muted-foreground"></svg>
              {{ 'entityRefSelect.edit' | transloco }}
            </a>
          }
          <a [routerLink]="'/properties'" [queryParams]="propertyManageParams(null)"
            class="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            title="{{ 'entityRefSelect.new' | transloco }}">
            <svg lucideArrowUpRight class="size-3.5 text-muted-foreground"></svg>
            {{ 'entityRefSelect.new' | transloco }}
          </a>
        </div>
      </ng-template>

      <ng-template #unitManageLink let-value>
        <div class="flex shrink-0 items-center gap-1.5">
          @if (value && parentPropertyIri()) {
            <a [routerLink]="'/properties'" [queryParams]="roomManageParams(value)"
              class="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="{{ 'entityRefSelect.edit' | transloco }}">
              <svg lucideArrowUpRight class="size-3.5 text-muted-foreground"></svg>
              {{ 'entityRefSelect.edit' | transloco }}
            </a>
          }
          <a [routerLink]="'/properties'" [queryParams]="roomManageParams(null)"
            class="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            title="{{ 'entityRefSelect.new' | transloco }}">
            <svg lucideArrowUpRight class="size-3.5 text-muted-foreground"></svg>
            {{ 'entityRefSelect.new' | transloco }}
          </a>
        </div>
      </ng-template>

      <!-- Inline tenant quick-create — projected under the tenant field via fieldFooters.
           It reuses the generic dynamic form + Tenant view shape, so the create button is
           ALWAYS enabled and violations are fed back inline exactly like every other form. -->
      <ng-template #tenantCreateForm>
        @if (showTenantForm()) {
          <div class="border border-border rounded-lg p-3 mt-2 flex flex-col gap-2">
            <p class="text-xs text-muted-foreground">{{ 'nav.rentals.addTenantHint' | transloco }}</p>
            @if (tenantError(); as err) {
              <p class="text-sm text-destructive">{{ err }}</p>
            }
            <aletheia-entity-form
              #tenantForm
              [entity]="tenantEntity"
              [mode]="'create'"
              [shapeKey]="tenantShapeKey"
              (saved)="onTenantSaved($event)" />
            <div class="flex justify-end">
              <button hlmBtn size="sm" (click)="saveTenantFromForm(tenantForm)" [disabled]="savingTenant()">
                {{ 'nav.rentals.saveTenant' | transloco }}
              </button>
            </div>
          </div>
        }
      </ng-template>

      <!-- Property & room jump buttons are projected per field via [fieldActions]
           (see the templates above). -->

      <!-- AI wizard overlay — launched from inside the stepper, filling the stage it shows. The
           domain is 'rental' and only the fill key is bound: launched from a stage, the intent,
           edit and complete keys have nothing left to decide. -->
      @if (aiWizardOpen()) {
        <app-ai-assistant-wizard
          domain="rental"
          [placeholderKey]="aiPlaceholderKey()"
          [textScenarioKey]="aiScenarioKey()"
          [draft]="aiDraft()"
          (proposal)="onAiProposal($event)"
          (close)="aiWizardOpen.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    /* A stage carrying SHACL violations — red outline. */
    .stage-invalid {
      border: 1px solid var(--destructive) !important;
      border-radius: 6px;
      box-shadow: 0 0 0 1px var(--destructive);
    }
    /* The AI assistant entry button — friendly gradient, easy to spot. */
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
    @media (max-width: 767px) {
      :host {
        display: block;
        padding-top: 32px;
      }
      .rentals-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
        margin-bottom: 32px !important;
        min-height: auto !important;
        padding: 0 !important;
      }
      .rentals-breadcrumb {
        gap: 12px !important;
        font-size: 30px !important;
      }
      .rentals-breadcrumb svg[lucideFileSignature] {
        width: 32px !important;
        height: 32px !important;
        color: var(--primary) !important;
      }
      .rentals-breadcrumb svg[lucideChevronRight] {
        width: 32px !important;
        height: 32px !important;
      }
      .rentals-actions {
        margin-top: 8px !important;
      }
      /* In create mode on mobile, show only the icon + "New Rental" */
      .creating .rentals-base-label {
        display: none !important;
      }
    }
  `],
})
export class Rentals implements OnInit {
  private readonly aletheia = inject(AletheiaHttpClient);
  private readonly validator = inject(ShaclValidatorService);
  private readonly model = inject(AletheiaModelService);
  private readonly transloco = inject(TranslocoService);

  readonly entity = this.entityInfoFor('rental');

  /**
   * The `EntityInfo` the SDK's table and form take, straight from the backend's
   * definitions (loaded before the app boots — see app.config). Routes and IRIs
   * come from the generated identity const, which is compiled from the same model.
   */
  private entityInfoFor(predicatePath: string): EntityInfo {
    const info = this.model.getEntity(predicatePath);
    if (!info) {
      throw new Error(
        `The backend's definitions carry no '${predicatePath}' entity — the model did not load, so this page cannot render its fields.`,
      );
    }
    return info;
  }

  /**
   * The rentals table's columns — exactly these four, in this order, and no
   * others offered: the tree shows a stage timeline under each row, so the
   * remaining properties are noise, not options.
   *
   * Keyed by the entity's API ROUTE, which is what identifies the entity here.
   */
  /**
   * The list's columns. A rental names its tenant, its property and its stage by IRI, and the table
   * shows a reference it cannot resolve as its last path segment — a bare identifier. Naming them is
   * the row type's job, and `formatters` is where the table asks for it.
   */
  readonly tableColumns: ColumnConfigs = {
    rentals: {
      order: ['tenant', 'rentalDocuments', 'property', 'currentStage'],
      visible: ['tenant', 'rentalDocuments', 'property', 'currentStage'],
      restrict: true,
      formatters: {
        tenant: (value) => this.tenantLabel(value),
        property: (value) => this.propertyLabel(value),
        currentStage: (value) => this.stageLabel(value),
        // A count of documents reads as documents, not as "3 item(s)" — the count is this column's
        // sentence, and the table asks the row type for it. (The SDK's own count is English for
        // every host that does not name its unit.)
        rentalDocuments: (value) => this.documentCountLabel(value),
      },
    },
  };
  readonly stages = STAGES;

  /**
   * Router targets for the Application stage's "New / Edit" jump buttons.
   *
   * The SDK form renders them through `fieldActions` (one template per field),
   * which is the successor of the old `[manage]` config: the property field
   * edits the selected property or creates a new one, and a room is always
   * managed inside its property — so the room link needs the property that is
   * selected right now.
   */
  readonly parentPropertyIri = computed<string | null>(() => {
    // `refIri` answers an absent reference with an EMPTY STRING, which `?? null`
    // would pass straight through — so the null has to be asked for explicitly,
    // or the computed never satisfies the type it declares.
    const iri = refIri((this.workingRental() ?? {})['property']);
    return iri || null;
  });

  /** Jump params for the property field. */
  propertyManageParams(value: unknown): Record<string, unknown> {
    const iri = refIri(value as Record<string, unknown> | string | null);
    return iri ? { mode: 'edit', iri } : { mode: 'create' };
  }

  /** Jump params for the room field — a room lives inside the selected property. */
  roomManageParams(value: unknown): Record<string, unknown> {
    const parentIri = this.parentPropertyIri();
    const roomIri = refIri(value as Record<string, unknown> | string | null);
    if (!parentIri) return { mode: 'create' };
    return roomIri
      ? { mode: 'edit', iri: parentIri, room: roomIri }
      : { mode: 'edit', iri: parentIri };
  }

  // ── List state ──────────────────────────────────────────────────────────
  readonly items = signal<Record<string, unknown>[]>([]);

  /**
   * The query aspects the Application stage's pickers read their options under. A rental belongs
   * to the landlord of the property it is for, so a landlord may only ever pick from its OWN
   * properties and rooms: the field → aspect map makes the dropdowns ask the gated collections
   * instead of every record in the store. Keys are the fields' CLR property names.
   */
  readonly applicationQueryAspects: Record<string, string> = {
    Property: PROPERTY_QUERY_ASPECT_IRI,
    Unit: ROOM_QUERY_ASPECT_IRI,
  };
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<PageMode>('list');
  readonly confirmingDelete = signal(false);
  readonly deletingItem = signal<Record<string, unknown> | null>(null);

  // ── AI Personal Assistent (per rental stage) ────────────────────────────
  readonly aiWizardOpen = signal(false);
  /** The stage the wizard was launched for; the wizard's key and validation follow it. */
  private readonly aiTargetStage = signal(0);
  readonly aiWarnings = signal<ShapeViolation[]>([]);

  /** The stage the assistant fills: the one the stepper showed when it was launched. */
  readonly aiCurrentStage = computed(() => STAGES[Math.min(this.aiTargetStage(), STAGES.length - 1)]);

  /**
   * The scenario that fills that stage. One scenario per stage, so the step is judged by the stage's
   * OWN AI view — the model is asked for the right fields by construction, not by a sentence.
   */
  readonly aiScenarioKey = computed(() => `rental.stage.${this.aiCurrentStage().key}.text`);

  /** The composer's invitation for that stage — a deposit is not a viewing. */
  readonly aiPlaceholderKey = computed(() => `ai.rental.stage.${this.aiCurrentStage().key}.placeholder`);

  /** The rental so far — handed to the model so earlier stages are kept, not rebuilt. */
  readonly aiDraft = computed<Record<string, unknown> | null>(() => this.workingRental());

  // ── Reference lookups (for display labels + options) ────────────────────
  /**
   * The tenants, for the reference cells of the list. Kept as `{iri, displayName}` because that is
   * what the list needs and what the selector already receives.
   */
  readonly tenants = signal<{ iri: string; displayName: string }[]>([]);

  /** The properties, for the list's Property cell — a rental names one by IRI alone. */
  readonly properties = signal<{ iri: string; name: string }[]>([]);

  /**
   * What the list's Tenant cell shows: the tenant's name, or its IRI when the name is not loaded.
   *
   * The table renders a reference it was handed the raw IRI for as an em dash, because resolving
   * one entity from another is not the table's business — and a row of em dashes tells a reader
   * nothing about which rental is which. This page holds both registries already, so it names them.
   */
  tenantLabel(iri: unknown): string {
    const wanted = refIri(iri);
    if (!wanted) return '';
    return this.tenants().find((tenant) => tenant.iri === wanted)?.displayName ?? wanted;
  }

  /** What the list's Property cell shows: the property's name, or its IRI. */
  propertyLabel(iri: unknown): string {
    const wanted = refIri(iri);
    if (!wanted) return '';
    return this.properties().find((property) => property.iri === wanted)?.name ?? wanted;
  }

  /**
   * What the list's Current Stage cell shows: the stage's translated name.
   *
   * The stage registry maps a KEY to an IRI, so its inverse names the stage a rental stands on; a
   * stage the registry does not know is shown as the IRI it was given rather than as nothing.
   */
  stageLabel(iri: unknown): string {
    const wanted = refIri(iri);
    if (!wanted) return '';
    const known = this.stages.find((stage) => this.stageByKey().get(stage.key) === wanted);
    return known ? this.transloco.translate(known.labelKey) : wanted;
  }

  /**
   * What the list's Rental Documents cell shows: how many documents the rental carries.
   *
   * The count is a sentence, so it is translated with its number as a parameter, and the fallback is
   * written here rather than assumed — a key that stops resolving must not print itself.
   */
  documentCountLabel(value: unknown): string {
    const count = Array.isArray(value) ? value.length : 0;
    const key = 'rentals.documentCount';
    const translated = this.transloco.translate(key, { count });
    return translated && translated !== key ? translated : `${count} item(s)`;
  }
  readonly rooms = signal<{ iri: string; name: string; isPartOf: unknown }[]>([]);
  private readonly stageByKey = signal<Map<string, string>>(new Map());

  // ── Create/edit state ───────────────────────────────────────────────────
  readonly pendingRental = signal<Record<string, unknown> | null>(null);
  readonly editingItem = signal<Record<string, unknown> | null>(null);
  readonly doneStages = signal<Set<number>>(new Set());
  readonly stageViolations = signal<Map<number, ShapeViolation[]>>(new Map());
  readonly savingStage = signal(false);

  /**
   * Bumped after an inline tenant create so the tenant EntityRef dropdown
   * reloads its options and selects the new entry — WITHOUT re-mounting the
   * whole Application form (which used to reset the other field selections).
   */
  readonly tenantReloadKey = signal(0);

  // ── Contract documents (Stage 2) ───────────────────────────────────────

  /** Loaded metadata of the uploaded contract documents (iri/name/contentType). */
  readonly contractDocuments = signal<ObjectUploadItem[]>([]);

  /**
   * IRIs the user removed in the Contract stage UI. The owning rental is
   * saved without them (replace-set PUT drops the references) and THEN the
   * server-side document entity + blob are deleted — only once the rental is
   * persisted. Deleting without saving (Cancel) leaves the documents in place.
   */
  private pendingDocDeletes: string[] = [];

  // ── Tenant quick-create ─────────────────────────────────────────────────
  readonly showTenantForm = signal(false);
  readonly savingTenant = signal(false);
  readonly tenantError = signal<string | null>(null);
  /** The inline tenant create reuses the generic dynamic form + Tenant view shape. */
  readonly tenantEntity = this.entityInfoFor('tenant');
  readonly tenantShapeKey = TENANT_SHAPE_IRI;

  /**
   * A row action's `label` is a TRANSLATION KEY — the table renders it through the transloco pipe.
   * Literals here read as English in every language, which is what they used to do.
   */
  readonly rowActions: TableAction[] = [
    { label: 'common.edit', icon: 'pencil', action: (item) => this.enterEdit(item) },
    { label: 'common.delete', icon: 'trash', action: (item) => { this.deletingItem.set(item); this.confirmingDelete.set(true); } },
  ];

  ngOnInit(): void {
    this.refresh();
  }

  /** The object the stage forms mutate — the create draft or the item being edited. */
  readonly workingRental = computed<Record<string, unknown> | null>(() =>
    this.mode() === 'edit' ? this.editingItem() : this.pendingRental(),
  );

  /**
   * Cascade guard: when the selected property changes, clear a room (unit) that
   * no longer belongs to it, so a stale room can't be saved against a different
   * property. Only clears on a positive mismatch (room found + known isPartOf).
   */
  private readonly clearStaleUnit = effect(() => {
    const working = this.workingRental();
    if (!working) return;
    const propertyIri = refIri(working['property']);
    const unitIri = refIri(working['unit']);
    if (!propertyIri || !unitIri) return;
    const room = this.rooms().find((r) => r.iri === unitIri);
    const roomProperty = room ? refIri(room['isPartOf']) : '';
    if (roomProperty && roomProperty !== propertyIri) {
      working['unit'] = '';
    }
  });

  /** Index of the first not-yet-done stage (the current one). */
  readonly currentStageIndex = computed<number>(() => {
    const done = this.doneStages();
    for (let i = 0; i < STAGES.length; i++) {
      if (!done.has(i)) return i;
    }
    return STAGES.length;
  });

  /** The tenant display name for the edit breadcrumb (falls back to the IRI). */
  readonly editingTenantLabel = computed<string>(() => {
    const iri = refIri(this.editingItem()?.['tenant']);
    if (!iri) return '';
    return this.tenants().find((t) => t.iri === iri)?.displayName ?? iri;
  });

  stageAvailable(stageId: number): boolean {
    return stageId === 0 || this.doneStages().has(stageId - 1);
  }

  stageStatus(stageId: number): StageStatus {
    if (this.doneStages().has(stageId)) return 'done';
    return this.stageAvailable(stageId) ? 'current' : 'locked';
  }

  statusLabelKey(status: StageStatus): string {
    switch (status) {
      case 'done': return 'nav.rentals.stageDone';
      case 'current': return 'nav.rentals.stageCurrent';
      default: return 'nav.rentals.stageLocked';
    }
  }

  stageViolationsFor(stageId: number): ShapeViolation[] {
    return this.stageViolations().get(stageId) ?? [];
  }

  stageHasViolations(stageId: number): boolean {
    return this.stageViolationsFor(stageId).length > 0;
  }

  // ── Display decoration (tree table) ─────────────────────────────────────

  /**
   * Tree-table rows arranged by derived state: one expandable group header per
   * state (in overview order), each holding its rentals. The state comes from
   * the backend QueryAspect enrichment (`state` field); a local fallback keeps
   * the grouping stable even if the field is absent.
   */
  readonly displayItems = computed<Record<string, unknown>[]>(() => {
    const stageByKeyMap = this.stageByKey();

    // EntityRef labels (tenant / property / currentStage) are resolved by the
    // table itself — enums translated by key via the i18n dictionary — so the
    // rows keep raw IRIs here.
    const decorated = this.items().map((r) => ({
      ...r,
      __stages: this.computeStages(r, stageByKeyMap),
      __state: this.stateOf(r),
    }));

    const byState = new Map<string, Record<string, unknown>[]>();
    for (const item of decorated) {
      const key = (item['__state'] as string) || 'progressing';
      const bucket = byState.get(key) ?? [];
      bucket.push(item);
      byState.set(key, bucket);
    }

    const result: Record<string, unknown>[] = [];
    for (const key of RENTAL_STATES) {
      const members = byState.get(key);
      if (!members?.length) continue;
      result.push({
        __group: key,
        __label: STATE_LABEL_KEYS[key as RentalState] ?? key,
        __children: members,
      });
    }
    return result;
  });

  /** The rental's derived state — backend enrichment first, local fallback second. */
  private stateOf(rental: Record<string, unknown>): string {
    const state = rental['state'];
    if (typeof state === 'string' && state.length > 0) return state;
    return this.fallbackState(rental);
  }

  /** Local fallback mapping the stage key to a state (mirrors the QueryAspect). */
  private fallbackState(rental: Record<string, unknown>): string {
    const key = this.stageKeyOf(rental);
    switch (key) {
      case 'terminated': return 'closed';
      case 'handback':
      case 'noticed': return 'ending';
      case 'tenancy': return 'active';
      case 'application': return refIri(rental['tenant']) ? 'progressing' : 'new';
      default: return 'progressing';
    }
  }

  private stageKeyOf(rental: Record<string, unknown>): string {
    const iri = refIri(rental['currentStage']);
    return [...this.stageByKey().entries()].find(([, v]) => v === iri)?.[0] ?? '';
  }

  private computeStages(
    rental: Record<string, unknown>,
    stageByKeyMap: Map<string, string>,
  ): { key: string; labelKey: string; status: StageStatus }[] {
    const curIri = refIri(rental['currentStage']);
    const curKey = [...stageByKeyMap.entries()].find(([, iri]) => iri === curIri)?.[0];
    const idx = STAGES.findIndex((s) => s.key === curKey);
    const current = idx < 0 ? 0 : idx;
    return STAGES.map((s, i) => ({
      key: s.key,
      labelKey: s.labelKey,
      status: i < current ? 'done' : i === current ? 'current' : 'locked',
    }));
  }

  // ── Data loading ────────────────────────────────────────────────────────

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    // Opt into the QueryAspect enrichment so the backend derives the `state`
    // field per rental from indirect knowledge (currentStage + tenant).
    const stateHeaders = queryAspectHeaders(RENTAL_STATE_QUERY_ASPECT_IRI);
    forkJoin({
      rentals: this.aletheia.query<Record<string, unknown>>('rentals', {}, stateHeaders),
      tenants: this.aletheia.query<{ iri: string; displayName: string }>('tenants', {}, queryAspectHeaders(TENANT_QUERY_ASPECT_IRI)),
      rooms: this.aletheia.query<{ iri: string; name: string; isPartOf: unknown }>('rooms', {}, queryAspectHeaders(ROOM_QUERY_ASPECT_IRI)),
      properties: this.aletheia.query<{ iri: string; name: string }>('properties', {}, queryAspectHeaders(PROPERTY_QUERY_ASPECT_IRI)),
      stages: this.aletheia.query<{ iri: string; key: string; displayName: string }>('rental-stages'),
    }).subscribe({
      next: ({ rentals, tenants, rooms, properties, stages }) => {
        this.items.set(rentals.items ?? []);
        this.tenants.set(tenants.items ?? []);
        this.rooms.set(rooms.items ?? []);
        this.properties.set(properties.items ?? []);
        const keyMap = new Map<string, string>();
        for (const s of stages.items ?? []) keyMap.set(s.key, s.iri);
        this.stageByKey.set(keyMap);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load rentals');
        this.loading.set(false);
      },
    });
  }

  private loadTenants(): Promise<void> {
    return lastValueFrom(this.aletheia.query<{ iri: string; displayName: string }>('tenants', {}, queryAspectHeaders(TENANT_QUERY_ASPECT_IRI))).then((res) => {
      this.tenants.set(res.items ?? []);
    });
  }

  // ── Mode transitions ────────────────────────────────────────────────────

  enterCreate(): void {
    this.editingItem.set(null);
    this.pendingRental.set({});
    this.doneStages.set(new Set());
    this.stageViolations.set(new Map());
    this.tenantReloadKey.set(0);
    this.contractDocuments.set([]);
    this.pendingDocDeletes = [];
    this.showTenantForm.set(false);
    this.savingTenant.set(false);
    this.tenantError.set(null);
    this.mode.set('create');
  }

  enterEdit(item: Record<string, unknown>): void {
    const raw = this.rawItem(item);
    const normalized = this.normalizeRefs(raw);
    this.editingItem.set(normalized);
    this.pendingRental.set(null);
    this.stageViolations.set(new Map());
    this.pendingDocDeletes = [];
    this.showTenantForm.set(false);
    this.tenantError.set(null);

    // Replay progress: everything before the current stage is done.
    const curKey = [...this.stageByKey().entries()].find(([, iri]) => iri === refIri(normalized['currentStage']))?.[0];
    const idx = STAGES.findIndex((s) => s.key === curKey);
    const done = new Set<number>();
    for (let i = 0; i < Math.max(idx, 0); i++) done.add(i);
    this.doneStages.set(done);
    // Switch to edit mode FIRST — loadContractDocuments() reads the working
    // rental, which only points at editingItem once mode is 'edit' (while in
    // 'list' mode it is the null pendingRental, so the stored document
    // references would never be loaded and the uploaded files would look lost).
    this.mode.set('edit');
    this.loadContractDocuments();
  }

  exitCreate(): void {
    this.editingItem.set(null);
    this.pendingRental.set(null);
    this.deletingItem.set(null);
    this.confirmingDelete.set(false);
    this.doneStages.set(new Set());
    this.stageViolations.set(new Map());
    // Leaving without saving discards any queued document removals.
    this.pendingDocDeletes = [];
    this.mode.set('list');
    // Stage saves are durable now — reflect any rentals persisted before the
    // user left the editor.
    this.refresh();
  }

  // ── AI Personal Assistent ───────────────────────────────────────────────

  /**
   * Open the assistant. From the list there is no open stage yet, so it starts a rental and stands
   * on the first stage — the same entry the "Add Rental" button has, with the description already
   * asked for. Inside the stepper it fills the stage the reader is on, because a stage is the unit
   * of progress and "where am I" is the context — nothing has to be detected.
   */
  openAssistant(): void {
    if (this.mode() === 'list') this.enterCreate();
    this.openStageAssistant();
  }

  /** Open the assistant on the stage the stepper shows. */
  private openStageAssistant(): void {
    this.aiTargetStage.set(Math.min(this.currentStageIndex(), STAGES.length - 1));
    this.aiWarnings.set([]);
    this.aiWizardOpen.set(true);
  }

  /** Lets the reader chat / voice again to complete a partial fill. */
  reopenAiWizard(): void {
    this.aiWizardOpen.set(true);
  }

  /**
   * The wizard produced a proposal. It merges into the rental so far — the
   * earlier stages are kept — and lands in the stage form the reader is looking
   * at. The stage is NOT saved here: "Save & Continue" stays the only write, so
   * what the AI filled is always something the reader saw before it persisted.
   */
  async onAiProposal(data: Record<string, unknown>): Promise<void> {
    this.aiWizardOpen.set(false);
    const working = this.workingRental();
    if (!working) return;
    // REPLACE the object the mounted form two-way binds — a mutation would not re-render it.
    const merged = { ...this.normalizeRefs(working), ...this.collapseRefs(data) };
    if (this.mode() === 'edit') this.editingItem.set(merged);
    else this.pendingRental.set(merged);
    await this.refreshAiWarnings();
  }

  /** Collapses `{ iri }` reference objects in a proposal to plain IRI strings. */
  private collapseRefs(data: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'iri' in (value as object)) {
        out[key] = ((value as { iri: unknown }).iri as string) ?? '';
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  /**
   * The AI is allowed to fill only part of a stage — the model is judged by the
   * stage's lenient AI view, so a sentence that carried half the fields still
   * returned. Here the draft meets the STRICT stage shape: what is still missing
   * is reported against the stage the reader is on, and "Ask again" is offered.
   */
  private async refreshAiWarnings(): Promise<void> {
    const working = this.workingRental();
    if (!working) {
      this.aiWarnings.set([]);
      return;
    }
    const violations = await this.validator.validate(this.aiCurrentStage().shapeIri, working);
    this.aiWarnings.set(violations);
  }

  /** Resolves the raw (undecorated) item by IRI — the table works on display copies. */
  private rawItem(item: Record<string, unknown>): Record<string, unknown> {
    const iri = item['iri'];
    if (typeof iri === 'string') {
      const found = this.items().find((r) => r['iri'] === iri);
      if (found) return found;
    }
    return item;
  }

  /** Collapses { iri } reference objects to plain IRI strings for the forms. */
  private normalizeRefs(item: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (Array.isArray(value)) {
        // EntityRefCollection — collapse each { iri } element to a plain IRI string.
        out[key] = value.map((v) => refIri(v)).filter(Boolean);
      } else if (value && typeof value === 'object' && 'iri' in (value as object)) {
        out[key] = ((value as { iri: unknown }).iri as string) ?? '';
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  onRowClick(item: Record<string, unknown>): void {
    this.enterEdit(item);
  }

  // ── Stage gating ────────────────────────────────────────────────────────

  /**
   * Validates the stage against its view aspect and, when it conforms,
   * PERSISTS the rental (create on the first save, update afterwards) with
   * currentStage advanced to the next incomplete stage. Every "Save &
   * Continue" is therefore durable — uploaded documents and earlier stages
   * survive a reload — and it is the only save action (no global Save button).
   */
  /**
   * EVERY stage form on screen, in template order — the contract stage uploads instead of asking,
   * so it has none. A query that returns only the FIRST match is what made this page read the wrong
   * form: the Application stage is never locked, it stands first, and an accordion panel that is
   * closed is still in the DOM — so the first match was the Application form for every stage.
   */
  readonly stageForms = viewChildren<EntityFormComponent>('stageForm');

  /**
   * The form of the stage being saved, found by the shape it validates against — the one fact that
   * names a stage unambiguously (the stage IRIs are these shape IRIs' last segments). Selecting by
   * position would break the moment a stage stops rendering a form.
   */
  private stageFormFor(stageId: number): EntityFormComponent | undefined {
    const shapeIri = STAGES[stageId].shapeIri;
    return this.stageForms().find((form) => form.shapeKey() === shapeIri);
  }

  /**
   * The draft as the form shows it: the page's own draft, with everything the stage's own form
   * carries merged into IT — the same object, not a copy.
   *
   * The mounted forms hold their own copy of the draft, and the first save records the new rental's
   * IRI on the draft so the next stage updates instead of creating a second rental. `payload()` is
   * the same object `save()` emits: every field at the arity its entity declares, which is what a
   * write has to carry.
   *
   * Reading the WRONG stage's form is invisible on screen — the control keeps what the reader
   * picked — and lands as a shape complaint about a field the reader can see filled: the stale copy
   * still holds the empty string the form was seeded with, and `sh:minLength 1` reports it while
   * `sh:minCount 1` (an empty literal is still a value node) passes.
   */
  private draftToSave(stageId: number): Record<string, unknown> | null {
    const draft = this.workingRental();
    if (!draft) return null;
    const edited = this.stageFormFor(stageId)?.payload();
    if (edited) Object.assign(draft, edited);
    return draft;
  }

  async saveStage(stageId: number): Promise<void> {
    const working = this.draftToSave(stageId);
    if (!working) return;
    this.savingStage.set(true);
    this.error.set(null);
    try {
      const violations = await this.validator.validate(STAGES[stageId].shapeIri, working);
      const map = new Map(this.stageViolations());
      map.set(stageId, violations);
      this.stageViolations.set(map);
      // Restrictions not satisfied — do NOT persist; the form shows the errors.
      if (violations.length > 0) return;

      // Persist with currentStage = the next stage still to fill, so a reload
      // re-opens exactly where the user left off.
      const done = new Set(this.doneStages());
      done.add(stageId);
      let nextIdx = 0;
      while (nextIdx < STAGES.length && done.has(nextIdx)) nextIdx++;
      const currentIdx = Math.min(nextIdx, STAGES.length - 1);
      const stageIri = this.stageByKey().get(STAGES[currentIdx].key);
      const data: Record<string, unknown> = { ...working };
      // EntityRefCollection fields must be sent as arrays of IRI strings.
      if (Array.isArray(data['rentalDocuments'])) {
        data['rentalDocuments'] = (data['rentalDocuments'] as unknown[]).map((v) => refIri(v)).filter(Boolean);
      }
      if (stageIri) data['currentStage'] = stageIri;

      const iri = refIri(working['iri']);
      // The gate is the stage being saved — its fields and its presence rules — not the stage
      // the rental will be sitting at afterwards. Each write names its own selection: a write
      // that selects none is unrestricted (see aspect-wiring.spec.ts).
      if (iri) {
        await lastValueFrom(this.aletheia.update(
          'rentals', iri, data, operationAspectHeaders(rentalOperationIriFor(STAGES[stageId].key)),
        ));
      } else {
        const created = await lastValueFrom(this.aletheia.create(
          'rentals', data, operationAspectHeaders(rentalOperationIriFor(STAGES[stageId].key)),
        ));
        // Keep the mounted forms bound to the SAME working object (swapping it
        // would orphan their two-way bound edits) — just record the new IRI so
        // subsequent stage saves update instead of creating again.
        working['iri'] = refIri(created['iri']);
      }

      // Only mark the stage done once the persist succeeded — otherwise the
      // accordion would advance while nothing was actually saved.
      this.doneStages.set(done);
      // The rental now persists WITHOUT the removed documents (replace-set PUT
      // drops the references) — commit their server-side deletion.
      this.flushDocumentDeletes();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save stage');
    } finally {
      this.savingStage.set(false);
    }
  }

  // ── Contract documents (Stage 2) ───────────────────────────────────────

  /**
   * The Contract stage owns a single field — the uploaded object-bearing
   * documents. Called by the object-upload component on every change: writes
   * the new IRI list onto the working rental and reloads the metadata so the
   * list re-renders with the fresh documents.
   */
  onContractDocumentsChanged(iris: string[]): void {
    const working = this.workingRental();
    if (!working) return;
    working['rentalDocuments'] = iris;
    this.loadContractDocuments();
  }

  /**
   * The user removed a document in the UI — queue it for deletion. The actual
   * server-side delete happens only once the rental is persisted (Save &
   * Continue), so a removal without a save (Cancel) is undone.
   */
  onContractDocumentRemoved(iri: string): void {
    if (iri && !this.pendingDocDeletes.includes(iri)) {
      this.pendingDocDeletes.push(iri);
    }
  }

  /** Deletes the queued document entities + blobs (best effort) after a persist. */
  private flushDocumentDeletes(): void {
    const queued = this.pendingDocDeletes;
    this.pendingDocDeletes = [];
    // Documents belong to the Contract stage, so its aspect governs their deletion.
    void Promise.allSettled(
      queued.map((iri) =>
        lastValueFrom(this.aletheia.delete('rental-documents', iri, operationAspectHeaders(rentalOperationIriFor('contract')))),
      ),
    );
  }

  /** Loads the metadata of every document IRI currently on the working rental. */
  private loadContractDocuments(): void {
    const working = this.workingRental();
    const iris = this.toIriArray(working?.['rentalDocuments']);
    if (iris.length === 0) {
      this.contractDocuments.set([]);
      return;
    }
    forkJoin(iris.map((iri) => this.aletheia.get<Record<string, unknown>>('rental-documents', iri))).subscribe({
      next: (docs) => this.contractDocuments.set(
        docs.map((d) => ({
          iri: d['iri'] as string,
          name: (d['name'] as string) ?? '',
          contentType: (d['contentType'] as string) ?? '',
        })),
      ),
      error: () => this.contractDocuments.set([]),
    });
  }

  private toIriArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => refIri(v)).filter(Boolean);
  }

  // ── Tenant quick-create ─────────────────────────────────────────────────

  /** Toggles the tenant quick-create card when the inline selector action fires. */
  onCreateRequested(field: string): void {
    // The form reports the property by its `propertyName` (the Tenant relation's CLR name), so the
    // check is on the field's identity, not its casing — the label is the app's, the key is the SDK's.
    if (field.toLowerCase() === 'tenant') {
      this.showTenantForm.set(!this.showTenantForm());
    }
  }

  /**
   * The inline tenant create button — always enabled. It delegates to the
   * generic dynamic form, which validates against the Tenant view shape and
   * feeds the errors back inline; only a conforming tenant emits `saved`.
   */
  async saveTenantFromForm(form: EntityFormComponent): Promise<void> {
    if (this.savingTenant()) return;
    this.tenantError.set(null);
    await form.save();
  }

  /** The tenant view conformed — create the tenant and apply it to the rental. */
  async onTenantSaved(data: Record<string, unknown>): Promise<void> {
    const name = typeof data['displayName'] === 'string' ? data['displayName'].trim() : '';
    if (!name) return;
    this.savingTenant.set(true);
    this.tenantError.set(null);
    try {
      const created = await lastValueFrom(this.aletheia.create('tenants', {
        displayName: name,
        email: (data['email'] as string) ?? '',
        phone: (data['phone'] as string) ?? '',
      }, operationAspectHeaders(TENANT_OPERATION_IRI)));
      await this.loadTenants();
      // The new tenant becomes the selection. The mounted form owns its OWN copy of the draft, so a
      // mutation of the page's draft never reaches the dropdown — write through the form that renders
      // it. The reload key below re-fetches the options; the selector re-asserts the (now available)
      // value after render, so the pick lands without re-mounting and every other field stays.
      this.stageFormFor(0)?.setField('tenant', created.iri);
      const working = this.workingRental();
      if (working) working['tenant'] = created.iri;
      this.tenantReloadKey.update((n) => n + 1);
      this.showTenantForm.set(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tenant';
      this.tenantError.set(message);
    } finally {
      this.savingTenant.set(false);
    }
  }

  // ── Delete the rental ───────────────────────────────────────────────────

  onDelete(): void {
    const item = this.deletingItem();
    const iri = item?.['iri'];
    if (typeof iri !== 'string') return;
    this.loading.set(true);
    this.error.set(null);
    // A delete carries no field gate — the backend validates an empty graph — so the stage's
    // aspect is the statement of which rental right is being exercised, taken from the rental
    // itself rather than assumed.
    const stageIri = item?.['currentStage'];
    this.aletheia.delete('rentals', iri, operationAspectHeaders(
      rentalOperationIriFor(typeof stageIri === 'string' ? stageIri : undefined),
    )).subscribe({
      next: () => {
        this.confirmingDelete.set(false);
        this.deletingItem.set(null);
        this.editingItem.set(null);
        this.mode.set('list');
        this.refresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to delete rental');
        this.loading.set(false);
      },
    });
  }
}
