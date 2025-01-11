// TTTTTTTTTTTTTTTTTTTTTTTTTTT

import { chromium } from "playwright";
import { newInjectedContext } from "fingerprint-injector";
import protectIt from "playwright-afp";
import ProxyRouter from "@extra/proxy-router";
import { checkTz, checkTzQuick } from "./tz.js";
// CONFIG
const Threads = 5;
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
  const countries = ["se","se","se","se","se", "pt","no", "us"];

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
      password: "qNyHNzFRMFuwQhs",
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

  await page.route("**/*", (route) => {
    const request = route.request();
    const resourceType = request.resourceType();
    const url = new URL(request.url());
    if (
      !url.hostname.endsWith("twee.be") &&
      ["image", "stylesheet", "font", "css"].includes(resourceType)
    ) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    const page = await context.newPage();

    await page.evaluate(() => {
      navigator.mediaDevices = {
        getUserMedia: async () => ({}),
      };
    });

    protectIt(page);

    await page.goto(link, { waitUntil: "load" });

    await new Promise((resolve) =>
      setTimeout(resolve, generateRandomNumber(5000, 10000))
    );

    for (let i = 0; i < 5; i++) {
      const randomX = generateRandomNumber(0, 500);
      const randomY = generateRandomNumber(0, 500);
      await page.mouse.move(randomX, randomY);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const inputSelector =
      "body > main > form > button";
    await page.waitForSelector(inputSelector);
    await page.click(inputSelector);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const pages = context.pages();

    if (pages.length > 1) {
      const tab1 = pages[0];
      await tab1.bringToFront();
      console.log("Switched to Tab 1");

      const randomElements = await tab1.$$("*");
      if (randomElements.length > 0) {
        const randomElement =
          randomElements[Math.floor(Math.random() * randomElements.length)];
        const rect = await randomElement.boundingBox();
        if (rect) {
          const randomX = generateRandomNumber(rect.x, rect.x + rect.width);
          const randomY = generateRandomNumber(rect.y, rect.y + rect.height);

          await tab1.mouse.move(randomX, randomY);
          await new Promise((resolve) => setTimeout(resolve, 500));
          await tab1.mouse.click(randomX, randomY);
          console.log("Clicked on a random element in Tab 1");
        }
      }
    } else {
      console.log("[x] - Tab 1 is not available 🗂️");
    }

    await new Promise((resolve) => setTimeout(resolve, 25000));
  } catch (error) {
    console.log("error");
  } finally {
    await context.close();
    await browser.close();
  }
};

const tasksPoll = async () => {
  const tasks = Array.from({ length: Threads }).map(() => {
    return OpenBrowser("https://djberniev.be/");
  });

  await Promise.all(tasks);
};

const RunTasks = async () => {
  let views = 0;
  for (let i = 0; i < 10000000; i++) {
    try {
      views = views + Threads;
      await tasksPoll(views);
      console.log(`[+] - MONEY MACHINE 💰💸 > ${views}`);
    } catch (error) {
      console.log(error);
    }
  }
};

RunTasks();

