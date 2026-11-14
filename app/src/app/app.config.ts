import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { I18nService } from './core/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Load the language dictionary before the first paint, so text never flashes in the wrong language.
    provideAppInitializer(() => inject(I18nService).load(inject(I18nService).lang())),
  ],
};
