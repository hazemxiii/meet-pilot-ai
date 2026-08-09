// ============================================================
// background.js — Manifest V3 service worker
// 1) Migrates legacy storage into the unified `meetDB` key.
// 2) Real-time bridge: lets your website pull the data via
//    chrome.runtime.onMessageExternal.
// ============================================================

const DB_KEY = 'meetDB';
const SCHEMA_VERSION = 2;
const LEGACY_SESSION_PREFIX = 'meeting_';
const LEGACY_KEYS = ['meetingIndex', 'meetTranscript', 'meetTranscriptLive'];

// ------------------------------------------------------------------
// MIGRATION — the old version stored data across many keys:
//   meetTranscript, meetTranscriptLive, meetingIndex, meeting_<id>__...
// This folds everything into the single unified `meetDB` object and
// deletes the legacy keys. Idempotent: once legacy keys are gone it
// has nothing to do.
// ------------------------------------------------------------------
async function migrateLegacyStorage() {
  const all = await chrome.storage.local.get(null);
  const legacySessions = [];

  // 1) Collect per-session records from the old `meeting_*` keys.
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(LEGACY_SESSION_PREFIX) && value && typeof value === 'object') {
      legacySessions.push({
        sessionId: value.sessionId || key,
        meetingCode: value.id || (value.sessionId || '').split('__')[0] || 'legacy',
        url: value.url || null,
        title: value.title || 'Legacy meeting',
        hostEmail: null,
        startedAt: value.startedAt || null,
        endedAt: value.endedAt || null,
        durationSec: value.durationSec ?? null,
        language: value.language ?? null,
        speakers: value.speakers || [],
        transcript: value.transcript || [],
      });
    }
  }

  // 2) Wrap the very old flat `meetTranscript` array as a single session.
  if (Array.isArray(all.meetTranscript) && all.meetTranscript.length) {
    legacySessions.push({
      sessionId: `legacy__${Date.now()}`,
      meetingCode: 'legacy',
      url: null,
      title: 'Legacy transcript',
      hostEmail: null,
      startedAt: null,
      endedAt: null,
      durationSec: null,
      language: null,
      speakers: [...new Set(all.meetTranscript.map((l) => l.speaker).filter(Boolean))],
      transcript: all.meetTranscript,
    });
  }

  // 3) Merge into the unified meetDB (newest first, no duplicates).
  if (legacySessions.length) {
    const db =
      all[DB_KEY] && all[DB_KEY].schemaVersion === SCHEMA_VERSION && Array.isArray(all[DB_KEY].sessions)
        ? all[DB_KEY]
        : { schemaVersion: SCHEMA_VERSION, hostEmail: null, sessions: [] };
    const known = new Set(db.sessions.map((s) => s.sessionId));
    db.sessions = legacySessions.filter((s) => !known.has(s.sessionId)).concat(db.sessions);
    await chrome.storage.local.set({ [DB_KEY]: db });
  }

  // 4) Remove all legacy keys.
  const toRemove = Object.keys(all).filter(
    (k) => LEGACY_KEYS.includes(k) || k.startsWith(LEGACY_SESSION_PREFIX)
  );
  if (toRemove.length) {
    await chrome.storage.local.remove(toRemove);
    console.log('[bridge] migrated legacy data into meetDB, removed:', toRemove);
  }
}

// Run on service worker start and on install/update.
migrateLegacyStorage();
chrome.runtime.onInstalled.addListener(() => migrateLegacyStorage());

// ------------------------------------------------------------------
// SUPABASE AUTH — PKCE sign-in with Google, done right inside the
// extension (chrome.identity.launchWebAuthFlow). The extension acts
// as a public client (anon key), exchanges the OAuth code for tokens
// via GoTrue and refreshes them before every POST — no need for the
// website to push tokens here anymore.
// ------------------------------------------------------------------

const CONFIG_ENDPOINT = 'http://localhost:3000/api/extension/config';

// Public fallback values so syncing keeps working even if the dev site
// is offline. Identical to what /api/extension/config returns.
const FALLBACK_CONFIG = {
  SUPABASE_URL: 'https://jwgwoyqakncwozswjjls.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_KVvuoKvjevjBtDzNc8kbjg_3d-xiuUG',
  MEETINGS_ENDPOINT: 'http://localhost:3000/api/meetings',
};

let configCache = null;

async function getSupabaseConfig() {
  if (configCache) return configCache;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CONFIG_ENDPOINT, { signal: controller.signal });
    if (!res.ok) throw new Error(`config HTTP ${res.status}`);
    configCache = await res.json();
    return configCache;
  } catch (err) {
    console.warn('[bridge] falling back to built-in config:', err && err.message);
    configCache = FALLBACK_CONFIG;
    return configCache;
  } finally {
    clearTimeout(timer);
  }
}

function toBase64Url(uint8) {
  let bin = '';
  uint8.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePkce() {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = toBase64Url(verifierBytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = toBase64Url(new Uint8Array(digest));
  return { codeVerifier, codeChallenge };
}

async function storeTokens(session, user) {
  const expiresInSec = session.expires_in || 3600;
  await chrome.storage.local.set({
    supabaseAccessToken: session.access_token,
    supabaseRefreshToken: session.refresh_token,
    supabaseExpiresAt: Date.now() + expiresInSec * 1000 - 60 * 1000, // 60s safety margin
    supabaseUserEmail: (user && user.email) || null,
  });
}

async function exchangeCodeForSession(code, codeVerifier, config) {
  const res = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (HTTP ${res.status}): ${text}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken, config) {
  const res = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (HTTP ${res.status}): ${text}`);
  }
  return res.json();
}

async function getValidToken() {
  const { supabaseAccessToken, supabaseRefreshToken, supabaseExpiresAt } =
    await chrome.storage.local.get(['supabaseAccessToken', 'supabaseRefreshToken', 'supabaseExpiresAt']);

  if (!supabaseAccessToken || !supabaseRefreshToken) return null;

  if (supabaseExpiresAt && Date.now() >= supabaseExpiresAt) {
    try {
      const config = await getSupabaseConfig();
      const refreshed = await refreshAccessToken(supabaseRefreshToken, config);
      await storeTokens(refreshed, refreshed.user);
      return refreshed.access_token;
    } catch (err) {
      console.error('[supabase] token refresh failed:', err);
      return null;
    }
  }
  return supabaseAccessToken;
}

async function signInWithGoogle() {
  const config = await getSupabaseConfig();
  const redirectUri = chrome.identity.getRedirectURL('google');
  const { codeVerifier, codeChallenge } = await generatePkce();

  const authorizeUrl = new URL(`${config.SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('flow_type', 'pkce');
  authorizeUrl.searchParams.set('redirect_to', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizeUrl.toString(),
    interactive: true,
  });
  if (!redirectUrl) throw new Error('Sign-in was cancelled.');

  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) throw new Error('Google sign-in returned no authorization code.');

  const session = await exchangeCodeForSession(code, codeVerifier, config);
  await storeTokens(session, session.user);
  return { email: (session.user && session.user.email) || null, id: (session.user && session.user.id) || null };
}

// ------------------------------------------------------------------
// BRIDGE — the website can pull the data with runtime.sendMessage.
// ------------------------------------------------------------------

const ALLOWED_ORIGIN = 'http://localhost:3000'; // Update in prod
const EXPECTED_MESSAGE_TYPE = 'GET_STORAGE_DATA';

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const senderOrigin =
    (sender.origin && String(sender.origin)) ||
    (sender.url ? new URL(sender.url).origin : null);

  // We allow localhost in dev. In prod, check strictly.
  if (!senderOrigin || (!senderOrigin.startsWith('http://localhost') && senderOrigin !== ALLOWED_ORIGIN)) {
    console.warn(`[bridge] blocked message from ${senderOrigin || '(unknown origin)'}`);
    return;
  }

  if (!message || message.type !== EXPECTED_MESSAGE_TYPE) {
    console.warn('[bridge] blocked unexpected message type:', message && message.type);
    return;
  }

  (async () => {
    try {
      const allData = await chrome.storage.local.get(null);
      sendResponse({
        ok: true,
        data: {
          meetDB: allData[DB_KEY] || { schemaVersion: SCHEMA_VERSION, hostEmail: null, sessions: [] },
          meetLive: allData.meetLive || null,
          selectedLangCode: allData.selectedLangCode || null,
        },
      });
    } catch (err) {
      console.error('[bridge] failed to read storage:', err);
      sendResponse({ ok: false, error: String((err && err.message) || err) });
    }
  })();

  return true;
});

// ------------------------------------------------------------------
// SYNC — push finalized, unsynced sessions to the database.
// ------------------------------------------------------------------

async function syncFinalizedSessions() {
  const token = await getValidToken();
  if (!token) {
    const msg = 'Not signed in. Open the popup and tap "Sign in with Google" so transcripts can be uploaded.';
    console.warn('[bridge] ' + msg);
    return { ok: false, reason: msg };
  }

  const { [DB_KEY]: db } = await chrome.storage.local.get(DB_KEY);
  if (!db || !Array.isArray(db.sessions)) {
    const msg = 'No meetDB found in storage.';
    console.warn('[bridge] ' + msg);
    return { ok: false, reason: msg };
  }

  const pending = db.sessions.filter((s) => s.endedAt && s.synced !== true);
  if (pending.length === 0) {
    const msg = 'No finalized sessions waiting to sync (all pending=0).';
    console.log('[bridge] ' + msg);
    return { ok: true, reason: msg, synced: 0 };
  }

  const config = await getSupabaseConfig();
  let dbChanged = false;
  const results = [];

  for (const session of pending) {
    try {
      const res = await fetch(config.MEETINGS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: session.title,
          transcript: session.transcript,
          time: session.startedAt,
        })
      });

      if (res.ok) {
        session.synced = true;
        dbChanged = true;
        const msg = `Synced session ${session.sessionId} (${session.transcript.length} lines)`;
        console.log('[bridge] ' + msg);
        results.push({ sessionId: session.sessionId, ok: true });
      } else {
        const text = await res.text();
        console.error(`[bridge] FAILED session ${session.sessionId}: HTTP ${res.status} ${text}`);
        results.push({ sessionId: session.sessionId, ok: false, status: res.status, body: text });
      }
    } catch (err) {
      console.error(`[bridge] NETWORK error on session ${session.sessionId}:`, err);
      results.push({ sessionId: session.sessionId, ok: false, error: String((err && err.message) || err) });
    }
  }

  if (dbChanged) {
    await chrome.storage.local.set({ [DB_KEY]: db });
  }

  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    reason: failed.length ? `${failed.length} failed, ${results.length - failed.length} synced` : `${results.length} synced`,
    synced: results.length - failed.length,
    failed,
  };
}

// Sync whenever meetDB changes (a session just got finalized/updated).
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== 'local' || !changes[DB_KEY]) return;
  await syncFinalizedSessions();
  await syncLiveSessionThrottled();
});

// ------------------------------------------------------------------
// LIVE SYNC — while a meeting is still running, periodically upsert
// its current transcript so the website shows captions in real time
// (not only after the tab closes). Same endpoint as finalize sync.
// ------------------------------------------------------------------

const LIVE_SYNC_MIN_INTERVAL_MS = 15000;
let lastLiveSyncAt = 0;

async function syncLiveSessionThrottled() {
  const now = Date.now();
  if (now - lastLiveSyncAt < LIVE_SYNC_MIN_INTERVAL_MS) return;
  lastLiveSyncAt = now;

  const token = await getValidToken();
  if (!token) return;

  const { [DB_KEY]: db } = await chrome.storage.local.get(DB_KEY);
  if (!db || !Array.isArray(db.sessions)) return;

  // The first (newest) session with no endedAt is the one currently running.
  const live = db.sessions.find((s) => !s.endedAt && s.transcript && s.transcript.length > 0);
  if (!live) return;

  try {
    const config = await getSupabaseConfig();
    const res = await fetch(config.MEETINGS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: live.title,
        transcript: live.transcript,
        time: live.startedAt,
      })
    });
    if (res.ok) {
      console.log(`[bridge] Live-synced ${live.transcript.length} lines for ${live.sessionId}`);
    } else {
      const text = await res.text();
      console.error(`[bridge] Live sync FAILED (HTTP ${res.status}): ${text}`);
    }
  } catch (err) {
    console.error('[bridge] Live sync network error:', err);
  }
}

// content.js pings us on pagehide so a finalized session isn't lost even
// if the storage write races with tab unload.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'SESSION_FINALIZED') {
    syncFinalizedSessions();
    sendResponse({ ok: true });
    return;
  }
  if (msg && msg.type === 'SYNC_NOW') {
    syncFinalizedSessions().then((result) => sendResponse(result || { ok: false, reason: 'No result' }));
    return true; // keep channel open for the async response
  }
  if (msg && msg.type === 'GET_CONFIG') {
    getSupabaseConfig()
      .then((config) => sendResponse({ ok: true, config }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;
  }
  if (msg && msg.type === 'SYNC_STATUS') {
    (async () => {
      const { supabaseAccessToken: hasToken, supabaseUserEmail: email, supabaseExpiresAt } =
        await chrome.storage.local.get(['supabaseAccessToken', 'supabaseUserEmail', 'supabaseExpiresAt']);
      const { [DB_KEY]: db } = await chrome.storage.local.get(DB_KEY);
      const sessions = (db && Array.isArray(db.sessions)) ? db.sessions : [];
      sendResponse({
        signedIn: !!hasToken,
        email: email || null,
        expiresIn: supabaseExpiresAt ? Math.max(0, Math.round((supabaseExpiresAt - Date.now()) / 60000)) : null,
        sessionCount: sessions.length,
        finalizedUnsynced: sessions.filter((s) => s.endedAt && s.synced !== true).length,
        live: sessions.filter((s) => !s.endedAt).length,
        endpoint: 'http://localhost:3000/api/meetings',
      });
    })();
    return true;
  }
  if (msg && msg.type === 'SIGN_IN') {
    signInWithGoogle()
      .then((account) => {
        sendResponse({ ok: true, email: account.email });
        return Promise.all([syncFinalizedSessions(), syncLiveSessionThrottled()]);
      })
      .catch((err) => sendResponse({ ok: false, reason: String((err && err.message) || err) }));
    return true;
  }
  if (msg && msg.type === 'SIGN_OUT') {
    chrome.storage.local.remove(
      ['supabaseAccessToken', 'supabaseRefreshToken', 'supabaseExpiresAt', 'supabaseUserEmail'],
      () => sendResponse({ ok: true })
    );
    return true;
  }
});

// Catch anything missed while the service worker was asleep (e.g. the
// storage change fired before startup). Runs on worker start + install.
chrome.runtime.onStartup.addListener(() => syncFinalizedSessions());
chrome.runtime.onInstalled.addListener(() => syncFinalizedSessions());
