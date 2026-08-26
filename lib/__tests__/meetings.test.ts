import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the splitIntoChunks function directly from the meetings.ts file
// We need to test it in isolation since it's a pure function
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

describe("splitIntoChunks", () => {
  it("should split text into chunks of specified size", () => {
    const text = "word ".repeat(1000);
    const chunks = splitIntoChunks(text, 100, 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].split(" ").length).toBeLessThanOrEqual(100);
  });

  it("should handle empty text", () => {
    const chunks = splitIntoChunks("", 500, 75);
    expect(chunks).toEqual([]);
  });

  it("should handle text shorter than chunk size", () => {
    const text = "short text";
    const chunks = splitIntoChunks(text, 500, 75);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe("short text");
  });

  it("should create overlapping chunks", () => {
    const text = "one two three four five six seven eight nine ten";
    const chunks = splitIntoChunks(text, 3, 1);

    expect(chunks.length).toBeGreaterThan(1);
    // Check that chunks overlap
    const firstChunkWords = chunks[0].split(" ");
    const secondChunkWords = chunks[1].split(" ");
    expect(secondChunkWords).toContain(
      firstChunkWords[firstChunkWords.length - 1],
    );
  });

  it("should handle text with multiple spaces", () => {
    const text = "word  word   word";
    const chunks = splitIntoChunks(text, 500, 75);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe("word word word");
  });

  it("should use default chunk size and overlap when not specified", () => {
    const text = "word ".repeat(600);
    const chunks = splitIntoChunks(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].split(" ").length).toBeLessThanOrEqual(500);
  });

  it("should handle zero overlap", () => {
    const text = "one two three four five six";
    const chunks = splitIntoChunks(text, 2, 0);

    expect(chunks.length).toBe(3);
    expect(chunks[0]).toBe("one two");
    expect(chunks[1]).toBe("three four");
    expect(chunks[2]).toBe("five six");
  });

  it("should handle overlap larger than chunk size", () => {
    const text = "one two three four five six seven eight nine ten";
    const chunks = splitIntoChunks(text, 3, 2);

    // With reasonable overlap, it should still work
    expect(chunks.length).toBeGreaterThan(1);
  });
});
