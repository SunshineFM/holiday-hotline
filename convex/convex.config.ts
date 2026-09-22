import { defineApp } from "convex/server";
import { v } from "convex/values";
export default defineApp({
  env: {
    STAFF_EMAIL: v.optional(v.string()),
    STAFF_ENROLLMENT_CODE: v.optional(v.string()),
    PILOT_NAME: v.optional(v.string()),
    PILOT_SLUG: v.optional(v.string()),
    PILOT_WEBSITE: v.optional(v.string()),
    HOTLINE_STORE_SLUG: v.optional(v.string()),
    ELEVENLABS_TOOL_SECRET: v.optional(v.string()),
    AGENTMAIL_API_KEY: v.optional(v.string()),
    AGENTMAIL_INBOX_ID: v.optional(v.string()),
    FIRECRAWL_API_KEY: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
  },
});
