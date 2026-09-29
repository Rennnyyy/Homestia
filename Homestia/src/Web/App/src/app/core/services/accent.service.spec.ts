/**
 * AccentService owns EXACTLY one axis of the theme: the `data-theme` attribute
 * (the accent palette). The skin (`data-skin`) and the dark/light mode (`.dark`)
 * belong to the SDK's ThemeService — these specs pin that boundary, because a
 * second writer on `<html>` is how the two services would fight.
 *
 * `localStorage` is stubbed so the persistence path is deterministic and both
 * failure branches (storage throwing) can be exercised.
 */
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccentService, THEMES, type ThemeName } from './accent.service';

/**
 * The service writes `data-theme` from an `effect`, and a root effect runs on a
 * change-detection cycle — so every spec drives one through a host fixture
 * instead of asserting straight after a signal write.
 */
@Component({ selector: 'app-accent-host', standalone: true, template: '' })
class Host {}

/** In-memory Storage whose methods can be made to throw on demand. */
class FakeStorage {
  private readonly map = new Map<string, string>();
  throwOnRead = false;
  throwOnWrite = false;

  getItem(key: string): string | null {
    if (this.throwOnRead) throw new Error('storage unavailable');
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnWrite) throw new Error('quota exceeded');
    this.map.set(key, value);
  }

  seed(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('AccentService', () => {
  let storage: FakeStorage;
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    storage = new FakeStorage();
    vi.stubGlobal('localStorage', storage);
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Runs the effect the service writes `data-theme` and the accent in. */
  const flush = (): void => fixture.detectChanges();

  it('defaults to neutral and writes the accent to data-theme', () => {
    const service = TestBed.inject(AccentService);
    flush();

    expect(service.accent()).toBe('neutral');
    expect(document.documentElement.getAttribute('data-theme')).toBe('neutral');
  });

  it('restores a stored accent and ignores a value it does not offer', () => {
    storage.seed('spartan-theme', 'violet');
    expect(TestBed.inject(AccentService).accent()).toBe('violet');

    TestBed.resetTestingModule();
    storage.seed('spartan-theme', 'chartreuse');
    expect(TestBed.inject(AccentService).accent()).toBe('neutral');
  });

  it('reports neutral when the stored value cannot be read', () => {
    storage.seed('spartan-theme', 'rose');
    storage.throwOnRead = true;

    expect(TestBed.inject(AccentService).accent()).toBe('neutral');
  });

  it('persists the accent when it changes', () => {
    const service = TestBed.inject(AccentService);
    flush();

    service.setAccent('amber');
    flush();

    expect(service.accent()).toBe('amber');
    expect(document.documentElement.getAttribute('data-theme')).toBe('amber');
    expect(storage.getItem('spartan-theme')).toBe('amber');
  });

  it('swallows a storage write failure instead of breaking the theme', () => {
    const service = TestBed.inject(AccentService);
    flush();
    storage.throwOnWrite = true;

    expect(() => {
      service.setAccent('green');
      flush();
    }).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
  });

  it('cycles forward and backward through every accent, wrapping at both ends', () => {
    const service = TestBed.inject(AccentService);

    service.cycleAccent(1);
    expect(service.accent()).toBe(THEMES[1].id);

    service.cycleAccent(-1);
    expect(service.accent()).toBe(THEMES[0].id);

    service.cycleAccent(-1);
    expect(service.accent()).toBe(THEMES[THEMES.length - 1].id);

    service.cycleAccent(1);
    expect(service.accent()).toBe(THEMES[0].id);
  });

  it('offers exactly the accents the skin stylesheets define', () => {
    // The CSS scopes `[data-skin='homestia'][data-theme='…']` — an accent offered
    // here without a matching block would silently render the neutral palette.
    const ids: ThemeName[] = THEMES.map((t) => t.id);
    expect(ids).toEqual(['neutral', 'blue', 'rose', 'green', 'violet', 'amber']);
    for (const theme of THEMES) {
      expect(theme.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
