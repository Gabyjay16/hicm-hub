import { describe, expect, it } from "vitest";
import { compareDocumentText, normalizeText, reportRecommendations, textShingles } from "../functions/lib/originality.js";

describe("originality engine", () => {
  it("normalizes case, punctuation, and repeated whitespace deterministically", () => {
    expect(normalizeText("  Academic, INTEGRITY!\nMatters. ")).toBe("academic integrity matters");
  });

  it("creates unique fixed-width word shingles", () => {
    const shingles = textShingles("one two three four five six seven one two three four five six seven", 7);
    expect(shingles.has("one two three four five six seven")).toBe(true);
    expect(shingles.size).toBe(7);
  });

  it("measures unique overlap across the internal corpus", () => {
    const target = "research ethics protects participants through informed consent and careful handling of personal data in every academic study";
    const result = compareDocumentText(target, [
      { id: "source-1", extracted_text: "a handbook says informed consent and careful handling of personal data in every academic study protects communities" },
    ]);
    expect(result.similarityPercent).toBeGreaterThan(0);
    expect(result.matchedShingles).toBeGreaterThan(0);
    expect(result.matches[0].sourceDocumentId).toBe("source-1");
  });

  it("returns an honest zero for an empty comparison corpus", () => {
    const result = compareDocumentText("a sufficiently long document with original words for a useful analysis result", []);
    expect(result.similarityPercent).toBe(0);
    expect(result.matches).toEqual([]);
    expect(reportRecommendations(result)[0]).toContain("No exact seven-word overlap");
  });
});

