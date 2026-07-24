import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // HANDLE FILE SELECTION
  // ==========================================

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    setError("");

    // No files selected
    if (selectedFiles.length === 0) {
      return;
    }

    // Maximum 4 files
    if (
      files.length + selectedFiles.length > 4
    ) {
      setError(
        "You can upload a maximum of 4 weekly reports."
      );

      event.target.value = "";
      return;
    }

    // Allowed file extensions
    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".txt",
    ];

    // Check invalid files
    const invalidFile =
      selectedFiles.find((file) => {
        const extension =
          "." +
          file.name
            .split(".")
            .pop()
            .toLowerCase();

        return !allowedExtensions.includes(
          extension
        );
      });

    if (invalidFile) {
      setError(
        "Only PDF, DOCX, and TXT files are supported."
      );

      event.target.value = "";
      return;
    }

    // Check file size
    const oversizedFile =
      selectedFiles.find(
        (file) =>
          file.size >
          10 * 1024 * 1024
      );

    if (oversizedFile) {
      setError(
        `${oversizedFile.name} is larger than 10 MB. Please upload a smaller file.`
      );

      event.target.value = "";
      return;
    }

    // Add files
    setFiles((previousFiles) => [
      ...previousFiles,
      ...selectedFiles,
    ]);

    // Reset input
    event.target.value = "";
  };

  // ==========================================
  // REMOVE SELECTED FILE
  // ==========================================

  const removeFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );

    setError("");
  };

  // ==========================================
  // GENERATE MONTHLY REPORT
  // ==========================================

  const generateReport = async () => {
    // Check files
    if (files.length === 0) {
      setError(
        "Please upload at least one weekly report."
      );

      return;
    }

    // Start loading
    setLoading(true);

    // Clear previous error
    setError("");

    // Clear previous report
    setReport("");

    // Create FormData
    const formData = new FormData();

    // Add all uploaded files
    files.forEach((file) => {
      formData.append(
        "reports",
        file
      );
    });

    try {
      console.log(
        "Sending reports to backend..."
      );

      // ========================================
      // IMPORTANT
      // Same Vercel domain backend API
      // ========================================

      const response =
        await axios.post(
          "/api/generate-report",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },

            // 5 minute timeout
            timeout:
              5 * 60 * 1000,
          }
        );

      console.log(
        "Backend response:",
        response.data
      );

      // ========================================
      // SUCCESS
      // ========================================

      if (
        response.data &&
        response.data.success
      ) {
        setReport(
          response.data.report || ""
        );

        setError("");
      } else {
        setError(
          response.data?.message ||
            response.data?.error ||
            "Failed to generate monthly report."
        );
      }
    } catch (error) {
      console.error(
        "REPORT GENERATION ERROR:",
        error
      );

      // ========================================
      // SERVER ERROR
      // ========================================

      if (
        error.response
      ) {
        const serverMessage =
          error.response.data?.error ||
          error.response.data?.message;

        setError(
          serverMessage ||
            `Server error (${error.response.status}). Please try again.`
        );
      }

      // ========================================
      // REQUEST TIMEOUT
      // ========================================

      else if (
        error.code ===
        "ECONNABORTED"
      ) {
        setError(
          "The report is taking too long to generate. Please try again."
        );
      }

      // ========================================
      // NETWORK ERROR
      // ========================================

      else if (
        error.request
      ) {
        setError(
          "Could not connect to the backend server. Please try again."
        );
      }

      // ========================================
      // OTHER ERROR
      // ========================================

      else {
        setError(
          "Something went wrong while generating the report."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COPY REPORT
  // ==========================================

  const copyReport = async () => {
    if (!report) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        report
      );

      alert(
        "Monthly report copied to clipboard!"
      );
    } catch (error) {
      console.error(
        "Copy error:",
        error
      );

      setError(
        "Could not copy the report."
      );
    }
  };

  // ==========================================
  // DOWNLOAD REPORT AS TXT
  // ==========================================

  const downloadReport = () => {
    if (!report) {
      return;
    }

    const blob =
      new Blob(
        [report],
        {
          type:
            "text/plain;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "monthly-report.txt";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  };

  // ==========================================
  // CLEAR EVERYTHING
  // ==========================================

  const clearAll = () => {
    setFiles([]);

    setReport("");

    setError("");
  };

  // ==========================================
  // FORMAT FILE SIZE
  // ==========================================

  const formatFileSize = (
    bytes
  ) => {
    if (
      bytes <
      1024
    ) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">

      {/* ====================================
          HEADER
      ==================================== */}

      <header className="header">

        <div className="brand">

          <div className="brand-icon">
            AI
          </div>

          <div>

            <h1>
              Monthly Report Generator
            </h1>

            <p>
              Transform weekly reports into
              professional monthly insights
            </p>

          </div>

        </div>

        <div className="ai-badge">
          ✨ Powered by Gemini AI
        </div>

      </header>

      {/* ====================================
          MAIN CONTENT
      ==================================== */}

      <main className="container">

        {/* ==================================
            HERO
        ================================== */}

        <section className="hero">

          <div className="hero-badge">
            AI-Powered Reporting
          </div>

          <h2>
            Turn 4 weeks of work into
            <span>
              {" "}
              one professional report.
            </span>
          </h2>

          <p>
            Upload your weekly reports and
            let AI intelligently merge and
            consolidate your work into one
            complete monthly report.
          </p>

        </section>

        {/* ==================================
            UPLOAD CARD
        ================================== */}

        <section className="card">

          <div className="section-title">

            <div>

              <h3>
                Upload Weekly Reports
              </h3>

              <p>
                Add up to 4 reports for the month
              </p>

            </div>

            <span className="file-count">
              {files.length}/4
            </span>

          </div>

          {/* ================================
              UPLOAD AREA
          ================================= */}

          <label
            className="upload-area"
            htmlFor="file-upload"
          >

            <div className="upload-icon">
              ↑
            </div>

            <h4>
              Click to upload reports
            </h4>

            <p>
              PDF, DOCX or TXT
            </p>

            <span>
              Maximum 4 files • 10 MB each
            </span>

            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={
                handleFileChange
              }
              disabled={
                files.length >= 4 ||
                loading
              }
            />

          </label>

          {/* ==================================
              SELECTED FILES
          ================================== */}

          {files.length > 0 && (

            <div className="file-list">

              <div className="file-list-header">

                <h4>
                  Selected Reports
                </h4>

                <button
                  type="button"
                  onClick={
                    clearAll
                  }
                  disabled={
                    loading
                  }
                >
                  Clear All
                </button>

              </div>

              {files.map(
                (
                  file,
                  index
                ) => (

                  <div
                    className="file-item"
                    key={`${file.name}-${index}`}
                  >

                    <div className="file-info">

                      <div className="file-icon">
                        📄
                      </div>

                      <div>

                        <strong>
                          {file.name}
                        </strong>

                        <small>
                          {formatFileSize(
                            file.size
                          )}
                        </small>

                      </div>

                    </div>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() =>
                        removeFile(
                          index
                        )
                      }
                      disabled={
                        loading
                      }
                    >
                      ×
                    </button>

                  </div>

                )
              )}

            </div>

          )}

          {/* ==================================
              ERROR MESSAGE
          ================================== */}

          {error && (

            <div className="error-message">
              ⚠️ {error}
            </div>

          )}

          {/* ==================================
              GENERATE BUTTON
          ================================== */}

          <button
            type="button"
            className="generate-button"
            onClick={
              generateReport
            }
            disabled={
              loading ||
              files.length === 0
            }
          >

            {loading ? (

              <>
                <span className="spinner"></span>

                Merging Reports with AI...
              </>

            ) : (

              <>
                ✨ Generate Monthly Report
              </>

            )}

          </button>

          {/* ==================================
              INFORMATION
          ================================== */}

          <p className="upload-note">
            AI will merge all uploaded weekly
            reports into one detailed monthly
            report without unnecessarily
            repeating duplicate information.
          </p>

        </section>

        {/* ==================================
            REPORT SECTION
        ================================== */}

        {report && (

          <section className="card report-card">

            <div className="report-header">

              <div>

                <h3>
                  Your Monthly Report
                </h3>

                <p>
                  Generated and consolidated
                  by Gemini AI
                </p>

              </div>

              <div className="report-actions">

                <button
                  type="button"
                  onClick={
                    copyReport
                  }
                >
                  📋 Copy
                </button>

                <button
                  type="button"
                  onClick={
                    downloadReport
                  }
                >
                  ↓ Download
                </button>

              </div>

            </div>

            <div className="report-content">
              {report}
            </div>

          </section>

        )}

      </main>

      {/* ====================================
          FOOTER
      ==================================== */}

      <footer>

        AI Monthly Report Generator

        <span>
          •
        </span>

        Built with React & Gemini AI

      </footer>

    </div>
  );
}

export default App;