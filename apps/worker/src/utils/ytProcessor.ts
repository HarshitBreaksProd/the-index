import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";
import os from "os";
import { resolve } from "dns";

let BrowserInstance: Browser | null = null;

const getBrowser = async () => {
  if (!BrowserInstance) {
    BrowserInstance = await puppeteer.launch({
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

export const processYoutubeLink = async (url: string) => {
  let page = null;
  let tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `ytmp3-${Date.now()}-${crypto.randomUUID()}`)
  );

  try {
    page = await getPage();

    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: tempDir,
    });

    console.log("going to ytmp3");
    await page.goto("https://ytmp3.as/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

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
        ? `input[type="${urlInput.type}"]
          [${urlInput.id ? `id="${urlInput.id}"][` : ""}
          ${urlInput.name ? `name="${urlInput.name}"` : ""}]`
        : 'input[type="text"]';
    });

    console.log("pasting yt url");
    await page.type(inputSelector, url, { delay: 50 });

    await page.waitForSelector(
      'button[type="submit"], button:has-text("Convert"), button[class*="convert"]',
      {
        timeout: 10000,
      }
    );

    console.log("clicking convert button");
    await page.click('button[type="submit"]');

    console.log("waiting for conversion to complete");

    try {
      await page.waitForSelector(
        'a[download], button:has-text("Download"), a[href*=".mp3"], a[href*="download"]',
        { timeout: 600000 }
      );

      console.log("conversion complete, clicking download");

      await page.click(`button:has-text("Download")`);
    } catch (waitError) {
      console.log(
        "Download button not found, checking for automatic download..."
      );
    }

    console.log("waiting for file to download");

    let downloadedFile: string | null = null;
    const maxWaitTime = 600000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const files = fs.readdirSync(tempDir);
      const mp3File = files.find((file) => file.endsWith(".mp3"));

      if (mp3File) {
        await new Promise((res) => setTimeout(res, 1000));
        downloadedFile = path.join(tempDir, mp3File);
        break;
      }

      await new Promise((res) => setTimeout(res, 500));
    }

    if (!downloadedFile) {
      throw new Error(
        "Download timeout: File was not downloaded within the expected time"
      );
    }

    const captions = await processAudioToText(downloadedFile);
    return captions;
  } catch (err) {
    console.log("Error in processing of youtube link");
    console.log(err);
  }
};

const processAudioToText = async (file: string) => {};
