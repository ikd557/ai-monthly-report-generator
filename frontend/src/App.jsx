import { useState, useRef } from "react";
import { motion } from "framer-motion";
import "./App.css";
import {
  UploadIcon,
  SparkleIcon,
  CompassIcon,
  LayersIcon,
  CalendarIcon,
  CheckBadgeIcon,
  AlertIcon,
  ArrowNextIcon,
  FlagIcon,
  DocIcon,
  CopyIcon,
  DownloadIcon,
  TrashIcon,
  ShieldIcon,
  ClockIcon,
  TargetIcon,
  BuildingIcon,
  StarIcon,
  FolderIcon,
  BotIcon,
  PercentIcon,
} from "./icons.jsx";
import {
  parseReport,
  splitInlineBold,
  countWeeks,
  wordCount,
  readingTime,
  colorForSection,
  sectionWordCount,
  computeCompletion,
  computeQuality,
  computeContentBreakdown,
  computeWeeklyVolume,
  computeTopKeywords,
} from "./reportParser.js";
import { exportDashboardPdf } from "./pdfExport.js";

const SECTION_ICONS = {
  compass: CompassIcon,
  layers: LayersIcon,
  calendar: CalendarIcon,
  check: CheckBadgeIcon,
  alert: AlertIcon,
  arrow: ArrowNextIcon,
  flag: FlagIcon,
  doc: DocIcon,
};

const FILE_BADGES = {
  pdf: { label: "PDF", className: "badge-pdf" },
  docx: { label: "DOC", className: "badge-docx" },
  txt: { label: "TXT", className: "badge-txt" },
};

const EXPECTED_WEEKS = 4;

function getExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

// A small presentational card used across the KPI grid — kept local to
// this file since it's only ever used here.
function KpiCard({ icon: Icon, color, label, value, sub, index }) {
  return (
    <motion.div
      className={`kpi-card kpi-${color}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <div className="kpi-icon">
        <Icon />
      </div>
      <div className="kpi-body">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
        {sub ? <span className="kpi-sub">{sub}</span> : null}
      </div>
    </motion.div>
  );
}

// A small "at a glance" chart panel shown only inside the Conclusion
// section: a completion-percentage donut ring, plus a horizontal bar
// chart comparing how much content each section carries. Pure CSS/SVG —
// no charting library.
function ConclusionCharts({ sections, maxWords, completionPct, quality, ringColor }) {
  return (
    <motion.div
      className="conclusion-charts"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.35 }}
    >
      <h5 className="conclusion-charts-title">Report Summary at a Glance</h5>
      <div className="conclusion-charts-grid">
        <div className="donut-block">
          <div
            className="donut-ring"
            style={{
              "--pct": completionPct,
              "--ring-color": `var(--${ringColor})`,
            }}
          >
            <div className="donut-center">
              <span className="donut-value">{completionPct}%</span>
              <span className="donut-caption">Complete</span>
            </div>
          </div>
          <div className="donut-grade">
            <span className="donut-grade-badge">{quality.grade}</span>
            <span>{quality.label} quality</span>
          </div>
        </div>

        <div className="bars-chart">
          {sections.map((s) => {
            const pct = Math.max(6, Math.round((s.words / maxWords) * 100));
            return (
              <div className="bar-row" key={s.number + s.title}>
                <span className={`bar-dot bar-dot-${s.color}`} />
                <span className="bar-name">{s.title}</span>
                <div className="bar-track">
                  <motion.div
                    className={`bar-fill bar-fill-${s.color}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="bar-value">{s.words}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// The "read the graph, not the report" panel: sits right under the KPI
// grid so it's the first thing anyone sees. Unlike the KPI cards (which
// describe the report's structure — word count, section coverage), this
// reads the actual bullet content so someone can understand what
// happened this month without opening a single section.
function WorkContentOverview({ breakdown, weeklyVolume, keywords }) {
  const segments = [
    { key: "wins", label: "Achievements", color: "green", value: breakdown.wins },
    { key: "problems", label: "Challenges", color: "red", value: breakdown.problems },
    { key: "planned", label: "Next Steps", color: "teal", value: breakdown.planned },
  ];
  const totalBreakdown = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const maxWeekWords = Math.max(...weeklyVolume.map((w) => w.words), 1);
  const maxKeywordCount = Math.max(...keywords.map((k) => k.count), 1);

  return (
    <div className="content-overview-card">
      <div className="content-overview-header">
        <h4>This Month&rsquo;s Work &mdash; At a Glance</h4>
        <p>Skip the reading. See what actually happened this month.</p>
      </div>

      <div className="content-overview-grid">
        <div className="overview-panel">
          <span className="overview-panel-title">Work Breakdown</span>
          <div className="stacked-bar">
            {segments.map((seg) =>
              seg.value ? (
                <motion.div
                  key={seg.key}
                  className={`stacked-bar-segment stacked-bar-${seg.color}`}
                  initial={{ width: 0 }}
                  whileInView={{
                    width: `${Math.round((seg.value / totalBreakdown) * 100)}%`,
                  }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5 }}
                />
              ) : null
            )}
          </div>
          <div className="stacked-bar-legend">
            {segments.map((seg) => (
              <span className="legend-item" key={seg.key}>
                <span className={`legend-dot legend-dot-${seg.color}`} />
                {seg.label} <strong>{seg.value}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="overview-panel">
          <span className="overview-panel-title">Work Volume by Week</span>
          {weeklyVolume.length === 0 ? (
            <p className="overview-empty">No weekly breakdown detected.</p>
          ) : (
            <div className="week-volume-chart">
              {weeklyVolume.map((w) => {
                const pct = Math.max(
                  6,
                  Math.round((w.words / maxWeekWords) * 100)
                );
                return (
                  <div className="week-volume-col" key={w.week}>
                    <span className="week-volume-value">{w.words}</span>
                    <div className="week-volume-track">
                      <motion.div
                        className="week-volume-fill"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${pct}%` }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="week-volume-label">W{w.week}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overview-panel">
          <span className="overview-panel-title">What This Month Was About</span>
          {keywords.length === 0 ? (
            <p className="overview-empty">Not enough text to detect themes.</p>
          ) : (
            <div className="keyword-cloud">
              {keywords.map((k) => {
                const scale = 0.82 + (k.count / maxKeywordCount) * 0.6;
                return (
                  <span
                    className="keyword-pill"
                    key={k.word}
                    style={{ fontSize: `${scale}rem` }}
                  >
                    {k.word}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [reportMeta, setReportMeta] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const coverRef = useRef(null);

  // ==========================================
  // BACKEND URL
  // ==========================================

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // ==========================================
  // FILE SELECTION
  // ==========================================

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setError("");

    if (selectedFiles.length === 0) {
      return;
    }

    if (files.length + selectedFiles.length > 4) {
      setError("You can upload a maximum of 4 weekly reports.");
      event.target.value = "";
      return;
    }

    const allowedExtensions = [".pdf", ".docx", ".txt"];

    const invalidFile = selectedFiles.find((file) => {
      const extension = "." + file.name.split(".").pop().toLowerCase();
      return !allowedExtensions.includes(extension);
    });

    if (invalidFile) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > 10 * 1024 * 1024
    );

    if (oversizedFile) {
      setError(`${oversizedFile.name} is larger than 10 MB.`);
      event.target.value = "";
      return;
    }

    setFiles((previousFiles) => [...previousFiles, ...selectedFiles]);
    event.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );
    setError("");
  };

  // ==========================================
  // GENERATE REPORT
  // ==========================================

  const generateReport = async () => {
    if (files.length === 0) {
      setError("Please upload at least one weekly report.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");
    setReportMeta(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("reports", file));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      const response = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Backend returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || `Server error: ${response.status}`
        );
      }

      if (data?.success) {
        setReport(String(data.report || ""));
        setGeneratedAt(new Date());
        setReportMeta({
          aiProvider: data.aiProvider || "Google Gemini",
          model: data.model || "",
          filesProcessed: data.filesProcessed || files.length,
        });
        setError("");
      } else {
        setError(
          String(data?.error || data?.message || "Failed to generate report.")
        );
      }
    } catch (error) {
      let errorMessage = "Something went wrong while generating the report.";

      if (error.name === "AbortError") {
        errorMessage = "The request took too long. Please try again.";
      } else if (
        error instanceof TypeError &&
        error.message.toLowerCase().includes("fetch")
      ) {
        errorMessage = `Cannot connect to backend at ${BACKEND_URL}.`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      alert("Monthly report copied to clipboard!");
    } catch {
      setError("Could not copy the report.");
    }
  };

  const exportPdf = async () => {
    if (!report || !parsed) return;
    setExportingPdf(true);
    try {
      await exportDashboardPdf({
        coverEl: coverRef.current,
        parsed,
        meta: {
          docTitle: parsed.docTitle,
          filesProcessed: reportMeta?.filesProcessed ?? files.length,
          aiProvider: reportMeta?.aiProvider || "Google Gemini",
          words,
          readingTime: readingMin,
          weeksMerged,
          completionPct,
          quality,
          timeline,
        },
      });
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setReport("");
    setReportMeta(null);
    setError("");
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ==========================================
  // REPORT STRUCTURE (parsed once per report)
  // ==========================================

  const parsed = report ? parseReport(report) : null;
  const weeksMerged = parsed ? countWeeks(parsed.sections) : 0;
  const words = report ? wordCount(report) : 0;
  const readingMin = report ? readingTime(words) : 0;
  const completionPct = parsed ? computeCompletion(parsed.sections) : 0;
  const quality = parsed
    ? computeQuality(parsed.sections, words, completionPct)
    : { score: 0, label: "\u2014", grade: "\u2014" };

  const weeksComplete = Math.min(
    weeksMerged || reportMeta?.filesProcessed || files.length,
    EXPECTED_WEEKS
  );
  const timeline = Array.from({ length: EXPECTED_WEEKS }, (_, i) => ({
    label: `Week ${i + 1}`,
    complete: i < weeksComplete,
  }));

  const completionColor =
    completionPct >= 80 ? "green" : completionPct >= 50 ? "orange" : "red";

  const sectionStats = parsed
    ? parsed.sections.map((s) => ({
        number: s.number,
        title: s.title,
        color: colorForSection(s.icon),
        words: sectionWordCount(s),
      }))
    : [];
  const maxSectionWords = Math.max(...sectionStats.map((s) => s.words), 1);

  const contentBreakdown = parsed
    ? computeContentBreakdown(parsed.sections)
    : { wins: 0, problems: 0, planned: 0 };
  const weeklyVolume = parsed ? computeWeeklyVolume(parsed.sections) : [];
  const topKeywords = parsed ? computeTopKeywords(parsed.sections) : [];

  const kpiCards = parsed
    ? [
        {
          icon: FolderIcon,
          color: "blue",
          label: "Files Processed",
          value: reportMeta?.filesProcessed ?? files.length,
        },
        {
          icon: BotIcon,
          color: "purple",
          label: "AI Provider",
          value: reportMeta?.aiProvider || "Google Gemini",
          sub: reportMeta?.model,
        },
        {
          icon: TargetIcon,
          color: "green",
          label: "Completion Status",
          value: "Completed",
        },
        {
          icon: LayersIcon,
          color: "teal",
          label: "Generated Sections",
          value: parsed.sections.length,
        },
        {
          icon: DocIcon,
          color: "orange",
          label: "Word Count",
          value: words.toLocaleString(),
        },
        {
          icon: ClockIcon,
          color: "gray",
          label: "Reading Time",
          value: `${readingMin} min`,
        },
        {
          icon: StarIcon,
          color: "gold",
          label: "Report Quality",
          value: quality.grade,
          sub: quality.label,
        },
        {
          icon: PercentIcon,
          color: completionColor,
          label: "Completion",
          value: `${completionPct}%`,
        },
      ]
    : [];

  // ==========================================
  // INLINE TEXT RENDER (handles **bold**)
  // ==========================================

  const renderInline = (text) =>
    splitInlineBold(text).map((part, i) =>
      typeof part === "string" ? (
        <span key={i}>{part}</span>
      ) : (
        <strong key={i}>{part.bold}</strong>
      )
    );

  const renderBlocks = (blocks) =>
    blocks.map((block, i) => {
      if (block.type === "p") {
        return (
          <p className="block-p" key={i}>
            {renderInline(block.text)}
          </p>
        );
      }
      if (block.type === "list") {
        return (
          <ul className="block-list" key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      }
      if (block.type === "subsection") {
        const isWeek = /^week\s*\d+/i.test(block.title);
        return (
          <div
            className={isWeek ? "subsection week-node" : "subsection"}
            key={i}
          >
            <h4>{block.title}</h4>
            {renderBlocks(block.blocks)}
          </div>
        );
      }
      return null;
    });

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <ShieldIcon />
          </div>
          <div>
            <h1>AI Monthly Report Generator</h1>
            <p>Weekly reports in. One structured monthly report out.</p>
          </div>
        </div>
        <span className="ai-badge">
          <SparkleIcon /> Powered by Gemini AI
        </span>
      </header>

      <main className="container">
        <section className="hero">
          <span className="hero-eyebrow">Report automation</span>
          <h2>
            Turn a month of weekly notes into <span>one clear report</span>
          </h2>
          <p>
            Upload your weekly reports and let AI merge your progress,
            achievements, challenges, and priorities into a single monthly
            report &mdash; rendered here as a structured, readable dossier
            instead of a wall of text.
          </p>

          <ol className="hero-steps">
            <li>
              <span className="step-num">01</span>
              <span className="step-label">Upload weekly reports</span>
            </li>
            <li>
              <span className="step-num">02</span>
              <span className="step-label">AI merges &amp; verifies facts</span>
            </li>
            <li>
              <span className="step-num">03</span>
              <span className="step-label">Read, copy, or export as PDF</span>
            </li>
          </ol>
        </section>

        <section className="card">
          <div className="section-title">
            <div>
              <h3>Upload Weekly Reports</h3>
              <p>PDF, DOCX, or TXT &middot; up to 4 files &middot; 10 MB each</p>
            </div>
            {files.length > 0 && (
              <span className="file-count">{files.length}/4 selected</span>
            )}
          </div>

          <label className="upload-area">
            <div className="upload-icon">
              <UploadIcon />
            </div>
            <strong>Click to upload reports</strong>
            <p>or drag files into this area</p>
            <span>PDF, DOCX, or TXT &middot; maximum 4 files &middot; 10 MB each</span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={files.length >= 4 || loading}
            />
          </label>

          {files.length > 0 && (
            <div className="file-list">
              <div className="file-list-header">
                <h4>Selected Reports</h4>
                <button type="button" onClick={clearAll} disabled={loading}>
                  Clear all
                </button>
              </div>

              {files.map((file, index) => {
                const ext = getExtension(file.name);
                const badge = FILE_BADGES[ext] || {
                  label: ext.toUpperCase(),
                  className: "badge-generic",
                };
                return (
                  <div className="file-item" key={`${file.name}-${index}`}>
                    <div className="file-info">
                      <span className={`file-badge ${badge.className}`}>
                        {badge.label}
                      </span>
                      <div>
                        <strong>{file.name}</strong>
                        <small>{formatFileSize(file.size)}</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                      aria-label={`Remove ${file.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertIcon />
              <span>{String(error)}</span>
            </div>
          )}

          <button
            className="generate-button"
            type="button"
            onClick={generateReport}
            disabled={loading || files.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Generating monthly report...
              </>
            ) : (
              <>
                <SparkleIcon />
                Generate Monthly Report
              </>
            )}
          </button>

          <p className="upload-note">
            AI will merge all uploaded weekly reports into one detailed
            monthly report.
          </p>
        </section>

        {report && parsed && (
          <section className="card report-section">
            {/* ============ DASHBOARD BANNER (also the PDF cover) ============ */}
            <div className="dashboard-banner" ref={coverRef}>
              <div className="banner-row">
                <div className="banner-logo">
                  <BuildingIcon />
                </div>
                <div className="banner-titles">
                  <h3>Monthly Report Dashboard</h3>
                  <p>
                    {parsed.docTitle}
                    {generatedAt
                      ? ` \u00b7 Generated ${generatedAt.toLocaleString()}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="banner-badges">
                <span className="badge badge-glass">
                  <SparkleIcon /> AI Generated
                </span>
                <span className="badge badge-glass badge-glass-status">
                  <CheckBadgeIcon /> Status: Completed
                </span>
              </div>
            </div>

            <div className="report-actions-row">
              <button type="button" onClick={copyReport}>
                <CopyIcon /> Copy Report
              </button>
              <button
                type="button"
                className="export-pdf-button"
                onClick={exportPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <span className="spinner spinner-dark"></span>
                ) : (
                  <DownloadIcon />
                )}
                {exportingPdf ? "Preparing PDF..." : "Export as PDF"}
              </button>
            </div>

            {/* ============ KPI GRID ============ */}
            <div className="kpi-grid">
              {kpiCards.map((kpi, i) => (
                <KpiCard key={kpi.label} index={i} {...kpi} />
              ))}
            </div>

            {/* ============ CONTENT-AT-A-GLANCE PANEL ============ */}
            <WorkContentOverview
              breakdown={contentBreakdown}
              weeklyVolume={weeklyVolume}
              keywords={topKeywords}
            />

            {/* ============ WEEKLY TIMELINE ============ */}
            <div className="timeline-card">
              <h4>Weekly Completion Timeline</h4>
              <div className="timeline">
                {timeline.map((week, i) => (
                  <div className="timeline-step" key={week.label}>
                    <div className="timeline-node-row">
                      <motion.div
                        className={`timeline-node ${
                          week.complete ? "is-complete" : ""
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.08, duration: 0.3 }}
                      />
                      {i < timeline.length - 1 && (
                        <div className="timeline-line">
                          <motion.div
                            className="timeline-line-fill"
                            initial={{ width: 0 }}
                            animate={{
                              width: week.complete ? "100%" : "0%",
                            }}
                            transition={{ delay: i * 0.08 + 0.15, duration: 0.4 }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="timeline-label">{week.label}</span>
                    <span
                      className={`timeline-status ${
                        week.complete ? "is-complete" : "is-pending"
                      }`}
                    >
                      {week.complete ? "Complete" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ============ SECTION CARDS ============ */}
            <div className="report-content">
              {parsed.sections.map((section, i) => {
                const Icon = SECTION_ICONS[section.icon] || DocIcon;
                const color = colorForSection(section.icon);
                const size = sectionWordCount(section);
                const barPct = Math.max(
                  8,
                  Math.round((size / maxSectionWords) * 100)
                );
                const isConclusion = section.icon === "flag";
                return (
                  <motion.details
                    className={`report-block report-block-${color}`}
                    key={i}
                    open={i < 2}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * i }}
                    whileHover={{ y: -2 }}
                  >
                    <summary>
                      <span className="report-block-icon">
                        <Icon />
                      </span>
                      <span className="report-block-heading">
                        <span className="report-block-number">
                          {section.number}
                        </span>
                        {section.title}
                      </span>
                      <span className="report-block-chevron">
                        <ArrowNextIcon />
                      </span>
                    </summary>
                    <div className="report-block-body">
                      <div className="activity-bar">
                        <div
                          className="activity-bar-fill"
                          style={{ width: `${barPct}%` }}
                        />
                        <span className="activity-bar-label">
                          {size.toLocaleString()} words
                        </span>
                      </div>
                      {renderBlocks(section.blocks)}
                      {isConclusion && (
                        <ConclusionCharts
                          sections={sectionStats}
                          maxWords={maxSectionWords}
                          completionPct={completionPct}
                          quality={quality}
                          ringColor={completionColor}
                        />
                      )}
                    </div>
                  </motion.details>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer>
        <p>AI Monthly Report Generator</p>
      </footer>
    </div>
  );
}

export default App;
