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

    if (selectedFiles.length === 0) {
      return;
    }

    // Maximum 4 files
    if (
      files.length +
        selectedFiles.length >
      4
    ) {
      setError(
        "You can upload a maximum of 4 weekly reports."
      );

      event.target.value = "";
      return;
    }

    // Allowed file types
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const invalidFile =
      selectedFiles.find(
        (file) =>
          !allowedTypes.includes(
            file.type
          )
      );

    if (invalidFile) {
      setError(
        "Only PDF, DOCX, and TXT files are supported."
      );

      event.target.value = "";
      return;
    }

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

  const removeFile = (
    indexToRemove
  ) => {
    setFiles(
      (previousFiles) =>
        previousFiles.filter(
          (_, index) =>
            index !==
            indexToRemove
        )
    );

    setError("");
  };

  // ==========================================
  // GENERATE MONTHLY REPORT
  // ==========================================

  const generateReport =
    async () => {

      // Check files
      if (
        files.length === 0
      ) {
        setError(
          "Please upload at least one weekly report."
        );

        return;
      }

      setLoading(true);
      setError("");
      setReport("");

      // Create FormData
      const formData =
        new FormData();

      // Add files
      files.forEach(
        (file) => {
          formData.append(
            "reports",
            file
          );
        }
      );

      try {

        console.log(
          "Sending reports to backend..."
        );

        // ======================================
        // VERCEL BACKEND API
        // ======================================

        const response =
          await axios.post(
            "/api/generate-report",
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

        // ======================================
        // CHECK RESPONSE
        // ======================================

        if (
          response.data &&
          response.data.success
        ) {

          // Make sure report is string
          const generatedReport =
            response.data.report;

          if (
            typeof generatedReport ===
            "string"
          ) {

            setReport(
              generatedReport
            );

          } else {

            setReport(
              JSON.stringify(
                generatedReport,
                null,
                2
              )
            );

          }

        } else {

          // Safely get error message
          let errorMessage =
            "Failed to generate report.";

          if (
            response.data
          ) {

            if (
              typeof response.data.error ===
              "string"
            ) {

              errorMessage =
                response.data.error;

            } else if (
              typeof response.data.message ===
              "string"
            ) {

              errorMessage =
                response.data.message;

            }

          }

          setError(
            errorMessage
          );

        }

      } catch (
        error
      ) {

        console.error(
          "REPORT GENERATION ERROR:",
          error
        );

        // ======================================
        // SAFE ERROR HANDLING
        // IMPORTANT:
        // NEVER put an object directly
        // inside setError()
        // ======================================

        let errorMessage =
          "Something went wrong while generating the report.";

        // Backend returned response
        if (
          error.response &&
          error.response.data
        ) {

          const data =
            error.response.data;

          if (
            typeof data.error ===
            "string"
          ) {

            errorMessage =
              data.error;

          } else if (
            typeof data.message ===
            "string"
          ) {

            errorMessage =
              data.message;

          } else if (
            typeof data ===
            "string"
          ) {

            errorMessage =
              data;

          }

        }

        // Network error
        else if (
          error.request &&
          !error.response
        ) {

          errorMessage =
            "Could not connect to the backend server. Please try again.";

        }

        // Normal JavaScript error
        else if (
          error.message
        ) {

          errorMessage =
            error.message;

        }

        // Always convert to string
        setError(
          String(
            errorMessage
          )
        );

      } finally {

        setLoading(false);

      }

    };

  // ==========================================
  // COPY REPORT
  // ==========================================

  const copyReport =
    async () => {

      if (
        !report
      ) {
        return;
      }

      try {

        await navigator.clipboard.writeText(
          report
        );

        alert(
          "Report copied to clipboard!"
        );

      } catch (
        error
      ) {

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
  // DOWNLOAD REPORT
  // ==========================================

  const downloadReport =
    () => {

      if (
        !report
      ) {
        return;
      }

      try {

        const blob =
          new Blob(
            [
              report,
            ],
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

        link.href =
          url;

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

      } catch (
        error
      ) {

        console.error(
          "Download error:",
          error
        );

        setError(
          "Could not download the report."
        );

      }

    };

  // ==========================================
  // APP UI
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

        {/* ===================================
            HERO
        ==================================== */}

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
            AI analyze your progress, achievements,
            challenges, and priorities.
          </p>

        </section>


        {/* ===================================
            UPLOAD CARD
        ==================================== */}

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


          {/* =================================
              UPLOAD AREA
          ================================== */}

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


          {/* =================================
              SELECTED FILES
          ================================== */}

          {files.length > 0 && (

            <div className="file-list">

              <h4>
                Selected Reports
              </h4>

              {files.map(
                (
                  file,
                  index
                ) => (

                  <div
                    className="file-item"
                    key={
                      `${file.name}-${index}`
                    }
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
                          ).toFixed(
                            1
                          )}{" "}
                          KB
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
                    >
                      ×
                    </button>

                  </div>

                )
              )}

            </div>

          )}


          {/* =================================
              ERROR MESSAGE
          ================================== */}

          {error && (

            <div className="error-message">

              ⚠️{" "}

              <span>
                {String(
                  error
                )}
              </span>

            </div>

          )}


          {/* =================================
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

                Analyzing Reports...
              </>

            ) : (

              <>
                ✨ Generate Monthly Report
              </>

            )}

          </button>

        </section>


        {/* ===================================
            GENERATED REPORT
        ==================================== */}

        {report && (

          <section className="card report-card">

            <div className="report-header">

              <div>

                <h3>
                  Your Monthly Report
                </h3>

                <p>
                  Generated by Gemini AI
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

              <pre
                style={{
                  whiteSpace:
                    "pre-wrap",
                  fontFamily:
                    "inherit",
                  margin:
                    0,
                }}
              >
                {String(
                  report
                )}
              </pre>

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