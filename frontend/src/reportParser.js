// ==========================================
// Turns the AI-generated markdown-style report
// (#, ##, ###, "- " lists, **bold**) into a
// structured tree the UI can render graphically
// instead of a single <pre> text block.
// ==========================================

const SECTION_ICON_RULES = [
  { match: /consolidated|work and activity/i, icon: "layers" },
  { match: /week[- ]by[- ]week|weekly/i, icon: "calendar" },
  { match: /findings|achievements/i, icon: "check" },
  { match: /challenges/i, icon: "alert" },
  { match: /recommendation|next steps/i, icon: "arrow" },
  { match: /conclusion/i, icon: "flag" },
  { match: /overview/i, icon: "compass" },
];

export function iconForSection(title = "") {
  const rule = SECTION_ICON_RULES.find((r) => r.match.test(title));
  return rule ? rule.icon : "doc";
}

// Splits "## 3. WEEK-BY-WEEK PROGRESS" -> { number: "3", title: "WEEK-BY-WEEK PROGRESS" }
function splitNumberedTitle(raw) {
  const match = raw.match(/^(\d+)[.)]?\s*(.*)$/);
  if (match) {
    return { number: match[1], title: match[2].trim() || raw.trim() };
  }
  return { number: null, title: raw.trim() };
}

export function parseReport(rawText) {
  const text = String(rawText || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  let docTitle = "";
  const sections = [];

  let currentSection = null;
  let currentSub = null;
  let listBuffer = [];
  let paraBuffer = [];

  const flushParagraph = (target) => {
    if (paraBuffer.length > 0) {
      const joined = paraBuffer.join(" ").trim();
      if (joined) target.push({ type: "p", text: joined });
      paraBuffer = [];
    }
  };

  const flushList = (target) => {
    if (listBuffer.length > 0) {
      target.push({ type: "list", items: [...listBuffer] });
      listBuffer = [];
    }
  };

  const currentBlocks = () => {
    if (!currentSection) return null;
    return currentSub ? currentSub.blocks : currentSection.blocks;
  };

  const flushAllBuffers = () => {
    const target = currentBlocks();
    if (target) {
      flushParagraph(target);
      flushList(target);
    } else {
      paraBuffer = [];
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Top document title: "# MONTHLY PROGRESS REPORT"
    if (/^#\s+/.test(line)) {
      flushAllBuffers();
      docTitle = line.replace(/^#\s+/, "").trim();
      continue;
    }

    // Section heading: "## 2. CONSOLIDATED WORK..."
    if (/^##\s+/.test(line)) {
      flushAllBuffers();
      const { number, title } = splitNumberedTitle(
        line.replace(/^##\s+/, "")
      );
      currentSection = {
        type: "section",
        number: number || String(sections.length + 1),
        title,
        icon: iconForSection(title),
        blocks: [],
      };
      currentSub = null;
      sections.push(currentSection);
      continue;
    }

    // Subsection heading: "### Week 1" / "### Network and Bandwidth Activity"
    if (/^###\s+/.test(line)) {
      flushAllBuffers();
      if (!currentSection) {
        currentSection = {
          type: "section",
          number: String(sections.length + 1),
          title: "Report",
          icon: "doc",
          blocks: [],
        };
        sections.push(currentSection);
      }
      currentSub = {
        type: "subsection",
        title: line.replace(/^###\s+/, "").trim(),
        blocks: [],
      };
      currentSection.blocks.push(currentSub);
      continue;
    }

    // Divider lines like "====" or "----" from the raw prompt echo — skip
    if (/^[-=]{3,}$/.test(line)) {
      continue;
    }

    // Bullet list item
    if (/^[-*•]\s+/.test(line)) {
      const target = currentBlocks();
      flushParagraph(target || []);
      listBuffer.push(line.replace(/^[-*•]\s+/, "").trim());
      continue;
    }

    // Blank line -> paragraph/list break
    if (line === "") {
      const target = currentBlocks();
      if (target) {
        flushParagraph(target);
        flushList(target);
      } else {
        paraBuffer = [];
        listBuffer = [];
      }
      continue;
    }

    // Otherwise: accumulate into paragraph (finish any pending list first)
    const target = currentBlocks();
    if (target) flushList(target);
    paraBuffer.push(line);
  }

  flushAllBuffers();

  // If the model never used markdown headers at all, treat the whole
  // thing as one section so it still renders gracefully.
  if (sections.length === 0 && text.trim()) {
    sections.push({
      type: "section",
      number: "1",
      title: "Monthly Report",
      icon: "doc",
      blocks: [{ type: "p", text: text.trim() }],
    });
  }

  return { docTitle: docTitle || "Monthly Progress Report", sections };
}

// Splits inline "**bold**" markers into plain string/bold segments,
// e.g. "Peak usage **42%**" -> ["Peak usage ", {bold:"42%"}]
export function splitInlineBold(text) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? { bold: part } : part
  );
}

export function countWeeks(sections) {
  let count = 0;
  for (const s of sections) {
    for (const b of s.blocks) {
      if (b.type === "subsection" && /^week\s*\d+/i.test(b.title)) {
        count += 1;
      }
    }
  }
  return count;
}

// Recursively sums word counts across a section's paragraphs, list
// items, and any nested subsections — used to size the overview bars.
export function sectionWordCount(section) {
  let total = 0;
  const walk = (blocks) => {
    for (const b of blocks) {
      if (b.type === "p") total += wordCount(b.text);
      else if (b.type === "list") {
        for (const item of b.items) total += wordCount(item);
      } else if (b.type === "subsection") {
        walk(b.blocks);
      }
    }
  };
  walk(section.blocks);
  return total;
}

export function wordCount(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
