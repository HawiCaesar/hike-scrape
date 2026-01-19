import type { V3Options } from "@browserbasehq/stagehand";
import dotenv from "dotenv";


dotenv.config();

const StagehandConfig: V3Options = {
  verbose: 0 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeout: 30_000 /* Timeout for DOM to settle in milliseconds */,

  model: {
    modelName: "anthropic/claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  } /* Configuration options for the model client */,

  // Browser configuration
  env: "BROWSERBASE" /* Environment to run in: LOCAL or BROWSERBASE */,
  apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
  projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
  browserbaseSessionID:
    undefined /* Session ID for resuming Browserbase sessions */,
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    proxies: true,
    browserSettings: {
      blockAds: true,
      // captchaImageSelector: 'img#captcha_img',
      // captchaInputSelector: 'input#captcahText',
      viewport: {
        width: 1024,
        height: 768,
      },
    },
  },
  localBrowserLaunchOptions: {
    headless: false, // Visible browser is less detectable
    viewport: {
      width: 1024,
      height: 768,
    },
  } /* Configuration options for the local browser */,
};

export default StagehandConfig;
