# Architecture

This page explains how the generator is built, for anyone who wants to fix something in it or add a part. It follows
a value from the form to the 3D preview and the STEP file, shows where each piece of code lives, and explains the
rules the code follows and why. How to install and run the app is in the [README](../README.md); where the dimensions
come from is in [dimensions.md](dimensions.md).

## Overview

The generator is a static web page. There is no server: all the work happens in the user's browser.

- The **user interface** is a React app on the browser's main thread. It shows the Parts and Calibrate sections and
  the fit settings, checks what the user typed, draws the 3D preview and saves the downloaded file.
- The **CAD engine** builds the parts. It is OpenCascade, an open-source C++ CAD kernel compiled to WebAssembly (one
  file of about 23 MB), used through the TypeScript library [replicad](https://replicad.xyz). It runs in a Web Worker,
  a background thread, so building a part never freezes the page.
- [Comlink](https://github.com/GoogleChromeLabs/comlink) connects the two. It makes the worker's functions look like
  ordinary `async` functions to the UI.

The UI sends the worker a **build request**: which part, its parameter values and the clearance settings. The worker
builds the part as an exact solid and returns either a triangle mesh for the preview or a file for download: STEP
(exact curves, the reason the project exists) or, if the user chooses it, STL (a mesh made from the exact solid).

### A few CAD terms

If you haven't worked with a CAD kernel before, these terms come up throughout the code:

- **B-rep** (boundary representation): how CAD kernels store a solid. The solid is bounded by faces; each face lies on
  an exact surface (a plane, a cylinder, ...) and is bounded by edges, each lying on an exact curve (a line, a
  circle, ...). A hole is one cylindrical face, not hundreds of small flat ones.
- **STEP**: the standard file format for exchanging B-rep models between CAD and CAM programs. A cylinder in a STEP
  file stays a true cylinder. This is why the project exists: mesh-based tools such as OpenSCAD write STEP files in
  which every hole is made of flat facets.
- **Mesh** (or tessellation): an approximation of the surfaces by triangles. The app uses one only to draw the
  preview; the STEP file always comes from the exact solid.
- **Extrude**: turn a 2D outline into a solid by pushing it along a direction.
- **Boolean operations**: combine solids. `fuse` joins two solids, `cut` removes one from another. A beam, for example,
  is an extruded stadium shape with a hole-shaped cutter cut out at every hole position.
- **Analytic geometry**: surfaces and curves described by a simple formula (plane, cylinder, cone, sphere, torus;
  line, circle, ellipse), as opposed to free-form splines or triangles. The parts use only analytic geometry.

## How a change flows through the app

The vertical line is the boundary between the two threads; every call across it goes through Comlink.

```
  MAIN THREAD (React UI)                          │  WEB WORKER (CAD engine)
                                                  │
  form text, kept as typed                        │
    │  parseParams, readClearance                 │
    ▼                                             │
  numbers ──> validatePart ──> error message      │
    │  valid                                      │
    ▼                                             │
  BuildRequest { partId, params, clearance }      │
    │                                             │
    ├─ preview:  scheduler.preview ─> createMesh ─┼──> shape cache
    │                                             │      same request as last time? reuse the shape
    └─ download: scheduler.always ──> createBlob ─┼──>   otherwise buildPart(request):
                                                  │        validate again, run the part's builder
                                                  │
  ReplicadMesh draws it, CameraControls fits it <─┼─── MeshData  (previewMesh: typed arrays, handed over)
  FileSaver saves beam-5-holes.step <─────────────┼─── Blob      (shape.blobSTEP())
```

Step by step, for a user who sets a beam to 5 holes:

1. **The form keeps text.** Every field is stored exactly as typed (`paramText` per part, and the fit settings'
   `text`), not as a number, so a half-typed value such as `-` or `0,` stays in the field instead of jumping back. The text is also
   what gets saved for the next visit.
2. **Parse.** `parseParams(part, text)` turns the parameter text into numbers, and `readClearance(text,
   part.clearance)` reads the clearance fields the part uses. Both go through `parseNumber`, which accepts a decimal
   comma and rejects anything that isn't clearly a number.
3. **Validate.** `validatePart(part, params, clearance)` returns an error message or `null`. If there is a message,
   the app shows it and builds nothing.
4. **Make a build request.** Otherwise the app creates a `BuildRequest { partId, params, clearance }`. It is memoised,
   so it only changes when a value really changes, and a new request is what starts a preview build.
5. **Schedule.** The request goes to the worker's `createMesh` through the scheduler, which runs one worker job at a
   time and drops preview requests that a newer one has replaced (see [Scheduling](#scheduling)).
6. **Build.** In the worker, `createMesh` waits until the engine has loaded, gets the shape from the shape cache
   (which calls `buildPart` when the request differs from the previous one) and meshes it with `previewMesh`:
   within 0.01 mm, a third of the triangles of an STL (see [The 3D preview](#the-3d-preview)). The mesh is typed
   arrays, handed over to the page with Comlink's `transfer` instead of being copied.
7. **Show.** The `MeshData` (triangles plus edge lines) comes back to the UI, which keeps the last six meshes by
   request (`src/previews.ts`): a part seen before (the other section, Back, "Show" in the parts list, a quick pick)
   shows at once, without a build. `boundsOf` computes the model's bounding sphere for the camera, and `ReplicadMesh`
   draws the model. While a newer build runs, the model shown last stays on screen with an "Updating…" badge.
8. **Download.** "Download STEP" (or STL) sends the same request and the file type to `createBlob`, through the
   scheduler's `always` lane: after the build that is running, before a waiting preview. The cache normally still
   holds the shape, so the worker only has to export it (`exportShape`). The UI saves the file as
   `part.filename(params)` + `.step` or `.stl`, with `-adjusted` before the extension when a clearance value the part
   uses isn't zero; the name is shown under the button before downloading.

### The worker's interface

`src/worker.ts` exports the `CadApi` interface; the UI calls it through `wrap<CadApi>(worker)`:

| Function | Returns | Used for |
|---|---|---|
| `ready()` | `true` once the engine has loaded | showing "Loading the CAD engine…" separately from "Building model…" |
| `createMesh(request)` | `MeshData { faces, edges }` | the preview |
| `createBlob(request, format)` | the STEP or STL file as a `Blob` | the download |
| `createSetBlob(items, format)` | several parts, each in a number of copies, in one file | "Download all four calibration parts", the parts list |
| `heapSize()` | the engine's memory in bytes | replacing a worker whose memory has grown too much (see [Memory](#memory)) |

Requests and results are plain data, copied between the threads; only the preview mesh's typed arrays are handed over
instead (see [The 3D preview](#the-3d-preview)). The UI reaches the current worker through `engine.api()`
(`src/engine.ts`), as the worker can be replaced. The UI imports only *types*
from the worker (`import type { CadApi, MeshData }`); the next section explains why.

`createSetBlob` calls `exportSet` (`src/parts/builders.ts`). It builds each part once as `buildPart` does and lays
its copies out on z = 0 in rows no wider than 120 mm (a typical resin printer's plate), 8 mm apart (`shelf` in
`src/layout.ts`, pure and tested), as a shift per copy. In a STEP file each copy is a `clone()`, moved into place and
named (the item's name, numbered when there are copies), so CAD programs and slicers list them by name. An STL file
has one mesh of all the parts: each part is meshed once (`mesh()`, the same mesher and tolerances as `blobSTL`) and
`binaryStl` (`src/stl.ts`, pure) writes its triangles once per copy, shifted. These shapes don't go through the shape
cache, so the previewed shape stays cached, and they are freed after the export.

**STL.** `exportShape` writes binary STL with replicad's `blobSTL`: OpenCascade meshes the exact solid to within
0.001 mm and 0.1 rad. The STEP file is unaffected, and stays analytic (rule: no faceted STEP); STL is offered only
for slicers that can't open STEP. `tests/stl.test.ts` reads the STL back (`tests/stlStats.ts`) and checks its size.
A 29-hole beam is about 2.8 MB as STL (0.35 MB as STEP). The angle limit decides how finely the small circles are
divided, so a looser distance (0.01 mm) only saves about a quarter; a looser angle (0.2 rad) halves the file but
leaves holes up to about 0.015 mm undersize, which matters for fit, so both stay as they are. A long parts list
therefore makes a large STL file (30 × 15-hole beams: 44 MB). It is quick, though: meshing each distinct part once
instead of every copy took that list from about 8 s to 0.5 s in the browser, and the engine's heap no longer grows
with the copies (it went from 100 to 692 MB). The triangles are those OpenCascade writes for the part, within float
rounding; only a flat face's diagonals can differ from meshing a moved copy afresh.

## The user interface

The page has two sections. Each section, part and step has its own address (`src/route.ts`): `#parts/<part id>` and
`#calibrate/<step id>`, with the parameters after a `?` (`#parts/beam?holes=7&height=0`). The address follows the
form with `history.replaceState` (so typing doesn't add history entries) while the parameters are valid; a link's
parameters replace the part's if they make a valid part (`paramsFromAddress`). The fit settings never go in the
address: they belong to the machine, so a shared link gives the recipient the part with their own fit. Picking a part or step adds a history entry (`history.pushState`), so the back and forward
buttons move between them and a link opens the part or step it names. An address without one (or the old
`#calibration`) is rewritten in place on load, so the first history entry names its part or step too.

- **Parts** (`#parts/beam`, the default): pick a part from tiles with an icon (`PartPicker.tsx`; `REGULAR_PARTS`, the
  parts without a `calibration` entry), optionally start from a quick pick (the part's `presets`, e.g. common pins),
  set its parameters, see the fit settings it uses in a box above the download button (`FitBox`), choose STEP or STL,
  and download it, or add it to the **parts list** (`PartsListCard.tsx`, logic in `src/partsList.ts`): parts with a
  quantity, downloaded together as one file through `createSetBlob`. Adding a part already in the list raises its
  quantity; each line can be shown in the form again or removed, and removing or clearing offers Undo.
- **Calibrate** (`#calibrate/hole`): one step per entry in `CALIBRATION_STEPS` (`src/calibrationSteps.ts`), shown as a list
  with each step's state, worked out from the fit settings. A step has three parts: *Make* (the step's part in the
  panel and the preview), *Test* (the step's section of the calibration guide) and *Result*: `Picker` draws the
  calibration part's features in the order they are on the part, as radio buttons, and `Measure` takes the test
  beam's measured width and height. Saving a result writes it into the fit settings with today's date. Picking a
  feature at either end offers to set the part's middle value to it.

The **fit settings** (`src/fit.ts`) are the six clearance values as typed plus, for each, where it came from
(`calibration` or `hand`, with the date). The "Fit settings" button beside the section tabs (`FitButton`) opens them
in a dialog (`FitSettings.tsx`). Saving them to a JSON file, loading one (`fitToFile`, `fitFromFile`: loading
replaces all six, a value missing from the file becomes 0, and nothing changes if any value is wrong) and resetting
them is one component, `FitFileActions`, shown in the dialog and in the "Your fit settings" box at the top of the
Calibrate section (`FitCard`), where the values are made. Loading and resetting offer Undo instead of asking first. `#guide` opens the whole calibration guide over either section.

`App.tsx` holds the state and works out the part on screen: under Parts the selected part with the user's fit
settings; under Calibrate the step's part at nominal clearance (`NO_CLEARANCE`; calibration parts exist to find the
settings), with the step's fixed parameters for the test beam. From there, building, previewing and downloading
work the same in both sections.

**Accessibility.** The choices (part tiles, button rows such as Full/Half and STEP/STL, the Result row) are radio
buttons underneath, so each group is one tab stop and the arrow keys move within it. Field errors and hints are tied
to their fields (`aria-describedby`), and number fields with a step answer the arrow keys. The muted grey text is at
least 5:1 against every background it is used on. With the system's "reduce motion" setting, transitions and the
spinner stop and scrolling jumps instead of gliding. The page title names the part or step, for tabs, bookmarks and
history. While the engine loads, the preview says it is about 7 MB (the compressed size; a host that doesn't
compress serves 23 MB), and after 15 s that a slow connection can take a minute.

## Code organisation

### UI code, CAD code and pure code

The most important rule in the code base: **the UI bundle must never import replicad at runtime.** replicad only works
once OpenCascade has been loaded, and that happens in the worker. Imported from UI code, replicad would be added to the
main JavaScript bundle, making the first load slower, and would fail when called.

So every module is one of three kinds:

- **Pure**: no runtime import of replicad. An `import type` is fine, because types disappear at build time. Pure code
  can be used by the UI, the worker and the tests, and is easy to test, so most of the logic lives here.
- **UI**: React components, on the main thread only.
- **CAD**: imports replicad. Used only by the worker and by tests, and reached through `src/parts/builders.ts`.

Vite builds the worker as a separate bundle: `App.tsx` starts it with `import cadWorker from "./worker?worker"`. The
same rule is why every part is split into a pure definition and a CAD builder (see [Parts](#parts)).

### Code map

| File | What it does | Kind |
|---|---|---|
| [src/spec.ts](../src/spec.ts) | Nominal dimensions (`SPEC`, `AXLE`, `PIN`), `MIN_WALL`, the `Clearance` type and the clearance fields with their limits | pure |
| [src/parseNumber.ts](../src/parseNumber.ts) | Strict parser for every number a user types; accepts a decimal comma | pure |
| [src/clearance.ts](../src/clearance.ts) | Reads the clearance fields for a part: values, invalid fields, the "adjusted" list, the header's counts, saved data | pure |
| [src/fit.ts](../src/fit.ts) | The fit settings: values with their origin, typed or calibrated changes, status, the settings file | pure |
| [src/calibrationSteps.ts](../src/calibrationSteps.ts) | The Calibrate section's steps, their state, measured sizes to settings, the guide's sections | pure |
| [src/settings.ts](../src/settings.ts) | `settingsFrom`: saved settings to the starting state, with fallbacks | pure |
| [src/route.ts](../src/route.ts) | The `#hash` of each section, part and step, with its parameters, and of the guide | pure |
| [src/stepper.ts](../src/stepper.ts) | `stepText`: the − and + buttons and arrow keys of a number field | pure |
| [src/layout.ts](../src/layout.ts) | `shelfLayout` and `shelf` (one part at a time): parts in rows, for a file with several parts | pure |
| [src/partsList.ts](../src/partsList.ts) | The parts list: adding, quantities, descriptions, saved data | pure |
| [src/kernelError.ts](../src/kernelError.ts) | `runKernel()` and `engineLoadError()`: readable messages for OpenCascade failures (naming the exception, out of memory) and for an engine that won't load | pure |
| [src/parts/types.ts](../src/parts/types.ts) | `PartDefinition`, `ParamDef`, `BuildRequest` | pure |
| [src/parts/index.ts](../src/parts/index.ts) | The part registry `PARTS`; parsing and validating parameters | pure |
| `src/parts/<id>.ts` | One part's definition: parameters, checks, file name | pure |
| `src/parts/<id>.build.ts` | One part's geometry, written with replicad | CAD |
| [src/parts/builders.ts](../src/parts/builders.ts) | `BUILDERS` (part id to builder), `buildPart()`, `exportShape()` (STEP or STL) and `exportSet()` (several parts in one file) | CAD |
| [src/stl.ts](../src/stl.ts) | `binaryStl()`: a binary STL file from meshes, each written once per copy | pure |
| [src/parts/shapes.ts](../src/parts/shapes.ts) | `as3D()`: narrows the type of replicad's `extrude()` result; used by the builders | CAD |
| [src/parts/booleans.build.ts](../src/parts/booleans.build.ts) | `fuseAll()` and `cutAll()`: many pieces joined or cut in one boolean operation | CAD |
| [src/worker.ts](../src/worker.ts) | The Web Worker: loads the engine, caches the last shape, returns meshes and STEP or STL files, and its heap size | CAD |
| [src/engine.ts](../src/engine.ts) | The worker's lifecycle on the page: a fresh worker once the engine's memory passes a limit, error events from whichever is current | pure |
| [src/shapeCache.ts](../src/shapeCache.ts) | Keeps the last built shape and frees the one it replaces | pure |
| [src/scheduler.ts](../src/scheduler.ts) | Runs the worker's jobs one at a time: previews skip outdated requests, downloads are never skipped and go first | pure |
| [src/previews.ts](../src/previews.ts) | The page's last six preview meshes by request, and which was shown last | pure |
| [src/storage.ts](../src/storage.ts) | The `localStorage` keys, reading and writing them, and moving data from renamed keys | pure |
| [src/browserSupport.ts](../src/browserSupport.ts) | Whether the browser can run the CAD engine (WebAssembly SIMD and exception handling), and the browsers that can | pure |
| [src/cameraFit.ts](../src/cameraFit.ts) | When and where to move the camera | pure |
| [src/webgl.ts](../src/webgl.ts) | Checks whether the browser supports WebGL | pure |
| [src/links.ts](../src/links.ts) | The source repository's address, linked from the footer | pure |
| [src/App.tsx](../src/App.tsx) | The UI's state and layout: sections, the part on screen, saved settings, calls to the worker | UI |
| [src/Calibrate.tsx](../src/Calibrate.tsx) | The Calibrate section: introduction, step list, the step's panel, Test and Result cards | UI |
| [src/FitSettings.tsx](../src/FitSettings.tsx) | The fit settings: the header button, the dialog, the file actions (save, load, reset), the Calibrate section's box and the Parts section's box | UI |
| [src/PartPicker.tsx](../src/PartPicker.tsx) | The part tiles, and an icon per part | UI |
| [src/PartsListCard.tsx](../src/PartsListCard.tsx) | The parts list card on the Parts section | UI |
| [src/fields.tsx](../src/fields.tsx), [src/Dialog.tsx](../src/Dialog.tsx) | Form fields, a part's quick picks and parameter fields; a modal dialog | UI |
| [src/Viewer.tsx](../src/Viewer.tsx) | The preview area: loads the 3D view (`Scene.tsx`) on demand; messages, and the fallbacks when WebGL or the 3D chunk fails | UI |
| [src/Scene.tsx](../src/Scene.tsx) | The 3D view (canvas and model), loaded by `Viewer.tsx` as a separate chunk | UI |
| [src/ThreeContext.tsx](../src/ThreeContext.tsx) | The 3D canvas, three.js's orbit controls and automatic camera fit (`CameraControls`) | UI |
| [src/ReplicadMesh.tsx](../src/ReplicadMesh.tsx) | Draws a `MeshData`: faces and edge lines, a geometry per mesh | UI |
| [src/ErrorBoundary.tsx](../src/ErrorBoundary.tsx) | Keeps a crash in the preview from blanking the whole page | UI |
| [src/CalibrationGuide.tsx](../src/CalibrationGuide.tsx), [src/guideHtml.ts](../src/guideHtml.ts) | The in-app calibration guide, rendered from `docs/calibration.md` | UI |
| [src/index.tsx](../src/index.tsx) | Entry point: mounts the app | UI |
| [tests/](../tests/) | Vitest tests, a small STEP reader and beam-measuring helpers | |
| [scripts/generate-notices.mjs](../scripts/generate-notices.mjs) | Writes the third-party licence file | |
| [scripts/headersFile.ts](../scripts/headersFile.ts) | Reads `public/_headers`, for `vite preview` and the tests | |
| [scripts/screenshots.mjs](../scripts/screenshots.mjs) | Makes `docs/screenshot.png` and the link-preview card `public/og-image.png` | |
| [e2e/](../e2e/), [playwright.config.ts](../playwright.config.ts) | The browser smoke test | |
| [eslint.config.js](../eslint.config.js), [.prettierrc.json](../.prettierrc.json) | Lint rules (and why some are tuned) and the format | |
| [tools/typescript-eslint/](../tools/typescript-eslint/) | An npm workspace that gives typescript-eslint the TypeScript 6 it needs | |

### Conventions

- **Strict TypeScript**: `strict`, plus `noUncheckedIndexedAccess` (an index or a lookup can be `undefined`),
  `exactOptionalPropertyTypes` (an optional property that may be passed `undefined` says so: `hint?: string |
  undefined`), `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax` (enforces `import type`) and `erasableSyntaxOnly` (no enums or
  namespaces). Vite and Vitest don't type-check, so run `npm run typecheck`, or `npm run check` for everything.
- **Lookups that can't fail** throw a readable error instead of using `!`: `requirePart`, `requireStep`,
  `clearanceField`, `pinSide`. ESLint forbids `!` outside the tests.
- **ESLint and Prettier**: `npm run lint` (typescript-eslint's strict and stylistic type-checked rules, React's hooks
  rules including the React Compiler's) and `npm run format`. An `eslint-disable` comment says why after `--`.
  TypeScript 7, which type-checks the project, has no JavaScript API, so typescript-eslint gets TypeScript 6 from the
  npm workspace `tools/typescript-eslint/` (the root `overrides` keep `ts-api-utils` there too). Markdown isn't
  formatted (hand-wrapped prose; Prettier would only pad the tables).
- **Imports**: relative imports without a file extension, and `import type` for anything used only as a type.
- **User-typed numbers** always go through `parseNumber`, never `parseFloat` or `Number`. Many users type a decimal
  comma, and `parseFloat("0,2")` silently gives 0, which would produce a wrongly sized part.
- **Comments explain why**, not what.
- **Tests come with every change** (see [Tests](#tests)): unit tests for pure logic, assertions on the exported STEP
  file for geometry.

## Parts

### What a part consists of

Each part is two files, registered in two places and linked by the part's `id`:

| | File | Registered in | Contains |
|---|---|---|---|
| Definition | `src/parts/<id>.ts` (pure) | `PARTS` in `src/parts/index.ts` | parameters, checks, file name |
| Builder | `src/parts/<id>.build.ts` (CAD) | `BUILDERS` in `src/parts/builders.ts` | the geometry, written with replicad |

Everything else comes for free: the part appears as a tile in the Parts section, its form is generated from its
parameters, validation runs from its definition, and the generic tests check it (see [Tests](#tests)). A
calibration part needs a little more; see [Calibration parts](#calibration-parts).

### The part definition

`PartDefinition<P>` (in `src/parts/types.ts`) has these fields:

| Field | Purpose |
|---|---|
| `id` | Stable identifier. It is the key in `BUILDERS` and in saved settings, so don't rename it once released. |
| `name` | Shown on the part's tile, and as the solid's name in a file made by "Download all". |
| `params` | The parameters, in form order (see below). |
| `presets` | Optional. Quick picks above the form, e.g. `{ label: "Common pins", options: [{ label: "3L pin", params: { sideA: 0, sideB: 1 } }, ...] }`. Each sets the parameters it lists and leaves the others; the one the form matches is shown as pressed. |
| `clearance` | The global clearance fields the part uses, e.g. `["hole", "width", "height"]`, or `[]` for none. Only these appear in the part's fit settings box. |
| `calibration` | Only on calibration parts: the setting the part finds, the name of one feature, the part's two ends (smaller values first), whether tabs mark the middle, and which feature to pick. Such a part is listed under Calibrate instead of Parts. |
| `validate(params, clearance)` | Optional. Checks that the generic range checks can't express, e.g. "the wall beside the counterbore must stay at least `MIN_WALL` thick". Returns a message or `null`. |
| `summary(params, clearance)` | Optional. The resulting dimensions, shown as tiles under "Resulting sizes" in the fit settings box. |
| `info(params)` | Optional. A note under the parameter fields. |
| `filename(params)` | The download's file name without extension, e.g. `beam-5-holes`. |
| `describe(params)` | Optional. A short description, e.g. `7 holes, full height` or `3L pin`, for the parts list and the solids' names in a file with several parts; without it, the file name is used. |

A parameter (`ParamDef`) is one of two kinds:

- A **number**: `type: "int"` (whole numbers) or `type: "number"` (decimals), with `min`, `max`, `default`, and
  optionally `step` and `hint`. Both are text fields, so a decimal comma can be typed. With a `step`, the field gets
  − and + buttons, and the up and down arrow keys step too (`stepText` in `src/stepper.ts`: the next value on the
  grid `min`, `min + step`, ..., within the range), and a value must lie on that grid (the axle's half studs), checked
  with the range so the message appears under the field.
- A **choice**: `type: "choice"` with `options: { value, label }[]`, shown as a drop-down list, or with `buttons: true`
  as a row of buttons (for a few short options, such as the beam's Full/Half height). The values are numbers, so every
  part's parameters are a `Record<string, number>`. Values end up in saved settings, so never change them.

A part declares its own parameter type, e.g. `PartDefinition<BeamParams>` with `BeamParams = { holes: number; height: number }`, and
still fits in the shared `PARTS` list. That works because the interface declares its functions with method syntax
(`validate?(params: P, ...)`, not `validate?: (params: P, ...) => ...`), which TypeScript checks less strictly
("bivariantly"). `BUILDERS` uses the same trick. Keep the method syntax when you change these types.

### Writing a builder

A builder is a function `(params, clearance) => Shape3D` that returns one solid, centred on the origin. The parameters
have already been validated when it runs. A long part lies along X with its first end at −X: an axle's End 1, a pin's
Side 1, a calibration part's smaller values (the flat end or the small end). The preview's first view shows −X on the
left (`VIEW_FROM` in `cameraFit.ts`), so the part appears in the same order as the form and the Calibrate section's
Result row; `tests/orientation.test.ts` checks every such part. The beam builder shows the usual approach: draw the
2D outline (a stadium), extrude it, make one hole cutter by fusing a through-hole cylinder with two counterbore
cylinders, place a copy at every hole position, and cut them all out at once.

Things to know about replicad:

- **Transforms consume their input.** `shape.translateX(x)` and the other transforms return a new shape and invalidate
  the original ("This object has been deleted"). Always reassign (`hole = hole.translateX(pitch)`), and `clone()` a shape
  (or build a fresh one) when you need two copies; the beam clones its hole cutter for every hole.
- **`extrude()` is loosely typed**: it may return any kind of shape. Wrap the result in `as3D(...)`, which narrows it
  to `Shape3D` and checks at runtime that it really is a solid.
- **Use few booleans.** Every boolean costs time and keeps a little memory in the engine for good (see
  [Memory](#memory)), so join or cut many pieces in one operation. `fuseAll` and `cutAll` (`booleans.build.ts`) take
  the shape and all the tools at once, and the tools may overlap each other: a bore and its counterbore, two axle
  sections. The pin, the axle's bevels, the calibration bars and the calibration axle use them. Copies of one cutter can also go in one
  compound (`makeCompound`) and be cut at once, as on the beam; a compound's solids must not overlap each other, as
  the kernel doesn't intersect them with each other. The results are the same solids as before: a
  32-hole beam builds in about 100 ms instead of 420 ms, the calibration axle in 140 instead of 540 ms.
- **Coinciding surfaces are fragile.** A stop-in end's sleeve has exactly the arm tips' radius, so it is joined along
  their own cylinder. That came out clean only with the cross made as it always was (two rectangles fused and cut to a
  circle, the bevels cut one wedge at a time); made any other way, it left slivers. So an axle with a stop-in end keeps
  that construction, and every other axle gets a drawn outline and one cut for each bevelled end's four wedges
  (`axleAlongZ`).
- **Let cutters stick out.** A cutter face that lies exactly on a face of the body makes boolean operations fragile,
  so the builders make cutters stick out past the faces they cut through (the `over` constant, e.g. 1 mm in the
  beam builder).
- **Don't change a shape after returning it.** The worker caches it and meshes and exports it repeatedly.
- **Use analytic geometry only**: planes, cylinders, cones, spheres and tori; lines, circles and ellipses. No splines
  and no meshes. A test checks this for every registered part.
- **Validation guards the kernel.** On degenerate input OpenCascade can fail with an unreadable error or never return
  at all (a zero-height beam hangs it), so the definition's checks must rule such input out before the builder runs.

Builders share code where parts share features: `calibrationBody` in `calibration.build.ts` is the bar of the three
calibration bars (a flat end, a rounded end and marker tabs at the middle), and `axleAlongZ` from `axle.build.ts`
builds the axle, the axle sides of pins and the sections of the calibration axle.

### The current parts

| Part (`id`) | Files in `src/parts/` | Clearance used | Notes |
|---|---|---|---|
| Beam (`beam`) | `beam.ts`, `beam.build.ts` | hole, width, height | 2 to 32 holes (`MAX_STUDS`, shared with the axle: the longest genuine axle is 32 studs); full (8 mm) or half height (4 mm, a thin liftarm), with the same holes. The half-height beam was a part of its own (`half-beam`) until 2026-10-31; its file name `half-beam-<n>-holes` is kept, and saved settings that had it selected open it as a half-height beam. |
| Axle (`axle`) | `axle.ts`, `axle.build.ts` | axle, collar | 1 to 32 studs in half steps. Each end is plain, notched, a stop, a stop with a stud, or a stop one stud in. `axleAlongZ` is reused by the pin and the calibration axle. |
| Pin (`pin`) | `pin.ts`, `pin.build.ts` | pin, collar, axle | A collar plus a side on each end from `PIN_SIDES`: a pin or friction pin of 1, 1.5 or 2 studs, an axle of 1 or 2 studs, or a stud; snap ends (lip and slots) or plain. Each half is built along +Z and side 1 turned round; pieces overlap 0.3 mm across the centre, except a collar towards an axle or stud. |
| Hole calibration bar (`calibration`) | `calibration.ts`, `calibration.build.ts` | none | Holes 8 mm apart. |
| Calibration axle (`axle-calibration`) | `axleCalibration.ts`, `axleCalibration.build.ts` | none | One-stud sections growing from a bevelled small end to a stop; each reaches 0.3 mm into the next. The id is kept from the earlier axle calibration bar so saved settings still apply. |
| Pin calibration bar (`pin-calibration`) | `pinCalibration.ts`, `pinCalibration.build.ts` | none | Round stubs 16 mm apart. |
| Collar calibration bar (`collar-calibration`) | `collarCalibration.ts`, `collarCalibration.build.ts` | none | Round buttons 8 mm apart. |

The calibration parts use no clearance settings because they exist to find them: each feature has its own
graduated size change (by default −0.20 to +0.20 mm in 0.05 mm steps). All four share three parameters, made by the
helpers in `calibration.ts`: features per side (`perSide`), the step, and the middle value (`centre`, 0 by default),
which shifts the whole range so a second part can look beyond the end of the first or refine a result. Every value
must stay within the part's limit (`rangeProblem`), and a part centred off nominal gets `-plus-0.20` or
`-minus-0.10` in its file name.

### Calibration parts

A calibration part is a part like the others, plus:

1. A `calibration` entry in its definition (see the table above): the setting it finds, `feature` (e.g. `"hole"`),
   `ends` (e.g. `["flat end", "rounded end"]`), `tabs` and `best` (the sentence saying which feature to pick).
2. A step in `CALIBRATION_STEPS` in `src/calibrationSteps.ts`, whose `guide` is the part's `name`.
3. A section in `docs/calibration.md` headed `### <n>. <name>: ...`; the step's Test card shows it.

Tests check all three: every calibration part has a step that finds its setting, every step has a guide section,
and every fit setting is found by some step.

### How to add a part

1. Create `src/parts/<id>.ts` with a `PartDefinition<YourParams>` as its default export. Keep it pure: no runtime
   import of replicad.
2. Create `src/parts/<id>.build.ts` with `export function buildX(params, clearance): Shape3D`, following
   [Writing a builder](#writing-a-builder).
3. Add the definition to `PARTS` in `src/parts/index.ts` and the builder to `BUILDERS` in `src/parts/builders.ts`,
   under the same id.
4. Add tests in `tests/` that check the exported STEP file: `analyseStep` counts face and edge types, and
   `stepGeometry` gives the cylinders and planes to measure. The generic tests cover the new part automatically.
5. If the part needs a new kind of clearance, see [Adding a clearance field](#adding-a-clearance-field).
6. Record where its dimensions come from in [dimensions.md](dimensions.md), and add it to the README's feature list.
7. Give it an icon in `ICONS` in `src/PartPicker.tsx` (a small line drawing, 48 × 32); without one its tile shows a
   plain box.
8. For a calibration part, see [Calibration parts](#calibration-parts).

## Clearance

Printers and CNC machines don't make parts at exactly the drawn size; holes, for example, often come out slightly too
small. The clearance settings correct for that. There are six global values, set once per machine and shared by every
part that uses them:

| Field | Changes | Limit |
|---|---|---|
| `hole` | the diameters of bores and counterbores | ±1 mm |
| `width` | the beam width | ±1 mm |
| `height` | the beam height | ±1 mm |
| `axle` | the axle's cross and stud (also a pin's axle side) | ±0.5 mm |
| `pin` | a pin's shaft, lips, friction ribs and a half pin's stud | ±0.5 mm |
| `collar` | pin collars and axle stops that seat in a counterbore | ±0.5 mm |

Each value is a change to the nominal dimension in millimetres; positive makes the feature bigger. Hole spacing and
lengths are never changed. The fields, with their labels, hints and limits, are defined once in `CLEARANCE_FIELDS` in
`src/spec.ts`. A builder applies a value by adding it to the nominal size, e.g. `SPEC.holeD + clearance.hole`.

In the UI the clearance values are called **fit settings** (see [The user interface](#the-user-interface)). How the
UI handles them (`src/clearance.ts`, `src/fit.ts`, `FitSettings.tsx` and `App.tsx`):

- **Only the fields a part uses count.** `readClearance(text, part.clearance)` reads those fields; the others count as
  0 and are never invalid, so a bad value in a field the current part ignores can't block it.
- **Unused fields don't trigger rebuilds.** The app keeps the same clearance object as long as its values don't
  change, so editing a field the current part ignores doesn't start a new build.
- **The values in use are always visible.** They change every download, so the box above the download button lists
  the ones the part uses with their origin (calibrated with the date, set by hand, or not calibrated), links to the
  Calibrate step for one that isn't calibrated, and says when the file name will end in `-adjusted`. The header's
  button shows how many of the six aren't zero, or, while any is invalid, how many are invalid (`clearanceCounts`
  reads each field on its own, so one bad value doesn't hide the others).
- **Where each value came from.** A value saved from the Calibrate section is `calibration`, one typed in the dialog
  `hand`, each with the date (`Origin`). Data saved before origins existed has none: a non-zero value then shows as
  set by hand, a zero as not calibrated.
- **The message offers the fix.** When the fit settings cause the current error (a field is invalid, or a part check
  fails that would pass at nominal clearance, for example a counterbore wall too thin), the error message has an
  "Edit fit settings" button.

### Adding a clearance field

1. Add the field to `Clearance`, `NO_CLEARANCE` and `CLEARANCE_FIELDS` in `src/spec.ts`, with its limit.
2. List it in the `clearance` of the parts that use it, and apply it in their builders.
3. Describe it in `docs/calibration.md`; a test checks that the guide names every setting.
4. Add it to a step in `CALIBRATION_STEPS` (or a new step with its calibration part); a test checks that every setting
   is found by some step.

Settings saved before the field existed load with the new field at 0 (`clearanceTextFrom`).

## Errors and validation

| What fails | Where it's handled | What the user sees |
|---|---|---|
| Invalid input | `validatePart`, in the UI and again in the worker | A parameter outside its range or off its step grid (`paramProblem`): the message under that field. Any other problem: a message under the download button. Nothing is built, and the preview dims the last valid model with "Showing the last valid part". |
| A kernel operation | `runKernel` | "The CAD engine could not build this part (…). Try slightly different values; …", by the button that started it: the part's download button (also for a failed preview build, which dims the previous model too), the parts list's, or "Download all four calibration parts". |
| Loading the engine | `worker.ts`, and the worker's `error` event in `App.tsx` (through `engine.onError`, whichever worker is current) | "Could not load the CAD engine: …" with a Reload button. |
| The 3D preview | see [When the preview fails](#when-the-preview-fails) | A message; the download still works. |

In more detail:

- **Validation order.** `validatePart` checks each parameter's type and range (a choice must be one of its options),
  then each clearance field the part uses against its limit, then calls the part's own `validate`. The first problem
  found becomes the message.
- **Validated twice.** `buildPart` in the worker validates again before building, so every caller (the UI, the tests)
  gets the same messages and bad input never reaches the kernel.
- **Limits are inclusive.** Limit checks allow a tiny tolerance (`EPS` in `spec.ts`), so a value exactly at a limit
  isn't rejected because of floating-point rounding. For example, with the width reduced by 0.2 mm and the holes
  enlarged by 0.4 mm, the wall beside the counterbore is exactly the 0.2 mm minimum, but computes as a hair below it.
- **Kernel errors are made readable.** OpenCascade fails by throwing a `WebAssembly.Exception` without a message;
  shown as is, the user would read "[object WebAssembly.Exception]". `runKernel(action, operation)` wraps building,
  meshing and exporting, and rethrows a sentence naming the action and the OpenCascade exception (e.g.
  `Standard_ConstructionError`, read with the engine's own `getExceptionMessage`, which the worker hands to
  `nameExceptionsWith`). Running out of memory (`std::bad_alloc`, `Standard_OutOfMemory`) gets its own message: reload,
  close other tabs, fewer parts per file. `runKernel` also handles operations that return a promise, such as
  `blobSTEP()`.
- **A failed engine load doesn't hang, and says why.** The worker starts loading the engine as soon as it starts, and
  every API call waits for that first. If loading fails, each call rejects with `engineLoadError`'s message: the
  browser can't compile it (names the browsers that can), not enough memory for its 100 MB start, no connection, or
  "Could not load the CAD engine: …". The engine's loader wraps every cause in `Aborted(…)`, so the cause is read from
  the message.
- Errors thrown in the worker reach the UI as rejected promises carrying a normal `Error`; Comlink takes care of that.
- **A failure is kept with what it was for.** `App.tsx` stores a failed preview build with its request, and a failed
  download with what the file was made from (the request, the parts list or the calibration set). The message shows
  only while that is unchanged, so an old failure never sits next to a newer problem.

## The worker

### Loading the engine

`src/worker.ts` imports the OpenCascade module (`replicad-opencascadejs`) and the URL of its WebAssembly file
(`replicad-opencascadejs/wasm?url`; the `?url` suffix makes Vite copy the file into the build and return its URL). It
calls `opencascade({ locateFile: () => wasmUrl })` and hands the result to replicad with `setOC(OC)`.

`src/index.tsx` imports the same `?url` once more, with the comment "to compensate for a bug in vite". This comes from
the replicad example app the project started from; leave it in unless you have confirmed that a production build works
without it.

The tests load the engine in Node instead, through `tests/openCascade.ts`.

### Browser support

The engine's WebAssembly uses exception handling (the legacy encoding: it doesn't validate without it, and does without
the newer exnref one), SIMD, bulk memory, sign extension and non-trapping float conversion; the app needs module
workers too. That means Chrome or Edge 95, Firefox 114 or Safari 16.4, or newer (`SUPPORTED_BROWSERS`). Before
starting the worker, `startEngine()` in `App.tsx` calls `engineUnsupported()` (`src/browserSupport.ts`), which
validates two tiny modules, one using SIMD and one using exception handling (the other three features came earlier in
every browser). Creating the worker is wrapped too, because Firefox before 114 throws there. In both cases no worker
starts and nothing is downloaded: the page says what is missing and which browsers work (without a "Reload page"
button), and the form, the guide and the fit settings still work. A browser that fails anyway gets
`engineLoadError`'s message (see [Errors and validation](#errors-and-validation)).

### The shape cache

`createShapeCache(build)` (`src/shapeCache.ts`) keeps the last request and the shape built for it:

- **Same request as last time:** the cached shape is returned. This is why previewing and then downloading builds the
  part only once.
- **Different request:** the new shape is built first, then the previous one is freed with `delete()`, which releases
  its WebAssembly memory straight away instead of waiting for the garbage collector.
- **The build fails:** the previous shape stays cached and untouched.

Requests are compared by value, as `JSON.stringify(request)`. Key order matters for that comparison, so always create a
`BuildRequest` with its keys in the same order (the app creates it in one place).

### Scheduling

Every call to the worker goes through one scheduler (`createScheduler` in `src/scheduler.ts`, set up in `App.tsx`),
which runs one job at a time:

- **Previews** (`jobs.preview(request)`): while a job runs, only the newest waiting preview is kept; older waiting ones
  resolve to `SKIPPED` without running. Holding down the + button on the hole count from 2 to 32 therefore builds a
  handful of beams, not 30 in a row.
- **Downloads** (`jobs.always(() => engine.api().createBlob(...))`, also the two `createSetBlob` downloads): never
  skipped, and run after the job that is running but before a waiting preview, because the user asked for that file.

After each job that succeeds, while no other job runs, the page checks the engine's memory and replaces a worker that has grown past
512 MB (see [Memory](#memory)).

The worker would run overlapping calls in the order they arrive anyway, but only as long as each of its functions stays
synchronous once the engine has loaded; the scheduler makes the order and the one-at-a-time rule explicit, so a job
can never meet a shape that another job has freed. A preview that arrives after the part has changed (a `cancelled`
flag set in the effect's cleanup) is kept with the others in `previews` but not made the one on screen.

### Memory

WebAssembly memory can grow but never shrinks. The worker frees the shape it replaces (see above), and replicad frees
the intermediate shapes a builder makes through a `FinalizationRegistry` once their JavaScript objects are
garbage-collected. But the engine itself keeps a little memory after every operation, measured on 2026-11-01: about 0.2 MB per 3D boolean, even between two small cylinders, and about 0.3 MB per 2D drawing boolean (replicad's
`fuse`/`intersect` on drawings). Nothing on our side gives it back: freeing the results and the boolean's builder
right away, or forcing garbage collection, changed nothing. So the heap grows with the number of booleans a session
runs, and two things keep it in hand:

- **Few booleans per build** (see [Writing a builder](#writing-a-builder)). Over 20 builds of each part's largest
  variant, the heap now ends at 100 MB for the beam, the axle and the pin and collar bars, 127 MB for the hole bar,
  163 MB for the friction pin and 199 MB for the calibration axle; before, up to 239 MB for the pin and 595 MB for the
  calibration axle. `tests/memory.test.ts` builds the heaviest parts ten times each and checks the heap stays under
  256 MB.
- **A fresh worker when the heap passes 512 MB** (`src/engine.ts`, `RECYCLE_AT` in `App.tsx`). After every successful job the
  page asks the worker for its heap size (`heapSize`); past the limit it ends that worker and starts another, between
  jobs, so nothing is lost. The next build waits about 0.3 s while the engine loads from the cache; the previews kept
  on the page stay, and the new worker's shape cache starts empty. Only a long session of large parts gets there.

Development builds log `[cad] built <part>; WASM heap N MB` after every new build, so you can watch for growth in the
browser console. The heap starts at 100 MB (the WebAssembly file's initial memory) and may grow to 4 GB. A phone may
not have that much: if the engine can't start, or a build runs out of memory, the messages say so (see
[Errors and validation](#errors-and-validation)).

## The 3D preview

The preview uses three.js through React Three Fiber (R3F: React components for three.js), with three.js's own
`OrbitControls` (`three/addons/controls/OrbitControls.js`) for rotating, zooming and panning.

- **A coarser mesh than the STL.** `previewMesh` (`builders.ts`) meshes within 0.01 mm and 0.3 rad (`PREVIEW_MESH`),
  against 0.001 mm and 0.1 rad for an STL (`STL_MESH`). That is a third of the triangles and a fifth of the meshing
  time (a 32-hole beam: 637 → 136 ms). Together with the beam's holes cut in one boolean, a 15-hole beam's preview
  now updates in about 0.2 s after a change, instead of 0.8 s. Side by side, even zoomed in on a hole, the two look the same; the size shown is still right to
  0.1 mm. The mesher always meshes to the tolerance asked for, so an STL exported from the cached shape afterwards is
  as fine as without a preview (a test checks this).
- **Handed over, not copied.** The mesh comes as typed arrays (`MeshData` in `parts/types.ts`) and the worker returns
  it with Comlink's `transfer(mesh, meshBuffers(mesh))`, so the page receives the buffers without a copy (copying a
  32-hole beam's mesh as plain arrays took about 14 ms).

- **A chunk of its own.** three.js and R3F are about three quarters of the app's code, so `Viewer.tsx` loads the 3D
  view (`Scene.tsx`, with `ThreeContext` and `ReplicadMesh`) with `React.lazy`. The first download is about 90 kB
  compressed instead of 335 kB, so the form shows sooner; the 3D chunk (about 245 kB) starts loading as soon as WebGL is
  known to work, alongside the engine. `chunkSizeWarningLimit` in `vite.config.ts` is set just above that chunk.

- **`ThreeContext.tsx`** sets up the canvas. It uses `frameloop="demand"`: the scene is redrawn only when something
  calls `invalidate()`. This saves power, but any code that changes the scene or the camera must call it. Z points up,
  as in CAD (three.js defaults to Y up); `THREE.Object3D.DEFAULT_UP.set(0, 0, 1)` runs when the module loads, because
  it must happen before the camera is created.
- **Starting view.** The camera starts at `VIEW_FROM` (front left, above) and the light at `LIGHT_FROM` (same side),
  both in `cameraFit.ts`: +X runs to the right, so a part's first end shows on the left. A test checks the direction.
- **Help in the view** (`Viewer.tsx`): a "Reset view" button (it changes `reset` on `ThreeContext`, and `CameraControls`
  then fits the model from `VIEW_FROM` whatever the user did), a line on how to move the view (touch wording when
  `pointer: coarse`), and the model's size along X, Y and Z from `boundsOf` (the mesh, so shown to 0.1 mm).
- **`ReplicadMesh.tsx`** draws the faces and the edge lines. Each new mesh gets its own geometry, made by wrapping the
  typed arrays in `BufferAttribute`s (no copy); the one it replaces is disposed, which frees its graphics memory.
  (`replicad-threejs-helper` did this before, but it needs plain arrays: three.js's `setIndex` only wraps those.) A
  polygon offset on the face material stops the faces from flickering through the lines where the two overlap
  (z-fighting).
- **Orbit controls.** `CameraControls` (in `ThreeContext.tsx`) creates the `OrbitControls` for the camera with damping
  (the view glides to a stop), calls `update()` on every frame and asks for a frame on every change, which is what drei
  did before it was dropped (2026-10-31).
- **Camera fit.** `CameraControls` also frames the model when the model or the viewport size changes.
  The rules are pure functions in `cameraFit.ts`:
  - On the first model, or when the model's size changes by more than 10%, the camera always refits.
  - Otherwise it refits only if the user hasn't zoomed (camera distance changed by more than 2% since the last fit) or
    panned (target moved by more than 1% of the model's radius). So a window resize or phone rotation keeps an
    untouched view fitted, but leaves alone a detail the user has zoomed in on.
  - A fit keeps the viewing direction and sets the distance so that the model's bounding sphere fits the narrower of
    the two fields of view, with a 10% margin (`MARGIN`).

### When the preview fails

The preview needs WebGL, but the STEP download doesn't, so the app keeps working without a preview:

- **No WebGL at all** (`webglAvailable()` checks at start-up): a message replaces the view.
- **A crash while rendering:** `ErrorBoundary` catches it and shows a message with a "Try again" button, which
  remounts the view (by changing `previewKey`).
- **The browser drops the WebGL context**, for example to free graphics memory: the canvas's `webglcontextlost` event
  shows the same message and button.
- **The 3D chunk doesn't load** (no connection, or a new version deployed meanwhile): the import fails with a
  `SceneLoadError`, and the message asks to reload the page, since a failed import stays failed until then.

## Saved settings

The app remembers the user's choices in `localStorage`, as the text they typed (keys and reading/writing in `src/storage.ts`, which never throws: blocked storage or corrupt data reads as nothing):

| Key | Contents |
|---|---|
| `building-block-parts-settings` | `{ partId, stepId, paramText: { [partId]: { [key]: string } }, format }`: the selected part, the selected calibration step, the parameters of every part (calibration parts included), and the file type (`"step"` or `"stl"`) |
| `building-block-parts-list` | The parts list: `[{ partId, params: { [key]: number }, count }]`. `listFrom` drops lines whose part is unknown or whose parameters are no longer valid. |
| `building-block-parts-fit` | The fit settings' values `{ hole, width, height, axle, pin, collar }` as strings. Until 2026-10-31 the key was `beam-generator-clearance` (the first version's name): it is read while the new key is missing and removed when the new one is first written, so saved values move over on the next visit. |
| `building-block-parts-fit-origins` | `{ [field]: { by: "calibration" \| "hand", date: "YYYY-MM-DD" } }`: where each fit setting came from |

`settingsFrom` (`src/settings.ts`), `clearanceTextFrom` and `originsFrom` check everything they read. A part that
became an option of another (`MERGED`: the half-height beam, now the beam's Half height) opens as that part, with
its saved parameters and the option that selects it. An unknown part
or step, a missing key, or parameters that fail validation fall back to the defaults (a parameter added later, such
as the calibration parts' middle value, starts at its default), clearance fields missing from older data load as
`"0"`, and malformed origins are dropped. Settings saved while a calibration part was selected as the part open its
step under Calibrate instead.
If storage is unavailable or its data is corrupt, the app starts with the defaults, and failed writes are ignored:
saving is a convenience, never a requirement.

## The calibration guide

`docs/calibration.md` is both a page in the repository and the guide inside the app. `src/guideHtml.ts` imports it as
text (Vite's `?raw` suffix) and converts it to HTML with `marked`: the whole guide for a modal `<dialog>`
(`src/CalibrationGuide.tsx`), and each calibration step's section (`guideSection`: the text under its
`### <n>. <title>` heading) for the step's Test card. It is loaded with a dynamic `import()` (`useGuide`) the first
time the guide or the Calibrate section opens, so the markdown and `marked` sit in a separate chunk that visitors who
only make parts never download. Inserting the result as HTML is safe because it is our own file, bundled at build
time.

Links to `#guide` open the whole guide over the current section, and so does loading the page with that address.
Closing it puts the section's address back: by going back in history when a link opened it (the entry before is the
section), otherwise by replacing the address. The guide's old address, `#calibration`, now opens the Calibrate section.

When you edit the guide:

- Use only absolute links (`https://...`); relative links would break inside the app.
- Keep it in step with the code. `tests/calibrationGuide.test.ts` checks that it names every clearance setting,
  calibration part and the app's buttons it refers to, quotes the current sizes and limits, and has a section for
  every step.
- Write each step's section so it reads well both on its own and in the app's Test card: it is shown without its
  heading, and ends by saying what to pick under **Result**.

## Tests

The tests run with Vitest in Node: `npm test`, or `npm run check` for type checking, linting, the format check and
tests. Tests that build parts
import `tests/openCascade.ts`, which loads the real OpenCascade engine once before they run; building real solids is
why the suite takes a while.

The tests follow three principles:

- **Test the file, not the code.** Geometry tests export a STEP file and read it back, because the file is what users
  get.
- **Write expected values out by hand.** Expected dimensions are typed into the tests (e.g. `NOMINAL` in
  `beamGeometry.ts`) instead of being taken from `SPEC`, so a wrong constant can't make a test agree with itself.
- **Cover new parts automatically.** The generic tests loop over `PARTS`.

### Helpers and fixtures

- **`tests/stlStats.ts`**: reads a binary STL file: its triangle count, bounding box, surface area and signed volume
  (positive only if the triangles face outwards).
- **`tests/stepStats.ts`**: a small STEP reader with no CAD dependency. `analyseStep(text)` counts the surface type of
  every face and the curve type of every edge. `stepGeometry(text)` lists every cylinder (axis, radius) and plane
  (position, normal), and whether the file declares millimetres.
- **`tests/beamGeometry.ts`**: `measureBeam` turns that geometry into a beam's width, height, length, end radius, bore
  and counterbore diameters, counterbore depth and hole positions, wherever the model sits. `expectedBeam` gives the
  values a beam should have.
- **`tests/pinGeometry.ts`** and **`tests/pinSides.ts`**: building a pin and measuring it from its STEP file, for
  `pin.test.ts`; and the sweep over every pair of pin sides, run by `pinSides.snap.test.ts` and
  `pinSides.plain.test.ts` (one kind of end each, so the two halves run in parallel).
- **`tests/fixtures/`**: two small synthetic STEP files for testing the STEP reader itself, not written by the
  generator. `analytic-cylinder.step` is a Ø4.8 × 8 mm cylinder with exact surfaces (2 planes and a cylinder; 2
  circles and a line, one circle and the seam wrapped in `SURFACE_CURVE` and `SEAM_CURVE` as some exporters write
  them). `faceted-cylinder.step` is the negative control, the same cylinder made of six flat sides (8 planes, 18
  lines), the kind of file this project exists to avoid. Both open in OpenCascade as valid solids of the right
  volume. They replaced a real Fusion export and a 3.4 MB PythonSCAD export in 2026-10, to keep the repository small.
  The measuring code (`measureBeam`) is checked on a 3-hole beam's faces written out by hand in `dimensions.test.ts`.

### What each test file covers

| File | Covers |
|---|---|
| `parts-export.test.ts` | Every registered part exports only analytic geometry, and can be meshed and exported twice with identical results. Several parts in one file: four named solids laid out on z = 0, in millimetres; copies numbered by name; an invalid part is refused with its message. |
| `preview.test.ts` | The preview mesh: handed over rather than copied, coarser than the STL mesh but within 0.01 mm of the part, a later STL export unchanged, and a well-formed mesh with edges for every part. |
| `booleans.test.ts` | `fuseAll` and `cutAll`: overlapping pieces joined into one solid of the right volume with its faces merged again, overlapping tools (a bore and its counterbore) cut at once, a single shape given back unchanged. |
| `memory.test.ts` | In a fresh engine, ten builds each of the parts with the most booleans (friction pin, hole bar, calibration axle, pin bar) keep the heap under 256 MB (it ends at about 199 MB; when it joined its sections one by one, the calibration axle alone reached 287 MB in ten builds). |
| `engine.test.ts` | Replacing the worker: kept below the limit, replaced at it (the old one ended, jobs going to the new one), error events from whichever worker is current, a worker that can't report its memory left alone. |
| `stl.test.ts` | STL files: a binary mesh at the part's exact size (within the mesh tolerance), with the fit settings applied, for every part; several parts in one mesh, in a row on z = 0; a set meshes each part once (30 copies, one `mesh()`, no `blobSTL`) and has the triangle count, area and volume of OpenCascade's own STL of each part times its copies. |
| `binaryStl.test.ts` | The STL writer: header, facet normals, the attribute, copies shifted, several meshes, a degenerate triangle. |
| `layout.test.ts`, `stepper.test.ts`, `partsList.test.ts` | Parts laid out in rows; the − and + steps; the parts list (merging, quantities, descriptions, saved data) and every part's `describe`. |
| `parts.test.ts` | The registry: unique ids, a builder for every part, distinct file names, valid defaults; which parts are calibration parts, and their shared parameters. Beam validation. |
| `beam.test.ts` | The STEP reader on the fixtures (face and edge types through curve wrappers, positions, millimetres). Beam face counts: PLANE = 4 + 2n and CYLINDRICAL_SURFACE = 2 + 3n for n holes (for n = 3, 21 faces, as a beam drawn in Fusion has). |
| `dimensions.test.ts` | The measuring code on a hand-written beam away from the origin, then real beam dimensions, pitch and centring for 2, 3 and 32 holes, with clearance, at full and half height. |
| `corners.test.ts` | The edges of what validation allows, actually built: every combination of −1, 0 and +1 mm for the beam clearances, plus the exact wall limit, on 2- and 32-hole beams. Accepted cases must build with the right dimensions; rejected ones must fail with the validation message. Also the hole calibration bar's extremes, including exactly at its 0.6 mm limit. |
| `calibration.test.ts` | Hole calibration bar: its graduated values, its wall limit, and a bore and counterbore of the right size for every hole. The middle value: shifted values, the limit on both sides for every calibration part, file names, the range note, a bar built off nominal. |
| `axle.test.ts` | Axle validation (a length between half studs is the Length field's problem), file names, and STEP dimensions per end type. Every pair of end types at its shortest valid length and at 32 studs, with axle size −0.5 and +0.5, must build one solid with only analytic geometry. |
| `pin.test.ts` | Pin validation, the lengths of the genuine pin types and of the quick picks, and STEP dimensions: tips, lips, slots, collar faces, friction ribs 2.5 mm from the axis, the axle pin's collar and blind bore, the half pin's stud, plain ends, and what each clearance changes. |
| `pinSides.snap.test.ts`, `pinSides.plain.test.ts` | Every valid pair of pin sides, with snap and with plain ends, at clearances −0.3 and +0.3: one solid with only analytic geometry and the right length. Split from `pin.test.ts`, which alone set the test run's time (45 s then; the whole run now takes about 25 s, limited by total CPU work). |
| `previews.test.ts` | The page's preview cache: kept by request, least recently used dropped first but never the mesh on screen, the same object back when nothing changes, and the fallback to the mesh shown last. |
| `pinCalibration.test.ts` | Pin calibration bar: its limit, and every stub at its diameter (4.8 mm plus its change), 16 mm apart. |
| `axleCalibration.test.ts` | Calibration axle: its limit (exactly 0.5 allowed); in the STEP, a step every 8 mm, the bevelled small end and the stop's faces, every section's arm sides and tips at its size, one solid. |
| `collarCalibration.test.ts` | Collar calibration bar: its limit, and every button at its diameter (6.0 mm plus its change), 0.6 mm tall. |
| `calibrationGuide.test.ts` | The guide names every setting, calibration part and app button it refers to, quotes the current numbers, has no relative links, and renders a section for every step. |
| `clearance.test.ts` | Reading clearance text: invalid fields and messages, adjustments, ignoring fields a part doesn't use, the header's adjusted and invalid counts, data saved before newer fields existed. |
| `fit.test.ts` | Fit settings: typed and calibrated values, status, saved origins, the settings file written and read back, values written by hand (tiny, a hair beyond a limit), and every way a file is refused. |
| `calibrationSteps.test.ts` | The steps match the calibration parts and cover every setting; step state; measured sizes to settings; the guide's sections. |
| `settings.test.ts`, `route.test.ts` | Saved settings with their fallbacks, the move of calibration parts to steps and of the half-height beam into the beam; the address of each section, part and step. |
| `kernelError.test.ts` | Readable messages for kernel failures, synchronous and asynchronous, including a real OpenCascade failure named by its exception (`Standard_ConstructionError`); the out-of-memory message; the engine-load messages (old browser, memory, connection). |
| `orientation.test.ts` | Parts lie along X with their first end at −X: an axle's End 1, a pin's Side 1, the calibration bars' flat end and the calibration axle's small end. |
| `spec.test.ts` | The nominal dimensions are the right fractions of the 8 mm module; the measured counterbore and collar sizes; `MIN_WALL` beside the nominal counterbore. |
| `parseNumber`, `shapes`, `shapeCache`, `scheduler`, `storage`, `cameraFit`, `webgl` (`.test.ts`) | Unit tests of the pure modules (the scheduler's order and one-at-a-time rule; the renamed storage key). |
| `headers.test.ts` | The `_headers` reader (`scripts/headersFile.ts`), and `public/_headers`: each header set by one rule only, the security headers on every path, the Content-Security-Policy's sources, the cache rules, and an `index.html` without inline styles or scripts. |
| `links.test.ts` | The footer's source address matches `repository` and `bugs` in `package.json`. |
| `browserSupport.test.ts` | The browser check, and that its exception-handling module tests the legacy encoding the engine uses (in a Node child process with it switched off). |

### The browser smoke test

`npm run test:browser` builds the site and runs `e2e/smoke.spec.ts` with Playwright in Chromium, Firefox and WebKit
(Safari's engine), against `vite preview`, which sends the headers in `public/_headers`, so the real
Content-Security-Policy applies. Each test fails on a page error, a console error or a CSP violation. It checks:

- a 5-hole beam: the CSP header is sent, the engine loads, the preview shows the size (and the 3D view, or its message
  where the browser has no WebGL), and the downloaded STEP file has only exact faces and edges and measures as
  `expectedBeam(5)` with an 8 mm pitch (`measureBeam`, the same code as the unit tests);
- the same beam as STL: a mesh within 0.003 mm of the beam's size;
- Calibrate: "Download all four calibration parts" gives one STEP file with four exact solids;
- a browser without WebAssembly SIMD (simulated): the message, no "Reload page", the form still there, and no request
  for the engine or the worker.

The browsers are installed once with `npx playwright install` (`--with-deps` on Linux). On macOS, Firefox gets an
empty home folder of its own (`CFFIXED_USER_HOME` in `playwright.config.ts`): macOS 27 refuses Playwright's Firefox
157 its Application Support folder, and it won't start without it. Not covered: the React
components on their own, and the many UI states that are checked by hand before a release.

## Build, licence notices and deployment

- **Vite** (`vite.config.ts`) builds the app into `build/`, with the worker as an ES module. The development server
  runs on port 4444. `react`, `react-dom` and `three` are deduplicated, so the 3D libraries all use the app's single
  copy of each.
- **Type checking.** Vite doesn't type-check, so `npm run build` runs `tsc --noEmit` before building. Linting and
  the format check are part of `npm run check`, not of the build.
- **Licence notices.** OpenCascade is licensed under the LGPL 2.1 with the Open CASCADE exception. The app ships it as
  a separate WebAssembly file and shows a notice in the footer that links to `THIRD_PARTY_NOTICES.txt`.
  `scripts/generate-notices.mjs` writes that file into `public/` before every `npm start` and `npm run build`
  (`prestart` and `prebuild`). It walks the production dependencies and lists each package with its licence text,
  starting with the OpenCascade notice and ending with the full LGPL text from `scripts/LGPL-2.1.txt`. The file is
  generated, so it is not in git. The OpenCascade notice names this application's source, taken from `repository` in
  `package.json`; the footer links the same address (`src/links.ts`, checked against `package.json` by a test).
- **Hosting.** The build is plain static files (see the README). The WebAssembly file is about 23 MB, and some hosts
  limit the size of a single file (Cloudflare Pages, used for the maintainer's deployment, allows 25 MiB), so check
  the size when upgrading `replicad-opencascadejs`.
- **Headers and cache rules.** `public/_headers`, in the format Cloudflare Pages and Netlify read, sets for every path a
  Content-Security-Policy (only the site's own files; `'unsafe-eval'` for the engine's embind bindings, which build
  functions with `new Function`, and `'wasm-unsafe-eval'` for compiling it; no inline scripts or styles, which is why
  the placeholder in `index.html` is styled by the `prerender` class), `nosniff`, no framing, a referrer policy and a
  permissions policy; `assets/*` cached for a year as immutable (the names carry a hash) and the page as `no-cache`.
  One policy covers the page and the worker, because browsers differ on whether a worker takes the page's policy or
  its own. Both hosts join a header that two matching rules set, so each header is set by one rule only
  (`tests/headers.test.ts` checks this, and the policy). HSTS belongs to the domain's settings, not this file.
- **Link previews.** `index.html` has `og:image` (the 1200 × 630 card `public/og-image.png`) and a large-image Twitter
  card. Link previews need absolute addresses, so building with `SITE_URL=https://…` writes it into `og:image` and adds
  `og:url` (`siteAddress` in `vite.config.ts`); without it the image address stays relative.
- **Images.** `npm run screenshots` builds and remakes the README screenshot and the card from the running app, in
  Playwright's Chromium.
- **CI.** `.github/workflows/ci.yml` runs `npm ci`, `npm run check` (type check, lint, format check, tests) and
  `npm run build` on Node 22 for every push and pull request, and in a second job the browser smoke test (keeping its
  traces if it fails). It is specific to GitHub and optional.

## Known limitations

- **The engine keeps a little memory after every boolean** (see [Memory](#memory)). The builders keep booleans few,
  and the page starts a fresh worker past 512 MB, which costs one build a wait of about 0.3 s in a long session.
- **No component tests.** The React components are tested only through the browser smoke test and by hand.
