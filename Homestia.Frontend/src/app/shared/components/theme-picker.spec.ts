/**
 * The accent cycler: its swatch must show the ACTIVE accent's colour, and the
 * ‹ › buttons must move exactly one step in the direction they point.
 */
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemePicker } from './theme-picker';
import { AccentService, THEMES } from '../../core/services/accent.service';

describe('ThemePicker', () => {
  let fixture: ComponentFixture<ThemePicker>;
  let accents: AccentService;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
    });
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ThemePicker);
    accents = TestBed.inject(AccentService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * The colour the swatch is painting. jsdom normalizes a hex value to its
   * `rgb(…)` form, so the expected colour is converted the same way — the
   * assertion still comes from THEMES, not from a copied literal.
   */
  const swatchColour = (): string =>
    (fixture.nativeElement as HTMLElement)
      .querySelector('span')!
      .style.getPropertyValue('background-color');

  const toRgb = (hex: string): string => {
    const value = parseInt(hex.slice(1), 16);
    return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
  };

  it('paints the active accent colour', () => {
    expect(swatchColour()).toBe(toRgb(THEMES[0].color));

    accents.setAccent('rose');
    fixture.detectChanges();

    expect(swatchColour()).toBe(toRgb('#f43f5e'));
  });

  it('moves one accent forward and back with the arrow buttons', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons).toHaveLength(2);

    buttons[1].click();
    fixture.detectChanges();
    expect(accents.accent()).toBe(THEMES[1].id);

    buttons[0].click();
    fixture.detectChanges();
    expect(accents.accent()).toBe(THEMES[0].id);
  });
});
