const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Aguarda a página carregar
  await page.waitForTimeout(2000);
  
  // Foca na seção dos botões
  const tabsSection = await page.locator('.flex.gap-3.bg-gradient-to-br').first();
  if (await tabsSection.isVisible()) {
    await tabsSection.screenshot({ path: '/tmp/buttons.png' });
    console.log('Screenshot capturado: /tmp/buttons.png');
  } else {
    // Se não encontrou, tira screenshot da página inteira
    await page.screenshot({ path: '/tmp/screenshot.png', fullPage: true });
    console.log('Screenshot completo capturado: /tmp/screenshot.png');
  }
  
  await browser.close();
})();
