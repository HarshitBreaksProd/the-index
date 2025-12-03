import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import puppeteer, { Browser } from "puppeteer";

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

    BrowserInstance.on("disconnected", () => {
      console.log("Browser got disconnected");
      BrowserInstance = null;
    });
  }
  return BrowserInstance;
};

const getPage = async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  return page;
};

const cleanHtmlContent = (htmlContent: string): string => {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const scripts = document.querySelectorAll("script, style, noscript");
  scripts.forEach((el) => el.remove());

  const textContent =
    document.body?.textContent || document.documentElement?.textContent || "";

  const cleaned = textContent
    .split(/\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")

    .replace(/\s+/g, " ")

    .replace(/\n\s*\n/g, "\n")
    .trim();

  return cleaned;
};

const fetchContentFromUrl = async (url: string) => {
  let page = null;
  try {
    page = await getPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const html = await page?.evaluate(
      () => document.querySelector("*")?.outerHTML
    );

    if (!html) {
      throw new Error(`Failed to extract HTML from ${url}`);
    }

    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);

    let htmlContent = reader.parse()?.content;

    if (!htmlContent) {
      throw new Error(`Failed to parse readable content from ${url}`);
    }

    const textContent = cleanHtmlContent(htmlContent);

    console.log("URL PROCESSING COMPLETE");
    await page.close();
    return textContent;
  } catch (err) {
    console.log(err);
    console.log("Url Processor error ^^^^^^^^^^^^^^^^^^^^^^^^^");
    throw err;
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

export const fetchContentFromUrlWithRetry = async (
  url: string,
  maxAttempts: number = 3
) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetchContentFromUrl(url);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.log(`Retry ${attempt}/${maxAttempts}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

export const gracefulShutDownOfBrowser = async () => {
  if (BrowserInstance && BrowserInstance.connected) {
    console.log("Closing browser instance");
    await BrowserInstance.close();
  }
  process.exit(0);
};
