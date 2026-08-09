import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmCard } from '@spartan-ng/helm/card';
import { LucideHouse } from '@lucide/angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslocoPipe, HlmCard, LucideHouse],
  template: `
    <div class="max-w-6xl mx-auto px-6 pt-8">
      <div class="flex items-center gap-3 mb-8">
        <svg lucideHouse class="size-8 text-primary"></svg>
        <h2 class="text-3xl font-bold text-foreground">{{ 'nav.home' | transloco }}</h2>
      </div>
      <section hlmCard class="p-8 text-center text-muted-foreground">
        <p class="text-lg">{{ 'app.description' | transloco }}</p>
      </section>
    </div>
  `,
  styleUrl: './home.scss',
})
export class Home {}
