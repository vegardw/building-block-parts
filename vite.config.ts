import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import reactPlugin from "@vitejs/plugin-react";

// With its extension, unlike elsewhere: Vite's coming native config loader (Node) needs it.
import { headersFor, parseHeadersFile } from "./scripts/headersFile.ts";
import { siteUrlFrom } from "./scripts/siteAddress.ts";

// `vite preview` (npm run serve) sends the headers in public/_headers, as the host
// does, so the production headers (the CSP above all) are tried before deploying.
const hostHeaders = (): Plugin => ({
  name: "host-headers",
  configurePreviewServer(server) {
    const rules = parseHeadersFile(readFileSync(join(server.config.publicDir, "_headers"), "utf8"));
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? "/").split("?")[0] ?? "/";
      for (const [name, value] of headersFor(rules, path)) res.setHeader(name, value);
      next();
    });
  },
});

// Link previews (og:image, og:url) need absolute addresses: package.json's `homepage`, or SITE_URL
// (scripts/siteAddress.ts). Without one the image address stays relative and there is no og:url or
// canonical link. The canonical link makes search engines prefer this address over the host's own
// (*.pages.dev on Cloudflare Pages).
const pkg = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")) as { homepage?: string };
const siteUrl = siteUrlFrom(process.env.SITE_URL, pkg.homepage);
const siteAddress = (): Plugin => ({
  name: "site-address",
  transformIndexHtml: {
    order: "pre", // before Vite's own %NAME% replacement, which would warn about it
    handler: (html) => ({
      html: html.replaceAll("%SITE_URL%", siteUrl),
      tags: siteUrl
        ? [
            { tag: "meta", attrs: { property: "og:url", content: `${siteUrl}/` }, injectTo: "head" },
            { tag: "link", attrs: { rel: "canonical", href: `${siteUrl}/` }, injectTo: "head" },
          ]
        : [],
    }),
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactPlugin(), hostHeaders(), siteAddress()],
  resolve: {
    // Keep renderer dependencies on the application's runtime instances.
    dedupe: ["react", "react-dom", "three"],
  },
  build: {
    outDir: "build",
    // The 3D view's chunk (src/Scene.tsx) is mostly three.js, about 920 kB (245 kB
    // compressed), already split off and loaded on demand. Warn only above that.
    chunkSizeWarningLimit: 1000,
  },
  worker: {
    format: "es",
  },
  server: {
    port: 4444,
  },
});
