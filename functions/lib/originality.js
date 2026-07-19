import { unzipSync, strFromU8 } from "fflate";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

const COVERAGE_NOTE = "Compared deterministically with readable thesis documents stored in HICM HUB. Scanned image pages, subscription databases, and the public web are outside this report's coverage.";

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function textShingles(value, width = 7) {
  const words = normalizeText(value).split(" ").filter(Boolean);
  const shingles = new Map();
  for (let index = 0; index <= words.length - width; index += 1) {
    const key = words.slice(index, index + width).join(" ");
    if (!shingles.has(key)) shingles.set(key, words.slice(Math.max(0, index - 5), index + width + 8).join(" "));
  }
  return shingles;
}

export function compareDocumentText(targetText, sources) {
  const target = textShingles(targetText);
  const matched = new Set();
  const matches = [];

  for (const source of sources) {
    const sourceKeys = textShingles(source.extracted_text);
    const overlap = [];
    for (const [key, excerpt] of target) {
      if (sourceKeys.has(key)) {
        matched.add(key);
        if (overlap.length < 3) overlap.push(excerpt);
      }
    }
    if (overlap.length) {
      const count = [...target.keys()].filter((key) => sourceKeys.has(key)).length;
      matches.push({
        sourceDocumentId: source.id,
        similarityPercent: percentage(count, target.size),
        matchedShingles: count,
        excerpt: overlap[0],
      });
    }
  }

  return {
    similarityPercent: percentage(matched.size, target.size),
    matchedShingles: matched.size,
    totalShingles: target.size,
    coverageNote: COVERAGE_NOTE,
    matches: matches.sort((left, right) => right.similarityPercent - left.similarityPercent),
  };
}

export async function extractDocumentText(buffer, fileName) {
  const extension = String(fileName).split(".").pop()?.toLowerCase();
  if (extension === "pdf") {
    const document = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractPdfText(document, { mergePages: true });
    return String(result.text || "");
  }
  if (extension === "docx") {
    const archive = unzipSync(new Uint8Array(buffer));
    const documentXml = archive["word/document.xml"];
    if (!documentXml) throw new Error("The DOCX document body could not be read.");
    return decodeXml(strFromU8(documentXml)
      .replace(/<w:tab\/?\s*>/g, "\t")
      .replace(/<w:br\/?\s*>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, " "));
  }
  throw new Error("Only PDF and DOCX documents can be analyzed.");
}

export function reportRecommendations(result) {
  const recommendations = [];
  if (result.similarityPercent >= 20) recommendations.push("Review the highlighted overlaps and add quotation marks or citations where required.");
  if (result.similarityPercent > 0 && result.similarityPercent < 20) recommendations.push("Check the matched passages for correct paraphrasing and source attribution.");
  if (result.similarityPercent === 0) recommendations.push("No exact seven-word overlap was found in the current HICM document collection.");
  recommendations.push("Verify the bibliography and all borrowed ideas manually before submission.");
  recommendations.push("This similarity measure is evidence for review, not a finding of academic misconduct or AI authorship.");
  return recommendations;
}

function percentage(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

