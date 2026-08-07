import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppShellComponent } from './shell/app-shell.component';

@Component({
    selector: 'app-root',
    imports: [AppShellComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<app-shell />`
})
export class AppComponent {}
