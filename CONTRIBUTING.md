# Contributing

Thanks for wanting to help. Bug reports, measurements of genuine parts, new parts and fixes are all welcome. Report
bugs and share measurements in the [issues](https://github.com/vegardw/building-block-parts/issues); send changes as
pull requests.

## Getting started

You need Node.js 22.13 or newer.

```sh
git clone https://github.com/vegardw/building-block-parts.git
cd building-block-parts
npm install
npm start               # dev server on http://localhost:4444
npm run check           # type check, lint, format check and unit tests: run this before every pull request
```

`npm test` builds real parts with the CAD engine in Node, so the unit tests take about half a minute. The browser smoke
test builds the site and drives it in Chromium, Firefox and WebKit:

```sh
npx playwright install  # once, to download the browsers (on Linux: npx playwright install --with-deps)
npm run test:browser
```

Format with `npm run format` (Prettier); `npm run lint` runs ESLint. How the code fits together (the UI, the worker,
the split between UI and CAD code, the tests) is in [docs/architecture.md](docs/architecture.md); read its
"Code organisation" section before a larger change.

## The rules that matter most

- **STEP files contain only exact geometry.** Planes, cylinders, cones, spheres and tori, with lines, circles and
  ellipses as edges: never triangles or splines standing in for curves. This is the reason the project exists, and a
  test checks it for every part.
- **The UI never imports the CAD library.** Pure modules (`spec.ts`, `parts/<id>.ts`, `parts/index.ts`, ...) stay free
  of replicad; CAD code lives in `*.build.ts` files and runs in the worker.
- **Numbers typed by users go through `parseNumber`**, never `parseFloat` or `Number`: many users type a decimal comma.
- **Every change comes with tests.** Pure logic gets unit tests; geometry gets assertions on the exported STEP file
  (see `tests/stepStats.ts`), with expected values written out by hand rather than taken from the code.
- **Dimensions need a source.** Nominal sizes are documented with their sources in
  [docs/dimensions.md](docs/dimensions.md); a change to one needs a measurement or a reference, added there.
- **Comments explain why**, not what.

## Adding a part

A part is a definition file and a builder file, registered in two places; the form, validation, file name, download
and the exact-geometry test pick it up by themselves. The steps are in
[docs/architecture.md](docs/architecture.md#how-to-add-a-part). A calibration part also needs a step under Calibrate
and a section in [docs/calibration.md](docs/calibration.md), which the app shows as its guide.

## Names and trademarks

The project is not affiliated with the LEGO Group. Don't use "LEGO" or "Technic" in names, page titles, headings, file
names or keywords. Describing compatibility in body text is fine ("compatible with LEGO® bricks, LEGO® Technic™"),
with the disclaimer that the README uses. Say "beam (liftarm)".

## Licence

The project is MIT-licensed (see [LICENSE](LICENSE)); by contributing you agree that your contribution is licensed the
same way. The OpenCascade engine it ships is LGPL 2.1 with the Open CASCADE exception; `npm run notices` lists every
third-party licence.
