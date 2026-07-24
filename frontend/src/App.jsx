import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [files, setFiles] = useState([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    setError("");

    // Maximum 4 files
    if (files.length + selectedFiles.length > 4) {
      setError("You can upload a maximum of 4 weekly reports.");
      return;
    }

    // Allowed file types
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const invalidFile = selectedFiles.find(
      (file) => !allowedTypes.includes(file.type)
    );

    if (invalidFile) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      return;
    }

    setFiles((previousFiles) => [
      ...previousFiles,
      ...selectedFiles,
    ]);
  };

  // Remove selected file
  const removeFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) => index !== indexToRemove
      )
    );
  };

  // Generate monthly report
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
      const response = await axios.post(
        "http://localhost:5000/api/generate-report",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setReport(response.data.report);
      } else {
        setError(
          response.data.message ||
            "Failed to generate report."
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.error ||
          "Something went wrong while generating the report."
      );
    } finally {
      setLoading(false);
    }
  };

  // Copy report
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      alert("Report copied to clipboard!");
    } catch (error) {
      console.error(error);
    }
  };

  // Download report as TXT
  const downloadReport = () => {
    const blob = new Blob(
      [report],
      {
        type: "text/plain",
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

  return (
    <div className="app">

      {/* Header */}
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


      {/* Main Content */}
      <main className="container">

        {/* Hero */}
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
            AI analyze your progress, achievements,
            challenges, and priorities.
          </p>

        </section>


        {/* Upload Card */}
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


          {/* Upload Area */}
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
              onChange={handleFileChange}
              disabled={files.length >= 4}
            />

          </label>


          {/* Selected Files */}
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


          {/* Error */}
          {error && (

            <div className="error-message">
              ⚠️ {error}
            </div>

          )}


          {/* Generate Button */}
          <button
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

                Analyzing Reports...
              </>

            ) : (

              <>
                ✨ Generate Monthly Report
              </>

            )}

          </button>

        </section>


        {/* Report Section */}
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
                  onClick={copyReport}
                >
                  📋 Copy
                </button>

                <button
                  onClick={downloadReport}
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


      {/* Footer */}
      <footer>
        AI Monthly Report Generator
        <span>•</span>
        Built with React & Gemini AI
      </footer>

    </div>
  );
}

export default App;