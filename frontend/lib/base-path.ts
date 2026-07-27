// Single source of truth for the app's basePath (see next.config.ts).
// Next.js auto-prefixes basePath onto its own asset pipeline (_next/static,
// next/image, next/link) but not onto raw hardcoded path strings - anything
// referencing a public/ asset by a literal "/..." string needs this prefix
// applied manually, or it resolves to the domain root instead of /skillbridge
// and 404s behind the production nginx proxy.
export const BASE_PATH = "/skillbridge";
