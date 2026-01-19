import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod/v3";
import { readFileSync } from "fs";
import { join } from "path";
import StagehandConfig from "./stagehand.config";

// Define the schema for hike data extraction
const HikeSchema = z.object({
  hikes: z.array(
    z.object({
      name: z.string().describe("Name of the hike or adventure"),
      location: z.string().optional().describe("Location or destination of the hike"),
      date: z.string().optional().describe("Date of the hike"),
      time: z.string().optional().describe("Meeting or departure time"),
      meetingPoint: z.string().optional().describe("Meeting point or pickup location"),
      cost: z.string().optional().describe("Cost or price of the hike"),
      contact: z.string().optional().describe("Contact information (phone, email, or social media)"),
    })
  ),
});

type HikeData = z.infer<typeof HikeSchema>;

interface ScrapedResult {
  company: string;
  url: string;
  hikes: HikeData["hikes"];
}

// Read target dates from weekend_dates.md
const readTargetDates = (): string => {
  try {
    const filePath = join(process.cwd(), "weekend_dates.md");
    const content = readFileSync(filePath, "utf-8").trim();
    return content;
  } catch (error) {
    console.error("Error reading weekend_dates.md:", error);
    return "this weekend";
  }
};

// Helper to scroll down the page
const scrollPage = async (page: Awaited<ReturnType<typeof Stagehand.prototype.context.pages>>[0], percentage: number = 50) => {
  await page.evaluate((pct) => {
    const viewportHeight = window.innerHeight;
    const scrollAmount = (viewportHeight * pct) / 100;
    window.scrollBy(0, scrollAmount);
  }, percentage);
  await new Promise((resolve) => setTimeout(resolve, 500));
};

// Helper to scroll to bottom of page
const scrollToBottom = async (page: Awaited<ReturnType<typeof Stagehand.prototype.context.pages>>[0]) => {
  for (let i = 0; i < 5; i++) {
    await scrollPage(page, 80);
  }
};

// Scrape a single website for hike information
const scrapeWebsite = async (
  stagehand: Stagehand,
  page: Awaited<ReturnType<typeof Stagehand.prototype.context.pages>>[0],
  url: string,
  companyName: string,
  targetDates: string
): Promise<ScrapedResult> => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Scraping: ${companyName}`);
  console.log(`URL: ${url}`);
  console.log(`Looking for hikes on: ${targetDates}`);
  console.log("=".repeat(60));

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to close any popups/cookie banners
    try {
      await stagehand.act("close any popup, cookie banner, or accept button if visible", {
        timeout: 5000,
      });
    } catch {
      // No popup to close, continue
    }

    // Scroll through the page to load all content
    await scrollToBottom(page);

    // Extract hike information using the schema
    const extractionPrompt = `
      Find ONLY hikes, adventures, or expeditions listed on this page that are scheduled for ${targetDates}.
      
      IMPORTANT RULES:
      - ONLY include hikes happening on ${targetDates} - no other dates
      - If there are NO hikes scheduled for these specific dates, return an EMPTY array
      - DO NOT return hikes for other dates if the target dates have no events
      - Look for dates that match: ${targetDates}, or phrases like "this weekend", "this Saturday", "this Sunday"
      
      For each matching hike ONLY, extract:
      - Name of the hike/adventure
      - Location or destination
      - Date (exact date if available)
      - Time (meeting time or departure time)
      - Meeting point or pickup location
      - Cost/price
      - Contact information (phone, email, WhatsApp, etc.)
      
      If no hikes match ${targetDates}, return an empty hikes array.
    `;

    const hikeData = await stagehand.extract(extractionPrompt, HikeSchema);

    console.log(`Found ${hikeData.hikes.length} hike(s) on ${companyName}`);

    return {
      company: companyName,
      url,
      hikes: hikeData.hikes,
    };
  } catch (error) {
    console.error(`Error scraping ${companyName}:`, error);
    return {
      company: companyName,
      url,
      hikes: [],
    };
  }
};

// Format and print the summary
const printSummary = (results: ScrapedResult[], targetDates: string) => {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                    HIKE SCRAPE RESULTS                           ║");
  console.log(`║              Target Dates: ${targetDates.padEnd(38)}║`);
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  let totalHikes = 0;

  for (const result of results) {
    console.log(`\n┌──────────────────────────────────────────────────────────────────┐`);
    console.log(`│ 🏢 ${result.company.padEnd(62)}│`);
    console.log(`│ 🔗 ${result.url.padEnd(62)}│`);
    console.log(`└──────────────────────────────────────────────────────────────────┘`);

    if (result.hikes.length === 0) {
      console.log(`   ⚠️  No hikes found for ${targetDates} (other dates not included)`);
    } else {
      for (const hike of result.hikes) {
        totalHikes++;
        console.log(`\n   🥾 ${hike.name}`);
        if (hike.location) console.log(`      📍 Location: ${hike.location}`);
        if (hike.date) console.log(`      📅 Date: ${hike.date}`);
        if (hike.time) console.log(`      ⏰ Time: ${hike.time}`);
        if (hike.meetingPoint) console.log(`      🚩 Meeting Point: ${hike.meetingPoint}`);
        if (hike.cost) console.log(`      💰 Cost: ${hike.cost}`);
        if (hike.contact) console.log(`      📞 Contact: ${hike.contact}`);
      }
    }
  }

  console.log("\n");
  console.log("═".repeat(70));
  console.log(`📊 TOTAL: Found ${totalHikes} hike(s) across ${results.length} websites`);
  console.log("═".repeat(70));
};

// Main function
async function main() {
  // Read target dates from file
  const targetDates = readTargetDates();
  console.log(`\n🗓️  Target weekend: ${targetDates}\n`);

  // Define websites to scrape
  const websites = [
    {
      url: "https://monatrailskenya.wordpress.com/category/upcoming-hikes/",
      company: "Mona Trails Kenya",
    },
    {
      url: "https://matembezitravel.com/expedition/",
      company: "Matembezi Travel",
    },
    {
      url: "https://aviexpeditions.com/events/",
      company: "Avi Expeditions",
    },
  ];

  // Initialize Stagehand
  const stagehand = new Stagehand({
    ...StagehandConfig,
    env: "BROWSERBASE",
  });

  await stagehand.init();

  // console.log("🌐 Session URL:", stagehand.browserbaseSessionURL);
  // console.log("🔍 Debug URL:", stagehand.browserbaseDebugURL);

  const page = stagehand.context.pages()[0];
  const results: ScrapedResult[] = [];

  // Scrape each website
  for (const site of websites) {
    const result = await scrapeWebsite(stagehand, page, site.url, site.company, targetDates);
    results.push(result);
  }

  // Print formatted summary
  printSummary(results, targetDates);

  await stagehand.close();
  console.log("\n✅ Scraping complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
