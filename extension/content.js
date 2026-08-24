// Meet Caption Capture — watches the live captions region and builds a
// per-meeting transcript with metadata. ALL meeting data lives in ONE
// chrome.storage.local key: `meetDB`:
//
//   meetDB = {
//     schemaVersion: 2,
//     hostEmail: null,          // (next step) Google account that hosted the meeting
//     sessions: [               // newest first
//       {
//         sessionId: "abc-defg-hij__2026-08-08T11:46:04.425Z",
//         meetingCode: "abc-defg-hij",
//         url, title, hostEmail,
//         startedAt, endedAt, durationSec, language,
//         speakers: ["You", "Alice"],
//         transcript: [{ speaker, text, time }]
//       }
//     ]
//   }
//
// A separate small key `meetLive` holds the transient in-progress line,
// and `selectedLangCode` is just the popup's UI preference.

const FLUSH_INTERVAL_MS = 3000; // always keep the in-progress line in the transcript
const LIVE_PREVIEW_DEBOUNCE_MS = 150; // fast, near-real-time preview updates

const DB_KEY = 'meetDB';
const SCHEMA_VERSION = 2;

let transcript = []; // [{speaker, text, time}] for the current session
let committedTexts = []; // text already committed for each caption line POSITION (index-based)
let livePreviewTimer = null; // debounce for the transient meetLive preview
let liveRowIndex = -1; // transcript index currently holding the in-progress (gray) line
let currentKnownSpeaker = null; // Meet omits the speaker name on continuation sentences
let currentSessionId = null; // stable id for this page load's session
let sessionMeta = null; // metadata for the current session
let sessionRegistered = false; // true once the session has been saved to meetDB
let speakers = []; // unique speaker names seen this session
let currentLanguage = null; // caption language code, once chosen

// Serialize storage writes so a read-modify-write of meetDB can never
// race within this page (e.g. the creation write vs. the first caption
// write both unshifting the same session).
let writeQueue = Promise.resolve();

function getMeetingInfo() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const id = path.split('/')[0];
  const title = (document.title || '')
    .replace(/\s*[-–—|]\s*Google Meet$/i, '')
    .trim();
  return {
    id: id && id !== 'landing' && id !== 'new' ? id : 'unknown',
    url: window.location.href.split('?')[0],
    title: title || 'Google Meet',
  };
}

function findCaptionsContainer() {
  return (
    document.querySelector('[role="region"][aria-label="Captions"]') ||
    document.querySelector('div[aria-label="Captions"]') ||
    document.querySelector('[aria-label="Captions"]')
  );
}

// ---- Hide Meet's native captions UI (CC button + language dropdown) ----
// We keep these elements in the DOM and in normal layout flow (not
// display:none), just moved off-screen. Some of Google's jsaction click
// handling treats display:none elements (offsetParent === null) as
// non-interactive, which can silently break our own programmatic .click()
// calls on the CC button. Off-screen positioning avoids that risk while
// still being invisible to the user.
function injectHidingStyles() {
  if (document.getElementById('meet-caption-capture-hide-style')) return;
  const style = document.createElement('style');
  style.id = 'meet-caption-capture-hide-style';
  style.textContent = `
    button[aria-label="Turn on captions"],
    button[aria-label="Turn off captions"],
    [aria-label="Meeting language"] {
      position: fixed !important;
      left: -9999px !important;
      top: -9999px !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}
injectHidingStyles();

// ---- On-page frame: a quiet border + status pill so the extension feels
// present and working, without touching Meet's own DOM/styles. Lives in a
// shadow root so Meet's CSS can never bleed in (or vice versa).
let frameEls = null;

function injectCaptureFrame() {
  if (document.getElementById('mcc-frame-host')) return;

  const host = document.createElement('div');
  host.id = 'mcc-frame-host';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
    <style>
      :host { all: initial; }
      .frame {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        pointer-events: none;
        border: 2px solid rgba(26, 115, 232, 0);
        box-shadow: inset 0 0 0 rgba(26, 115, 232, 0);
        transition: border-color 600ms ease, box-shadow 600ms ease;
      }
      .frame.on {
        border-color: rgba(26, 115, 232, 0.55);
        box-shadow: inset 0 0 28px rgba(26, 115, 232, 0.16);
      }
      .pill {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483001;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 14px 6px 10px;
        border-radius: 999px;
        background: rgba(32, 33, 36, 0.82);
        backdrop-filter: blur(6px);
        color: #fff;
        font: 500 12px/1.3 "Google Sans", Roboto, Arial, sans-serif;
        letter-spacing: 0.1px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        opacity: 0;
        transition: opacity 400ms ease, transform 400ms ease;
      }
      .pill.show { opacity: 1; }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9aa0a6;
        flex: none;
      }
      .dot.live {
        background: #ea4335;
        box-shadow: 0 0 0 rgba(234, 67, 53, 0.5);
        animation: mcc-pulse 1.6s ease-out infinite;
      }
      .dot.waiting { background: #fbbc04; }
      @keyframes mcc-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.55); }
        70%  { box-shadow: 0 0 0 7px rgba(234, 67, 53, 0); }
        100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); }
      }
      .label { white-space: nowrap; }
      .sub { color: rgba(255,255,255,0.65); font-weight: 400; }
    </style>
    <div class="frame" id="frame"></div>
    <div class="pill" id="pill">
      <span class="dot waiting" id="dot"></span>
      <span class="label"><span id="labelMain">Meet Transcript</span> <span class="sub" id="labelSub"></span></span>
    </div>
  `;

  frameEls = {
    frame: root.getElementById('frame'),
    pill: root.getElementById('pill'),
    dot: root.getElementById('dot'),
    labelMain: root.getElementById('labelMain'),
    labelSub: root.getElementById('labelSub'),
  };

  requestAnimationFrame(() => frameEls.pill.classList.add('show'));
}

// status: 'waiting' | 'capturing' | 'off' ; detail: short trailing text
function setFrameStatus(status, detail) {
  if (!frameEls) return;
  const { frame, dot, labelMain, labelSub } = frameEls;
  frame.classList.toggle('on', status === 'capturing');
  dot.classList.remove('live', 'waiting');
  if (status === 'capturing') {
    dot.classList.add('live');
    labelMain.textContent = 'Capturing captions';
  } else if (status === 'waiting') {
    dot.classList.add('waiting');
    labelMain.textContent = 'Meet Transcript';
  } else {
    labelMain.textContent = 'Captions off';
  }
  labelSub.textContent = detail || '';
}

injectCaptureFrame();
setFrameStatus('waiting', 'waiting for captions…');

// ---- Unified storage: meetDB ----

// Creates (once) the session id + metadata for this page load. The actual
// storage write happens later via persist(), so this is safe to call
// synchronously from caption handlers.
function ensureSession() {
  if (currentSessionId) return;
  const info = getMeetingInfo();
  currentSessionId = `${info.id}__${new Date().toISOString()}`;
  sessionMeta = {
    sessionId: currentSessionId,
    meetingCode: info.id,
    url: info.url,
    title: info.title,
    hostEmail: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSec: null,
    language: currentLanguage,
  };
  sessionRegistered = false;
}

// Ensures the session is in meetDB (call on first preview AND first commit).
function ensureRegistered() {
  ensureSession();
  if (sessionRegistered) return;
  sessionRegistered = true;
  persist();
}

function addSpeaker(name) {
  if (name && name !== 'Unknown' && !speakers.includes(name)) {
    speakers.push(name);
  }
}

// Rebuilds the current session record from module state and merges it into
// the single `meetDB` object (find by sessionId → update, else insert at
// the front, newest first).
function persist() {
  if (!currentSessionId) return;
  const session = {
    ...sessionMeta,
    endedAt: sessionMeta.endedAt, // null while live; set only by finalizeSession
    durationSec: sessionMeta.durationSec,
    language: currentLanguage || sessionMeta.language,
    speakers: speakers.slice(),
    transcript,
  };

  writeQueue = writeQueue
    .then(async () => {
      const { [DB_KEY]: stored } = await chrome.storage.local.get(DB_KEY);
      const db =
        stored && stored.schemaVersion === SCHEMA_VERSION && Array.isArray(stored.sessions)
          ? stored
          : { schemaVersion: SCHEMA_VERSION, hostEmail: null, sessions: [] };
      const idx = db.sessions.findIndex((s) => s.sessionId === session.sessionId);
      if (idx >= 0) {
        // Preserve flags (e.g. `synced`) set by the background worker.
        db.sessions[idx] = { ...session, synced: !!db.sessions[idx].synced };
      } else {
        db.sessions.unshift({ ...session, synced: false });
      }
      await chrome.storage.local.set({ [DB_KEY]: db });
    })
    .catch((err) => console.error('[Meet Caption Capture] persist failed', err));
  return writeQueue;
}

async function finalizeSession() {
  if (!currentSessionId) return;
  const endedAt = new Date().toISOString();
  sessionMeta.endedAt = endedAt;
  sessionMeta.durationSec = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(sessionMeta.startedAt).getTime()) / 1000)
  );
  await persist();
  // Nudge the background worker so the finalized session is synced even if
  // this tab is unloading (the async storage write may be interrupted).
  try {
    chrome.runtime.sendMessage({ type: 'SESSION_FINALIZED' });
  } catch {
    /* service worker may be unavailable at unload — storage change still fires */
  }
}
window.addEventListener('pagehide', () => finalizeSession());

// ---- Caption capture ----

function commitFinal(speaker, text) {
  if (!text) return;

  const last = transcript[transcript.length - 1];

  // Only merge a settled sentence into the previous block when that block
  // is truly finalized. The LAST transcript row is usually the live gray
  // tail we keep updating — never merge finalized text into it (that would
  // garble the in-progress utterance).
  const isLiveTail = liveRowIndex === transcript.length - 1;

  if (last && last.speaker === speaker && !isLiveTail) {
    if (last.text === text || last.text.endsWith(text)) return; // already merged in
    last.text = `${last.text} ${text}`.trim();
  } else {
    // If the exact text already exists as the live tail, don't re-add it.
    if (last && last.speaker === speaker && last.text === text) return;
    transcript.push({ speaker, text, time: new Date().toISOString() });
  }

  addSpeaker(speaker);
  ensureRegistered();
}

function pushLivePreview(speaker, text) {
  clearTimeout(livePreviewTimer);
  livePreviewTimer = setTimeout(() => {
    ensureRegistered();
    chrome.storage.local.set({
      meetLive: {
        sessionId: currentSessionId,
        meetingCode: sessionMeta.meetingCode,
        speaker,
        text,
        time: new Date().toISOString(),
      },
    });
  }, LIVE_PREVIEW_DEBOUNCE_MS);
}

// Meet shows the current utterance as a gray "in-progress" line that only
// turns into a finalized caption once the next sentence begins (or the
// recognition settles). That gray line never gets committed while speech
// is continuous — so its words would be lost if the tab closes or the
// meeting ends mid-sentence. This mirrors the gray line into the LAST
// transcript row in-place (updating, never duplicating), so the spoken
// words are always preserved even before Meet finalizes the caption.
// `di` is the DOM index of the gray line: while the SAME line keeps
// growing we update the existing tail row; when a NEW gray line starts
// the previous tail row is finalized and we begin a fresh one.
function mirrorLiveTail(di, speaker, text) {
  if (!text) return false;
  const last = transcript[transcript.length - 1];
  let changed = false;

  if (liveRowIndex === di && last && last.speaker === speaker) {
    // Same in-progress line growing / being corrected — update in place.
    if (last.text !== text) {
      last.text = text;
      last.time = new Date().toISOString();
      changed = true;
    }
  } else if (!(last && last.speaker === speaker && last.text === text)) {
    // A new gray line (or a speaker change on the live row): the previous
    // tail row is now finalized — start a fresh row for the new utterance.
    transcript.push({ speaker, text, time: new Date().toISOString() });
    liveRowIndex = di;
    addSpeaker(speaker);
    changed = true;
  }

  // Keep committedTexts in sync for this position. Without this, once the
  // line stops being the "last" line (a new one starts) and reconcileLine()
  // sees it as a normal settled row, committedTexts[di] would still be
  // undefined — reconcileLine would treat the already-saved text as brand
  // new and commit it a SECOND time as a duplicate row. Recording it here
  // means the transition from live -> settled sees text === prev (or a
  // small delta) and behaves exactly like any other settled line.
  committedTexts[di] = text;
  return changed;
}

// Periodically re-read the gray line and mirror it, so even if the
// MutationObserver misses an update the spoken words are captured.
function flushLiveTail() {
  const container = findCaptionsContainer();
  if (!container) return;
  const lines = container.querySelectorAll('.nMcdL.bj4p3b');
  if (!lines.length) return;
  const data = readLine(lines[lines.length - 1]);
  if (!data || !data.text) return;
  if (mirrorLiveTail(lines.length - 1, data.speaker, data.text)) persist();
}
setInterval(flushLiveTail, FLUSH_INTERVAL_MS);

function readLine(el) {
  const speakerEl = el.querySelector('.NWpY1d');
  const textEl = el.querySelector('.ygicle.VbkSUe');
  if (!textEl) return null;

  // Continuation sentences from the same speaker don't repeat the name
  // element — fall back to whichever speaker we last saw.
  let speaker;
  if (speakerEl) {
    speaker = speakerEl.textContent.trim();
    currentKnownSpeaker = speaker;
  } else {
    speaker = currentKnownSpeaker || 'Unknown';
  }

  return { speaker, text: textEl.textContent.trim() };
}

// Meet re-renders the ENTIRE captions list on every update — even
// unchanged lines get brand-new DOM nodes. So we reconcile by position,
// diffing each line's current text against what we last committed for
// that position. Meet grows the active line in place (appending words
// to the same DOM node), so a line that stops changing for a moment
// can still pick up more words later. Naive "count how many lines are
// settled" tracking drops those later words; per-position diffing
// commits only the new words and never loses them.
function reconcileLine(i, speaker, text) {
  if (!text) return;
  const prev = committedTexts[i];
  if (prev === text) return; // unchanged since we last committed it

  if (prev && text.startsWith(prev)) {
    // The same line grew in place — commit only the newly added words.
    const delta = text.slice(prev.length).trim();
    if (delta) commitFinal(speaker, delta);
  } else {
    // Brand-new line, or Meet rewrote a line (a transcription fix).
    // The dedupe in commitFinal keeps this from re-adding old text.
    commitFinal(speaker, text);
  }

  committedTexts[i] = text;
}

function scanLines(container) {
  const lines = Array.from(container.querySelectorAll('.nMcdL.bj4p3b'));
  if (lines.length === 0) return;

  // Defensive: if the container got reset (e.g. captions toggled off/on),
  // the line count can drop below what we've already seen.
  if (lines.length < committedTexts.length) {
    committedTexts = [];
    currentKnownSpeaker = null;
    liveRowIndex = -1;
  }

  // Every line except the last one is settled — reconcile them all.
  for (let i = 0; i < lines.length - 1; i++) {
    const data = readLine(lines[i]);
    if (data) reconcileLine(i, data.speaker, data.text);
  }

  // The last line is the gray, still-growing one — mirror it into the
  // transcript tail (in place) and keep the live preview in sync. No 800ms
  // "quiet" delay needed anymore: the words are captured as soon as they
  // appear, so nothing is lost if the tab closes mid-sentence.
  const lastData = readLine(lines[lines.length - 1]);
  if (!lastData) return;

  if (lastData.text) {
    pushLivePreview(lastData.speaker, lastData.text);
    ensureRegistered();
    if (mirrorLiveTail(lines.length - 1, lastData.speaker, lastData.text)) persist();
  }
}

function attachObserver() {
  const container = findCaptionsContainer();
  if (!container) {
    // Captions not turned on yet (or Meet not loaded) — retry shortly.
    // No cap here on purpose: a user might sit in a waiting room for a
    // long time before the captions region even exists in the DOM.
    setTimeout(attachObserver, 2000);
    return;
  }

  console.log('[Meet Caption Capture] Captions container found, watching…');

  const observer = new MutationObserver(() => scanLines(container));
  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Initial scan in case captions are already present
  scanLines(container);
}

attachObserver();

// ---- Captions control (turn on CC + set language) ----

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findCaptionsToggleButton() {
  return (
    document.querySelector('button[aria-label="Turn on captions"]') ||
    document.querySelector('button[aria-label="Turn off captions"]')
  );
}

async function turnOnCaptions() {
  const btn = findCaptionsToggleButton();
  if (!btn) return { ok: false, reason: 'CC button not found' };
  if (btn.getAttribute('aria-label') === 'Turn off captions') {
    return { ok: true, alreadyOn: true };
  }
  btn.click();
  await wait(500);
  return { ok: true, alreadyOn: false };
}

async function setCaptionLanguage(langCode) {
  let combo = document.querySelector('[aria-label="Meeting language"][role="combobox"]');

  if (!combo) {
    return { ok: false, reason: 'Language combobox not found — open Captions settings once manually, then retry.' };
  }

  combo.click();
  await wait(400);

  const listboxId = combo.getAttribute('aria-controls');
  const listbox = listboxId
    ? document.getElementById(listboxId)
    : document.querySelector('ul[aria-label="Meeting language"]');

  if (!listbox) {
    return { ok: false, reason: 'Language list did not open' };
  }

  const option = listbox.querySelector(`li[data-value="${langCode}"]`);
  if (!option) {
    combo.click();
    return { ok: false, reason: `Language code "${langCode}" not found in list` };
  }

  option.click();
  await wait(200);
  return { ok: true };
}

// Let the popup control captions / clear the current transcript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CLEAR_TRANSCRIPT') {
    transcript = [];
    committedTexts = [];
    currentKnownSpeaker = null;
    speakers = [];
    liveRowIndex = -1;
    if (currentSessionId) persist();
    chrome.storage.local.set({ meetLive: null });
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'ENABLE_CAPTIONS_WITH_LANGUAGE') {
    (async () => {
      const ccResult = await turnOnCaptions();
      if (!ccResult.ok) {
        sendResponse({ ok: false, step: 'toggle', reason: ccResult.reason });
        return;
      }
      // Give Meet a moment to render the captions UI before touching language
      await wait(600);
      const langResult = await setCaptionLanguage(msg.langCode);
      if (langResult.ok) {
        currentLanguage = msg.langCode;
        if (sessionMeta) {
          sessionMeta.language = msg.langCode;
          persist();
        }
      }
      sendResponse({ ok: langResult.ok, step: 'language', reason: langResult.reason, ccResult, langResult });
    })();
    return true; // keep the message channel open for the async response
  }
});

// ---- Auto-turn on captions on page load ----
// Real meetings often sit in a waiting room for a while before the CC
// button even exists in the DOM — retry for several minutes, not just
// 20 seconds, and apply the user's last-chosen language once captions
// come on so auto-start behaves the same as clicking the popup button.
async function autoStartCaptions() {
  const MAX_ATTEMPTS = 90; // ~3 minutes at 2s intervals — covers waiting rooms
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const btn = findCaptionsToggleButton();
    if (btn) {
      const result = await turnOnCaptions();
      if (result.ok) {
        const { selectedLangCode } = await chrome.storage.local.get('selectedLangCode');
        if (selectedLangCode) {
          await wait(600);
          const langResult = await setCaptionLanguage(selectedLangCode);
          if (langResult.ok) currentLanguage = selectedLangCode;
        }
      }
      return;
    }
    await wait(2000);
  }
  console.warn('[Meet Caption Capture] Gave up waiting for the CC button to appear.');
}
autoStartCaptions();