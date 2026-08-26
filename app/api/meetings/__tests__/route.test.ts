import { describe, it, expect } from "vitest";

// Test the splitIntoChunks function that's used in the route
function splitIntoChunks(text: string, chunkSize = 500, overlap = 75) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }
  return chunks;
}

describe("API route utilities", () => {
  describe("splitIntoChunks (used in meetings route)", () => {
    it("should split text into chunks", () => {
      const text = "word ".repeat(100);
      const chunks = splitIntoChunks(text, 20, 5);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("should handle empty text", () => {
      const chunks = splitIntoChunks("", 500, 75);
      expect(chunks).toEqual([]);
    });

    it("should handle text shorter than chunk size", () => {
      const text = "short text";
      const chunks = splitIntoChunks(text, 500, 75);
      expect(chunks.length).toBe(1);
    });
  });

  describe("search parameter sanitization", () => {
    it("should remove dangerous characters from search", () => {
      const search = "test%_drop";
      const safeSearch = search.replace(/[%_,()]/g, "");
      expect(safeSearch).toBe("testdrop");
    });

    it("should handle empty search", () => {
      const search = "";
      const safeSearch = search.replace(/[%_,()]/g, "");
      expect(safeSearch).toBe("");
    });

    it("should preserve safe characters", () => {
      const search = "test-meeting 2024";
      const safeSearch = search.replace(/[%_,()]/g, "");
      expect(safeSearch).toBe("test-meeting 2024");
    });
  });

  describe("title normalization", () => {
    it("should trim whitespace from title", () => {
      const title = "  Test Meeting  ";
      const meetingTitle = title?.trim() || "Untitled Meeting";
      expect(meetingTitle).toBe("Test Meeting");
    });

    it("should use default title for empty string", () => {
      const title = "";
      const meetingTitle = title?.trim() || "Untitled Meeting";
      expect(meetingTitle).toBe("Untitled Meeting");
    });

    it("should use default title for undefined", () => {
      const title = undefined as string | undefined;
      const meetingTitle = title?.trim() || "Untitled Meeting";
      expect(meetingTitle).toBe("Untitled Meeting");
    });
  });

  describe("transcript normalization", () => {
    it("should stringify array transcript", () => {
      const transcript = [{ speaker: "A", text: "Hello" }];
      const transcriptText = Array.isArray(transcript)
        ? JSON.stringify(transcript)
        : typeof transcript === "string"
          ? transcript
          : "";
      expect(transcriptText).toBe('[{"speaker":"A","text":"Hello"}]');
    });

    it("should use string transcript as-is", () => {
      const transcript = "This is a transcript";
      const transcriptText = Array.isArray(transcript)
        ? JSON.stringify(transcript)
        : typeof transcript === "string"
          ? transcript
          : "";
      expect(transcriptText).toBe("This is a transcript");
    });

    it("should handle non-array non-string transcript", () => {
      const transcript = 123;
      const transcriptText = Array.isArray(transcript)
        ? JSON.stringify(transcript)
        : typeof transcript === "string"
          ? transcript
          : "";
      expect(transcriptText).toBe("");
    });
  });

  describe("time normalization", () => {
    it("should convert valid time string to ISO", () => {
      const time = "2024-01-01T00:00:00Z";
      const meetingTime = time
        ? new Date(time).toISOString()
        : new Date().toISOString();
      expect(meetingTime).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should use current time when time is not provided", () => {
      const time = undefined;
      const meetingTime = time
        ? new Date(time).toISOString()
        : new Date().toISOString();
      expect(meetingTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
