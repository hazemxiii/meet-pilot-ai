"use client";

export const EXTENSION_ID = "afodfpajipbpnmgcngnfibjmdmihffom";
const EXPECTED_MESSAGE_TYPE = "GET_STORAGE_DATA";

export interface ExtensionSession {
  sessionId: string;
  meetingCode: string;
  url: string | null;
  title: string;
  hostEmail: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  language: string | null;
  speakers: string[];
  transcript: Array<{
    speaker: string;
    text: string;
    time?: string;
  }>;
}

export interface MeetDB {
  schemaVersion: number;
  hostEmail: string | null;
  sessions: ExtensionSession[];
}

export interface ExtensionDataPayload {
  meetDB?: MeetDB;
  meetLive?: unknown;
  selectedLangCode?: string | null;
}

export async function fetchDataFromExtension(): Promise<ExtensionDataPayload> {
  return new Promise((resolve, reject) => {
    // 1. Try Chrome extension runtime messaging if available
    const chromeGlobal = (typeof window !== "undefined" ? (window as unknown as Record<string, unknown>).chrome : undefined) as {
      runtime?: {
        sendMessage?: (id: string, message: unknown, responseCallback: (response: unknown) => void) => void;
        lastError?: { message?: string };
      };
    } | undefined;

    if (chromeGlobal?.runtime?.sendMessage) {
      try {
        chromeGlobal.runtime.sendMessage(
          EXTENSION_ID,
          { type: EXPECTED_MESSAGE_TYPE },
          (response: unknown) => {
            if (chromeGlobal.runtime?.lastError) {
              console.warn("Chrome runtime message failed:", chromeGlobal.runtime.lastError.message);
              reject(new Error(`Extension unavailable: ${chromeGlobal.runtime.lastError.message}`));
            } else if (response && typeof response === "object") {
              const res = response as { ok?: boolean; data?: ExtensionDataPayload; error?: string };
              if (res.ok && res.data) {
                resolve(res.data);
              } else {
                reject(new Error(res.error || "Extension rejected the request."));
              }
            } else {
              reject(new Error("Invalid response from extension."));
            }
          }
        );
        return;
      } catch (err) {
        console.warn("Direct chrome.runtime call threw error:", err);
      }
    }

    reject(new Error("Extension messaging API is not available. Please use Google Chrome with the extension installed."));
  });
}
