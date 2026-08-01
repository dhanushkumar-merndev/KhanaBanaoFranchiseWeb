/**
 * Design verification helper.
 *
 *   node scripts/screenshot.mjs <outDir> [url]
 *
 * Captures the page at desktop and mobile widths, scrolling first so every
 * IntersectionObserver reveal has fired, then reports horizontal overflow,
 * unrevealed elements and runtime errors. Mobile is captured section by
 * section so each image stays legible.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2];
const URL = process.argv[3] ?? "http://localhost:3111/";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

async function prepare(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.5;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 700));
  });
  return errors;
}

/* ---------------- desktop ---------------- */
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const desktopErrors = await prepare(desktop);
await desktop.screenshot({ path: `${OUT}/desktop-full.png`, fullPage: true });
await desktop.screenshot({ path: `${OUT}/desktop-hero.png` });

/* ---------------- mobile ---------------- */
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const mobileErrors = await prepare(mobile);

const selectors = await mobile.$$eval("section, footer", (nodes) =>
  nodes.map((n, i) => ({ i, id: n.id || n.tagName.toLowerCase() })),
);

const handles = await mobile.$$("section, footer");
for (let i = 0; i < handles.length; i++) {
  const label = selectors[i]?.id ?? `s${i}`;
  try {
    await handles[i].scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(220);
    await handles[i].screenshot({
      path: `${OUT}/mobile-${String(i).padStart(2, "0")}-${label}.png`,
    });
  } catch {
    problems.push(`could not capture section ${label}`);
  }
}

const overflow = await mobile.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
if (overflow.scrollWidth > overflow.clientWidth) {
  problems.push(
    `horizontal overflow on mobile: ${overflow.scrollWidth} > ${overflow.clientWidth}`,
  );
}

// A section still at opacity 0 means its reveal never fired.
const unrevealed = await mobile.$$eval(".reveal", (nodes) =>
  nodes.filter((n) => n.dataset.revealed !== "true").length,
);
if (unrevealed > 0) problems.push(`${unrevealed} elements never revealed`);

console.log("sections captured:", handles.length);
console.log("mobile overflow  :", JSON.stringify(overflow));
console.log("unrevealed       :", unrevealed);
console.log("desktop errors   :", desktopErrors.length, desktopErrors.slice(0, 3));
console.log("mobile errors    :", mobileErrors.length, mobileErrors.slice(0, 3));
console.log("problems         :", problems.length ? problems : "none");

await browser.close();
