/**
 * Scrapes RuggedRed product pages using Playwright (SPA content).
 * Reads slugs from ruggedred_slugs.json or discovers from listing pages.
 * Outputs ruggedred_import.json in Product schema format.
 * Run: npm run scrape-ruggedred-slugs
 * First run: npx playwright install chromium
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const BASE_URL = 'https://ruggedred.com';
const SLUGS_PATH = path.join(__dirname, '../../data/ruggedred_slugs.json');
const OUTPUT_PATH = path.join(__dirname, '../../data/ruggedred_import.json');
const REQUEST_DELAY_MS = 2000;
const CONTENTFUL_BASE = 'https://cdn.contentful.com/spaces/hdznx4p7ef81/environments/master/entries';

interface ProductOutput {
  product_id: string;
  name: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry?: string;
  url?: string;
  image?: string;
  benefits: string[];
  applications: string[];
  how_to_use: string[];
  technical: Array<{ property: string; value: string; unit?: string }>;
  sizing: string[];
  published: boolean;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function extractSizingFromText(text: string): string[] {
  const matches = text.match(/\b\d+\s?(?:oz|ml|l|gal|gallon)\b(?:\s*(?:bottle|jug|pail|drum|canister|can|cart|tote))?/gi) || [];
  const normalized = matches.map((m) =>
    m
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\bgal\b/i, 'gallon')
  );

  const has32oz = /\b32\s?oz\b/i.test(text);
  const has1gal = /\b1\s?(?:gal|gallon)\b/i.test(text);
  if (has32oz && has1gal) {
    normalized.unshift('32oz + 1gallon Bottle');
  }

  return uniqueStrings(normalized).slice(0, 8);
}

function cleanLine(value: string): string {
  return value
    .replace(/[•·\u2022]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHeadingLine(value: string): boolean {
  const normalized = cleanLine(value).toLowerCase().replace(/\s+/g, ' ');
  return [
    'applications',
    'benefits',
    'how to use',
    'sizing',
    'request quote',
    'product assets',
    'technical data sheet (tds)',
    'safety data sheet (sds)',
  ].includes(normalized);
}

function isNoiseLine(value: string): boolean {
  const normalized = cleanLine(value).toLowerCase();
  return [
    'proudly made in america',
    'learn more about us',
    'get updates from rugged red',
    'new products, tips, and much more!',
    'subscribe',
    'powered by formoclean',
  ].includes(normalized) || normalized.includes('all rights reserved');
}

function splitPageLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter((line) => line.length > 0);
}

function extractSectionLines(text: string, sectionName: 'applications' | 'benefits' | 'how to use' | 'sizing'): string[] {
  const lines = splitPageLines(text);
  const normalizedSection = sectionName.toLowerCase();
  const start = lines.findIndex((line) => cleanLine(line).toLowerCase() === normalizedSection);
  if (start === -1) return [];

  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isHeadingLine(line)) break;
    if (isNoiseLine(line)) break;
    if (line.length < 2) continue;
    out.push(line);
  }
  return uniqueStrings(out);
}

function looksLikeSizing(value: string): boolean {
  return /\b\d+\s?(?:oz|ml|l|gal|gallon)\b/i.test(value) || /\b(?:bottle|jug|pail|drum|canister|tote)\b/i.test(value);
}

function looksLikeInstruction(value: string): boolean {
  return /^(spray|let|use|repeat|apply|wipe|rinse|allow|shake)\b/i.test(value);
}

function normalizeHowToUseLines(lines: string[]): string[] {
  const expanded = lines
    .flatMap((line) => line.split(/\r?\n/))
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const items: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const cleaned = cleanLine(current).replace(/^\d+\s*[).:-]\s*/, '');
    if (cleaned) items.push(cleaned);
    current = '';
  };

  for (const rawLine of expanded) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    const isNumberedStart = /^\d+\s*[).:-]\s*/.test(line);
    if (isNumberedStart) {
      if (current) pushCurrent();
      current = line.replace(/^\d+\s*[).:-]\s*/, '');
      continue;
    }

    // Lowercase line is usually a wrapped continuation from previous line.
    const isLikelyContinuation = /^[a-z]/.test(line) || /[,;:]$/.test(current);

    if (!current) {
      current = line;
      continue;
    }

    if (isLikelyContinuation) {
      current = `${current} ${line}`;
    } else {
      pushCurrent();
      current = line;
    }
  }

  if (current) pushCurrent();
  return uniqueStrings(items);
}

function isPlaceholderSizing(sizing: string[]): boolean {
  if (!sizing.length) return true;
  return sizing.length === 1 && /contact for sizing/i.test(sizing[0] || '');
}

function canonicalSlugFromProductId(productId: string): string {
  return productId.replace(/^rr_(household|industrial)_/, '');
}

function slugToProductId(slug: string, segment: 'household' | 'industrial'): string {
  return `rr_${segment}_${slug.replace(/-/g, '_').toLowerCase()}`;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function discoverSlugs(page: any, segment: 'household' | 'industrial'): Promise<string[]> {
  const url = `${BASE_URL}/${segment}/products`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await delay(3000);

  const links = (await page.$$eval('a[href*="/product/"]', (anchors: { getAttribute: (n: string) => string | null }[]) =>
    anchors.map((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/product\/(?:household|industrial)\/([^/?#]+)/);
      return match ? match[1] : null;
    }).filter((s): s is string => Boolean(s))
  )) as string[];

  return [...new Set(links)];
}

async function fetchContentfulSlugs(page: any): Promise<{ household: string[]; industrial: string[] }> {
  let bearerToken = '';
  const onRequest = (request: any) => {
    const url = request.url();
    if (url.includes('cdn.contentful.com')) {
      const headers = request.headers();
      if (headers['authorization'] && headers['authorization'].startsWith('Bearer ')) {
        bearerToken = headers['authorization'].replace(/^Bearer\s+/i, '').trim();
      }
    }
  };

  page.on('request', onRequest);
  await page.goto(`${BASE_URL}/household/products`, { waitUntil: 'networkidle', timeout: 60000 });
  await delay(1200);
  await page.goto(`${BASE_URL}/industrial/products`, { waitUntil: 'networkidle', timeout: 60000 });
  await delay(1200);
  page.off('request', onRequest);

  if (!bearerToken) {
    console.warn('Could not capture Contentful bearer token from listing pages.');
    return { household: [], industrial: [] };
  }

  const fetchEntries = async (contentType: string): Promise<any[]> => {
    const items: any[] = [];
    let skip = 0;
    const limit = 1000;

    while (true) {
      const response = await axios.get(CONTENTFUL_BASE, {
        params: { content_type: contentType, limit, skip },
        headers: { Authorization: `Bearer ${bearerToken}` },
        timeout: 30000,
      });
      const data = response.data || {};
      const pageItems = Array.isArray(data.items) ? data.items : [];
      items.push(...pageItems);
      const total = Number(data.total || 0);
      skip += pageItems.length;
      if (!pageItems.length || skip >= total) break;
    }
    return items;
  };

  const [consumerItems, b2bItems] = await Promise.all([
    fetchEntries('cleaningProductData'),
    fetchEntries('b2bCleaningProductData'),
  ]);

  const extractSlug = (entry: any, segment: 'household' | 'industrial'): string | null => {
    const fields = entry?.fields || {};
    const rawUrl = fields.buyNowButtonUrl || fields.productUrl || '';
    if (typeof rawUrl === 'string' && rawUrl.trim()) {
      const match = rawUrl.match(/\/(?:household|industrial)\/product\/(?:household|industrial)\/([^/?#]+)/i);
      if (match?.[1]) return match[1].toLowerCase();
    }
    const title = typeof fields.productTitle === 'string' ? fields.productTitle : '';
    if (title) return toSlug(title);
    return null;
  };

  const household = uniqueStrings(
    consumerItems.map((item) => extractSlug(item, 'household')).filter((s): s is string => Boolean(s))
  );
  const industrial = uniqueStrings(
    b2bItems.map((item) => extractSlug(item, 'industrial')).filter((s): s is string => Boolean(s))
  );

  return { household, industrial };
}

async function scrapeProductPage(
  page: any,
  slug: string,
  industry: 'household_industry' | 'industrial_industry',
  segment: 'household' | 'industrial'
): Promise<ProductOutput | null> {
  const url = `${BASE_URL}/${segment}/product/${segment}/${slug}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    const productId = slugToProductId(slug, segment);

    const title = await page.locator('h1').first().textContent().then((t: string | null) => t?.trim() || '').catch(() => '');
    const desc = await page.locator('[class*="description"], [class*="Description"], p').first().textContent().then((t: string | null) => t?.trim() || '').catch(() => '');
    const pageText = await page.locator('body').innerText().catch(() => '');
    let img = await page.locator('img[src*="product"], [class*="product"] img, img').first().getAttribute('src').then((s: string | null) => s || '').catch(() => '');
    if (img && !img.startsWith('http')) {
      img = new URL(img, url).href;
    }

    const genericListItems: string[] = (await page.$$eval('ul li', (els: { textContent: string | null }[]) =>
      els.map((e) => e.textContent?.trim() || '').filter((t: string) => t.length > 10 && t.length < 300).slice(0, 15)
    ).catch(() => [])) as string[];

    const sectionApplications = extractSectionLines(pageText, 'applications');
    const sectionBenefits = extractSectionLines(pageText, 'benefits');
    const sectionHowToUse = extractSectionLines(pageText, 'how to use');
    const sectionSizing = extractSectionLines(pageText, 'sizing');

    const benefits = (sectionBenefits.length
      ? sectionBenefits
      : genericListItems.filter((line) => !looksLikeInstruction(line) && !looksLikeSizing(line))
    ).slice(0, 20);

    const applications = uniqueStrings(
      sectionApplications.length ? sectionApplications : (desc ? [desc] : [])
    ).slice(0, 20);
    const howToUse = normalizeHowToUseLines(sectionHowToUse).slice(0, 20);

    const technical: Array<{ property: string; value: string; unit?: string }> = (await page.$$eval(
      'table tr',
      (rows: Array<{ querySelectorAll: (s: string) => Array<{ textContent: string }> }>) =>
        rows
          .map((row) => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const prop = (cells[0].textContent || '').trim();
              const val = (cells[1].textContent || '').trim();
              if (prop && val) return { property: prop, value: val };
            }
            return null;
          })
          .filter((x): x is { property: string; value: string } => x !== null)
    ).catch(() => [])) as Array<{ property: string; value: string; unit?: string }>;

    const cleanedTechnical = technical.filter((t) => {
      const p = t.property.toLowerCase();
      const v = t.value.toLowerCase();
      if (!t.property.trim() || !t.value.trim()) return false;
      if (p === 'feature' && /rugged red/.test(v)) return false;
      if (/rugged red/.test(p) || /rugged red/.test(v)) return false;
      return true;
    });

    const sizingFromOptions: string[] = (await page.$$eval('select option', (opts: { textContent: string | null }[]) =>
      opts.map((o) => o.textContent?.trim() || '').filter((t: string) => t && !/select|choose|option/i.test(t))
    ).catch(() => [])) as string[];
    const sizingFromText = extractSizingFromText(pageText);
    const sizing = uniqueStrings([
      ...sectionSizing.filter((line) => looksLikeSizing(line)),
      ...sizingFromOptions,
      ...sizingFromText,
    ]);

    const name = title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return {
      product_id: productId,
      name,
      full_name: name,
      description: desc || name,
      brand: 'rugged_red',
      industry,
      url,
      image: img ? img : undefined,
      benefits,
      applications,
      how_to_use: howToUse,
      technical: cleanedTechnical.map(t => ({ ...t, unit: undefined })),
      sizing: sizing.length ? sizing : ['Contact for sizing'],
      published: true,
    };
  } catch (err) {
    console.error(`Failed to scrape ${slug}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function main(): Promise<void> {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    let slugs: { household: string[]; industrial: string[] };
    if (fs.existsSync(SLUGS_PATH)) {
      slugs = JSON.parse(fs.readFileSync(SLUGS_PATH, 'utf8'));
    } else {
      slugs = { household: [], industrial: [] };
    }

    // Always attempt discovery and merge with existing slugs.
    // This keeps the local slug file up-to-date as RuggedRed adds products.
    console.log('Discovering slugs from listing pages...');
    const discoveredHousehold = await discoverSlugs(page, 'household');
    const discoveredIndustrial = await discoverSlugs(page, 'industrial');
    const contentfulSlugs = await fetchContentfulSlugs(page);
    slugs.household = uniqueStrings([
      ...(slugs.household || []),
      ...discoveredHousehold,
      ...contentfulSlugs.household,
    ]);
    slugs.industrial = uniqueStrings([
      ...(slugs.industrial || []),
      ...discoveredIndustrial,
      ...contentfulSlugs.industrial,
    ]);
    fs.writeFileSync(SLUGS_PATH, JSON.stringify(slugs, null, 2), 'utf8');
    console.log('Using household:', slugs.household.length, 'industrial:', slugs.industrial.length);

    const allProducts: ProductOutput[] = [];

    for (const slug of slugs.household) {
      console.log('Scraping household:', slug);
      const product = await scrapeProductPage(page, slug, 'household_industry', 'household');
      if (product) allProducts.push(product);
      await delay(REQUEST_DELAY_MS);
    }

    for (const slug of slugs.industrial) {
      console.log('Scraping industrial:', slug);
      const product = await scrapeProductPage(page, slug, 'industrial_industry', 'industrial');
      if (product) allProducts.push(product);
      await delay(REQUEST_DELAY_MS);
    }

    // If one segment has real sizing and the other has placeholder sizing for same slug,
    // copy the real sizing so both entries are usable in the portal.
    const sizingByCanonicalSlug = new Map<string, string[]>();
    for (const product of allProducts) {
      if (!isPlaceholderSizing(product.sizing)) {
        sizingByCanonicalSlug.set(canonicalSlugFromProductId(product.product_id), product.sizing);
      }
    }
    for (const product of allProducts) {
      if (isPlaceholderSizing(product.sizing)) {
        const sharedSizing = sizingByCanonicalSlug.get(canonicalSlugFromProductId(product.product_id));
        if (sharedSizing && sharedSizing.length) {
          product.sizing = [...sharedSizing];
        }
      }
    }

    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allProducts, null, 2), 'utf8');
    console.log(`\nWrote ${allProducts.length} products to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
