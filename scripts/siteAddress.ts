// The site's public address, for link previews (og:image, og:url) and the canonical link that vite.config.ts writes
// into the page. It comes from package.json's `homepage`, so the deployed site needs no build setting; SITE_URL
// overrides it (another host, or SITE_URL= for a build without one, e.g. a fork that hasn't set its own homepage).
export function siteUrlFrom(env: string | undefined, homepage: string | undefined): string {
  return (env ?? homepage ?? "").replace(/\/+$/, "");
}
