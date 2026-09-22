import { env } from "./_generated/server";
const config = {
  providers: [{ domain: env.CONVEX_SITE_URL, applicationID: "convex" }],
};

export default config;
