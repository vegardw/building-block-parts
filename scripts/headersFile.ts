// Reads public/_headers, the format Cloudflare Pages and Netlify use for response
// headers, so `vite preview` can serve the same headers (vite.config.ts) and the
// tests can check them (tests/headers.test.ts). Only what the file uses: paths with
// `*` splats, `#` comments, and indented "Name: value" lines under a path.

export interface HeaderRule {
  path: string;
  headers: [name: string, value: string][];
}

export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const [i, raw] of text.split("\n").entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("/")) {
      rules.push({ path: line, headers: [] });
      continue;
    }
    const colon = line.indexOf(":");
    const rule = rules.at(-1);
    if (!rule || colon <= 0) throw new Error(`_headers line ${i + 1}: expected a path or "Name: value"`);
    rule.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

// A rule's path matches as on the hosts: `*` stands for anything, slashes included.
export function pathMatches(pattern: string, path: string): boolean {
  const literal = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${literal.join(".*")}$`).test(path);
}

// Every header the matching rules set for a path, in file order.
export const headersFor = (rules: HeaderRule[], path: string): [string, string][] =>
  rules.filter((rule) => pathMatches(rule.path, path)).flatMap((rule) => rule.headers);
