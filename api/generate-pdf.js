import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

export const config = {
     maxDuration: 60,
     api: {
          bodyParser: {
               sizeLimit: '50mb',
          },
     },
};

export default async function handler(req, res) {
     if (req.method !== 'POST') {
          return res.status(405).json({ message: 'Method Not Allowed' });
     }

     const { html, coverWidth, coverHeight } = req.body;
     if (!html) {
          return res.status(400).json({ status: 'error', message: 'html is required' });
     }

     const pw = Math.ceil(Math.max(coverWidth || 800, 100));
     const ph = Math.ceil(Math.max(coverHeight || 600, 100));

     let browser;
     try {
          browser = await playwright.launch({
               args: chromium.args,
               defaultViewport: chromium.defaultViewport,
               executablePath: await chromium.executablePath(),
               headless: chromium.headless,
               ignoreHTTPSErrors: true,
          });

          const page = await browser.newPage();

          await page.setViewportSize({ width: pw, height: ph });
          await page.setContent(html, { waitUntil: 'networkidle' });

          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(400);

          const pdfBuffer = await page.pdf({
               width: `${pw}px`,
               height: `${ph}px`,
               printBackground: true,
               scale: 1,
               margin: { top: '0', right: '0', bottom: '0', left: '0' },
          });

          await browser.close();

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="book-cover.pdf"');
          res.send(Buffer.from(pdfBuffer));
     } catch (err) {
          if (browser) await browser.close().catch(() => { });
          console.error('generate-pdf error:', err.message);
          res.status(500).json({ status: 'error', message: err.message });
     }
}
