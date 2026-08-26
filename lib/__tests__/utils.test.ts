import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should handle undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("should handle empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("should handle array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle object with conditional classes", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should merge conflicting tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("should handle complex combinations", () => {
    expect(cn("foo", { bar: true, baz: false }, ["qux"])).toBe("foo bar qux");
  });
});
