/**
 * CommonJS helper to disable animations for Playwright tests.
 * Exported as CommonJS so it can be required from TypeScript tests when run
 * under the project's Node configuration.
 */
async function disableAnimations(page) {
  await page.addStyleTag({ content: "* , *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; } html, body { -webkit-font-smoothing: antialiased; }" });
}

module.exports = { disableAnimations };
