import { Component, signal, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCard,
  HlmCardHeader,
  HlmCardTitle,
  HlmCardDescription,
  HlmCardContent,
} from '@spartan-ng/helm/card';
import { HlmBadge } from '@spartan-ng/helm/badge';
import {
  LucideHouse,
  LucideArrowRight,
  LucidePalette,
  LucideGlobe,
  LucideBolt,
} from '@lucide/angular';
import { ThemePicker } from '../../shared/components/theme-picker';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    TranslocoPipe,
    HlmButton,
    HlmCard,
    HlmCardHeader,
    HlmCardTitle,
    HlmCardDescription,
    HlmCardContent,
    HlmBadge,
    LucideHouse,
    LucideArrowRight,
    LucidePalette,
    LucideGlobe,
    LucideBolt,
    ThemePicker,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly transloco = inject(TranslocoService);

  readonly currentLang = signal<string>(
    this.transloco.getActiveLang()
  );

  toggleLang(): void {
    const next = this.currentLang() === 'en' ? 'de' : 'en';
    this.transloco.setActiveLang(next);
    this.currentLang.set(next);
  }
}
