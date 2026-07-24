import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Backend Vercel URL
  const BACKEND_URL =
    "https://ai-monthly-report-generator-1iwl.vercel.app";

  // ==========================================
  // HANDLE FILE SELECTION
  // ==========================================

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    setError("");

    if (selectedFiles.length === 0) {
      return;
    }

    // Maximum 4 files
    if (files.length + selectedFiles.length > 4) {
      setError("You can upload a maximum of 4 weekly reports.");
      event.target.value = "";
      return;
    }

    // Maximum 10 MB per file
    const oversizedFile = selectedFiles.find(
      (file) => file.size > 10 * 1024 * 1024
    );

    if (oversizedFile) {
      setError(
        `${oversizedFile.name} is larger than 10 MB. Please upload a smaller file.`
      );
      event.target.value = "";
      return;
    }

    // Allowed extensions
    const allowedExtensions = [".pdf", ".docx", ".txt"];

    const invalidFile = selectedFiles.find((file) => {
      const extension =
        "." + file.name.split(".").pop().toLowerCase();

      return !allowedExtensions.includes(extension);
    });

    if (invalidFile) {
      setError("Only PDF, DOCX, and TXT files are supported.");
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
  // REMOVE FILE
  // ==========================================

  const removeFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) => index !== indexToRemove
      )
    );

    setError("");
  };

  // ==========================================
  // CLEAR ALL
  // ==========================================

  const clearAll = () => {
    setFiles([]);
    setReport("");
    setError("");
  };

  // ==========================================
  // GENERATE MONTHLY REPORT
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

    files.forEach((file) => {
      formData.append("reports", file);
    });

    try {
      console.log("Sending reports to backend...");

      const response = await axios.post(
        `${BACKEND_URL}/api/generate-report`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 300000,
        }
      );

      console.log("Backend response:", response.data);

      if (response.data && response.data.success) {
        const generatedReport = response.data.report;

        if (typeof generatedReport === "string") {
          setReport(generatedReport);
        } else {
          setReport(
            JSON.stringify(generatedReport, null, 2)
          );
        }
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

      let errorMessage =
        "Something went wrong while generating the report.";

      if (error.response) {
        const data = error.response.data;

        if (typeof data?.error === "string") {
          errorMessage = data.error;
        } else if (
          typeof data?.message === "string"
        ) {
          errorMessage = data.message;
        } else if (typeof data === "string") {
          errorMessage = data;
        } else {
          errorMessage = `Server error (${error.response.status}).`;
        }
      } else if (error.request) {
        errorMessage =
          "Could not connect to the backend server. Please check that the backend is running.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(String(errorMessage));
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
      await navigator.clipboard.writeText(report);
      alert("Monthly report copied to clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      setError("Could not copy the report.");
    }
  };

  // ==========================================
  // DOWNLOAD REPORT
  // ==========================================

  const downloadReport = () => {
    if (!report) {
      return;
    }

    try {
      const blob = new Blob(
        [report],
        {
          type: "text/plain;charset=utf-8",
        }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "monthly-report.txt";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      setError("Could not download the report.");
    }
  };

  // ==========================================
  // FORMAT FILE SIZE
  // ==========================================

  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
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

      {/* HEADER */}

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


      {/* MAIN */}

      <main className="container">

        {/* HERO */}

        <section className="hero">

          <div className="hero-badge">
            AI-Powered Reporting
          </div>

          <h2>
            Turn 4 weeks of work into
            <span> one professional report.</span>
          </h2>

          <p>
            Upload your weekly reports and let
            AI intelligently merge and consolidate
            your work into one complete monthly report.
          </p>

        </section>


        {/* UPLOAD CARD */}

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


          {/* UPLOAD AREA */}

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
              onChange={handleFileChange}
              disabled={
                files.length >= 4 ||
                loading
              }
            />

          </label>


          {/* SELECTED FILES */}

          {files.length > 0 && (

            <div className="file-list">

              <div className="file-list-header">

                <h4>
                  Selected Reports
                </h4>

                <button
                  type="button"
                  onClick={clearAll}
                  disabled={loading}
                >
                  Clear All
                </button>

              </div>


              {files.map((file, index) => (

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
                        {formatFileSize(file.size)}
                      </small>

                    </div>

                  </div>


                  <button
                    type="button"
                    className="remove-button"
                    onClick={() =>
                      removeFile(index)
                    }
                    disabled={loading}
                  >
                    ×
                  </button>

                </div>

              ))}

            </div>

          )}


          {/* ERROR */}

          {error && (

            <div className="error-message">

              ⚠️{" "}

              <span>
                {String(error)}
              </span>

            </div>

          )}


          {/* GENERATE BUTTON */}

          <button
            type="button"
            className="generate-button"
            onClick={generateReport}
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


          <p className="upload-note">
            AI will merge all uploaded weekly
            reports into one detailed monthly
            report without unnecessarily
            repeating duplicate information.
          </p>

        </section>


        {/* GENERATED REPORT */}

        {report && (

          <section className="card report-card">

            <div className="report-header">

              <div>

                <h3>
                  Your Monthly Report
                </h3>

                <p>
                  Generated and consolidated by Gemini AI
                </p>

              </div>


              <div className="report-actions">

                <button
                  type="button"
                  onClick={copyReport}
                >
                  📋 Copy
                </button>

                <button
                  type="button"
                  onClick={downloadReport}
                >
                  ↓ Download
                </button>

              </div>

            </div>


            <div className="report-content">

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  margin: 0,
                }}
              >
                {String(report)}
              </pre>

            </div>

          </section>

        )}

      </main>


      {/* FOOTER */}

      <footer>
        AI Monthly Report Generator
        <span> • </span>
        Built with React & Gemini AI
      </footer>

    </div>
  );
}

export default App;