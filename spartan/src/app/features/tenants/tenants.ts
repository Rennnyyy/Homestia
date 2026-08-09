import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { LucideUsers } from '@lucide/angular';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [TranslocoPipe, HlmCard, LucideUsers],
  template: `
    <div class="max-w-6xl mx-auto px-6 pt-8">
      <div class="flex items-center gap-3 mb-8">
        <svg lucideUsers class="size-8 text-primary"></svg>
        <h2 class="text-3xl font-bold text-foreground">{{ 'nav.tenants' | transloco }}</h2>
      </div>
      <section hlmCard class="p-8 text-center text-muted-foreground">
        <p class="text-lg">Tenants management coming soon.</p>
      </section>
    </div>
  `,
})
export class Tenants {}
