require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const { GoogleGenAI } = require("@google/genai");

// ==========================================
// APP SETUP
// ==========================================

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ==========================================
// GEMINI AI SETUP
// ==========================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==========================================
// FILE UPLOAD SETUP
// ==========================================

const upload = multer({
  dest: "/tmp/monthly-report-uploads/",

  limits: {
    files: 4,

    // Maximum 10 MB per file
    fileSize: 10 * 1024 * 1024,
  },
});

// ==========================================
// EXTRACT TEXT FROM FILE
// Supports TXT, DOCX, PDF
// ==========================================

async function extractText(file) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  console.log(
    `Processing ${file.originalname} (${extension})`
  );

  // ========================================
  // TXT FILE
  // ========================================

  if (extension === ".txt") {
    const text = fs.readFileSync(
      file.path,
      "utf8"
    );

    return text;
  }

  // ========================================
  // DOCX FILE
  // ========================================

  if (extension === ".docx") {
    const result =
      await mammoth.extractRawText({
        path: file.path,
      });

    return result.value;
  }

  // ========================================
  // PDF FILE
  // ========================================

  if (extension === ".pdf") {
    const buffer =
      fs.readFileSync(file.path);

    const data =
      await pdfParse(buffer);

    return data.text;
  }

  // ========================================
  // UNSUPPORTED FILE
  // ========================================

  throw new Error(
    `Unsupported file type: ${extension}. Please upload PDF, DOCX, or TXT files.`
  );
}

// ==========================================
// DELETE TEMPORARY FILES
// ==========================================

function cleanupFiles(files) {
  if (!files || !Array.isArray(files)) {
    return;
  }

  for (const file of files) {
    try {
      if (
        file &&
        file.path &&
        fs.existsSync(file.path)
      ) {
        fs.unlinkSync(file.path);

        console.log(
          `Temporary file deleted: ${file.originalname}`
        );
      }
    } catch (error) {
      console.error(
        `Could not delete temporary file:`,
        error.message
      );
    }
  }
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,

      message:
        "AI Monthly Report Generator API is running",

      aiProvider:
        "Google Gemini",

      model:
        "gemini-3-flash-preview",

      mode:
        "Monthly Report Consolidation",
    });
  }
);

// ==========================================
// GENERATE MONTHLY REPORT
// ==========================================

app.post(
  "/api/generate-report",

  upload.array(
    "reports",
    4
  ),

  async (req, res) => {
    try {
      // ======================================
      // CHECK FILES
      // ======================================

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please upload at least one weekly report.",
        });
      }

      console.log(
        `\nReceived ${req.files.length} weekly report(s)`
      );

      // ======================================
      // EXTRACT TEXT FROM ALL REPORTS
      // ======================================

      const reports = [];

      for (const file of req.files) {
        console.log(
          `Extracting text from: ${file.originalname}`
        );

        const text =
          await extractText(file);

        if (
          !text ||
          !text.trim()
        ) {
          throw new Error(
            `${file.originalname} does not contain readable text.`
          );
        }

        reports.push({
          filename:
            file.originalname,

          content:
            text.trim(),
        });
      }

      console.log(
        "Text extraction completed successfully."
      );

      // ======================================
      // COMBINE ALL WEEKLY REPORTS
      // ======================================

      const combinedReports =
        reports
          .map(
            (report, index) => `
========================================
WEEKLY REPORT ${index + 1}
FILE: ${report.filename}
========================================

${report.content}

========================================
END OF WEEKLY REPORT ${index + 1}
========================================
`
          )
          .join("\n");

      // ======================================
      // AI PROMPT
      // ======================================

      const prompt = `
You are an expert professional business and technical report editor.

Your task is to take multiple weekly work reports and create ONE complete, detailed, professional MONTHLY REPORT by intelligently MERGING, CONSOLIDATING, and ORGANIZING all information from the weekly reports.

IMPORTANT:

This is NOT a simple summarization task.

Do NOT reduce the entire month's work into a short summary.

The purpose is to combine the actual work performed during all uploaded weeks into ONE complete monthly report.

The final report must preserve the important substance and meaningful details from ALL uploaded weekly reports.

==================================================
CORE INSTRUCTIONS
==================================================

1. READ AND ANALYZE ALL PROVIDED WEEKLY REPORTS BEFORE WRITING THE FINAL REPORT.

2. MERGE information from ALL weekly reports into ONE unified monthly report.

3. DO NOT simply summarize each weekly report separately.

4. PRESERVE important information and meaningful details from EVERY uploaded report.

5. Include relevant information about:

- Tasks completed
- Tasks started
- Tasks continued
- Features developed
- Features improved
- Technical implementation
- Technical details
- Testing
- Bug fixes
- Improvements
- Achievements
- Challenges
- Problems
- Solutions
- Progress
- Pending tasks
- Future work
- Planned improvements

6. If the same task or activity appears across multiple weeks, do NOT unnecessarily repeat the same information.

Instead, intelligently combine the information into one logical description.

7. If a task progressed over multiple weeks, explain the COMPLETE progression of that task.

For example:

Week 1:
Login page created.

Week 2:
Login page connected to backend.

Week 3:
Authentication validation added.

Week 4:
Authentication bugs fixed.

The final monthly report should explain the overall progression of the authentication work rather than repeating the same task four times.

8. DO NOT remove important technical details simply to make the report shorter.

9. If information appears in only one weekly report, PRESERVE that information.

10. Use ONLY information provided in the uploaded weekly reports.

11. NEVER invent information.

Do not invent:

- Tasks
- Features
- Technologies
- Achievements
- Statistics
- Dates
- Results
- Problems
- Solutions
- Employees
- Projects
- Business outcomes

12. Remove only unnecessary repetition and exact duplicate statements.

13. Organize related activities together logically.

14. Maintain chronological progression where it helps explain how work developed.

15. Use professional business and technical writing.

16. The final report must represent the COMPLETE work performed during the month.

17. The final report should contain enough detail that a manager or supervisor can understand the actual work performed without needing to read the original weekly reports.

==================================================
REPORT STRUCTURE
==================================================

# MONTHLY PROGRESS REPORT

## 1. MONTHLY OVERVIEW

Provide a concise overview of the overall work performed during the month.

Mention the major areas of work and overall progress.

IMPORTANT:

This section is only an overview.

It must NOT replace the detailed information in the following sections.

==================================================

## 2. CONSOLIDATED WORK COMPLETED

This is the MOST IMPORTANT section.

Merge and organize ALL meaningful work from ALL uploaded weekly reports.

Group related tasks and activities logically.

For each major area of work:

- Explain what was done.
- Include important technical details.
- Explain how the work progressed.
- Combine related activities from different weeks.
- Preserve meaningful details from the original reports.
- Explain completed implementations.
- Mention important fixes and improvements.

If a task developed over multiple weeks, describe its complete progression as one coherent piece of work.

Do NOT reduce this section to a short summary.

==================================================

## 3. WEEK-BY-WEEK PROGRESS

Provide a chronological view of the work performed in each uploaded weekly report.

Use the following format when applicable:

### Week 1

Describe the important work performed during Week 1.

### Week 2

Describe the important work performed during Week 2.

### Week 3

Describe the important work performed during Week 3.

### Week 4

Describe the important work performed during Week 4.

If fewer than four reports are uploaded, include ONLY the available weeks.

Do not unnecessarily repeat long explanations already provided in the Consolidated Work Completed section.

The weekly section should provide a concise chronological record of the work.

==================================================

## 4. KEY ACHIEVEMENTS

List the important achievements completed during the month.

Use ONLY information supported by the uploaded weekly reports.

Do not invent achievements.

==================================================

## 5. CHALLENGES AND SOLUTIONS

Describe:

- Challenges encountered
- Problems identified
- Technical difficulties
- Solutions implemented
- Actions taken to resolve issues
- Improvements made as a result

Use ONLY information provided in the weekly reports.

If no challenges are mentioned, write exactly:

"No specific challenges were documented in the provided weekly reports."

==================================================

## 6. PENDING WORK AND NEXT STEPS

Include:

- Unfinished tasks
- Tasks still in progress
- Planned improvements
- Future priorities
- Next steps
- Pending implementations

Use ONLY information from the weekly reports.

If no future work is mentioned, write exactly:

"No specific future work was documented in the provided weekly reports."

==================================================

## 7. MONTHLY CONCLUSION

Provide a short professional conclusion describing the overall progress achieved during the month.

The conclusion should reflect the actual information provided in the weekly reports.

Do not introduce new information.

==================================================
FINAL REQUIREMENT
==================================================

The final output MUST be a COMPLETE CONSOLIDATED MONTHLY REPORT.

It must NOT be a short summary.

It must NOT simply repeat the weekly reports one after another.

It must intelligently MERGE, CONSOLIDATE, and ORGANIZE the information.

It must preserve meaningful:

- Work performed
- Technical details
- Tasks
- Implementations
- Progress
- Achievements
- Challenges
- Solutions
- Pending work
- Future tasks

from ALL uploaded weekly reports.

The goal is to create ONE professional monthly report that accurately represents the complete work performed during the month.

Use ONLY the information provided below.

Do not invent information.

==================================================
WEEKLY REPORTS
==================================================

${combinedReports}

==================================================
END OF WEEKLY REPORTS
==================================================
`;

      // ======================================
      // SEND TO GEMINI
      // ======================================

      console.log(
        "Sending reports to Google Gemini..."
      );

      const response =
        await ai.models.generateContent({
          model:
            "gemini-3-flash-preview",

          contents:
            prompt,
        });

      // ======================================
      // GET GENERATED REPORT
      // ======================================

      const monthlyReport =
        response.text;

      if (
        !monthlyReport ||
        !monthlyReport.trim()
      ) {
        throw new Error(
          "Gemini returned an empty report."
        );
      }

      console.log(
        "Gemini monthly report generated successfully."
      );

      // ======================================
      // CLEANUP TEMPORARY FILES
      // ======================================

      cleanupFiles(
        req.files
      );

      // ======================================
      // SEND SUCCESS RESPONSE
      // ======================================

      return res.status(200).json({
        success: true,

        message:
          "Monthly report generated successfully.",

        aiProvider:
          "Google Gemini",

        model:
          "gemini-3-flash-preview",

        filesProcessed:
          req.files.length,

        report:
          monthlyReport,
      });

    } catch (error) {

      console.error(
        "\n========================================"
      );

      console.error(
        "REPORT GENERATION ERROR"
      );

      console.error(
        "========================================"
      );

      console.error(
        error
      );

      // ======================================
      // CLEANUP FILES AFTER ERROR
      // ======================================

      cleanupFiles(
        req.files
      );

      // ======================================
      // SEND ERROR RESPONSE
      // ======================================

      return res.status(500).json({
        success: false,

        message:
          "Failed to generate monthly report.",

        error:
          error.message ||
          "Unknown server error.",
      });
    }
  }
);

// ==========================================
// VERCEL EXPORT
// ==========================================

// Vercel uses this export to run
// the Express application as a
// serverless function.

module.exports = app;

// ==========================================
// LOCAL DEVELOPMENT SERVER
// ==========================================

// When running locally with:
//
// node server.js
//
// the Express server starts normally.
//
// On Vercel, this section does not
// execute because Vercel imports
// the Express app instead.

if (
  require.main === module
) {
  app.listen(
    PORT,
    () => {

      console.log(
        `\nServer running at http://localhost:${PORT}`
      );

      console.log(
        "AI Provider: Google Gemini"
      );

      console.log(
        "AI Model: gemini-3-flash-preview"
      );

      console.log(
        "Supported files: PDF, DOCX, TXT"
      );

      console.log(
        "Maximum reports: 4"
      );

      console.log(
        "Mode: Monthly Report Consolidation"
      );

    }
  );
}