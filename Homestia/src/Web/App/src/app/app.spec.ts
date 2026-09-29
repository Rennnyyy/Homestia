/**
 * The app shell — the frame every page renders inside: the SDK navigation rail,
 * the header chrome (dark mode, language), and the route table whose three
 * entries are lazy.
 */
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslocoService, provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { provideSkins, ThemeService } from '@rennnyyy/aletheia-ui';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';
import { HOMESTIA_SKINS } from './core/theme/homestia-skin';

@Injectable()
class EmptyTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

@Component({ selector: 'app-blank', standalone: true, template: '' })
class Blank {}

describe('App shell', () => {
  let fixture: ComponentFixture<App>;
  let app: App;

  beforeEach(() => {
    // The theme service reads the OS colour scheme when it boots.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'properties', component: Blank },
          { path: 'rentals', component: Blank },
        ]),
        provideSkins(HOMESTIA_SKINS),
        provideTransloco({
          config: {
            availableLangs: [
              { id: 'en', label: 'English' },
              { id: 'de', label: 'Deutsch' },
            ],
            defaultLang: 'en',
            reRenderOnLangChange: true,
          },
          loader: EmptyTranslocoLoader,
        }),
      ],
    });

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the navigation rail around the routed page', async () => {
    // The outlet only fills once the router has run a navigation.
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('aletheia-sidebar')).toBeTruthy();
    expect(host.querySelector('router-outlet')).toBeTruthy();
    expect(host.querySelector('app-blank')).toBeTruthy();
  });

  it('gives the rail the three destinations', () => {
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'aletheia-sidebar nav a',
      ),
    ).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/', '/properties', '/rentals']);
  });

  it('marks only the current destination as active', async () => {
    await TestBed.inject(Router).navigateByUrl('/properties');
    await fixture.whenStable();
    fixture.detectChanges();

    const active = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'aletheia-sidebar nav a.bg-muted',
      ),
    ).map((a) => a.getAttribute('href'));

    expect(active).toEqual(['/properties']);
  });

  it('keeps the accent cycler in the header, on every breakpoint', () => {
    const host = fixture.nativeElement as HTMLElement;
    const picker = host.querySelector('app-theme-picker');
    expect(picker).toBeTruthy();
    // The rail's 64px icon strip cannot hold three controls, so the cycler does
    // not live there — and it must survive a collapse.
    expect(picker!.closest('header')).toBeTruthy();
    expect(picker!.closest('aside')).toBeNull();
  });

  it('keeps the accent cycler when the rail collapses to icons', () => {
    app.railCollapsed.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-theme-picker')).toBeTruthy();
    // The destinations stay — the icon rail is still navigation.
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('aletheia-sidebar nav a')
        .length,
    ).toBe(3);
  });

  it('toggles dark mode from the header', () => {
    const theme = TestBed.inject(ThemeService);
    const before = theme.isDark();

    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'header button[aria-pressed]',
    );
    expect(toggle, 'dark-mode button').toBeTruthy();

    toggle!.click();
    fixture.detectChanges();
    expect(theme.isDark()).toBe(!before);
  });

  it('switches the language between the two dictionaries it ships', () => {
    const transloco = TestBed.inject(TranslocoService);
    expect(transloco.getActiveLang()).toBe('en');

    const switcher = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'header aletheia-language-switcher button',
    );
    expect(switcher, 'language switcher').toBeTruthy();

    switcher!.click();
    fixture.detectChanges();
    expect(transloco.getActiveLang()).toBe('de');

    switcher!.click();
    fixture.detectChanges();
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('opens the mobile drawer from the header menu button and closes it again', () => {
    expect(app.sidebarOpen()).toBe(false);

    const menu = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'header button[aria-label]',
    );
    expect(menu, 'menu button').toBeTruthy();
    menu!.click();
    fixture.detectChanges();
    expect(app.sidebarOpen()).toBe(true);

    // The rail reports a backdrop / close-button click back through the binding.
    const rail = fixture.debugElement.query((node) => node.name === 'aletheia-sidebar');
    rail.componentInstance.mobileOpenChange.emit(false);
    fixture.detectChanges();
    expect(app.sidebarOpen()).toBe(false);
  });
});

describe('app routes', () => {
  const byPath = (path: string) => routes.find((r) => r.path === path);

  it('lazily loads the three pages', () => {
    for (const path of ['', 'properties', 'rentals']) {
      const route = byPath(path);
      expect(route, `route '${path}'`).toBeDefined();
      // A lazy route is what keeps each page out of the initial bundle.
      expect(typeof route!.loadComponent).toBe('function');
    }
  });

  it('resolves every lazy loader to a component class', async () => {
    for (const path of ['', 'properties', 'rentals']) {
      const loaded = await byPath(path)!.loadComponent!();
      expect(typeof loaded).toBe('function');
    }
  });

  it('sends an unknown URL home instead of showing nothing', () => {
    expect(byPath('**')?.redirectTo).toBe('');
  });
});
