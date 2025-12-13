import { chromium, Browser, Download } from "playwright";
import path from "path";

let BrowserInstance: Browser | null = null;

const getBrowser = async () => {
  if (!BrowserInstance) {
    BrowserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });
  }

  BrowserInstance.on("disconnected", () => {
    BrowserInstance = null;
  });
  return BrowserInstance;
};

const getPage = async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(600000);
  page.setDefaultTimeout(600000);

  return page;
};

export const processYoutubeLinkToAudioFile = async (
  url: string,
  tempDir: string
) => {
  let page = null;
  console.log(`[YT-Processor] Starting processing for URL: ${url}`);
  try {
    console.log(`[YT-Processor] Launching browser page...`);
    page = await getPage();

    console.log(`[YT-Processor] Navigating to ytmp3.as...`);
    await page.goto("https://ytmp3.as/", {
      waitUntil: "load",
      timeout: 60000,
    });
    console.log(`[YT-Processor] Navigation complete.`);

    console.log(`[YT-Processor] Waiting for input selector...`);
    await page.waitForSelector(
      'input[type="text"], input[placeholder*="youtube"], input[id*="v"], input[name*="v"]',
      {
        timeout: 10000,
      }
    );

    const inputSelector = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input"));
      const urlInput = inputs.find(
        (input) =>
          input.type === "text" ||
          input.placeholder?.toLowerCase().includes("youtube") ||
          input.id?.toLowerCase().includes("v") ||
          input.name?.toLowerCase().includes("v")
      );
      return urlInput
        ? `input[type="${urlInput.type}"]` +
            `[${urlInput.id ? `id="${urlInput.id}"][` : ""}` +
            `${urlInput.name ? `name="${urlInput.name}"` : ""}]`
        : 'input[type="text"]';
    });
    console.log(`[YT-Processor] Input selector found: ${inputSelector}`);

    console.log(`[YT-Processor] Typing URL...`);
    await page.locator(inputSelector).pressSequentially(url);

    console.log(`[YT-Processor] Clicking submit...`);
    await page.click('button[type="submit"]');

    let downloadedFile: string | null = null;

    try {
      console.log(`[YT-Processor] Waiting for Download button...`);
      const submitBtn = page.locator('//button[text()="Download"]');
      await submitBtn.waitFor({ timeout: 1800000 });

      console.log(
        `[YT-Processor] Download button found. Clicking and waiting for download...`
      );
      const [download]: [Download, void] = await Promise.all([
        page.waitForEvent("download", { timeout: 600000 }),
        page.click('button:has-text("Download")'),
      ]);

      const finalPath = path.join(tempDir, "audio.mp3");

      console.log(`[YT-Processor] Saving file to ${finalPath}...`);
      await download.saveAs(finalPath);
      downloadedFile = finalPath;
      console.log(`[YT-Processor] File saved successfully.`);
    } catch (waitError) {
      console.log(
        "Download button not found, checking for automatic download..."
      );
    }

    if (!downloadedFile) {
      throw {
        errorMessage:
          "Download timeout: File was not downloaded within the expected time",
      };
    }
    await page.close();
    return downloadedFile;
  } catch (err) {
    console.error(`[YT-Processor] Error processing URL ${url}:`, err);
    const errorMessage = (err as { errorMessage: string }).errorMessage;
    throw {
      errorMessage:
        errorMessage || "Accessing the youtube content faced some issues",
    };
  } finally {
    if (page && !page.isClosed()) {
      try {
        console.log(`[YT-Processor] Closing page.`);
        await page.close();
      } catch (closeError) {
        console.error(`Error closing page for ${url}:`, closeError);
      }
    }
  }
};
