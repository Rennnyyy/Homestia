import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmButtonDirective } from '@spartan-ng/helm/button';
import { PropertyCreateComponent } from './property-create.component';
import { PropertyService, EnumService, RoomService } from '../../core/state';
import type { Property, CreatePropertyPayload, CreateRoomPayload } from '../../core/api';

type PageView = 'list' | 'create' | 'edit';

@Component({
    selector: 'app-properties',
    imports: [TranslatePipe, HlmButtonDirective, PropertyCreateComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="space-y-4">
      @if (view() === 'list') {
        <!-- ── List View ── -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-50">{{ 'PROPERTIES.TITLE' | translate }}</h1>
          <button hlmBtn variant="primary" (click)="openCreate()">
            {{ 'PROPERTIES.ADD' | translate }}
          </button>
        </div>

        <!-- Error state -->
        @if (propertyService.error(); as err) {
          <div class="rounded-lg border border-destructive-200 bg-destructive-50 p-4 text-center text-destructive-600 dark:text-destructive-400">
            {{ err }}
          </div>
        }

        <!-- Empty state -->
        @if (!propertyService.loading() && !propertyService.error() && properties().length === 0) {
          <div class="rounded-lg border border-surface-200 p-12 text-center text-surface-400 dark:text-surface-500">
            {{ 'PROPERTIES.EMPTY' | translate }}
          </div>
        }

        <!-- Property list -->
        @if (!propertyService.loading() && properties().length > 0) {
          <div class="rounded-lg border border-surface-200">
            @for (p of properties(); track p.iri; let i = $index) {
              <button
                class="flex w-full items-center gap-3 border-b border-surface-200 px-4 py-3 text-left last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                (click)="openEdit(i)"
              >
                <span class="font-medium text-surface-900 dark:text-surface-50">{{ p.name }}</span>
                @if (p.segmentedInto?.length) {
                  <span class="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                    {{ p.segmentedInto.length === 1 ? ('PROPERTIES.ROOM_COUNT_ONE' | translate) : ('PROPERTIES.ROOM_COUNT_OTHER' | translate:{ count: p.segmentedInto.length }) }}
                  </span>
                }
              </button>
            }
          </div>
        }
      }

      <!-- ── Create View ── -->
      @if (view() === 'create') {
        <app-property-create
          (cancelled)="view.set('list')"
          (saved)="onCreated($event)"
          (roomsToCreate)="onRoomsToCreate($event)"
        />
      }

      <!-- ── Edit View ── -->
      @if (view() === 'edit') {
        <app-property-create
          [initialProperty]="editingProperty()!"
          (cancelled)="view.set('list')"
          (saved)="onUpdated($event)"
          (deleted)="onDeleted()"
        />
      }
    </div>
  `
})
export class PropertiesComponent implements OnInit {
  protected readonly propertyService = inject(PropertyService);
  protected readonly roomService = inject(RoomService);
  protected readonly enumService = inject(EnumService);
  protected readonly view = signal<PageView>('list');
  protected readonly editingIndex = signal(0);
  protected readonly properties = this.propertyService.properties;
  protected readonly editingProperty = signal<Property | null>(null);

  /** Room payloads queued by the create form — processed before creating the property. */
  private pendingRoomPayloads: CreateRoomPayload[] | null = null;
  private pendingPropertyPayload: CreatePropertyPayload | null = null;

  ngOnInit(): void {
    this.enumService.loadAll();
    this.propertyService.loadAll();
  }

  protected openCreate(): void {
    this.view.set('create');
  }

  protected openEdit(index: number): void {
    this.editingIndex.set(index);
    const prop = this.properties()[index];
    this.editingProperty.set(prop ?? null);
    this.view.set('edit');
  }

  /** Queues room payloads. If property payload already arrived, starts the create sequence. */
  protected onRoomsToCreate(roomPayloads: CreateRoomPayload[]): void {
    this.pendingRoomPayloads = roomPayloads;
    this.tryCreateWithRooms();
  }

  /** Queues property payload. If room payloads already arrived, starts the create sequence. */
  protected onCreated(payload: CreatePropertyPayload): void {
    this.pendingPropertyPayload = payload;
    this.tryCreateWithRooms();
  }

  private tryCreateWithRooms(): void {
    const propPayload = this.pendingPropertyPayload;
    const roomPayloads = this.pendingRoomPayloads;
    if (!propPayload) return;

    if (!roomPayloads || roomPayloads.length === 0) {
      this.propertyService.create(propPayload);
      this.view.set('list');
      this.pendingPropertyPayload = null;
      return;
    }

    // Step 1: create property
    this.propertyService.createAndReturn(propPayload, async (propertyIri) => {
      // Step 2: create rooms sequentially — wait for all before reloading
      for (const roomPayload of roomPayloads) {
        await this.roomService.createAsync({ ...roomPayload, isPartOf: propertyIri });
      }
      this.propertyService.loadAll();
      this.view.set('list');
      this.pendingPropertyPayload = null;
      this.pendingRoomPayloads = null;
    });
  }

  protected onUpdated(payload: CreatePropertyPayload): void {
    const prop = this.editingProperty();
    if (prop) {
      this.propertyService.update(prop.iri, payload);
    }
    this.view.set('list');
  }

  protected onDeleted(): void {
    const prop = this.editingProperty();
    if (prop) {
      this.propertyService.delete(prop.iri);
    }
    this.view.set('list');
  }
}
