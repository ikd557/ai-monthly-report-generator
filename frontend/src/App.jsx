import { useState } from "react";
import axios from "axios";
import "./App.css";

// ==========================================
// BACKEND API URL
// ==========================================

const API_URL =
  "https://ai-monthly-report-generator-1iwl.vercel.app";

function App() {
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // HANDLE FILE SELECTION
  // ==========================================

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    // Clear previous error
    setError("");

    // Check maximum 4 files
    if (files.length + selectedFiles.length > 4) {
      setError(
        "You can upload a maximum of 4 weekly reports."
      );

      // Reset input
      event.target.value = "";

      return;
    }

    // Allowed file extensions
    const allowedExtensions = [
      ".txt",
      ".pdf",
      ".docx",
    ];

    // Check invalid file
    const invalidFile = selectedFiles.find(
      (file) => {
        const fileName =
          file.name.toLowerCase();

        return !allowedExtensions.some(
          (extension) =>
            fileName.endsWith(extension)
        );
      }
    );

    if (invalidFile) {
      setError(
        "Only PDF, DOCX, and TXT files are supported."
      );

      event.target.value = "";

      return;
    }

    // Add selected files
    setFiles((previousFiles) => [
      ...previousFiles,
      ...selectedFiles,
    ]);

    // Reset input so same file can be selected again
    event.target.value = "";
  };

  // ==========================================
  // REMOVE FILE
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
    // Check if files exist
    if (files.length === 0) {
      setError(
        "Please upload at least one weekly report."
      );

      return;
    }

    // Start loading
    setLoading(true);

    // Clear old data
    setError("");
    setReport("");

    // Create FormData
    const formData = new FormData();

    // Add every file
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

      console.log(
        "Backend URL:",
        `${API_URL}/api/generate-report`
      );

      // Send files to deployed backend
      const response =
        await axios.post(
          `${API_URL}/api/generate-report`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      console.log(
        "Backend response:",
        response.data
      );

      // Check successful response
      if (
        response.data &&
        response.data.success
      ) {
        setReport(
          response.data.report || ""
        );
      } else {
        setError(
          response.data?.message ||
            "Failed to generate monthly report."
        );
      }

    } catch (error) {
      console.error(
        "Report generation error:",
        error
      );

      // Handle backend error
      if (
        error.response &&
        error.response.data
      ) {
        const backendError =
          error.response.data;

        setError(
          backendError.error ||
            backendError.message ||
            "Backend failed to generate the report."
        );
      }

      // Handle network error
      else if (error.request) {
        setError(
          "Could not connect to the backend server. Please try again."
        );
      }

      // Handle other errors
      else {
        setError(
          error.message ||
            "Something went wrong while generating the report."
        );
      }

    } finally {
      // Stop loading
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
        "Report copied to clipboard!"
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

    const blob = new Blob(
      [report],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "monthly-report.txt";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">

      {/* =====================================
          HEADER
      ====================================== */}

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


      {/* =====================================
          MAIN CONTENT
      ====================================== */}

      <main className="container">

        {/* =====================================
            HERO SECTION
        ====================================== */}

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
            Upload your weekly reports and let
            AI consolidate your progress,
            achievements, challenges, and
            priorities into one complete
            monthly report.
          </p>

        </section>


        {/* =====================================
            UPLOAD CARD
        ====================================== */}

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


          {/* ===================================
              UPLOAD AREA
          ==================================== */}

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
              Maximum 4 files
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
                files.length >= 4
              }
            />

          </label>


          {/* ===================================
              SELECTED FILES
          ==================================== */}

          {files.length > 0 && (

            <div className="file-list">

              <h4>
                Selected Reports
              </h4>

              {files.map(
                (file, index) => (

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
                          {(
                            file.size /
                            1024
                          ).toFixed(1)} KB
                        </small>

                      </div>

                    </div>


                    <button
                      className="remove-button"
                      onClick={() =>
                        removeFile(index)
                      }
                    >
                      ×
                    </button>

                  </div>

                )
              )}

            </div>

          )}


          {/* ===================================
              ERROR MESSAGE
          ==================================== */}

          {error && (

            <div className="error-message">
              ⚠️ {error}
            </div>

          )}


          {/* ===================================
              GENERATE BUTTON
          ==================================== */}

          <button
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

                Generating Monthly Report...
              </>

            ) : (

              <>
                ✨ Generate Monthly Report
              </>

            )}

          </button>

        </section>


        {/* =====================================
            GENERATED REPORT
        ====================================== */}

        {report && (

          <section
            className="card report-card"
          >

            <div className="report-header">

              <div>

                <h3>
                  Your Monthly Report
                </h3>

                <p>
                  Consolidated by Gemini AI
                </p>

              </div>


              <div className="report-actions">

                <button
                  onClick={
                    copyReport
                  }
                >
                  📋 Copy
                </button>

                <button
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


      {/* =====================================
          FOOTER
      ====================================== */}

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