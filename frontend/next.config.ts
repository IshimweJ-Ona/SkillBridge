import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/base-path";

const nextConfig: NextConfig = {
  // Produces a minimal .next/standalone build (only the files actually
  // needed at runtime, deps traced and copied in) - see Dockerfile.
  output: "standalone",
  // The production nginx config proxies /skillbridge/* straight through to
  // this app unchanged (no path-stripping - see the "no trailing path on
  // proxy_pass" comment in /etc/nginx/sites-available/jonaintra.tech), so
  // Next.js itself must know to route (and prefix its own asset URLs)
  // under /skillbridge - otherwise every page and every /_next/static
  // asset 404s once traffic goes through that proxy.
  basePath: BASE_PATH,
  // nginx's own `location = /skillbridge { return 301 /skillbridge/; }`
  // forces a trailing slash on the bare basePath. Next's default behavior
  // is the opposite - it strips trailing slashes on every non-root path -
  // which fights nginx's rule and produces an infinite redirect loop
  // between the two. Matching nginx's convention here (as every other app
  // on this same nginx config also uses trailing-slash URLs) resolves it.
  trailingSlash: true,
};

export default nextConfig;
