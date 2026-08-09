import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { LucideBuilding } from '@lucide/angular';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [TranslocoPipe, HlmCard, LucideBuilding],
  template: `
    <div class="max-w-6xl mx-auto px-6 pt-8">
      <div class="flex items-center gap-3 mb-8">
        <svg lucideBuilding class="size-8 text-primary"></svg>
        <h2 class="text-3xl font-bold text-foreground">{{ 'nav.properties' | transloco }}</h2>
      </div>
      <section hlmCard class="p-8 text-center text-muted-foreground">
        <p class="text-lg">Properties management coming soon.</p>
      </section>
    </div>
  `,
})
export class Properties {}
