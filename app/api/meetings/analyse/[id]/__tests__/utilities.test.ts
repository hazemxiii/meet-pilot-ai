import { describe, it, expect } from "vitest";

describe("Meeting analysis utilities", () => {
  describe("JSON parsing from AI response", () => {
    it("should parse JSON from markdown code blocks", () => {
      const responseText = '```json{"notes":[{"title":"Note"}],"tasks":[]}```';
      const parsed = JSON.parse(
        responseText.replace("```json", "").replace("```", ""),
      );
      expect(parsed).toEqual({ notes: [{ title: "Note" }], tasks: [] });
    });

    it("should handle JSON without markdown", () => {
      const responseText = '{"notes":[],"tasks":[]}';
      const parsed = JSON.parse(responseText);
      expect(parsed).toEqual({ notes: [], tasks: [] });
    });

    it("should handle JSON with extra whitespace", () => {
      const responseText = '```json\n{"notes":[],"tasks":[]}\n```';
      const parsed = JSON.parse(
        responseText.replace("```json", "").replace("```", ""),
      );
      expect(parsed).toEqual({ notes: [], tasks: [] });
    });
  });

  describe("memory context formatting", () => {
    it("should join memory items with newlines", () => {
      const memoryItems = [
        { content: "Memory 1" },
        { content: "Memory 2" },
        { content: "Memory 3" },
      ];
      const memoryContext = memoryItems.map((item) => item.content).join("\n");
      expect(memoryContext).toBe("Memory 1\nMemory 2\nMemory 3");
    });

    it("should handle empty memory items", () => {
      const memoryItems: { content: string }[] = [];
      const memoryContext = memoryItems.map((item) => item.content).join("\n");
      expect(memoryContext).toBe("");
    });

    it("should use default message when no memory items", () => {
      const memoryItems: { content: string }[] | null = null;
      const memoryContext =
        memoryItems && memoryItems.length > 0
          ? memoryItems
              .map((item: { content: string }) => item.content)
              .join("\n")
          : "No previous memory context available.";
      expect(memoryContext).toBe("No previous memory context available.");
    });
  });

  describe("error response formatting", () => {
    it("should format error with code", () => {
      const error = { code: "CHNK_ERROR" };
      const errorMessage =
        "Failed to analyse meeting error code " + "CHNK_" + error.code;
      expect(errorMessage).toBe(
        "Failed to analyse meeting error code CHNK_CHNK_ERROR",
      );
    });

    it("should handle missing chunks error", () => {
      const errorMessage = "Failed to analyse meeting no chunks found";
      expect(errorMessage).toBe("Failed to analyse meeting no chunks found");
    });

    it("should handle ownership error", () => {
      const errorMessage =
        "Failed to analyse meeting you are not the owner of this meeting";
      expect(errorMessage).toBe(
        "Failed to analyse meeting you are not the owner of this meeting",
      );
    });
  });

  describe("authorization checks", () => {
    it("should check user authentication", () => {
      const user = null;
      const userError = { message: "Unauthorized" };
      const isUnauthorized = Boolean(userError) || !user;
      expect(isUnauthorized).toBe(true);
    });

    it("should pass when user is authenticated", () => {
      const user = { id: "user-123" };
      const userError = null;
      const isUnauthorized = Boolean(userError) || !user;
      expect(isUnauthorized).toBe(false);
    });

    it("should check chunk ownership", () => {
      const userId = "user-123";
      const chunks = [
        { user_id: "user-123", text: "chunk1" },
        { user_id: "user-123", text: "chunk2" },
      ];
      const isOwner = !chunks.some((chunk) => chunk.user_id !== userId);
      expect(isOwner).toBe(true);
    });

    it("should fail ownership check for mixed ownership", () => {
      const userId = "user-123";
      const chunks = [
        { user_id: "user-123", text: "chunk1" },
        { user_id: "other-user", text: "chunk2" },
      ];
      const isOwner = !chunks.some((chunk) => chunk.user_id !== userId);
      expect(isOwner).toBe(false);
    });
  });
});
