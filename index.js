import { chromium } from "playwright";
import { newInjectedContext } from "fingerprint-injector";
import protectIt from "playwright-afp";
import ProxyRouter from "@extra/proxy-router";
import { checkTzQuick } from "./tz.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// CONFIG
// Define minimum and maximum number of threads. These values can be configured via environment variables or default to 3 and 5 respectively.
const minThreads = parseInt(process.env.MIN_THREADS, 10) || 3; // Minimum threads for task execution.
const maxThreads = parseInt(process.env.MAX_THREADS, 10) || 5; // Maximum threads for task execution.
let views = 0;
let errors = 0;

function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const weightedRandom = (weights) => {
  let totalWeight = weights.reduce((sum, weight) => sum + weight.weight, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i].weight) return weights[i].value;
    random -= weights[i].weight;
  }
};

// Preferences define browser configurations and user patterns for diverse interactions.
const preferences = [
  {
    value: { device: "desktop", os: "windows", browser: "chrome" },
    weight: 70,
  },
  {
    value: { device: "desktop", os: "windows", browser: "firefox" },
    weight: 10,
  },
  {
    value: {
      device: "desktop",
      os: "macos",
      browser: "chrome",
      minVersion: 126,
    },
    weight: 5,
  },
  {
    value: {
      device: "desktop",
      os: "linux",
      browser: "chrome",
      minVersion: 125,
    },
    weight: 5,
  },
  {
    value: { device: "desktop", os: "linux", browser: "firefox" },
    weight: 5,
  },
  {
    value: { device: "mobile", os: "android", browser: "chrome" },
    weight: 15,
  },
  {
    value: { device: "mobile", os: "ios", browser: "safari" },
    weight: 8,
  },
  {
    value: { device: "desktop", os: "macos", browser: "safari" },
    weight: 10,
  },
  {
    value: { device: "mobile", os: "android", browser: "firefox" },
    weight: 6,
  },
  {
    value: {
      device: "desktop",
      os: "windows",
      browser: "edge",
      minVersion: 110,
    },
    weight: 7,
  },
  {
    value: {
      device: "mobile",
      os: "android",
      browser: "chrome",
    },
    weight: 5,
  },
  {
    value: {
      device: "mobile",
      os: "ios",
      browser: "safari",
    },
    weight: 4,
  },
  {
    value: {
      device: "desktop",
      os: "windows",
      browser: "opera",
      minVersion: 90,
    },
    weight: 3,
  },
];
// Sources
const referers = [
  "https://www.google.com",
  "https://www.discord.com",
  "https://twitter.com",
  "https://www.reddit.com",
  "https://www.linkedin.com",
  "https://news.ycombinator.com",
  "https://www.github.com",
  "https://www.bing.com",
  "https://www.youtube.com",
  "https://www.facebook.com",
  "direct", // Represents no referrer
];

// User Agents
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Mobile Safari/537.36",
];
//
const OpenBrowser = async (link) => {
  const countries = ["ca", "uk", "fr", "br", "de", "tr", "us"];

  // Randomly pick a country
  const selectedCountry =
    countries[Math.floor(Math.random() * countries.length)];

  const username =
    `qualityser-res-${selectedCountry}-sid-` +
    String(generateRandomNumber(10000, 10000000));

  const timezone = await checkTzQuick(username);

  if (!timezone) {
    console.log("Invalid timezone, exiting current browser.");
    return;
  }
  console.log(`[!] - ⏳ : ${timezone}`);

  const browser = await chromium.launch({
    headless: true,
    proxy: {
      server: "148.113.161.141:5959",
      username,
      password: process.env.PASSWORD,
    },
  });

  const selectedPreference = weightedRandom(preferences);
  const context = await newInjectedContext(browser, {
    fingerprintOptions: {
      devices: [selectedPreference.device],
      browsers: [selectedPreference.browser],
      operatingSystems: [selectedPreference.os],
      mockWebRTC: true,
    },
    newContextOptions: {
      timezoneId: timezone.time_zone,
    },
  });

  // Set randomized User-Agent via addInitScript
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      get: () => userAgents[Math.floor(Math.random() * userAgents.length)],
    });
  });

  try {
    const page = await context.newPage();

    const referer = referers[Math.floor(Math.random() * referers.length)];
    if (referer !== "direct") {
      await page.setExtraHTTPHeaders({ referer });
      console.log(`[+] Using referer: ${referer}`);
    } else {
      console.log(`[+] Using direct access (no referer).`);
    }

    await page.route("**/*", (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.evaluate(() => {
      navigator.mediaDevices = {
        getUserMedia: async () => ({}),
      };
    });

    protectIt(page);

    await page.goto(link, { waitUntil: "load" });

    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(10000, 15000))
    );

    for (let i = 0; i < 10; i++) {
      const randomX = generateRandomNumber(0, 500);
      const randomY = generateRandomNumber(0, 500);
      await page.mouse.move(randomX, randomY);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const scrollCount = generateRandomNumber(3, 6);
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 500);
      });
      await new Promise((resolve) =>
        setTimeout(resolve, generateRandomNumber(300, 1000))
      );
    }

    const inputSelector = "body > div > div:nth-child(1) > button";
    await page.waitForSelector(inputSelector);
    await page.click(inputSelector);

    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(5000, 10000))
    );

    const pages = context.pages();
    if (pages.length > 1) {
      const tab1 = pages[0];
      await tab1.bringToFront();
      console.log("[x] - Switched to Tab 1");
      views++;
    } else {
      console.log("[x] - Tab 1 is not availables 🗂️");
      errors++;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(20000, 50000))
    );
  } catch (error) {
    errors++;
  } finally {
    await context.close();
    await browser.close();
  }
};

const tasksPoll = async () => {
  const threadCount = generateRandomNumber(minThreads, maxThreads);
  const tasks = Array.from({ length: threadCount }).map(() => {
    return OpenBrowser("https://ryugi.be/");
  });

  await Promise.all(tasks);
};

const RunTasks = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      await tasksPoll();
      console.log(`[+] - MONEY MACHINE 💰💸 > ${views} - ❌ > ${errors}`);
    } catch (error) {
      console.log(error);
    }
  }
};

RunTasks();
