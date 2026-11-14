import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { captureRef } from './app/cloud/ref';

// Remember who invited this player before anything else saves to this device.
captureRef();

// The domain lock in index.pages.html sets __chessBlocked on copies of the site.
if (!(window as any).__chessBlocked) bootstrapApplication(App, appConfig).catch((err) => console.error(err));
