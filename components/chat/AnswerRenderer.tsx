"use client";

import type { ReactNode } from "react";

interface AnswerRendererProps {
  content: string;
}

type TableBlock = {
  type: "table";
  headers: string[];
  rows: string[][];
};

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "number"; number: string; text: string }
  | { type: "divider" }
  | TableBlock;

function cleanInline(value: string): string {
  return value
    .trim()
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .trim();
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanInline(cell))
    .filter((cell) => cell.length > 0);
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);

  return (
    cells.length >= 2 &&
    cells.every((cell) =>
      /^:?-{3,}:?$/u.test(cell.replace(/\s/g, "")),
    )
  );
}

function isPossibleTableRow(line: string): boolean {
  return (
    line.includes("|") &&
    splitTableRow(line).length >= 2
  );
}

function parseTable(
  lines: string[],
  start: number,
): {
  block: TableBlock;
  nextIndex: number;
} | null {
  if (
    start + 1 >= lines.length ||
    !isPossibleTableRow(lines[start]) ||
    !isTableSeparator(lines[start + 1])
  ) {
    return null;
  }

  const headers = splitTableRow(lines[start]);
  const rows: string[][] = [];

  let index = start + 2;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line || !isPossibleTableRow(line)) {
      break;
    }

    const row = splitTableRow(line);

    if (row.length > 0) {
      rows.push(row);
    }

    index += 1;
  }

  return {
    block: {
      type: "table",
      headers,
      rows,
    },
    nextIndex: index,
  };
}

function parseBlocks(content: string): Block[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      blocks.push({
        type: "paragraph",
        text,
      });
    }

    paragraph = [];
  };

  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);

    if (table) {
      flushParagraph();
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    const headingMatch = line.match(
      /^(#{1,4})\s+(.+)$/u,
    );

    if (headingMatch) {
      flushParagraph();

      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: cleanInline(headingMatch[2]),
      });

      index += 1;
      continue;
    }

    const numberMatch = line.match(
      /^(\d+)[.)]\s+(.+)$/u,
    );

    if (numberMatch) {
      flushParagraph();

      blocks.push({
        type: "number",
        number: numberMatch[1],
        text: cleanInline(numberMatch[2]),
      });

      index += 1;
      continue;
    }

    const bulletMatch = line.match(
      /^[-*•]\s+(.+)$/u,
    );

    if (bulletMatch) {
      flushParagraph();

      blocks.push({
        type: "bullet",
        text: cleanInline(bulletMatch[1]),
      });

      index += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();

      blocks.push({
        type: "divider",
      });

      index += 1;
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();

  return blocks;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g,
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("__") &&
      part.endsWith("__")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("`") &&
      part.endsWith("`")
    ) {
      return (
        <code
          key={index}
          style={{
            padding: "2px 5px",
            borderRadius: 5,
            background: "#f1f5f9",
            fontSize: "0.92em",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function headingStyle(level: number) {
  if (level === 1) {
    return {
      fontSize: 18,
      fontWeight: 850,
      marginTop: 8,
    };
  }

  if (level === 2) {
    return {
      fontSize: 16,
      fontWeight: 800,
      marginTop: 7,
    };
  }

  return {
    fontSize: 14,
    fontWeight: 800,
    marginTop: 5,
  };
}

export default function AnswerRenderer({
  content,
}: AnswerRendererProps) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 11,
        width: "100%",
      }}
    >
      {blocks.map((block, index) => {
        if (block.type === "divider") {
          return (
            <div
              key={index}
              style={{
                height: 1,
                background: "#e5e7eb",
                margin: "5px 0",
              }}
            />
          );
        }

        if (block.type === "heading") {
          const style = headingStyle(block.level);

          return (
            <div
              key={index}
              style={{
                ...style,
                lineHeight: 1.35,
                paddingBottom: 2,
                borderBottom:
                  block.level <= 2
                    ? "1px solid #e5e7eb"
                    : "none",
              }}
            >
              {renderInline(block.text)}
            </div>
          );
        }

        if (block.type === "table") {
          return (
            <div
              key={index}
              style={{
                width: "100%",
                overflowX: "auto",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#ffffff",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 520,
                  borderCollapse: "collapse",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <thead>
                  <tr>
                    {block.headers.map(
                      (header, cellIndex) => (
                        <th
                          key={cellIndex}
                          style={{
                            padding:
                              "9px 10px",
                            textAlign: "left",
                            fontWeight: 800,
                            color:
                              "#334155",
                            background:
                              "#f8fafc",
                            borderBottom:
                              "1px solid #e2e8f0",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {renderInline(header)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {block.rows.map(
                    (row, rowIndex) => (
                      <tr key={rowIndex}>
                        {block.headers.map(
                          (_, cellIndex) => (
                            <td
                              key={
                                cellIndex
                              }
                              style={{
                                padding:
                                  "9px 10px",
                                verticalAlign:
                                  "top",
                                borderBottom:
                                  rowIndex ===
                                  block.rows
                                    .length -
                                    1
                                    ? "none"
                                    : "1px solid #f1f5f9",
                                color:
                                  "#475569",
                              }}
                            >
                              {renderInline(
                                row[
                                  cellIndex
                                ] ?? "",
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "bullet") {
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                padding: "2px 0",
                fontSize: 14,
                lineHeight: 1.68,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  flexShrink: 0,
                  marginTop: 9,
                  borderRadius: "50%",
                  background: "#64748b",
                }}
              />

              <span>
                {renderInline(block.text)}
              </span>
            </div>
          );
        }

        if (block.type === "number") {
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 9,
                padding: "2px 0",
                fontSize: 14,
                lineHeight: 1.68,
              }}
            >
              <span
                style={{
                  width: 23,
                  height: 23,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "#f8fafc",
                  border:
                    "1px solid #cbd5e1",
                  color: "#334155",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {block.number}
              </span>

              <span>
                {renderInline(block.text)}
              </span>
            </div>
          );
        }

        return (
          <p
            key={index}
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.72,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              color: "#1e293b",
            }}
          >
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
