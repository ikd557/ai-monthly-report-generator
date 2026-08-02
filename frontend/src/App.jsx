import { useState } from "react";
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
} from "./icons.jsx";
import {
  parseReport,
  splitInlineBold,
  countWeeks,
  wordCount,
  sectionWordCount,
} from "./reportParser.js";

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

function getExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

function App() {
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // BACKEND URL
  // ==========================================

  const BACKEND_URL = "http://localhost:5000";

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
      } catch (jsonError) {
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
        errorMessage =
          "Cannot connect to backend. Make sure your backend server is running on http://localhost:5000.";
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
    } catch (error) {
      setError("Could not copy the report.");
    }
  };

  const downloadReport = () => {
    if (!report) return;
    try {
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "monthly-report.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError("Could not download the report.");
    }
  };

  const clearAll = () => {
    setFiles([]);
    setReport("");
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

  const overview = parsed
    ? parsed.sections.map((section) => ({
        title: section.title,
        number: section.number,
        words: sectionWordCount(section),
      }))
    : [];
  const maxOverviewWords = overview.length
    ? Math.max(...overview.map((s) => s.words), 1)
    : 1;

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
          <SparkleIcon /> Automated &amp; Verified
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
              <span className="step-label">Read, copy, or download</span>
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
            <div className="report-header">
              <div>
                <h3>{parsed.docTitle}</h3>
                <p>
                  {generatedAt
                    ? `Generated \u00b7 ${generatedAt.toLocaleString()}`
                    : "Generated report"}
                </p>
              </div>
              <div className="report-actions">
                <button type="button" onClick={copyReport}>
                  <CopyIcon /> Copy
                </button>
                <button type="button" onClick={downloadReport}>
                  <DownloadIcon /> Download
                </button>
              </div>
            </div>

            <div className="report-stats">
              <div className="stat-chip">
                <span className="stat-value">{files.length || "—"}</span>
                <span className="stat-label">Weekly reports merged</span>
              </div>
              <div className="stat-chip">
                <span className="stat-value">{parsed.sections.length}</span>
                <span className="stat-label">Report sections</span>
              </div>
              <div className="stat-chip">
                <span className="stat-value">{weeksMerged || "—"}</span>
                <span className="stat-label">Weeks covered</span>
              </div>
              <div className="stat-chip">
                <span className="stat-value">{words.toLocaleString()}</span>
                <span className="stat-label">Words</span>
              </div>
            </div>

            {overview.length > 0 && (
              <div className="report-overview">
                <div className="report-overview-title">
                  <span>Content Overview</span>
                  <span className="report-overview-hint">
                    Relative length of each section
                  </span>
                </div>
                <div className="report-overview-bars">
                  {overview.map((item, i) => {
                    const pct = Math.max(
                      6,
                      Math.round((item.words / maxOverviewWords) * 100)
                    );
                    return (
                      <div className="overview-row" key={i}>
                        <span className="overview-label">
                          <span className="overview-dot" />
                          {item.title}
                        </span>
                        <div className="overview-track">
                          <div
                            className="overview-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="overview-value">{item.words}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="report-content">
              {parsed.sections.map((section, i) => {
                const Icon = SECTION_ICONS[section.icon] || DocIcon;
                return (
                  <details className="report-block" key={i} open={i < 2}>
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
                      {renderBlocks(section.blocks)}
                    </div>
                  </details>
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
