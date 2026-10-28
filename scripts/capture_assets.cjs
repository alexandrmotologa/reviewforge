const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('B:/workgit/node_modules/puppeteer-core');

async function clickButtonWithText(page, text) {
  return page.evaluate((t) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes(t));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function main() {
  const imagesDir = path.resolve(__dirname, '../docs/images');
  const tempFramesDir = path.join(imagesDir, 'temp_frames');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (fs.existsSync(tempFramesDir)) fs.rmSync(tempFramesDir, { recursive: true, force: true });
  fs.mkdirSync(tempFramesDir, { recursive: true });

  console.log('1. Starting ReviewForge Fastify daemon on port 9445...');
  const { buildServer } = require('../dist/server/api.js');
  const app = buildServer();
  await app.listen({ port: 9445, host: '127.0.0.1' });
  console.log('✓ Fastify daemon ready at http://127.0.0.1:9445');

  console.log('2. Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('3. Navigating to ReviewForge studio...');
  await page.goto('http://127.0.0.1:9445', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  let frameIdx = 1;
  async function recordFrame(count = 1) {
    const frameBuffer = await page.screenshot({ type: 'png' });
    for (let c = 0; c < count; c++) {
      const framePath = path.join(tempFramesDir, `frame_${String(frameIdx).padStart(3, '0')}.png`);
      fs.writeFileSync(framePath, frameBuffer);
      frameIdx++;
    }
  }

  // Initial State: Diff Playground
  await recordFrame(2);

  // Click Run Review & Audit
  console.log('4. Triggering AST Diff Review...');
  const clicked = await clickButtonWithText(page, 'Run Review & Audit');
  console.log('Button clicked:', clicked);

  // Wait for review results to load via innerText
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Security Risk Score') || document.body.innerText.includes('/ 100');
  }, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('✓ Saving reviewforge_dashboard.png');
  await page.screenshot({
    path: path.join(imagesDir, 'reviewforge_dashboard.png'),
    type: 'png'
  });
  await recordFrame(4);

  // Switch to Interactive Diff Tab
  console.log('5. Capturing Interactive Diff & Applying Inline Fix...');
  await clickButtonWithText(page, 'Diff Viewer');
  await new Promise(r => setTimeout(r, 800));
  await recordFrame(2);

  // Expand finding fix
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const fixBtn = buttons.find(b => b.textContent && (b.textContent.includes('Fix') || b.textContent.includes('CWE-')));
    if (fixBtn) fixBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await recordFrame(2);

  // Click "Apply Fix Inline"
  await clickButtonWithText(page, 'Apply Fix Inline');
  await new Promise(r => setTimeout(r, 800));

  console.log('✓ Saving reviewforge_diff_viewer.png');
  await page.screenshot({
    path: path.join(imagesDir, 'reviewforge_diff_viewer.png'),
    type: 'png'
  });
  await recordFrame(4);

  // Switch to PR Description tab
  console.log('6. Capturing PR Description Tab...');
  await clickButtonWithText(page, 'PR Description');
  await new Promise(r => setTimeout(r, 800));

  console.log('✓ Saving reviewforge_pr_description.png');
  await page.screenshot({
    path: path.join(imagesDir, 'reviewforge_pr_description.png'),
    type: 'png'
  });
  await recordFrame(3);

  // Switch to Taint Flow tab
  console.log('7. Capturing Taint Flow Tab...');
  await clickButtonWithText(page, 'Taint Flow');
  await new Promise(r => setTimeout(r, 800));

  console.log('✓ Saving reviewforge_taint_flow.png');
  await page.screenshot({
    path: path.join(imagesDir, 'reviewforge_taint_flow.png'),
    type: 'png'
  });
  await recordFrame(3);

  // Switch to Security Scorecard tab
  console.log('8. Capturing Security Scorecard Tab...');
  await clickButtonWithText(page, 'Scorecard');
  await new Promise(r => setTimeout(r, 800));

  console.log('✓ Saving reviewforge_scorecard.png');
  await page.screenshot({
    path: path.join(imagesDir, 'reviewforge_scorecard.png'),
    type: 'png'
  });
  await recordFrame(3);

  // Mobile Viewport
  console.log('9. Capturing Mobile Responsiveness (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await clickButtonWithText(page, 'Diff Viewer');
  await new Promise(r => setTimeout(r, 800));

  console.log('✓ Saving reviewforge_mobile.png');
  await page.screenshot({
    path: path.join(imagesDir, 'reviewforge_mobile.png'),
    type: 'png'
  });

  await browser.close();
  await app.close();

  // 10. Generate animated demo GIF with FFmpeg
  console.log(`10. Compiling ${frameIdx - 1} frames into reviewforge_demo.gif with FFmpeg...`);
  const gifPath = path.join(imagesDir, 'reviewforge_demo.gif');
  const ffmpegCmd = `ffmpeg -y -framerate 2 -i "${tempFramesDir}\\frame_%03d.png" -vf "fps=10,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" "${gifPath}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log('✓ Successfully created docs/images/reviewforge_demo.gif');

  // Clean up temp frames
  fs.rmSync(tempFramesDir, { recursive: true, force: true });
  console.log('✓ Cleaned up temporary frames');
  console.log('ALL ASSETS CAPTURED AND GENERATED CLEANLY!');
  process.exit(0);
}

main().catch(err => {
  console.error('Asset capture failed:', err);
  process.exit(1);
});
