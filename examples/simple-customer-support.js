import {SkymelAgent} from "skymel-adk-js-beta";

const agent = new SkymelAgent(
  process.env.SKYMEL_API_KEY,
  "wss://api.skymel.com/agent-creation",
  true,
  "Support Bot",
  "Answer customer questions about our pricing and features. Our plans are: Basic ($10/month - 1000 API calls), Pro ($50/month - 10,000 API calls), Enterprise ($200/month - unlimited calls). All plans include email support.",
  "Be friendly, concise, and always mention our 14-day free trial"
);

const response = await agent.run("How much does the pro plan cost?");
console.log(response);