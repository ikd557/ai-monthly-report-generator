// ==========================================================
// Turns the parsed monthly report + dashboard metrics into a
// business-formatted PDF.
//
// html2canvas is used once, to snapshot the live cover banner
// (title, logo placeholder, generated date, AI/status badges)
// so the PDF's cover page matches what's on screen.
//
// Everything after that — executive summary, the stats table,
// every section, the weekly timeline, headers/footers, and page
// numbers — is drawn with jsPDF's own text/vector APIs. That's
// deliberate: text stays sharp and selectable instead of being a
// giant screenshot, which is what makes it read as a real report
// rather than a picture of a webpage.
// ==========================================================

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 34;

const COLOR = {
  ink: [14, 20, 32],
  inkSoft: [65, 76, 96],
  muted: [107, 118, 134],
  line: [225, 229, 235],
  accent: [15, 107, 92],
  accent2: [184, 114, 46],
};

const CATEGORY_RGB = {
  compass: [47, 111, 237],
  layers: [124, 92, 255],
  calendar: [184, 114, 46],
  check: [31, 138, 95],
  alert: [194, 60, 60],
  arrow: [15, 107, 92],
  flag: [107, 118, 134],
  doc: [15, 107, 92],
};

function setColor(doc, method, rgb) {
  doc[method](rgb[0], rgb[1], rgb[2]);
}

function stripInlineMarkup(text) {
  return String(text || "").replace(/\*\*(.+?)\*\*/g, "$1");
}

// Minimal layout cursor shared across all draw helpers below.
function makeCursor(doc) {
  return { doc, y: MARGIN, page: 1 };
}

function newPage(cursor) {
  cursor.doc.addPage();
  cursor.page += 1;
  cursor.y = MARGIN;
}

function ensureSpace(cursor, needed) {
  if (cursor.y + needed > PAGE_H - MARGIN - FOOTER_H) {
    newPage(cursor);
  }
}

function heading(cursor, text, opts = {}) {
  const { size = 13, color = COLOR.ink, before = 18, after = 10 } = opts;
  ensureSpace(cursor, before + size + after);
  cursor.y += before;
  const doc = cursor.doc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  setColor(doc, "setTextColor", color);
  doc.text(text, MARGIN, cursor.y);
  cursor.y += after;
}

function paragraph(cursor, text, opts = {}) {
  const { size = 10, color = COLOR.inkSoft, lineHeight = 14, indent = 0 } =
    opts;
  const doc = cursor.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  setColor(doc, "setTextColor", color);
  const lines = doc.splitTextToSize(
    stripInlineMarkup(text),
    CONTENT_W - indent
  );
  lines.forEach((line) => {
    ensureSpace(cursor, lineHeight);
    doc.text(line, MARGIN + indent, cursor.y);
    cursor.y += lineHeight;
  });
}

function bulletList(cursor, items, opts = {}) {
  const { size = 10, color = COLOR.inkSoft, lineHeight = 14, indent = 10 } =
    opts;
  const doc = cursor.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  items.forEach((item) => {
    const lines = doc.splitTextToSize(
      stripInlineMarkup(item),
      CONTENT_W - indent - 12
    );
    lines.forEach((line, i) => {
      ensureSpace(cursor, lineHeight);
      setColor(doc, "setTextColor", color);
      if (i === 0) {
        setColor(doc, "setTextColor", COLOR.accent);
        doc.text("\u2022", MARGIN + indent, cursor.y);
        setColor(doc, "setTextColor", color);
      }
      doc.text(line, MARGIN + indent + 12, cursor.y);
      cursor.y += lineHeight;
    });
  });
}

function subheading(cursor, text) {
  ensureSpace(cursor, 24);
  cursor.y += 10;
  const doc = cursor.doc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setColor(doc, "setTextColor", COLOR.accent2);
  doc.text(text.toUpperCase(), MARGIN, cursor.y);
  cursor.y += 12;
}

function renderBlocks(cursor, blocks) {
  blocks.forEach((block) => {
    if (block.type === "p") {
      paragraph(cursor, block.text);
      cursor.y += 4;
    } else if (block.type === "list") {
      bulletList(cursor, block.items);
      cursor.y += 4;
    } else if (block.type === "subsection") {
      subheading(cursor, block.title);
      renderBlocks(cursor, block.blocks);
    }
  });
}

function sectionDivider(cursor, rgb) {
  const doc = cursor.doc;
  ensureSpace(cursor, 4);
  setColor(doc, "setDrawColor", rgb);
  doc.setLineWidth(2.2);
  doc.line(MARGIN, cursor.y, MARGIN + 34, cursor.y);
  cursor.y += 14;
}

function statRow(cursor, pairs) {
  // A simple 2-column label/value table, drawn with rects + text.
  const doc = cursor.doc;
  const rowH = 30;
  const colW = CONTENT_W / 2;
  ensureSpace(cursor, Math.ceil(pairs.length / 2) * rowH + 6);

  pairs.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colW;
    const y = cursor.y + row * rowH;

    setColor(doc, "setFillColor", [244, 246, 248]);
    doc.roundedRect(x, y, colW - 8, rowH - 6, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(doc, "setTextColor", COLOR.muted);
    doc.text(String(label).toUpperCase(), x + 10, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    setColor(doc, "setTextColor", COLOR.ink);
    doc.text(String(value), x + 10, y + 22);
  });

  cursor.y += Math.ceil(pairs.length / 2) * rowH + 10;
}

function addRunningHeader(doc, pageNum, docTitle) {
  if (pageNum === 1) return;
  setColor(doc, "setTextColor", COLOR.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(docTitle, MARGIN, 30);
  setColor(doc, "setDrawColor", COLOR.line);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 36, PAGE_W - MARGIN, 36);
}

function addFooters(doc, meta) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    setColor(doc, "setDrawColor", COLOR.line);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, PAGE_H - MARGIN, PAGE_W - MARGIN, PAGE_H - MARGIN);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(doc, "setTextColor", COLOR.muted);
    doc.text("AI Monthly Report Generator", MARGIN, PAGE_H - MARGIN + 16);

    doc.text(
      `Page ${p} of ${total}`,
      PAGE_W - MARGIN,
      PAGE_H - MARGIN + 16,
      { align: "right" }
    );

    addRunningHeader(doc, p, meta.docTitle);
  }
}

export async function exportDashboardPdf({ coverEl, parsed, meta }) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const cursor = makeCursor(doc);

  // ---------- Cover page ----------
  if (coverEl) {
    try {
      const canvas = await html2canvas(coverEl, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgW = CONTENT_W;
      const imgH = (canvas.height / canvas.width) * imgW;
      doc.addImage(imgData, "PNG", MARGIN, cursor.y, imgW, imgH);
      cursor.y += imgH + 26;
    } catch {
      // If the snapshot fails for any reason, fall back to a plain
      // text cover rather than aborting the whole export.
      cursor.y += 10;
    }
  }

  heading(cursor, "Executive Summary", { before: 0, size: 15 });
  sectionDivider(cursor, COLOR.accent);
  const overview = parsed.sections.find((s) => s.icon === "compass");
  const firstParagraph =
    (overview?.blocks || []).find((b) => b.type === "p")?.text ||
    `This report consolidates ${meta.filesProcessed} weekly report${
      meta.filesProcessed === 1 ? "" : "s"
    } into a single monthly summary covering ${
      parsed.sections.length
    } report sections.`;
  paragraph(cursor, firstParagraph);

  cursor.y += 6;
  statRow(cursor, [
    ["Files Processed", meta.filesProcessed],
    ["AI Provider", meta.aiProvider],
    ["Generated Sections", parsed.sections.length],
    ["Word Count", meta.words.toLocaleString()],
    ["Reading Time", `${meta.readingTime} min`],
    ["Weeks Covered", meta.weeksMerged || "\u2014"],
    ["Report Quality", `${meta.quality.grade} \u00b7 ${meta.quality.label}`],
    ["Completion", `${meta.completionPct}%`],
  ]);

  // ---------- Report sections ----------
  parsed.sections.forEach((section) => {
    const rgb = CATEGORY_RGB[section.icon] || CATEGORY_RGB.doc;
    heading(cursor, `${section.number}. ${section.title}`, { size: 13 });
    sectionDivider(cursor, rgb);
    renderBlocks(cursor, section.blocks);
  });

  // ---------- Weekly timeline recap ----------
  if (meta.timeline && meta.timeline.length) {
    heading(cursor, "Timeline", { size: 13 });
    sectionDivider(cursor, COLOR.accent2);
    meta.timeline.forEach((week) => {
      ensureSpace(cursor, 16);
      const doc2 = cursor.doc;
      setColor(
        doc2,
        "setFillColor",
        week.complete ? COLOR.accent : COLOR.line
      );
      doc2.circle(MARGIN + 4, cursor.y - 3, 3.4, "F");
      doc2.setFont("helvetica", "bold");
      doc2.setFontSize(10);
      setColor(doc2, "setTextColor", COLOR.ink);
      doc2.text(week.label, MARGIN + 16, cursor.y);
      doc2.setFont("helvetica", "normal");
      setColor(doc2, "setTextColor", COLOR.muted);
      doc2.text(
        week.complete ? "Complete" : "Pending",
        MARGIN + 120,
        cursor.y
      );
      cursor.y += 16;
    });
  }

  addFooters(doc, meta);
  doc.save("monthly-report.pdf");
}
