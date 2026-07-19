import { unzipSync } from "fflate";

const decoder = new TextDecoder();
const ignoredValues = new Set(["matricule", "matricules", "student matricule", "student matricules"]);

export async function readMatricules(file) {
  if (!file || file.size > 5 * 1024 * 1024) throw new Error("Choose an XLSX or CSV file no larger than 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const values = extension === "csv" ? readCsv(await file.text()) : readXlsx(new Uint8Array(await file.arrayBuffer()));
  return [...new Set(values.map((value) => String(value || "").trim()).filter((value) => value && !ignoredValues.has(value.toLowerCase())))];
}

function readCsv(text) {
  return text.split(/\r?\n/).flatMap((row) => row.split(/[,;\t]/)).map((value) => value.replace(/^"|"$/g, ""));
}

function readXlsx(bytes) {
  let archive;
  try { archive = unzipSync(bytes); } catch { throw new Error("This XLSX file could not be opened."); }
  const totalSize = Object.values(archive).reduce((total, value) => total + value.length, 0);
  if (totalSize > 20 * 1024 * 1024) throw new Error("This spreadsheet expands beyond the 20 MB safety limit.");
  const sheet = archive["xl/worksheets/sheet1.xml"];
  if (!sheet) throw new Error("The first worksheet could not be found in this XLSX file.");
  const shared = archive["xl/sharedStrings.xml"] ? xmlValues(decoder.decode(archive["xl/sharedStrings.xml"]), "si") : [];
  const document = parseXml(decoder.decode(sheet));
  return Array.from(document.getElementsByTagName("c")).map((cell) => {
    const type = cell.getAttribute("t");
    if (type === "inlineStr") return textNodes(cell);
    const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
    return type === "s" ? shared[Number(raw)] || "" : raw;
  });
}

function xmlValues(xml, elementName) {
  return Array.from(parseXml(xml).getElementsByTagName(elementName)).map(textNodes);
}

function textNodes(node) {
  return Array.from(node.getElementsByTagName("t")).map((item) => item.textContent || "").join("");
}

function parseXml(xml) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("The spreadsheet contains invalid XML.");
  return document;
}
