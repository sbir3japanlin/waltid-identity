/**
 * CommonJS helper to disable animations for Playwright tests.
 * Exported as CommonJS so it can be required from TypeScript tests when run
 * under the project's Node configuration.
 */
async function disableAnimations(page) {
  await page.addStyleTag({ content: "* , *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; } html, body { -webkit-font-smoothing: antialiased; }" });
}

async function fillScreen(page) {
  // Inject CSS as early as possible so layout uses full viewport width.
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.innerHTML = `html, body, #root, #app, .container { width: 100vw !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }`;
    document.head.appendChild(style);
  });
}

module.exports = { disableAnimations, fillScreen };
