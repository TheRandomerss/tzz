import { newInjectedContext } from "fingerprint-injector";
import { chromium } from "playwright";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import https from "https"; // Import https

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
  { value: { device: "desktop", os: "macos", browser: "chrome" }, weight: 5 },
  { value: { device: "desktop", os: "macos", browser: "safari" }, weight: 10 },
  { value: { device: "desktop", os: "linux", browser: "chrome" }, weight: 5 },
  { value: { device: "desktop", os: "linux", browser: "firefox" }, weight: 5 },
  { value: { device: "mobile", os: "android", browser: "chrome" }, weight: 15 },
  { value: { device: "mobile", os: "ios", browser: "safari" }, weight: 10 },
];

export const checkTz = async (username) => {
  const headlessPreference = weightedRandom(preferences);

  const headless = await chromium.launch({
    headless: true,
    proxy: {
      server: "148.113.161.141:5959",
      username: username,
      password: "qNyHNzFRMFuwQhs",
    },
  });

  const headlessContext = await newInjectedContext(headless, {
    fingerprintOptions: {
      devices: [headlessPreference.device],
      browsers: [headlessPreference.browser],
      operatingSystems: [headlessPreference.os],
    },
  });

  try {
    const page = await headlessContext.newPage();

    // Abort requests for images, CSS, and fonts to improve performance
    await page.route("**/*", (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Add timeout to handle slow loading
    await page.goto("https://ipgeolocation.io/", {
      waitUntil: "load",
      timeout: 30000, // 30 seconds timeout (you can increase this value)
    });

    // Ensure the element exists
    await page.waitForSelector("#ip", { timeout: 30000 }); // Add timeout for selector

    // Adding a delay to wait for full page load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const ipDetails = {
      ip: await page.$eval("#ip", (el) => el.textContent.trim()),
      country_name: await page.$eval("#country_name", (el) =>
        el.textContent.trim()
      ),
      state_prov: await page.$eval("#state_prov", (el) =>
        el.textContent.trim()
      ),
      city: await page.$eval("#city", (el) => el.textContent.trim()),
      latitude: await page.$eval("#latitude", (el) => el.textContent.trim()),
      longitude: await page.$eval("#longitude", (el) => el.textContent.trim()),
      time_zone: await page.$eval("#time_zone_name", (el) =>
        el.textContent.trim()
      ),
      isp: await page.$eval("#isp", (el) => el.textContent.trim()),
      currency: await page.$eval("#currency_name", (el) =>
        el.textContent.trim()
      ),
      country_flag: await page.$eval("#country_flag", (el) => el.src),
    };

    console.log(
      `[!] - 🗺️ : ${ipDetails.country_name} | ⏳ : ${ipDetails.time_zone}`
    );

    // Safely closing browser and context
    await headlessContext.close();
    await headless.close();

    return ipDetails;
  } catch (error) {
    console.error("Error occurred while fetching timezone data");

    // Ensuring that the browser closes even if an error occurs
    try {
      await headlessContext.close();
      await headless.close();
    } catch (cleanupError) {
      console.error("Error closing the browser:", cleanupError);
    }

    // Simply log the error and continue
    return null;
  }
};

export const checkTzQuick = async (username) => {
  const proxyHost = "148.113.161.141";
  const proxyPort = "5959";
  const proxyUsername = username;
  const proxyPassword = "qNyHNzFRMFuwQhs";

  // Properly formatted proxy URL
  const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
  const proxyAgent = new HttpsProxyAgent(proxyUrl);

  try {
    const response = await axios.get(
      "https://white-water-a7d6.mahdiidrissi2022.workers.dev/",
      {
        httpsAgent: proxyAgent,
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );
    const ipDetails = { timezone: response.data.trim() };
    return ipDetails.timezone || null;
  } catch (error) {
    console.error("Error fetching timezone:", error.message);
    return null;
  }
};
