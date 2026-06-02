import type { Page } from '@playwright/test';

/**
 * Disable CSS animations and transitions to make videos and screenshots stable
 * and reduce visual jitter.
 */
export async function disableAnimations(page: Page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after { 
      transition: none !important; 
      animation: none !important; 
      caret-color: transparent !important;
    }
    html, body { -webkit-font-smoothing: antialiased; }
  ` });
}

export default disableAnimations;
