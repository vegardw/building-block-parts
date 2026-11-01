import { useState, useEffect, useMemo, useRef } from "react";

import { saveAs } from "file-saver";
import { wrap } from "comlink";

import { NO_CLEARANCE, CLEARANCE_FIELDS, type ClearanceKey } from "./spec";
import {
  readClearance,
  clearanceTextFrom,
  clearanceCounts,
  type ClearanceState,
  type ClearanceText,
} from "./clearance";
import { REGULAR_PARTS, requirePart, parseParams, validatePart, paramProblem } from "./parts/index";
import type { BuildRequest, FileFormat, MeshData, ParamText, SetItem } from "./parts/types";
import type { CadApi } from "./worker";
import { createScheduler, SKIPPED } from "./scheduler";
import { NO_PREVIEWS, previewKey, remember, shownMesh, type Previews } from "./previews";
import { settingsFrom, paramsFromAddress } from "./settings";
import { KEYS, readStorage, writeStorage } from "./storage";
import { engineUnsupported, unsupportedMessage } from "./browserSupport";
import { SOURCE_URL } from "./links";
import { createEngine, noEngine, type Engine } from "./engine";
import { readHash, partHash, stepHash, type Route, type View } from "./route";
import { CALIBRATION_STEPS, getStep, requireStep, type StepId } from "./calibrationSteps";
import { originsFrom, typeFitValue, calibratedFitValue, isoDate, type Fit } from "./fit";
import { ButtonsField, ParamFields } from "./fields";
import PartPicker from "./PartPicker";
import Viewer from "./Viewer";
import CalibrationGuide, { useGuide } from "./CalibrationGuide";
import FitSettings, { FitBox, FitButton, FitCard } from "./FitSettings";
import PartsList from "./PartsListCard";
import { addToList, describeItem, listFrom, totalCount, type ListItem } from "./partsList";
import { CalibrateIntro, StepList, StepPanel, StepDetail, type SaveResult } from "./Calibrate";

import cadWorker from "./worker?worker";

// Starts the CAD engine's worker, unless this browser can't run it. Then no worker
// starts, every call fails with the message (shown from the start), and the rest
// of the page (the form, the guide, the fit settings) still works.
function startEngine(): { engine: Engine<CadApi>; unsupported: string | null } {
  let unsupported = engineUnsupported();
  if (unsupported === null) {
    try {
      const startWorker = () => {
        const worker = new cadWorker();
        return { worker, api: wrap<CadApi>(worker) };
      };
      return { engine: createEngine(startWorker, RECYCLE_AT), unsupported: null };
    } catch {
      unsupported = unsupportedMessage("module workers"); // Firefox before 114 throws here
    }
  }
  const message = unsupported;
  const fail = () => Promise.reject(new Error(message));
  const api: CadApi = { ready: fail, createMesh: fail, createBlob: fail, createSetBlob: fail, heapSize: fail };
  return { engine: noEngine(api), unsupported };
}

// A worker whose engine has more memory than this is replaced between jobs
// (engine.ts): five times what the engine starts with, reached only in a long
// session of large parts.
const RECYCLE_AT = 512 * 1048576;

const { engine, unsupported } = startEngine();

// After each job, a worker that has grown past RECYCLE_AT is replaced by a fresh one.
const recycled = <T,>(result: T): Promise<T> => engine.recycleIfFull().then(() => result);

// Every worker job goes through one queue: one at a time, downloads before waiting
// previews, and only the newest waiting preview is built.
const jobs = createScheduler((request: BuildRequest) => engine.api().createMesh(request).then(recycled));

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// Fit settings are kept as text so the user can type "-" or clear a field.
const loadFit = (): Fit => ({
  text: clearanceTextFrom(readStorage(KEYS.fit)),
  origins: originsFrom(readStorage(KEYS.origins)),
});

// Calibration parts and the test beam are made at nominal size: they exist to
// find the fit settings, so they never use them.
const NOMINAL: ClearanceState = { clearance: NO_CLEARANCE, invalid: [], problem: null, adjustments: [] };

const today = () => isoDate(new Date());

// Scrolling that respects the "reduce motion" setting.
const scrollBehavior = (): ScrollBehavior =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

// The engine is one large file (about 7 MB compressed): say so, and say more if it takes long.
const SLOW_LOAD_MS = 15000;

const FORMAT_HINTS: Record<FileFormat, string> = {
  step: "Exact curves: for CAD, CAM and slicers that open STEP files.",
  stl: "A triangle mesh, for slicers that don't open STEP files. Curves become many small flat faces.",
};

// The part (under Parts) or step (under Calibrate) an address names, if it is one.
const partIn = (route: Route) =>
  route.view === "parts" ? REGULAR_PARTS.find((p) => p.id === route.id)?.id : undefined;
const stepIn = (route: Route) => (route.view === "calibrate" && route.id ? getStep(route.id) : undefined);

// Parameters in an address replace those of the part it names (a calibration
// step's part, unless the step fixes them), if they make a valid part.
function withAddress(paramText: Record<string, ParamText>, route: Route): Record<string, ParamText> {
  const step = stepIn(route);
  const partId = partIn(route) ?? (step && !step.params ? step.partId : undefined);
  if (!partId) return paramText;
  const text = paramsFromAddress(requirePart(partId), route.query, paramText[partId] ?? NO_TEXT);
  return text ? { ...paramText, [partId]: text } : paramText;
}

// Every part's text is in the app's record (settingsFrom puts it there); this stands in
// if one isn't, and is always the same object so it doesn't look like a change.
const NO_TEXT: ParamText = {};

interface PartSet {
  items: SetItem[] | null; // null: the problem says why the file can't be made
  problem: string | null;
}

// The four calibration parts with their current settings, for "Download all".
function calibrationSetFrom(paramText: Record<string, ParamText>): PartSet {
  const items: SetItem[] = [];
  for (const s of CALIBRATION_STEPS.filter((s) => !s.params)) {
    const p = requirePart(s.partId);
    const params = parseParams(p, paramText[p.id] ?? NO_TEXT);
    if (validatePart(p, params, NO_CLEARANCE)) {
      return { items: null, problem: `Correct the settings of the ${p.name.toLowerCase()} first (step “${s.title}”).` };
    }
    items.push({ request: { partId: p.id, params, clearance: NO_CLEARANCE }, count: 1, name: p.name });
  }
  return { items, problem: null };
}

// The parts list as one file: each part with the fit settings it uses, or why it can't be made.
function listSetFrom(list: ListItem[], fitText: ClearanceText): PartSet & { adjusted: boolean } {
  const items: SetItem[] = [];
  let adjusted = false;
  for (const item of list) {
    const p = requirePart(item.partId);
    const { name, detail } = describeItem(item);
    const state = readClearance(fitText, p.clearance);
    if (!state.clearance) return { items: null, problem: `${state.problem} Correct the fit settings first.`, adjusted };
    const bad = validatePart(p, item.params, state.clearance);
    if (bad) return { items: null, problem: `${name}, ${detail}: ${bad}`, adjusted };
    adjusted ||= state.adjustments.length > 0;
    items.push({
      request: { partId: p.id, params: item.params, clearance: state.clearance },
      count: item.count,
      name: `${name}: ${detail}`,
    });
  }
  return { items, problem: null, adjusted };
}

export default function App() {
  const [initial] = useState(() => settingsFrom(readStorage(KEYS.settings)));
  const [initialRoute] = useState(() => readHash(window.location.hash));
  const [view, setView] = useState<View>(initialRoute.view ?? "parts");
  const [guideOpen, setGuideOpen] = useState(initialRoute.guide);
  const [fitOpen, setFitOpen] = useState(false);
  // An address naming a part or step wins over the saved one, so links open what they name.
  const [partId, setPartId] = useState(partIn(initialRoute) ?? initial.partId);
  const [stepId, setStepId] = useState<StepId>(stepIn(initialRoute)?.id ?? initial.stepId);
  const [paramText, setParamText] = useState(() => withAddress(initial.paramText, initialRoute));
  const [format, setFormat] = useState<FileFormat>(initial.format);
  const [fit, setFit] = useState(loadFit);
  // The preview meshes built so far (the last few) and the one on screen last (previews.ts).
  const [previews, setPreviews] = useState<Previews<MeshData>>(NO_PREVIEWS);
  // Failures are kept with what they were for (a build request, the parts list, the
  // calibration set), so each shows by its own button and only until that changes.
  const [buildError, setBuildError] = useState<{ request: BuildRequest; message: string } | null>(null);
  const [downloadError, setDownloadError] = useState<{ subject: unknown; message: string } | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(unsupported);
  const [exporting, setExporting] = useState(false);
  const [routeTick, setRouteTick] = useState(0); // counts address changes, so the address is written back in full
  const [list, setList] = useState<ListItem[]>(() => listFrom(readStorage(KEYS.list)));
  // Once used, the list stays on screen even when emptied, so "Clear list" can be undone.
  const [listShown, setListShown] = useState(() => list.length > 0);
  const [added, setAdded] = useState<{ request: BuildRequest; message: string } | null>(null); // the last "Add to list"
  const [slowLoad, setSlowLoad] = useState(false); // the engine is taking long to load
  // The guide was opened by a link in the app, so the entry before it is this page.
  const guideFromLink = useRef(false);

  // Links, the back and forward buttons, and addresses typed by hand.
  useEffect(() => {
    const onRoute = () => {
      const route = readHash(window.location.hash);
      if (route.view) setView(route.view);
      const part = partIn(route);
      if (part) setPartId(part);
      const step = stepIn(route);
      if (step) setStepId(step.id);
      setParamText((prev) => withAddress(prev, route));
      setGuideOpen(route.guide);
      guideFromLink.current = route.guide;
      setRouteTick((t) => t + 1);
    };
    window.addEventListener("hashchange", onRoute);
    window.addEventListener("popstate", onRoute);
    return () => {
      window.removeEventListener("hashchange", onRoute);
      window.removeEventListener("popstate", onRoute);
    };
  }, []);

  // Picking a part or step gets its own history entry, so the back button returns to the previous one.
  const go = (hash: string) => {
    if (window.location.hash !== hash) history.pushState(null, "", hash);
  };
  const selectPart = (id: string) => {
    setPartId(id);
    go(partHash(id));
  };
  const selectStep = (id: StepId) => {
    setStepId(id);
    go(stepHash(id));
  };

  const calibrating = view === "calibrate";
  const step = requireStep(stepId);
  // The part on screen: the one picked under Parts, or the one the calibration step makes.
  const part = requirePart(calibrating ? step.partId : partId);
  const text = paramText[part.id] ?? NO_TEXT;
  const fixedParams = calibrating ? step.params : undefined;
  const parsed = useMemo(() => fixedParams ?? parseParams(part, text), [fixedParams, part, text]);

  // The address names the section, the part or step and its parameters. It is
  // rewritten in place as they change (so typing doesn't fill the history), but
  // only while the parameters are valid: an invalid value keeps the last good link.
  // An address without a part or step, or the old #calibration, is completed on load.
  const paramsValid = validatePart(part, parsed, NO_CLEARANCE) === null;
  const address = !paramsValid
    ? calibrating
      ? stepHash(stepId)
      : partHash(partId)
    : calibrating
      ? stepHash(stepId, fixedParams ? undefined : parsed)
      : partHash(partId, parsed);
  useEffect(() => {
    if (!guideOpen && paramsValid && window.location.hash !== address) history.replaceState(null, "", address);
  }, [address, paramsValid, guideOpen, routeTick]);

  // Back to the section's address, so the link works again next time. Opened by a
  // link, the guide goes back in history instead of replacing its entry, which
  // would leave the same address twice and a Back button that seems to do nothing.
  const closeGuide = () => {
    setGuideOpen(false);
    if (window.location.hash !== "#guide") return;
    if (guideFromLink.current) history.back();
    else history.replaceState(null, "", address);
    guideFromLink.current = false;
  };

  // Only the fields this part uses; the others are 0 and can't block it.
  const clearanceState = useMemo(
    () => (calibrating ? NOMINAL : readClearance(fit.text, part.clearance)),
    [calibrating, fit.text, part],
  );
  const { clearance } = clearanceState;
  // Same values, same object: editing a field this part ignores mustn't rebuild it.
  const clearanceValues = clearance && JSON.stringify(clearance);
  const effectiveClearance = useMemo(() => clearance, [clearanceValues]); // eslint-disable-line react-hooks/exhaustive-deps
  const usesClearance = !calibrating && part.clearance.length > 0;

  const problem = effectiveClearance ? validatePart(part, parsed, effectiveClearance) : clearanceState.problem;
  // A parameter outside its range is shown under its field; other problems by the download button.
  const fieldProblem = fixedParams ? null : paramProblem(part, parsed);
  const panelProblem = problem !== null && problem === fieldProblem?.message ? null : problem;
  // When the fit settings cause the problem (an invalid field, or a check such as
  // the counterbore wall that passes at nominal), the message offers to edit them.
  const clearanceIsProblem =
    usesClearance && problem !== null && (clearance === null || validatePart(part, parsed, NO_CLEARANCE) === null);

  // Memoised so the effect below only re-runs when something really changed.
  const request = useMemo(
    (): BuildRequest | null =>
      effectiveClearance && !problem ? { partId: part.id, params: parsed, clearance: effectiveClearance } : null,
    [part, parsed, effectiveClearance, problem],
  );

  const summary = usesClearance && clearance ? (part.summary?.(parsed, clearance) ?? null) : null;
  // The file name, shown under the download button before downloading.
  const adjusted = request !== null && part.clearance.some((k) => request.clearance[k] !== 0);
  const fileName = request && `${part.filename(request.params)}${adjusted ? "-adjusted" : ""}.${format}`;

  const calibrationSet = useMemo(() => calibrationSetFrom(paramText), [paramText]);
  const listSet = useMemo(() => listSetFrom(list, fit.text), [list, fit.text]);
  const listFileName =
    listSet.items && list.length > 0 ? `parts-list${listSet.adjusted ? "-adjusted" : ""}.${format}` : null;

  // The "Added" note is for the part on screen when it was added, so it goes when that changes.
  const addedNote = added !== null && added.request === request ? added.message : null;

  const { guide, failed: guideFailed } = useGuide(calibrating);

  useEffect(() => {
    writeStorage(KEYS.settings, { partId, stepId, paramText, format });
  }, [partId, stepId, paramText, format]);

  useEffect(() => {
    writeStorage(KEYS.list, list);
  }, [list]);

  useEffect(() => {
    writeStorage(KEYS.fit, fit.text);
    writeStorage(KEYS.origins, fit.origins);
  }, [fit]);

  useEffect(() => {
    if (engineReady) return;
    const timer = setTimeout(() => setSlowLoad(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [engineReady]);

  // A title per part and step, for tabs, bookmarks and history.
  useEffect(() => {
    document.title = `${calibrating ? `Calibrate: ${step.title}` : part.name} – Building Block Parts Generator`;
  }, [calibrating, step, part]);

  // Load the CAD engine once, and report a failed or crashed worker.
  useEffect(() => {
    if (unsupported) return; // the browser can't run it: engineError says so already
    let cancelled = false;
    const stopListening = engine.onError((e) => {
      if (!cancelled) setEngineError(e.message || "The CAD engine failed to start.");
    });
    engine
      .api()
      .ready()
      .then(() => {
        if (!cancelled) setEngineReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setEngineError(errorMessage(e));
      });
    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  // The part on screen's preview: kept from before, so shown at once, or built by
  // the worker. Either way it then becomes the latest, which stays on screen while
  // the next part builds; one that arrives after the part changed is kept, not shown.
  const previewFor = request && previewKey(request);
  const remembered = previewFor === null ? undefined : previews.meshes.get(previewFor);
  useEffect(() => {
    if (!engineReady || !request) return;
    let cancelled = false;
    const key = previewKey(request);
    const job: Promise<MeshData | typeof SKIPPED> = remembered ? Promise.resolve(remembered) : jobs.preview(request);
    job
      .then((m) => {
        if (m !== SKIPPED) setPreviews((p) => remember(p, key, m, !cancelled));
      })
      .catch((e: unknown) => {
        if (!cancelled) setBuildError({ request, message: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [engineReady, request, remembered]);

  const mesh = shownMesh(previews, previewFor) ?? null;
  // Building the part on screen: no mesh for it yet, and no failure either.
  const busy = engineReady && request !== null && !remembered && buildError?.request !== request;
  // The part on screen couldn't be built: the preview still shows the previous one.
  const buildFailed = buildError !== null && buildError.request === request ? buildError.message : null;
  const downloadFailed = (subject: unknown) =>
    downloadError !== null && downloadError.subject === subject ? downloadError.message : null;

  // `subject` is what the file is made from; a failure is shown with it.
  const download = async (subject: unknown, blob: () => Promise<Blob>, filename: string) => {
    if (exporting) return;
    setExporting(true);
    setDownloadError(null);
    try {
      saveAs(await blob(), filename);
    } catch (e) {
      setDownloadError({ subject, message: errorMessage(e) });
    } finally {
      setExporting(false);
    }
  };

  const downloadModel = () => {
    if (request && fileName)
      void download(
        request,
        () => jobs.always(() => engine.api().createBlob(request, format).then(recycled)),
        fileName,
      );
  };

  const downloadSet = () => {
    const { items } = calibrationSet;
    if (items)
      void download(
        calibrationSet,
        () => jobs.always(() => engine.api().createSetBlob(items, format).then(recycled)),
        `calibration-parts.${format}`,
      );
  };

  const downloadList = () => {
    const { items } = listSet;
    if (items && listFileName)
      void download(
        listSet,
        () => jobs.always(() => engine.api().createSetBlob(items, format).then(recycled)),
        listFileName,
      );
  };

  const addCurrent = () => {
    if (!request) return;
    const next = addToList(list, part.id, request.params);
    setList(next);
    setListShown(true);
    const { name, detail } = describeItem({ partId: part.id, params: request.params, count: 1 });
    const total = totalCount(next);
    setAdded({
      request,
      message: `Added: ${name}, ${detail}. The list has ${total} ${total === 1 ? "part" : "parts"}.`,
    });
  };

  const showListItem = (item: ListItem) => {
    selectPart(item.partId);
    setParamText((prev) => ({
      ...prev,
      [item.partId]: Object.fromEntries(Object.entries(item.params).map(([k, v]) => [k, String(v)])),
    }));
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  const goToList = () => {
    const card = document.getElementById("parts-list");
    card?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    card?.focus({ preventScroll: true });
  };

  const setParam = (id: string) => (key: string, value: string) =>
    setParamText((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  const typeFit = (key: ClearanceKey, value: string) => setFit((prev) => typeFitValue(prev, key, value, today()));
  const saveResult: SaveResult = (values) =>
    setFit((prev) =>
      CLEARANCE_FIELDS.reduce((acc, f) => {
        const value = values[f.key];
        return value === undefined ? acc : calibratedFitValue(acc, f.key, value, today());
      }, prev),
    );

  const fitCounts = clearanceCounts(fit.text);
  const shownError = panelProblem ?? buildFailed ?? downloadFailed(request);
  const viewerMessage = engineError
    ? "CAD engine unavailable."
    : !engineReady
      ? slowLoad
        ? "Still loading the CAD engine. On a slow connection the first visit can take a minute."
        : "Loading the CAD engine (about 7 MB; later visits are usually quicker)…"
      : busy
        ? "Building model…"
        : "No model to show.";
  const showSpinner = !engineError && (!engineReady || busy);

  return (
    <main className="app">
      <header className="header">
        <h1>Building Block Parts Generator</h1>
        <p>
          Generate beams (liftarms) and other pin-and-axle parts as STEP files with true curves, for resin printing, CNC
          milling and CAD. Compatible with LEGO® Technic™ and similar building systems.
        </p>
      </header>

      <nav className="tabs" aria-label="Sections">
        <a href={partHash(partId)} className="tab" aria-current={view === "parts" ? "page" : undefined}>
          Parts
        </a>
        <a href={stepHash(stepId)} className="tab" aria-current={calibrating ? "page" : undefined}>
          Calibrate
        </a>
        <FitButton adjusted={fitCounts.adjusted} invalid={fitCounts.invalid} onClick={() => setFitOpen(true)} />
      </nav>

      {calibrating && (
        <>
          <div className="calibrate-top">
            <CalibrateIntro
              onDownloadAll={downloadSet}
              problem={calibrationSet.problem}
              error={downloadFailed(calibrationSet)}
              disabled={!calibrationSet.items || !engineReady || exporting}
            />
            <FitCard fit={fit} onEdit={() => setFitOpen(true)} onReplace={setFit} />
          </div>
          <StepList fit={fit} current={stepId} onSelect={selectStep} />
        </>
      )}

      <div className="layout">
        <aside className="panel">
          {calibrating ? (
            <StepPanel step={step} part={part} text={text} error={fieldProblem} onParam={setParam(part.id)} />
          ) : (
            <>
              {REGULAR_PARTS.length > 1 && <PartPicker parts={REGULAR_PARTS} value={partId} onChange={selectPart} />}
              <ParamFields part={part} text={text} error={fieldProblem} onChange={setParam(part.id)} />
            </>
          )}

          {!problem && part.info && <p className="note">{part.info(parsed)}</p>}

          {usesClearance && (
            <FitBox
              part={part}
              fit={fit}
              adjusted={clearanceState.adjustments.length > 0}
              summary={summary}
              onEdit={() => setFitOpen(true)}
            />
          )}

          <ButtonsField
            id="format"
            label="File type"
            hint={FORMAT_HINTS[format]}
            options={[
              { value: "step", label: "STEP" },
              { value: "stl", label: "STL" },
            ]}
            value={format}
            onChange={(value) => setFormat(value as FileFormat)}
          />
          <button className="button" onClick={downloadModel} disabled={!request || !engineReady || exporting}>
            {exporting ? "Preparing…" : `Download ${format.toUpperCase()}`}
          </button>
          {fileName && <p className="note file-name">{fileName}</p>}
          {!calibrating && (
            <>
              <button type="button" className="button secondary" onClick={addCurrent} disabled={!request}>
                Add to list
              </button>
              {addedNote && (
                <p role="status" className="note">
                  {addedNote}{" "}
                  <button type="button" className="link" onClick={goToList}>
                    Go to the list
                  </button>
                </p>
              )}
            </>
          )}

          {engineError ? (
            <p role="alert" className="alert">
              {engineError}
              {!unsupported && ( // reloading can't help a browser that lacks the features
                <>
                  <br />
                  <button type="button" className="button secondary" onClick={() => window.location.reload()}>
                    Reload page
                  </button>
                </>
              )}
            </p>
          ) : (
            shownError && (
              <p role="alert" className="alert">
                {shownError}
                {clearanceIsProblem && (
                  <>
                    <br />
                    <button type="button" className="button secondary" onClick={() => setFitOpen(true)}>
                      Edit fit settings
                    </button>
                  </>
                )}
              </p>
            )
          )}
        </aside>

        <Viewer
          mesh={mesh}
          busy={busy}
          stale={request === null || buildFailed !== null}
          message={viewerMessage}
          spinner={showSpinner}
        />
      </div>

      {!calibrating && listShown && (
        <PartsList
          list={list}
          onChange={setList}
          onShow={showListItem}
          onDownload={downloadList}
          downloadLabel={exporting ? "Preparing…" : `Download list as ${format.toUpperCase()}`}
          fileName={listFileName}
          problem={listSet.problem ?? downloadFailed(listSet)}
          disabled={!engineReady || exporting}
        />
      )}

      {calibrating && (
        <StepDetail
          step={step}
          part={part}
          params={parsed}
          valid={!problem}
          fit={fit}
          guideHtml={guide?.stepGuideHtml[step.id] ?? null}
          guideFailed={guideFailed}
          onSave={saveResult}
          onCentre={(value) => setParam(part.id)("centre", String(value))}
        />
      )}

      <CalibrationGuide open={guideOpen} onClose={closeGuide} />
      <FitSettings open={fitOpen} onClose={() => setFitOpen(false)} fit={fit} onType={typeFit} onReplace={setFit} />

      <footer className="footer">
        <p>
          LEGO® and Technic™ are trademarks of the LEGO Group of companies. The LEGO Group does not sponsor, authorize,
          or endorse this website.
        </p>
        <p>
          This application uses Open CASCADE Technology under the GNU LGPL v2.1, which gives you certain rights,
          including access to its source code.{" "}
          <a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.txt`} target="_blank" rel="noreferrer">
            Licences and source
          </a>
        </p>
        <p>
          Open source under the MIT licence.{" "}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            Source code on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
