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
    console.log("Yt Browser got disconnected");
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
  console.log(`Processing yt url: ${url}`);

  let page = null;
  try {
    page = await getPage();

    console.log("going to ytmp3");
    await page.goto("https://ytmp3.as/", {
      waitUntil: "load",
      timeout: 60000,
    });

    await page.waitForSelector(
      'input[type="text"], input[placeholder*="youtube"], input[id*="v"], input[name*="v"]',
      {
        timeout: 10000,
      }
    );

    console.log("Page waited for input");

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

    console.log("pasting yt url");
    console.log("The input selector is", inputSelector);
    await page.type(inputSelector, url, { delay: 50 });

    console.log("page waited for download button");

    console.log("clicking convert button");
    await page.click('button[type="submit"]');

    console.log("waiting for conversion to complete");

    let downloadedFile: string | null = null;

    try {
      const submitBtn = page.locator('//button[text()="Download"]');
      await submitBtn.waitFor({ timeout: 1800000 });

      console.log("conversion complete, clicking download");

      const [download]: [Download, void] = await Promise.all([
        page.waitForEvent("download", { timeout: 600000 }),
        page.click('button:has-text("Download")'),
      ]);

      const finalPath = path.join(tempDir, "audio.mp3");

      console.log("saving download to :", finalPath);
      await download.saveAs(finalPath);
      downloadedFile = finalPath;
    } catch (waitError) {
      console.log(
        "Download button not found, checking for automatic download..."
      );
    }

    console.log("waiting for file to download");

    if (!downloadedFile) {
      throw new Error(
        "Download timeout: File was not downloaded within the expected time"
      );
    }

    await page.close();

    console.log(`The downloaded file is named: ${downloadedFile}`);

    return downloadedFile;
  } catch (err) {
    console.log("Error in processing of youtube link");
    console.log(err);
  } finally {
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (closeError) {
        console.error(`Error closing page for ${url}:`, closeError);
      }
    }
  }
};
