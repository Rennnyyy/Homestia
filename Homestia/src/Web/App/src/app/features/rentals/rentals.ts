import { Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { forkJoin, lastValueFrom } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  LucideFileSignature, LucidePlus, LucideChevronRight, LucideTrash,
  LucideCheck, LucideLock,
} from '@lucide/angular';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { AletheiaHttpClient } from '../../shared/services/aletheia-http-client';
import { ShaclValidatorService } from '../../core/shapes';
import {
  RENTAL_APPLICATION_SHAPE_IRI, RENTAL_CONTRACT_SHAPE_IRI, RENTAL_DEPOSIT_SHAPE_IRI,
  RENTAL_HANDOVER_SHAPE_IRI, RENTAL_TENANCY_SHAPE_IRI, RENTAL_NOTICED_SHAPE_IRI,
  RENTAL_HANDBACK_SHAPE_IRI, RENTAL_TERMINATED_SHAPE_IRI,
} from '../../core/shapes';
import type { ShapeViolation } from '../../core/shapes';
import { DynamicEntityFormComponent, type EntityManageConfig } from '../../shared/components/dynamic-entity-form/dynamic-entity-form.component';
import {
  DynamicEntityTableComponent,
  type TableAction,
} from '../../shared/components/dynamic-entity-table/dynamic-entity-table.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RentalEntity } from '../../entities/rental.entity';

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
  { id: 0, key: 'application', labelKey: 'nav.rentals.stage.application', shapeIri: RENTAL_APPLICATION_SHAPE_IRI },
  { id: 1, key: 'contract', labelKey: 'nav.rentals.stage.contract', shapeIri: RENTAL_CONTRACT_SHAPE_IRI },
  { id: 2, key: 'deposit', labelKey: 'nav.rentals.stage.deposit', shapeIri: RENTAL_DEPOSIT_SHAPE_IRI },
  { id: 3, key: 'handover', labelKey: 'nav.rentals.stage.handover', shapeIri: RENTAL_HANDOVER_SHAPE_IRI },
  { id: 4, key: 'tenancy', labelKey: 'nav.rentals.stage.tenancy', shapeIri: RENTAL_TENANCY_SHAPE_IRI },
  { id: 5, key: 'noticed', labelKey: 'nav.rentals.stage.noticed', shapeIri: RENTAL_NOTICED_SHAPE_IRI },
  { id: 6, key: 'handback', labelKey: 'nav.rentals.stage.handback', shapeIri: RENTAL_HANDBACK_SHAPE_IRI },
  { id: 7, key: 'terminated', labelKey: 'nav.rentals.stage.terminated', shapeIri: RENTAL_TERMINATED_SHAPE_IRI },
];

/** Resolves an entity reference value (IRI string or { iri } object) to its IRI. */
function refIri(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'iri' in (value as object)) {
    return ((value as { iri: unknown }).iri as string) ?? '';
  }
  return '';
}

/**
 * The query aspect that derives each rental's lifecycle state from indirect
 * knowledge (currentStage reference + tenant presence) on the backend. Sending
 * its IRI on the rentals list request enables the read-time enrichment.
 */
const RENTAL_STATE_QUERY_ASPECT_IRI = 'urn:aletheia:homestia:query:rental-state';

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
    FormsModule,
    HlmButton,
    LucideFileSignature,
    LucidePlus,
    LucideChevronRight,
    LucideTrash,
    LucideCheck,
    LucideLock,
    DynamicEntityFormComponent,
    DynamicEntityTableComponent,
    ConfirmDialogComponent,
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

        @if (mode() === 'list') {
          <div class="hidden md:flex items-center gap-2 rentals-actions">
            <button hlmBtn size="sm" (click)="enterCreate()">
              <svg lucidePlus class="size-4 mr-1"></svg>
              {{ 'nav.rentals.create' | transloco }}
            </button>
          </div>
        }
      </div>

      <!-- Create/Edit subtext -->
      @if (mode() === 'create') {
        <p class="hidden md:block" style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.rentals.createSubtext' | transloco }}</p>
      }
      @if (mode() === 'edit') {
        <p style="font-size: 1em; color: var(--muted-foreground); margin-bottom: 15px;">{{ 'nav.rentals.editSubtext' | transloco }}</p>
      }

      <!-- List mode: tree table — expand a rental to reveal its stages -->
      @if (mode() === 'list') {
        <app-dynamic-entity-table
          [entity]="entity"
          [items]="displayItems()"
          [loading]="loading()"
          [error]="error()"
          [columnNames]="['tenant', 'startDate', 'property', 'currentStage']"
          [defaultVisibleColumns]="['tenant', 'startDate', 'property', 'currentStage']"
          [emptyMessage]="'nav.rentals.empty'"
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
          <app-confirm-dialog
            [title]="'nav.rentals.deleteTitle'"
            [message]="'nav.rentals.deleteConfirm'"
            [confirmLabel]="'nav.rentals.delete'"
            [destructive]="true"
            (confirmed)="onDelete()"
            (cancelled)="confirmingDelete.set(false); deletingItem.set(null)" />
        }
        <!-- Mobile-only Add Rental button (below table) -->
        <div class="md:hidden flex items-center gap-2" style="margin-top: 24px;">
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
                      @for (form of [formNonce()]; track form) {
                        <app-dynamic-entity-form
                          [entity]="entity"
                          [mode]="'edit'"
                          [value]="workingRental()"
                          [fieldNames]="['property', 'unit', 'tenant', 'viewingDate']"
                          [shapeKey]="stage.shapeIri"
                          [violations]="stageViolationsFor(stage.id)"
                          [createActions]="{ tenant: { labelKey: 'nav.rentals.addTenant' } }"
                          [fieldDependencies]="{ unit: { dependsOn: 'property', via: 'isPartOf' } }"
                          [fieldFooters]="{ tenant: tenantCreateForm }"
                          [manage]="manageConfig"
                          [showDescriptions]="false"
                          (createRequested)="onCreateRequested($event)" />
                      }
                    } @else {
                      <app-dynamic-entity-form
                        [entity]="entity"
                        [mode]="'edit'"
                        [value]="workingRental()"
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

        <!-- Footer actions -->
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
          <button hlmBtn (click)="saveRental()" [disabled]="loading()">
            {{ 'nav.rentals.save' | transloco }}
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

      <!-- Inline tenant quick-create — projected under the tenant field via fieldFooters -->
      <ng-template #tenantCreateForm>
        @if (showTenantForm()) {
          <div class="border border-border rounded-lg p-3 mt-2 flex flex-col gap-2">
            <p class="text-xs text-muted-foreground">{{ 'nav.rentals.addTenantHint' | transloco }}</p>
            <label class="text-sm font-medium text-foreground">{{ 'fields.tenant.displayName' | transloco }}</label>
            <input type="text"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              [ngModel]="tenantName()" (ngModelChange)="tenantName.set($event)" />
            <label class="text-sm font-medium text-foreground">{{ 'fields.tenant.email' | transloco }}</label>
            <input type="text"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              [ngModel]="tenantEmail()" (ngModelChange)="tenantEmail.set($event)" />
            <label class="text-sm font-medium text-foreground">{{ 'fields.tenant.phone' | transloco }}</label>
            <input type="text"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              [ngModel]="tenantPhone()" (ngModelChange)="tenantPhone.set($event)" />
            <div class="flex justify-end">
              <button hlmBtn size="sm" (click)="saveTenant()" [disabled]="loading() || !tenantName().trim()">
                {{ 'nav.rentals.saveTenant' | transloco }}
              </button>
            </div>
          </div>
        }
      </ng-template>

      <!-- Property & room "New / Edit" jump buttons are rendered generically by the
           dynamic form's [manage] config — no per-field templates needed here. -->
    </div>
  `,
  styles: [`
    /* A stage carrying SHACL violations — red outline. */
    .stage-invalid {
      border: 1px solid var(--destructive) !important;
      border-radius: 6px;
      box-shadow: 0 0 0 1px var(--destructive);
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

  readonly entity = RentalEntity;
  readonly stages = STAGES;

  /**
   * Generic "New / Edit" manage targets for the Application-stage EntityRefs —
   * keyed by entity path; the dynamic form renders the jump buttons.
   */
  readonly manageConfig: Record<string, EntityManageConfig> = {
    properties: {
      route: '/properties',
      create: () => ({ mode: 'create' }),
      edit: (iri) => ({ mode: 'edit', iri }),
    },
    rooms: {
      route: '/properties',
      create: (parentIri) => (parentIri ? { mode: 'edit', iri: parentIri } : { mode: 'create' }),
      edit: (iri, parentIri) => (parentIri ? { mode: 'edit', iri: parentIri, room: iri } : null),
    },
  };

  // ── List state ──────────────────────────────────────────────────────────
  readonly items = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<PageMode>('list');
  readonly confirmingDelete = signal(false);
  readonly deletingItem = signal<Record<string, unknown> | null>(null);

  // ── Reference lookups (for display labels + options) ────────────────────
  readonly tenants = signal<{ iri: string; displayName: string }[]>([]);
  readonly properties = signal<{ iri: string; name: string }[]>([]);
  readonly rooms = signal<{ iri: string; name: string; isPartOf: unknown }[]>([]);
  readonly stageList = signal<{ iri: string; key: string; displayName: string }[]>([]);
  private readonly stageByKey = signal<Map<string, string>>(new Map());

  // ── Create/edit state ───────────────────────────────────────────────────
  readonly pendingRental = signal<Record<string, unknown> | null>(null);
  readonly editingItem = signal<Record<string, unknown> | null>(null);
  readonly doneStages = signal<Set<number>>(new Set());
  readonly stageViolations = signal<Map<number, ShapeViolation[]>>(new Map());
  readonly savingStage = signal(false);

  /** Bumped to re-mount the Application form so its dropdowns reload options (e.g. after creating a tenant). */
  readonly formNonce = signal(0);

  // ── Tenant quick-create ─────────────────────────────────────────────────
  readonly showTenantForm = signal(false);
  readonly tenantName = signal('');
  readonly tenantEmail = signal('');
  readonly tenantPhone = signal('');

  readonly rowActions: TableAction[] = [
    { label: 'Edit', icon: 'pencil', action: (item) => this.enterEdit(item) },
    { label: 'Delete', icon: 'trash', action: (item) => { this.deletingItem.set(item); this.confirmingDelete.set(true); } },
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
    const tenantMap = new Map(this.tenants().map((t) => [t.iri, t.displayName]));
    const propMap = new Map(this.properties().map((p) => [p.iri, p.name]));
    const stageMap = new Map(this.stageList().map((s) => [s.iri, s.displayName]));
    const stageByKeyMap = this.stageByKey();

    const decorated = this.items().map((r) => ({
      ...r,
      tenant: this.refLabel(tenantMap, r['tenant']),
      property: this.refLabel(propMap, r['property']),
      currentStage: this.refLabel(stageMap, r['currentStage']),
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

  private refLabel(map: Map<string, string>, value: unknown): string {
    const iri = refIri(value);
    return iri ? (map.get(iri) ?? iri) : '';
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
    const stateHeaders = new HttpHeaders({ 'X-Aletheia-Query-AspectIri': RENTAL_STATE_QUERY_ASPECT_IRI });
    forkJoin({
      rentals: this.aletheia.list<Record<string, unknown>>('rentals', undefined, stateHeaders),
      tenants: this.aletheia.list<{ iri: string; displayName: string }>('tenants'),
      properties: this.aletheia.list<{ iri: string; name: string }>('properties'),
      rooms: this.aletheia.list<{ iri: string; name: string; isPartOf: unknown }>('rooms'),
      stages: this.aletheia.list<{ iri: string; key: string; displayName: string }>('rental-stages'),
    }).subscribe({
      next: ({ rentals, tenants, properties, rooms, stages }) => {
        this.items.set(rentals.items ?? []);
        this.tenants.set(tenants.items ?? []);
        this.properties.set(properties.items ?? []);
        this.rooms.set(rooms.items ?? []);
        this.stageList.set(stages.items ?? []);
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
    return lastValueFrom(this.aletheia.list<{ iri: string; displayName: string }>('tenants')).then((res) => {
      this.tenants.set(res.items ?? []);
    });
  }

  // ── Mode transitions ────────────────────────────────────────────────────

  enterCreate(): void {
    this.editingItem.set(null);
    this.pendingRental.set({});
    this.doneStages.set(new Set());
    this.stageViolations.set(new Map());
    this.formNonce.set(0);
    this.showTenantForm.set(false);
    this.tenantName.set('');
    this.tenantEmail.set('');
    this.tenantPhone.set('');
    this.mode.set('create');
  }

  enterEdit(item: Record<string, unknown>): void {
    const raw = this.rawItem(item);
    const normalized = this.normalizeRefs(raw);
    this.editingItem.set(normalized);
    this.pendingRental.set(null);
    this.stageViolations.set(new Map());
    this.showTenantForm.set(false);

    // Replay progress: everything before the current stage is done.
    const curKey = [...this.stageByKey().entries()].find(([, iri]) => iri === refIri(normalized['currentStage']))?.[0];
    const idx = STAGES.findIndex((s) => s.key === curKey);
    const done = new Set<number>();
    for (let i = 0; i < Math.max(idx, 0); i++) done.add(i);
    this.doneStages.set(done);
    this.mode.set('edit');
  }

  exitCreate(): void {
    this.editingItem.set(null);
    this.pendingRental.set(null);
    this.deletingItem.set(null);
    this.confirmingDelete.set(false);
    this.doneStages.set(new Set());
    this.stageViolations.set(new Map());
    this.mode.set('list');
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
      if (value && typeof value === 'object' && 'iri' in (value as object)) {
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

  /** Validates the current stage against its view aspect; passing unlocks the next. */
  async saveStage(stageId: number): Promise<void> {
    const working = this.workingRental();
    if (!working) return;
    this.savingStage.set(true);
    try {
      const violations = await this.validator.validate(STAGES[stageId].shapeIri, working);
      const map = new Map(this.stageViolations());
      map.set(stageId, violations);
      this.stageViolations.set(map);
      if (violations.length === 0) {
        const done = new Set(this.doneStages());
        done.add(stageId);
        this.doneStages.set(done);
      }
    } finally {
      this.savingStage.set(false);
    }
  }

  // ── Tenant quick-create ─────────────────────────────────────────────────

  /** Toggles the tenant quick-create card when the inline selector action fires. */
  onCreateRequested(event: { propertyName: string; entityPath: string }): void {
    if (event.propertyName === 'tenant') {
      this.showTenantForm.set(!this.showTenantForm());
    }
  }

  async saveTenant(): Promise<void> {
    const name = this.tenantName().trim();
    if (!name) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const created = await lastValueFrom(this.aletheia.create('tenants', {
        displayName: name,
        email: this.tenantEmail().trim(),
        phone: this.tenantPhone().trim(),
      }));
      await this.loadTenants();
      const working = this.workingRental();
      if (working) working['tenant'] = created.iri;
      // Re-mount the Application form so the new tenant appears in its dropdown.
      this.formNonce.update((n) => n + 1);
      this.showTenantForm.set(false);
      this.tenantName.set('');
      this.tenantEmail.set('');
      this.tenantPhone.set('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tenant';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Save / delete the rental ────────────────────────────────────────────

  /** Persists the draft/edit; currentStage advances to the first incomplete stage. */
  async saveRental(): Promise<void> {
    const working = this.workingRental();
    if (!working) return;

    const current = STAGES[Math.min(this.currentStageIndex(), STAGES.length - 1)];
    const stageIri = this.stageByKey().get(current.key);
    const data: Record<string, unknown> = { ...working };
    if (stageIri) data['currentStage'] = stageIri;

    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'create') {
        await lastValueFrom(this.aletheia.create('rentals', data));
      } else {
        const iri = this.editingItem()?.['iri'];
        if (typeof iri !== 'string') return;
        await lastValueFrom(this.aletheia.update('rentals', iri, data));
      }
      this.exitCreate();
      this.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save rental';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  onDelete(): void {
    const item = this.deletingItem();
    const iri = item?.['iri'];
    if (typeof iri !== 'string') return;
    this.loading.set(true);
    this.error.set(null);
    this.aletheia.delete('rentals', iri).subscribe({
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
