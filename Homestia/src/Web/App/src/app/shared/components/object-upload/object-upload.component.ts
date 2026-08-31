import { Component, input, output, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  LucideUpload,
  LucideDownload,
  LucideTrash,
  LucideFileText,
  LucideLoaderCircle,
} from '@lucide/angular';
import { lastValueFrom } from 'rxjs';
import { AletheiaHttpClient } from '../../services/aletheia-http-client';

/** One uploaded object-bearing document — metadata only, the blob stays in the object store. */
export interface ObjectUploadItem {
  iri: string;
  name?: string;
  contentType?: string;
}

/**
 * ObjectUpload — a generic single-field editor for a collection of
 * object-bearing entities (e.g. contract documents). It is NOT tied to one
 * entity: pass any `[ObjectBearing]` entity path (e.g. 'rental-documents')
 * plus the already-loaded metadata documents, and it renders
 *
 *   • the attached documents as a list (name + content type),
 *   • a download button per document,
 *   • a delete button per document,
 *   • an upload button (create metadata entity → PUT binary content).
 *
 * The parent owns the value: it supplies `documents` (metadata) and receives
 * the new collection — an array of IRI strings — via `changed` on every
 * upload/delete, which it persists on the owning record.
 */
@Component({
  selector: 'app-object-upload',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    LucideUpload,
    LucideDownload,
    LucideTrash,
    LucideFileText,
    LucideLoaderCircle,
  ],
  template: `
    <div>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm font-medium text-foreground">{{ labelKey() | transloco }}</p>
          <p class="text-xs text-muted-foreground" style="margin-top: 2px;">{{ hintKey() | transloco }}</p>
        </div>
        <button hlmBtn size="sm" variant="outline" class="shrink-0" (click)="fileInput.click()" [disabled]="uploading()">
          @if (uploading()) {
            <svg lucideLoaderCircle class="size-4 mr-1 animate-spin"></svg>
            {{ 'nav.rentals.documents.uploading' | transloco }}
          } @else {
            <svg lucideUpload class="size-4 mr-1"></svg>
            {{ 'nav.rentals.documents.upload' | transloco }}
          }
        </button>
        <input #fileInput type="file" hidden (change)="onFileSelected($event)" />
      </div>

      @if (error()) {
        <p class="text-sm text-destructive" style="margin-top: 8px;">{{ error() }}</p>
      }

      @if ((documents() ?? []).length > 0) {
        <ul class="mt-3 flex flex-col gap-1.5">
          @for (doc of documents() ?? []; track doc.iri) {
            <li class="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <svg lucideFileText class="size-4 shrink-0 text-muted-foreground"></svg>
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ doc.name || doc.iri }}</span>
              @if (doc.contentType) {
                <span class="shrink-0 text-xs text-muted-foreground">{{ doc.contentType }}</span>
              }
              <button hlmBtn variant="ghost" size="icon-xs" [title]="'nav.rentals.documents.download' | transloco"
                (click)="download(doc)">
                <svg lucideDownload class="size-4"></svg>
              </button>
              <button hlmBtn variant="ghost" size="icon-xs" [title]="'nav.rentals.documents.delete' | transloco"
                [disabled]="deletingIri() === doc.iri" (click)="remove(doc)">
                <svg lucideTrash class="size-4 text-destructive"></svg>
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-muted-foreground" style="margin-top: 12px;">{{ 'nav.rentals.documents.empty' | transloco }}</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class ObjectUploadComponent {
  private readonly aletheia = inject(AletheiaHttpClient);

  /** The object-bearing entity path (e.g. 'rental-documents') used for all object calls. */
  readonly entityPath = input.required<string>();
  /** Currently attached document metadata (iri/name/contentType) — owned by the parent. */
  readonly documents = input<ObjectUploadItem[] | null>(null);
  /** i18n key for the field label. */
  readonly labelKey = input('fields.rental.rentalDocuments');
  /** i18n key for the field hint. */
  readonly hintKey = input('shape.rental.rentalDocuments');

  /** Emits the new collection — an array of IRI strings — whenever it changes. */
  readonly changed = output<string[]>();

  readonly uploading = signal(false);
  readonly deletingIri = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  private toIris(items: ObjectUploadItem[] | null | undefined): string[] {
    return (items ?? []).map((d) => d.iri).filter(Boolean);
  }

  /**
   * Upload flow: create the object-bearing metadata entity (carrying the file
   * name) → stream the binary content to the object store → emit the new
   * collection so the parent can persist it on the owning record.
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.uploading.set(true);
    this.error.set(null);
    try {
      const path = this.entityPath();
      const created = await lastValueFrom(this.aletheia.create(path, { name: file.name }));
      await lastValueFrom(this.aletheia.uploadObject(path, created.iri, file));
      this.changed.emit([...this.toIris(this.documents()), created.iri]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      this.uploading.set(false);
    }
  }

  /** Downloads the blob and triggers a browser save with the document's file name. */
  async download(item: ObjectUploadItem): Promise<void> {
    this.error.set(null);
    try {
      const blob = await lastValueFrom(this.aletheia.downloadObject(this.entityPath(), item.iri));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.name || 'document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Download failed');
    }
  }

  /** Deletes the document entity and its blob, then emits the reduced collection. */
  async remove(item: ObjectUploadItem): Promise<void> {
    this.deletingIri.set(item.iri);
    this.error.set(null);
    try {
      await lastValueFrom(this.aletheia.delete(this.entityPath(), item.iri));
      this.changed.emit(this.toIris(this.documents()).filter((iri) => iri !== item.iri));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      this.deletingIri.set(null);
    }
  }
}
