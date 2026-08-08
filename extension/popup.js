const DB_KEY = 'meetDB';

let currentMeetingId = null;
let currentSessionId = null;
let currentSession = null;
let latestLivePreview = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function formatDuration(sec) {
  if (sec == null || isNaN(sec)) return '—';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getMeetingIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'meet.google.com') return null;
    const id = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
    return id || null;
  } catch (e) {
    return null;
  }
}

function getActiveMeetTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes('meet.google.com')) {
      callback(tab);
    } else {
      callback(null);
    }
  });
}

function render() {
  const log = document.getElementById('log');
  const meta = document.getElementById('meta');
  const s = currentSession;

  if (!s) {
    meta.innerHTML = '';
    log.textContent = 'No captions captured yet. Make sure captions (CC) are turned on in Meet.';
    return;
  }

  const start = new Date(s.startedAt);
  const endTime =
    s.durationSec != null
      ? s.durationSec
      : s.endedAt
      ? (new Date(s.endedAt) - start) / 1000
      : null;
  const duration = formatDuration(endTime);
  const langName = s.language || '—';
  const speakerList = s.speakers && s.speakers.length ? s.speakers.join(', ') : '—';

  meta.innerHTML = `
    <div class="meta-title">${escapeHtml(s.title)}</div>
    <div class="meta-row">Code: ${escapeHtml(s.meetingCode)}</div>
    <div class="meta-row">Started ${start.toLocaleString()} · Duration ${duration}</div>
    <div class="meta-row">Language: ${escapeHtml(langName)}</div>
    <div class="meta-row">Speakers: ${escapeHtml(speakerList)}</div>
  `;

  const hasCommitted = s.transcript && s.transcript.length > 0;
  const hasLive =
    latestLivePreview && latestLivePreview.sessionId === currentSessionId && latestLivePreview.text;

  if (!hasCommitted && !hasLive) {
    log.textContent = 'No captions captured yet. Keep captions (CC) on during the call.';
    return;
  }

  log.innerHTML = '';
  (s.transcript || []).forEach((line) => {
    const div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = `<span class="speaker">${escapeHtml(line.speaker)}:</span> ${escapeHtml(line.text)}`;
    log.appendChild(div);
  });

  if (hasLive) {
    const div = document.createElement('div');
    div.className = 'line live-line';
    div.innerHTML = `<span class="speaker">${escapeHtml(latestLivePreview.speaker)}:</span> ${escapeHtml(latestLivePreview.text)}`;
    log.appendChild(div);
  }

  log.scrollTop = log.scrollHeight;
}

async function refresh() {
  getActiveMeetTab(async (tab) => {
    const log = document.getElementById('log');
    const meta = document.getElementById('meta');

    if (!tab || !getMeetingIdFromUrl(tab.url)) {
      currentMeetingId = null;
      currentSessionId = null;
      currentSession = null;
      latestLivePreview = null;
      meta.innerHTML = '';
      log.textContent = 'Open a Google Meet tab first.';
      return;
    }

    currentMeetingId = getMeetingIdFromUrl(tab.url);

    const { [DB_KEY]: db, meetLive } = await chrome.storage.local.get([DB_KEY, 'meetLive']);
    const sessions = (db && db.sessions) || [];
    const session = sessions.find((s) => s.meetingCode === currentMeetingId) || null;

    if (!session) {
      currentSessionId = null;
      currentSession = null;
      latestLivePreview = null;
      render();
      return;
    }

    currentSessionId = session.sessionId;
    currentSession = session;
    latestLivePreview =
      meetLive && meetLive.sessionId === currentSessionId ? meetLive : null;
    render();
  });
}

// Live-update the transcript while the popup is open: content.js writes
// everything to `meetDB` and the transient in-progress line to `meetLive`.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes[DB_KEY] || changes.meetLive) refresh();
});

// Restore the last-selected caption language so the dropdown doesn't
// reset to the top option every time the popup is reopened.
const langSelect = document.getElementById('langSelect');
chrome.storage.local.get('selectedLangCode', (result) => {
  if (result && result.selectedLangCode) {
    langSelect.value = result.selectedLangCode;
  }
});
langSelect.addEventListener('change', () => {
  chrome.storage.local.set({ selectedLangCode: langSelect.value });
});

document.getElementById('copyBtn').addEventListener('click', () => {
  if (!currentSession) return;
  const text = (currentSession.transcript || [])
    .map((l) => `${l.speaker}: ${l.text}`)
    .join('\n');
  navigator.clipboard.writeText(text);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!currentSession) return;
  const s = currentSession;
  const text =
    `Meeting: ${s.title}\n` +
    `Code: ${s.meetingCode}\n` +
    `Started: ${s.startedAt}\n` +
    `Duration (s): ${s.durationSec ?? ''}\n\n` +
    (s.transcript || []).map((l) => `[${l.time}] ${l.speaker}: ${l.text}`).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: `meet-${s.meetingCode}.txt` });
});

// Export the unified meetDB as one JSON file — this is the file your
// website loads (via upload/paste) to show meetings and process them
// with AI. A normal website can't read chrome.storage.local directly,
// so export is the bridge.
document.getElementById('exportJsonBtn').addEventListener('click', async () => {
  const { [DB_KEY]: db } = await chrome.storage.local.get(DB_KEY);
  const clean = db && db.sessions ? db : { schemaVersion: 2, hostEmail: null, sessions: [] };
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: clean.schemaVersion,
    hostEmail: clean.hostEmail,
    meetingCount: clean.sessions.length,
    meetings: clean.sessions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'meet-meetings.json' });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  getActiveMeetTab((tab) => {
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_TRANSCRIPT' }, () => {
      refresh();
    });
  });
});

// Debug helper: force background.js to attempt syncing finalized sessions
// and surface the exact outcome (missing token, no responses, etc.).
document.getElementById('syncBtn').addEventListener('click', () => {
  const statusEl = document.getElementById('syncStatus');
  statusEl.textContent = 'Checking…';
  chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, (result) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
      return;
    }
    if (!result) {
      statusEl.textContent = 'No response from background.';
      return;
    }
    if (result.ok) {
      statusEl.textContent = `OK — ${result.synced} synced. ${result.reason || ''}`;
    } else {
      statusEl.textContent = `FAILED — ${result.reason || 'unknown'}. failed=${JSON.stringify(result.failed || [])}`;
    }
  });
});

// Show sync state on popup open so failures are visible immediately.
function refreshSyncStatus() {
  const statusEl = document.getElementById('syncStatus');
  chrome.runtime.sendMessage({ type: 'SYNC_STATUS' }, (res) => {
    if (!res) return;
    updateAuthUI(res);
    const parts = [
      res.signedIn ? (res.email ? `as ${res.email}` : 'signed-in ✓') : 'not signed in',
      `sessions: ${res.sessionCount}`,
      `live: ${res.live}`,
      `to-sync: ${res.finalizedUnsynced}`,
    ];
    statusEl.textContent = parts.join('  ·  ');
  });
}
refreshSyncStatus();

// --- Google sign-in / sign-out (PKCE, run in the popup so the service
// worker can't be killed mid-flow and lose the OAuth callback) ---
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authNote = document.getElementById('authNote');

function updateAuthUI(status) {
  const signedIn = status && status.signedIn;
  signInBtn.style.display = signedIn ? 'none' : 'inline-block';
  signOutBtn.style.display = signedIn ? 'inline-block' : 'none';
  if (signedIn && status.email) {
    authNote.textContent =
      `Signed in as ${status.email}` +
      (status.expiresIn != null ? ` · token expires in ~${status.expiresIn}m` : '');
  } else if (signedIn) {
    authNote.textContent = 'Signed in — email unavailable.';
  } else if (!authNote.textContent || authNote.textContent.startsWith('Sign in to upload')) {
    // Only reset the default text if there isn't a more specific message
    // (e.g. a sign-in error) already showing, so the 5s status refresh
    // doesn't wipe out the actual failure reason.
    authNote.textContent = 'Sign in to upload transcripts to your account.';
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

function getSupabaseConfig() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (res) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(res && res.ok && res.config ? res.config : null);
    });
  });
}

async function signInWithGoogle() {
  if (!chrome.identity) {
    throw new Error(
      'chrome.identity is missing. Reload the extension from chrome://extensions to pick up the new manifest.'
    );
  }

  const config = await getSupabaseConfig();
  if (!config) throw new Error('Could not reach the site to fetch Supabase config. Is the dev server running?');

  const redirectUri = chrome.identity.getRedirectURL('google');
  const { codeVerifier, codeChallenge } = await generatePkce();

  const authorizeUrl = new URL(`${config.SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('flow_type', 'pkce');
  authorizeUrl.searchParams.set('redirect_to', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  let redirectUrl;
  try {
    redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authorizeUrl.toString(),
      interactive: true,
    });
  } catch (err) {
    const detail = String((err && err.message) || err);
    if (/ended|not.*complete|failed/i.test(detail)) {
      throw new Error(
        'Google sign-in could not finish. Make sure this exact redirect URL is allowed in Supabase ' +
          '(Authentication → URL Configuration → Redirect URLs): ' +
          redirectUri +
          '  (Error: ' + detail + ')'
      );
    }
    throw new Error('Google sign-in failed: ' + detail);
  }

  if (!redirectUrl) throw new Error('Sign-in was cancelled.');

  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) {
    throw new Error(
      'Google sign-in returned no code. Check that the redirect URL is allowed in Supabase ' +
        '(Authentication → URL Configuration → Redirect URLs): ' + redirectUri +
        '  (Got redirect: ' + String(redirectUrl).slice(0, 80) + ')'
    );
  }

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
  const session = await res.json();

  await chrome.storage.local.set({
    supabaseAccessToken: session.access_token,
    supabaseRefreshToken: session.refresh_token,
    supabaseExpiresAt: Date.now() + (session.expires_in || 3600) * 1000 - 60 * 1000,
    supabaseUserEmail: (session.user && session.user.email) || null,
  });

  return { email: (session.user && session.user.email) || null };
}

signInBtn.addEventListener('click', async () => {
  authNote.textContent = 'Opening Google sign-in…';
  try {
    const account = await signInWithGoogle();
    authNote.textContent = account.email ? `Signed in as ${account.email}.` : 'Signed in.';
    refreshSyncStatus();
    refresh();
    chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, (result) => {
      const statusEl = document.getElementById('syncStatus');
      if (result && result.ok) statusEl.textContent = `OK — ${result.synced} synced.`;
      else if (result) statusEl.textContent = `Sync: ${result.reason || 'failed'}`;
    });
  } catch (err) {
    authNote.textContent = 'Sign-in failed: ' + ((err && err.message) || 'unknown error');
  }
});

signOutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
    refreshSyncStatus();
  });
});

// Keep the status honest while the popup is open (e.g. after sign-in or
// once a session finalizes) without needing a manual refresh.
setInterval(refreshSyncStatus, 5000);

document.getElementById('startCcBtn').addEventListener('click', () => {
  const langCode = document.getElementById('langSelect').value;
  chrome.storage.local.set({ selectedLangCode: langCode });
  const statusEl = document.getElementById('ccStatus');
  statusEl.textContent = 'Working…';

  getActiveMeetTab((tab) => {
    if (!tab) {
      statusEl.textContent = 'Open a Google Meet tab first.';
      return;
    }
    chrome.tabs.sendMessage(
      tab.id,
      { type: 'ENABLE_CAPTIONS_WITH_LANGUAGE', langCode },
      (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        if (!response) {
          statusEl.textContent = 'No response from page.';
          return;
        }
        if (response.ok) {
          statusEl.textContent = 'Captions on, language set ✔';
        } else {
          statusEl.textContent = 'Could not finish: ' + (response.reason || 'unknown issue');
        }
      }
    );
  });
});

refresh();
