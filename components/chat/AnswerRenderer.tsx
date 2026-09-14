“use client”;

interface AnswerRendererProps {
content: string;
}

type Block =
| {
type: “heading”;
text: string;
}
| {
type: “paragraph”;
text: string;
}
| {
type: “bullet”;
text: string;
}
| {
type: “number”;
text: string;
}
| {
type: “divider”;
};

function cleanInline(value: string): string {
return value
.replace(/**(.?)**/g, “$1”)
.replace(/__(.?)__/g, “$1”)
.replace(/([^]+)`/g, “$1”)
.replace(/[([^]]+)](([^)]+))/g, “$1”)
.trim();
}

function isTableSeparator(line: string): boolean {
const normalized = line
.replace(/\s/g, “”)
.replace(/|/g, “”);

return (
normalized.length > 0 &&
/^[-:]+$/u.test(normalized)
);
}

function isTableLine(line: string): boolean {
return (
line.includes(”|”) &&
line.split(”|”).filter(Boolean).length >= 2
);
}

function normalizeContent(content: string): string {
const lines = content
.replace(/\r\n/g, “\n”)
.replace(/\r/g, “\n”)
.split(”\n”);

const output: string[] = [];
let tableMode = false;

for (const rawLine of lines) {
const line = rawLine.trim();

if (isTableSeparator(line)) {
  tableMode = true;
  continue;
}
if (isTableLine(line)) {
  if (!tableMode) {
    const cells = line
      .split("|")
      .map((item) => cleanInline(item))
      .filter(Boolean);
    if (cells.length > 0) {
      output.push(
        cells
          .map((cell) => `• ${cell}`)
          .join("\n"),
      );
    }
  }
  continue;
}
tableMode = false;
output.push(rawLine);

}

return output.join(”\n”);
}

function parseBlocks(content: string): Block[] {
const normalized = normalizeContent(content);

const lines = normalized.split(”\n”);
const blocks: Block[] = [];

let paragraph: string[] = [];

function flushParagraph() {
const text = paragraph
.join(” “)
.replace(/\s+/g, “ “)
.trim();

if (text) {
  blocks.push({
    type: "paragraph",
    text,
  });
}
paragraph = [];

}

for (const rawLine of lines) {
const line = rawLine.trim();

if (!line) {
  flushParagraph();
  continue;
}
if (/^#{1,3}\s+/u.test(line)) {
  flushParagraph();
  blocks.push({
    type: "heading",
    text: cleanInline(
      line.replace(/^#{1,3}\s+/u, ""),
    ),
  });
  continue;
}
if (/^[-*•]\s+/u.test(line)) {
  flushParagraph();
  blocks.push({
    type: "bullet",
    text: cleanInline(
      line.replace(/^[-*•]\s+/u, ""),
    ),
  });
  continue;
}
if (/^\d+[.)]\s+/u.test(line)) {
  flushParagraph();
  blocks.push({
    type: "number",
    text: cleanInline(
      line.replace(/^\d+[.)]\s+/u, ""),
    ),
  });
  continue;
}
if (/^---+$/u.test(line)) {
  flushParagraph();
  blocks.push({
    type: "divider",
  });
  continue;
}
paragraph.push(line);

}

flushParagraph();

return blocks;
}

function renderInline(text: string): React.ReactNode {
const parts = text.split(
/(**[^*]+**|[^_]+|[^]+`)/g,
);

return parts.map((part, index) => {
if (
part.startsWith(””) &&
part.endsWith(””)
) {
return (
{part.slice(2, -2)}
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
      }}
    >
      {part.slice(1, -1)}
    </code>
  );
}
return <span key={index}>{part}</span>;

});
}

function headingTone(text: string): {
background: string;
border: string;
} {
const value = text.toLowerCase();

if (
value.includes(“结论”) ||
value.includes(“conclusion”) ||
value.includes(“結論”)
) {
return {
background: “#f8fafc”,
border: “#cbd5e1”,
};
}

if (
value.includes(“可信度”) ||
value.includes(“confidence”) ||
value.includes(“信頼度”)
) {
return {
background: “#f8fafc”,
border: “#cbd5e1”,
};
}

return {
background: “#ffffff”,
border: “#e5e7eb”,
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
display: “flex”,
flexDirection: “column”,
gap: 10,
width: “100%”,
}}
>
{blocks.map((block, index) => {
if (block.type === “divider”) {
return (
<div
key={index}
style={{
height: 1,
background: “#e5e7eb”,
margin: “4px 0”,
}}
/>
);
}

    if (block.type === "heading") {
      const tone = headingTone(
        block.text,
      );
      return (
        <div
          key={index}
          style={{
            marginTop:
              index === 0 ? 0 : 8,
            padding:
              "9px 11px",
            borderLeft:
              "3px solid #111827",
            border:
              `1px solid ${tone.border}`,
            borderRadius: 9,
            background:
              tone.background,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing:
              "-0.01em",
          }}
        >
          {renderInline(
            block.text,
          )}
        </div>
      );
    }
    if (block.type === "bullet") {
      return (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems:
              "flex-start",
            gap: 9,
            padding:
              "3px 2px",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              flexShrink: 0,
              marginTop: 9,
              borderRadius:
                "50%",
              background:
                "#64748b",
            }}
          />
          <span>
            {renderInline(
              block.text,
            )}
          </span>
        </div>
      );
    }
    if (block.type === "number") {
      const match =
        block.text.match(
          /^\d+[.)]\s*/u,
        );
      const number =
        match?.[0]
          .replace(/[.)\s]/g, "") ??
        "";
      const text =
        match
          ? block.text
              .slice(
                match[0].length,
              )
              .trim()
          : block.text;
      return (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems:
              "flex-start",
            gap: 9,
            padding:
              "3px 2px",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              flexShrink: 0,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              borderRadius:
                "50%",
              background:
                "#f1f5f9",
              border:
                "1px solid #cbd5e1",
              color:
                "#334155",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {number}
          </span>
          <span>
            {renderInline(
              text,
            )}
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
          lineHeight: 1.7,
          whiteSpace:
            "pre-wrap",
          overflowWrap:
            "anywhere",
        }}
      >
        {renderInline(
          block.text,
        )}
      </p>
    );
  })}
</div>

);
}
