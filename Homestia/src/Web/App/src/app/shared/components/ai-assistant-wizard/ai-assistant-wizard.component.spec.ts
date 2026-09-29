/**
 * The wizard is the senior-friendly shell around the chat panel: it decides
 * WHEN the flow is finished (ask → review → hand back) and in WHICH ORDER the
 * page learns about it. Both are pinned here, because the page applies the
 * proposal to the property the edit IRI names.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { AletheiaAiClient } from '@rennnyyy/aletheia-core';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiAssistantWizardComponent } from './ai-assistant-wizard.component';
import { AiAssistantPanelComponent } from '../ai-assistant-panel/ai-assistant-panel.component';

@Injectable()
class EmptyTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

describe('AiAssistantWizardComponent', () => {
  let fixture: ComponentFixture<AiAssistantWizardComponent>;
  let wizard: AiAssistantWizardComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AiAssistantWizardComponent],
      providers: [
        provideSpartanHlm(),
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: EmptyTranslocoLoader,
        }),
        { provide: AletheiaAiClient, useValue: { flowStream: vi.fn(() => of()) } },
      ],
    });

    fixture = TestBed.createComponent(AiAssistantWizardComponent);
    wizard = fixture.componentInstance;
    fixture.componentRef.setInput('textScenarioKey', 'property.create.text');
    fixture.detectChanges();
  });

  /** The chat surface, mounted frameless inside the card. */
  const panel = (): AiAssistantPanelComponent | undefined =>
    fixture.debugElement.query(By.directive(AiAssistantPanelComponent))?.componentInstance;

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('opens on the chat step, framed by the card', () => {
    expect(wizard.phase()).toBe('ask');
    expect(panel()).toBeDefined();
    expect(text()).toContain('ai.wizardTitle');
  });

  it('hands every scenario key and the draft context to the panel', () => {
    fixture.componentRef.setInput('editTextScenarioKey', 'property.edit.text');
    fixture.componentRef.setInput('completeTextScenarioKey', 'property.complete.text');
    fixture.componentRef.setInput('intentTextScenarioKey', 'property.intent.text');
    fixture.componentRef.setInput('draft', { name: 'Haus A' });
    fixture.componentRef.setInput('draftIri', 'https://example.test/properties/1');
    fixture.componentRef.setInput('context', { language: 'de' });
    fixture.componentRef.setInput('existingProperties', [
      { iri: 'https://example.test/properties/1', name: 'Haus A' },
    ]);
    fixture.detectChanges();

    const mounted = panel()!;
    expect(mounted.textScenarioKey()).toBe('property.create.text');
    expect(mounted.editTextScenarioKey()).toBe('property.edit.text');
    expect(mounted.completeTextScenarioKey()).toBe('property.complete.text');
    expect(mounted.intentTextScenarioKey()).toBe('property.intent.text');
    expect(mounted.draft()).toEqual({ name: 'Haus A' });
    expect(mounted.draftIri()).toBe('https://example.test/properties/1');
    expect(mounted.context()).toEqual({ language: 'de' });
    expect(mounted.existingProperties()).toHaveLength(1);
  });

  it('moves to review when the panel proposes a filled form', () => {
    panel()!.proposal.emit({ name: 'Haus A', address: 'Weg 1' });
    fixture.detectChanges();

    expect(wizard.phase()).toBe('review');
    // The chat is replaced by the confirmation — the user reviews, not re-describes.
    expect(panel()).toBeUndefined();
    expect(text()).toContain('ai.wizardDoneTitle');
  });

  it('hands the edit IRI over BEFORE the proposal, so the page can target it', () => {
    const events: string[] = [];
    wizard.editIri.subscribe((iri) => events.push(`edit:${iri}`));
    wizard.proposal.subscribe(() => events.push('proposal'));
    wizard.close.subscribe(() => events.push('close'));

    panel()!.editIri.emit('https://example.test/properties/1');
    panel()!.proposal.emit({ name: 'Haus A' });
    fixture.detectChanges();
    wizard.continue();

    expect(events).toEqual(['edit:https://example.test/properties/1', 'proposal', 'close']);
  });

  it('reports a create (no edit IRI) as an explicit null', () => {
    const iris: (string | null)[] = [];
    wizard.editIri.subscribe((iri) => iris.push(iri));

    panel()!.proposal.emit({ name: 'Haus A' });
    fixture.detectChanges();
    wizard.continue();

    expect(iris).toEqual([null]);
  });

  it('applies nothing when review is confirmed without a proposal', () => {
    const proposal = vi.fn();
    const close = vi.fn();
    wizard.proposal.subscribe(proposal);
    wizard.close.subscribe(close);

    wizard.continue();

    expect(proposal).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('closes through the close button, the footer button and the backdrop', () => {
    const close = vi.fn();
    wizard.close.subscribe(close);

    fixture.debugElement.query(By.css('.ai-close')).nativeElement.click();
    fixture.debugElement.queryAll(By.css('.ai-footer button'))[0].nativeElement.click();
    // A click on the backdrop itself is an explicit dismissal…
    fixture.debugElement.query(By.css('.ai-backdrop')).nativeElement.click();

    expect(close).toHaveBeenCalledTimes(3);
  });

  it('does not close when the user clicks inside the card', () => {
    const close = vi.fn();
    wizard.close.subscribe(close);

    fixture.debugElement.query(By.css('.ai-card')).nativeElement.click();

    expect(close).not.toHaveBeenCalled();
  });

  it('closes on Escape — the one key this audience expects to work', () => {
    const close = vi.fn();
    wizard.close.subscribe(close);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('offers the review action only once there is something to review', () => {
    const footerButtons = (): number =>
      fixture.debugElement.queryAll(By.css('.ai-footer button')).length;

    expect(footerButtons()).toBe(1);

    panel()!.proposal.emit({ name: 'Haus A' });
    fixture.detectChanges();

    expect(footerButtons()).toBe(2);
  });
});
