
import OpenAI from "openai";
import { inflateRawSync, inflateSync } from "node:zlib";

import type {
  AIOSInputItem,
  AIOSInputExtractedData,
  AIOSInputSpreadsheetSheet,
  AIOSInputSpreadsheetRow,
} from "./aios-input-types";

import {
  getVideoVisionConfig,
} from "../video-vision-config";

export interface AIOSInputUnderstandingFile {
  inputId: string;
  file: File;
}

export interface AIOSInputUnderstandingResult {
  success: boolean;
  code:
    | "C164_7_INPUT_UNDERSTANDING_COMPLETED"
    | "C164_7_INPUT_UNDERSTANDING_PARTIAL"
    | "C164_7_INPUT_UNDERSTANDING_REJECTED";
  inputs: AIOSInputItem[];
  understoodCount: number;
  pendingCount: number;
  failedCount: number;
  limitations: string[];
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
  };
  generatedAt: string;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

const MAX_INPUTS = 8;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_TEXT_BYTES = 25 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 10 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2000;
const MAX_ZIP_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_ANALYSIS_LENGTH = 8000;

const TEXT_MIME_TYPES = new Set<string>([
  "text/plain",
  "text/csv",
  "application/json",
]);

const IMAGE_MIME_PREFIX = "image/";
const VIDEO_MIME_PREFIX = "video/";
const PDF_MIME_TYPE = "application/pdf";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function cloneInput(input: AIOSInputItem): AIOSInputItem {
  return {
    ...input,
    metadata: {
      ...input.metadata,
    },
  };
}

function isTextMimeType(mimeType: string): boolean {
  return TEXT_MIME_TYPES.has(mimeType.toLowerCase());
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith(IMAGE_MIME_PREFIX);
}

function isVideoMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith(VIDEO_MIME_PREFIX);
}

function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index < 0
    ? ""
    : fileName.slice(index + 1).toLowerCase();
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    );
}

function xmlText(xml: string): string {
  return decodeXml(
    xml
      .replace(/<w:tab\b[^>]*\/>/g, "\t")
      .replace(/<w:br\b[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/a:p>/g, "\n")
      .replace(/<\/si>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findZipEntries(buffer: Buffer): ZipEntry[] {
  const minimumOffset = Math.max(0, buffer.length - 65557);
  let eocd = -1;

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (
      buffer.readUInt32LE(offset) === 0x06054b50
    ) {
      eocd = offset;
      break;
    }
  }

  if (eocd < 0) {
    throw new Error("Invalid ZIP container: end record not found.");
  }

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocd + 12);
  let offset = buffer.readUInt32LE(eocd + 16);

  if (
    entryCount > MAX_ZIP_ENTRIES ||
    centralDirectorySize > buffer.length ||
    offset + centralDirectorySize > buffer.length
  ) {
    throw new Error("ZIP archive exceeds the parser safety limits.");
  }

  const entries: ZipEntry[] = [];
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    ) {
      throw new Error("Invalid ZIP central directory.");
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);

    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");

    offset += 46 + nameLength + extraLength + commentLength;

    if (
      name.includes("..") ||
      name.startsWith("/") ||
      uncompressedSize > MAX_ZIP_ENTRY_BYTES
    ) {
      throw new Error("ZIP entry exceeds parser safety limits.");
    }

    totalUncompressed += uncompressedSize;

    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("ZIP expanded size exceeds the parser safety limit.");
    }

    if (
      localOffset + 30 > buffer.length ||
      buffer.readUInt32LE(localOffset) !== 0x04034b50
    ) {
      throw new Error("Invalid ZIP local file header.");
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset =
      localOffset + 30 + localNameLength + localExtraLength;

    if (
      dataOffset + compressedSize > buffer.length
    ) {
      throw new Error("ZIP entry data is truncated.");
    }

    const compressed = buffer.subarray(
      dataOffset,
      dataOffset + compressedSize,
    );

    let data: Buffer;

    if (method === 0) {
      data = Buffer.from(compressed);
    } else if (method === 8) {
      data = inflateRawSync(compressed, {
        maxOutputLength: MAX_ZIP_ENTRY_BYTES,
      });
    } else {
      throw new Error(`Unsupported ZIP compression method: ${method}`);
    }

    if (data.length > MAX_ZIP_ENTRY_BYTES) {
      throw new Error("ZIP entry expanded beyond the permitted size.");
    }

    entries.push({
      name,
      data,
    });
  }

  return entries;
}

function getZipText(
  entries: ZipEntry[],
  name: string,
): string | null {
  const entry = entries.find((item) => item.name === name);
  return entry ? entry.data.toString("utf8") : null;
}

function extractDocxText(buffer: Buffer): string {
  const entries = findZipEntries(buffer);
  const document = getZipText(entries, "word/document.xml");

  if (!document) {
    throw new Error("DOCX document.xml was not found.");
  }

  const text = xmlText(document).slice(0, MAX_EXTRACTED_TEXT);

  if (!text.trim()) {
    throw new Error("DOCX document contains no extractable text.");
  }

  return text;
}

function columnNumber(reference: string): number {
  const letters = reference.replace(/[0-9]/g, "").toUpperCase();
  let result = 0;

  for (const char of letters) {
    result = result * 26 + char.charCodeAt(0) - 64;
  }

  return Math.max(0, result - 1);
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) {
    return [];
  }

  const values: string[] = [];
  const matches = xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g);

  for (const match of matches) {
    values.push(xmlText(match[1]));
  }

  return values;
}

function extractXlsxData(
  buffer: Buffer,
): {
  text: string;
  data: AIOSInputExtractedData;
} {
  const entries = findZipEntries(buffer);
  const workbookXml = getZipText(entries, "xl/workbook.xml");

  if (!workbookXml) {
    throw new Error("XLSX workbook.xml was not found.");
  }

  const sharedStrings = parseSharedStrings(
    getZipText(entries, "xl/sharedStrings.xml"),
  );

  const sheets: AIOSInputSpreadsheetSheet[] = [];
  const sheetMatches = Array.from(
    workbookXml.matchAll(
      /<sheet\b([^>]*?)\/?>/g,
    ),
  );

  for (let index = 0; index < sheetMatches.length; index += 1) {
    const attributes = sheetMatches[index][1];

    const nameMatch = attributes.match(/\bname="([^"]*)"/);
    const relationMatch = attributes.match(/\br:id="([^"]+)"/);

    const sheetName = nameMatch
      ? decodeXml(nameMatch[1])
      : `Sheet${index + 1}`;

    let sheetPath = `xl/worksheets/sheet${index + 1}.xml`;

    if (relationMatch) {
      const relationships = getZipText(
        entries,
        "xl/_rels/workbook.xml.rels",
      );

      const relationship = relationships?.match(
        new RegExp(
          `<Relationship\\b(?=[^>]*\\bId="${relationMatch[1]}")([^>]*)\\/>`,
        ),
      );

      const target = relationship?.[1].match(/\bTarget="([^"]+)"/);

      if (target) {
        const normalized = target[1].replace(/^\/+/, "");
        sheetPath = normalized.startsWith("xl/")
          ? normalized
          : `xl/${normalized.replace(/^\.?\//, "")}`;
      }
    }

    const sheetXml = getZipText(entries, sheetPath);

    if (!sheetXml) {
      continue;
    }

    const rows: AIOSInputSpreadsheetRow[] = [];
    const rowMatches = sheetXml.matchAll(
      /<row\b([^>]*)>([\s\S]*?)<\/row>/g,
    );

    for (const rowMatch of rowMatches) {
      const rowNumberMatch = rowMatch[1].match(/\br="(\d+)"/);
      const rowNumberValue = rowNumberMatch
        ? Number(rowNumberMatch[1])
        : rows.length + 1;

      const cells = Array.from(
        rowMatch[2].matchAll(
          /<c\b([^>]*)>([\s\S]*?)<\/c>/g,
        ),
      ).map((cellMatch) => {
        const reference = cellMatch[1].match(/\br="([^"]+)"/)?.[1] ?? "A1";
        const type = cellMatch[1].match(/\bt="([^"]+)"/)?.[1] ?? "";
        const body = cellMatch[2];

        let value = "";

        if (type === "inlineStr") {
          value = xmlText(body);
        } else {
          const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";

          if (type === "s") {
            value = sharedStrings[Number(raw)] ?? "";
          } else if (type === "b") {
            value = raw === "1" ? "TRUE" : "FALSE";
          } else {
            value = decodeXml(raw);
          }
        }

        return {
          row: rowNumberValue,
          column: columnNumber(reference),
          value,
        };
      });

      rows.push({
        row: rowNumberValue,
        cells,
      });
    }

    sheets.push({
      name: sheetName,
      index,
      rows,
    });
  }

  if (sheets.length === 0) {
    throw new Error("XLSX workbook contains no readable worksheets.");
  }

  const text = sheets
    .map((sheet) => {
      const rows = sheet.rows.map((row) =>
        row.cells
          .slice()
          .sort((a, b) => a.column - b.column)
          .map((cell) => cell.value)
          .join(","),
      );

      return `# ${sheet.name}\n${rows.join("\n")}`;
    })
    .join("\n\n")
    .slice(0, MAX_EXTRACTED_TEXT);

  return {
    text,
    data: {
      format: "xlsx",
      sheets,
    },
  };
}

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, char: string) => {
      const replacements: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };

      return replacements[char] ?? char;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(parseInt(octal, 8)),
    )
    .replace(/\\\r?\n/g, "");
}

function extractPdfText(buffer: Buffer): string {
  const source = buffer.toString("latin1");
  const streams: Buffer[] = [];
  const streamPattern = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;

  for (const match of source.matchAll(streamPattern)) {
    const dictionary = match[1];
    const raw = Buffer.from(match[2], "latin1");

    if (dictionary.includes("/FlateDecode")) {
      try {
        streams.push(
          inflateSync(raw, {
            maxOutputLength: MAX_ZIP_ENTRY_BYTES,
          }),
        );
      } catch {
        continue;
      }
    } else {
      streams.push(raw);
    }
  }

  const content = [
    ...streams.map((item) => item.toString("latin1")),
    source,
  ].join("\n");

  const extracted: string[] = [];

  for (const section of content.matchAll(/BT([\s\S]*?)ET/g)) {
    const block = section[1];

    for (const array of block.matchAll(/\[((?:.|\n)*?)\]\s*TJ/g)) {
      const values = Array.from(
        array[1].matchAll(/\((?:\\.|[^\\)])*\)|<([0-9a-fA-F]+)>/g),
      );

      for (const item of values) {
        if (item[1]) {
          const hex = item[1];
          const bytes = Buffer.from(hex.slice(0, hex.length - (hex.length % 4)), "hex");
          extracted.push(bytes.toString("utf16be" as BufferEncoding));
        } else {
          extracted.push(decodePdfLiteral(item[0].slice(1, -1)));
        }
      }

      extracted.push("\n");
    }

    for (const item of block.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      extracted.push(decodePdfLiteral(item[1]));
      extracted.push("\n");
    }

    for (const item of block.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) {
      const hex = item[1];
      const bytes = Buffer.from(hex.slice(0, hex.length - (hex.length % 4)), "hex");
      extracted.push(bytes.toString("utf16be" as BufferEncoding));
      extracted.push("\n");
    }
  }

  const text = extracted
    .join("")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT);

  if (!text) {
    throw new Error(
      "PDF contains no extractable text. Scanned PDFs require OCR.",
    );
  }

  return text;
}

function applyReadyState(
  input: AIOSInputItem,
  extractedText: string,
  extractedData: AIOSInputExtractedData | null = null,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    extractedText,
    extractedData,
    processingStatus: "ready",
    processingError: null,
  };
}

function applyPendingState(
  input: AIOSInputItem,
  reason: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    processingStatus: "pending",
    processingError: reason,
  };
}

function applyFailedState(
  input: AIOSInputItem,
  error: string,
): AIOSInputItem {
  return {
    ...cloneInput(input),
    processingStatus: "failed",
    processingError: error,
  };
}

function validateFile(
  entry: AIOSInputUnderstandingFile,
): string | null {
  if (!entry || typeof entry.inputId !== "string" || !entry.inputId.trim()) {
    return "Invalid input file entry.";
  }

  if (
    typeof File === "undefined" ||
    !(entry.file instanceof File)
  ) {
    return "Invalid uploaded File.";
  }

  const mime = entry.file.type.toLowerCase();

  if (isImageMimeType(mime) && entry.file.size > MAX_IMAGE_BYTES) {
    return "Image exceeds the 20 MB processing limit.";
  }

  if (isVideoMimeType(mime) && entry.file.size > MAX_VIDEO_BYTES) {
    return "Video exceeds the 100 MB processing limit.";
  }

  if (
    !isImageMimeType(mime) &&
    !isVideoMimeType(mime) &&
    entry.file.size > MAX_TEXT_BYTES
  ) {
    return "Uploaded file exceeds the 25 MB processing limit.";
  }

  return null;
}

function buildImageDataUrl(
  mimeType: string,
  base64: string,
): string {
  return `data:${mimeType};base64,${base64}`;
}

async function analyzeImage(
  input: AIOSInputItem,
  file: File,
  isVideoFrameSheet = false,
): Promise<AIOSInputItem> {
  const config = getVideoVisionConfig();

  if (!config.apiKeyConfigured) {
    return applyPendingState(
      input,
      "Vision provider is configured in the runtime boundary, but OPENAI_API_KEY is not available.",
    );
  }

  const mimeType =
    file.type ||
    input.metadata.mimeType ||
    "application/octet-stream";

  if (!isImageMimeType(mimeType)) {
    return applyFailedState(
      input,
      "Uploaded processing input is not a supported image.",
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(config.baseURL
        ? {
            baseURL: config.baseURL,
          }
        : {}),
    });

    const context = isVideoFrameSheet
      ? [
          "You are the AIOS uploaded-video visual understanding layer.",
          "Analyze the supplied contact sheet in chronological order.",
          "Describe only visible facts. Distinguish observations from interpretation.",
          "Read visible text when possible. Do not invent missing information.",
          "Return concise Chinese with key frames, visual facts, OCR, people, actions, products, commercial signals, uncertainty and confidence.",
        ].join("\n")
      : [
          "You are the AIOS visual understanding layer.",
          "Analyze only the supplied image.",
          "Describe visible facts and distinguish them from interpretation.",
          "Read visible text when possible. If unclear, say so.",
          "Do not invent missing information.",
          "Return concise Chinese with image content, visual facts, OCR, key objects, context and confidence.",
        ].join("\n");

    const response = await client.responses.create({
      model: config.model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: context,
            },
            {
              type: "input_image",
              image_url: buildImageDataUrl(mimeType, base64),
              detail: "low",
            },
          ],
        },
      ],
    });

    const output =
      response.output_text?.trim().slice(0, MAX_IMAGE_ANALYSIS_LENGTH) ?? "";

    if (!output) {
      return applyFailedState(
        input,
        "Vision provider returned no visual analysis.",
      );
    }

    return applyReadyState(input, output);
  } catch (error) {
    return applyFailedState(
      input,
      error instanceof Error ? error.message : "Vision processing failed.",
    );
  }
}

async function processSingleFile(
  input: AIOSInputItem,
  file: File,
): Promise<AIOSInputItem> {
  const mimeType = (
    file.type ||
    input.metadata.mimeType ||
    "application/octet-stream"
  ).toLowerCase();

  const fileName =
    input.metadata.name ||
    file.name ||
    "";

  const extension = getExtension(fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isTextMimeType(mimeType) || ["txt", "csv", "json"].includes(extension)) {
    try {
      const text = await file.text();

      if (!text.trim()) {
        return applyFailedState(input, "Text file produced empty extraction.");
      }

      return applyReadyState(
        input,
        text.slice(0, MAX_EXTRACTED_TEXT),
      );
    } catch {
      return applyFailedState(input, "Text file could not be decoded.");
    }
  }

  if (isImageMimeType(mimeType)) {
    const isVideoFrameSheet =
      input.kind === "video" ||
      Boolean(input.metadata.name?.endsWith(".frames.jpg"));

    return analyzeImage(input, file, isVideoFrameSheet);
  }

  if (isVideoMimeType(mimeType)) {
    return applyPendingState(
      input,
      "Uploaded video was received, but no derived frame evidence was provided for Vision analysis.",
    );
  }

  try {
    if (
      mimeType === PDF_MIME_TYPE ||
      extension === "pdf"
    ) {
      return applyReadyState(input, extractPdfText(bytes));
    }

    if (
      mimeType === DOCX_MIME_TYPE ||
      extension === "docx"
    ) {
      return applyReadyState(input, extractDocxText(bytes));
    }

    if (
      mimeType === XLSX_MIME_TYPE ||
      extension === "xlsx"
    ) {
      const result = extractXlsxData(bytes);

      return applyReadyState(
        input,
        result.text,
        result.data,
      );
    }

    if (
      mimeType === "application/msword" ||
      extension === "doc"
    ) {
      return applyPendingState(
        input,
        "Legacy DOC is not supported. Convert the document to DOCX.",
      );
    }

    if (
      mimeType === "application/vnd.ms-excel" ||
      extension === "xls"
    ) {
      return applyPendingState(
        input,
        "Legacy XLS is not supported. Convert the workbook to XLSX.",
      );
    }
  } catch (error) {
    return applyFailedState(
      input,
      error instanceof Error
        ? error.message
        : "Document parsing failed.",
    );
  }

  return applyPendingState(
    input,
    "This file type is accepted by AIOS Input Foundation but has no parser enabled.",
  );
}

export async function processAIOSInputUnderstanding(
  inputs: AIOSInputItem[],
  files: AIOSInputUnderstandingFile[],
): Promise<AIOSInputUnderstandingResult> {
  const generatedAt = new Date().toISOString();

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      code: "C164_7_INPUT_UNDERSTANDING_REJECTED",
      inputs: [],
      understoodCount: 0,
      pendingCount: 0,
      failedCount: 0,
      limitations: ["No AIOS inputs were provided."],
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
      },
      generatedAt,
    };
  }

  if (inputs.length > MAX_INPUTS) {
    return {
      success: false,
      code: "C164_7_INPUT_UNDERSTANDING_REJECTED",
      inputs,
      understoodCount: 0,
      pendingCount: 0,
      failedCount: 0,
      limitations: [
        `A maximum of ${MAX_INPUTS} inputs can be processed in one request.`,
      ],
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
      },
      generatedAt,
    };
  }

  const fileMap = new Map<string, File>();

  for (const entry of files) {
    if (
      entry &&
      typeof entry.inputId === "string" &&
      entry.inputId.trim() &&
      typeof File !== "undefined" &&
      entry.file instanceof File
    ) {
      fileMap.set(entry.inputId, entry.file);
    }
  }

  const processedInputs: AIOSInputItem[] = [];

  for (const input of inputs) {
    const file = fileMap.get(input.id);

    if (!file) {
      processedInputs.push(
        applyPendingState(
          input,
          "No server-side uploaded File was mapped to this input.",
        ),
      );
      continue;
    }

    const validationError = validateFile({
      inputId: input.id,
      file,
    });

    if (validationError) {
      processedInputs.push(applyFailedState(input, validationError));
      continue;
    }

    try {
      processedInputs.push(
        await processSingleFile(input, file),
      );
    } catch (error) {
      processedInputs.push(
        applyFailedState(
          input,
          error instanceof Error
            ? error.message
            : "Input processing failed.",
        ),
      );
    }
  }

  const understoodCount = processedInputs.filter(
    (input) => input.processingStatus === "ready",
  ).length;

  const pendingCount = processedInputs.filter(
    (input) => input.processingStatus === "pending",
  ).length;

  const failedCount = processedInputs.filter(
    (input) => input.processingStatus === "failed",
  ).length;

  const limitations = [
    "TXT, CSV, and JSON are extracted as transient text.",
    "DOCX text is extracted from the document XML package.",
    "XLSX worksheets are extracted into structured sheet, row, and cell data.",
    "PDF text extraction supports common text operators and Flate-compressed content streams.",
    "Scanned PDFs require OCR and are not reported as successfully parsed without extractable text.",
    "Legacy DOC and XLS formats remain unsupported.",
    "Image Vision uses the configured provider and may require OPENAI_API_KEY.",
    "Uploaded video requires derived frame evidence before Vision processing.",
    "ZIP archive entry count, expanded size, and per-entry size are bounded.",
    "No uploaded file is persisted by this runtime.",
    "Planner dispatch and trading execution remain disabled.",
  ];

  const success = failedCount === 0 && pendingCount === 0;

  return {
    success,
    code: success
      ? "C164_7_INPUT_UNDERSTANDING_COMPLETED"
      : "C164_7_INPUT_UNDERSTANDING_PARTIAL",
    inputs: processedInputs,
    understoodCount,
    pendingCount,
    failedCount,
    limitations,
    safetyBoundary: {
      plannerDispatched: false,
      tradingExecuted: false,
    },
    generatedAt,
  };
}
