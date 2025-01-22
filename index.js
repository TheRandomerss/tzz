import { chromium } from "playwright";
import { newInjectedContext } from "fingerprint-injector";
import protectIt from "playwright-afp";
import ProxyRouter from "@extra/proxy-router";
import { checkTz, checkTzQuick } from "./tz.js";
// CONFIG
const minThreads = 3; // Minimum threads for task execution.
const maxThreads = 7; // Maximum threads for task execution.
let views = 0;
let errors = 0;
//
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
  { value: { device: "desktop", os: "linux", browser: "firefox" }, weight: 5 },
  {
    value: {
      device: "mobile",
      os: "android",
      browser: "chrome",
    },
    weight: 15,
  },
];

const OpenBrowser = async (link) => {
  // const countries = ["us", "de", "fr", "uk", "se", "ca"];
const countries = ["us", "de", "fr", "uk", "se", "ca"];


  // Randomly pick a country
  const selectedCountry =
    countries[Math.floor(Math.random() * countries.length)];

  const username =
    `qualityser-res-${selectedCountry}-sid-` +
    String(generateRandomNumber(10000, 10000000));

  const timezone = await checkTzQuick(username);

  // Check if timezone.time_zone is empty or null
  if (!timezone) {
    console.log("Invalid timezone, exiting current browser.");
    return; // Exit and don't open the browser
  }
  console.log(`[!] : ${timezone}`);
  
const secretApiKey = process.env.JEDI;
  const browser = await chromium.launch({
    headless: true,
    proxy: {
      server: "148.113.161.141:5959",
      username,
      password: secretApiKey,
    },
  });

  // Apply Playwright AFP
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

  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    // Spoof WebRTC
    await page.evaluate(() => {
      navigator.mediaDevices = {
        getUserMedia: async () => ({}), // Mock getUserMedia to return an empty object
      };
    });

    // Apply AFP protections
    protectIt(page);

    await page.goto(link, { waitUntil: "load" });

    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(5000, 10000))
    );

    for (let i = 0; i < 5; i++) {
      const randomX = generateRandomNumber(0, 500);
      const randomY = generateRandomNumber(0, 500);
      await page.mouse.move(randomX, randomY);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Short delay for natural movement
    }
    const inputSelector = "body > div > div:nth-child(1) > button";
    await page.waitForSelector(inputSelector);
    await page.click(inputSelector);

    // Wait for 20 seconds after clicking
    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(5000, 10000))
    );

    // Switch to the first tab (tab 1)
    const pages = context.pages();
    if (pages.length > 1) {
      const tab1 = pages[0]; // The first tab (index 0)
      await tab1.bringToFront();
      console.log("[x] - Switched to Tab 1");
      views++;
    } else {
      console.log("[x] - Tab 1 is not available ðŸ—‚ï¸");
      errors++;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(8000, 11000))
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
    return OpenBrowser("https://ryugi.be/"); // Adjust URL as needed
  });

  await Promise.all(tasks);
};

const RunTasks = async () => {
  for (let i = 0; i < 10000000; i++) {
    try {
      await tasksPoll(views);
      console.log(`[+] - MONEY MACHINE ðŸ’°ðŸ’¸ > ${views} - âŒ > ${errors}`);
    } catch (error) {
      console.log(error);
    }
  }
};

RunTasks();
