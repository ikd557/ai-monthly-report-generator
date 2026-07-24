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
const PORT = 5000;

app.use(cors());
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
  dest: "uploads/",

  limits: {
    files: 4,
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
  if (!files) {
    return;
  }

  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error(
        `Could not delete ${file.path}:`,
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
    res.json({
      success: true,

      message:
        "AI Monthly Report Generator API is running",

      aiProvider:
        "Google Gemini",

      model:
        "gemini-3-flash-preview",
    });
  }
);

// ==========================================
// GENERATE MONTHLY REPORT
// ==========================================

app.post(
  "/api/generate-report",

  upload.array("reports", 4),

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
You are an expert professional business report editor.

Your task is to take multiple weekly reports and create ONE complete, professional MONTHLY REPORT by intelligently MERGING and CONSOLIDATING all of them.

This is NOT a simple summarization task.

The purpose is to combine the actual work performed during all weeks into one complete monthly report.

==================================================
IMPORTANT INSTRUCTIONS
==================================================

1. READ AND ANALYZE ALL PROVIDED WEEKLY REPORTS.

2. MERGE the information from ALL weekly reports into ONE complete monthly report.

3. DO NOT simply create a short summary of the reports.

4. PRESERVE important information and meaningful details from EVERY uploaded report.

5. Include relevant information about:

- Tasks completed
- Tasks started
- Features developed
- Features improved
- Technical work
- Implementation details
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

6. If the same task appears in multiple weeks, do not unnecessarily repeat it.

Instead, combine the information into one logical description.

7. If a task progressed over multiple weeks, describe the complete progression.

Example:

Week 1:
Login page created.

Week 2:
Login page connected to backend.

Week 3:
Authentication validation added.

Week 4:
Authentication bugs fixed.

Merge these into a complete description explaining the progression of the authentication system.

8. DO NOT remove important technical details just to make the report shorter.

9. If information appears in only one weekly report, preserve it.

10. Use ONLY information provided in the weekly reports.

11. DO NOT invent information.

Never invent:

- Tasks
- Features
- Technologies
- Achievements
- Statistics
- Dates
- Results
- Problems
- Solutions

12. Remove only unnecessary repetition.

13. Organize related work together logically.

14. Maintain chronological progress where useful.

15. Use professional business and technical writing.

16. The final report must represent the COMPLETE work performed during the month.

==================================================
REPORT STRUCTURE
==================================================

# MONTHLY PROGRESS REPORT

## 1. MONTHLY OVERVIEW

Provide a short overview of the overall work performed during the month.

This should only introduce the major areas of work.

Do not replace the detailed report with a short summary.

==================================================

## 2. CONSOLIDATED WORK COMPLETED

This is the most important section.

Merge ALL meaningful work from ALL weekly reports.

Group related tasks and activities together.

For each major area of work:

- Explain what was done.
- Include important technical details.
- Explain how the work progressed.
- Combine related activities from different weeks.
- Preserve important details from the original reports.

This section must represent the complete work performed during the month.

==================================================

## 3. WEEK-BY-WEEK PROGRESS

Provide a chronological view of the work performed in each uploaded report.

Use:

### Week 1

Describe the important work performed during Week 1.

### Week 2

Describe the important work performed during Week 2.

### Week 3

Describe the important work performed during Week 3.

### Week 4

Describe the important work performed during Week 4.

If fewer than four reports are uploaded, include only the available weeks.

Do not unnecessarily repeat long explanations already provided in the Consolidated Work Completed section.

==================================================

## 4. KEY ACHIEVEMENTS

List the important achievements completed during the month.

Use only information supported by the weekly reports.

==================================================

## 5. CHALLENGES AND SOLUTIONS

Describe:

- Challenges encountered
- Problems identified
- Solutions implemented
- Actions taken to resolve issues

Use only information from the weekly reports.

If no challenges are mentioned, write:

"No specific challenges were documented in the provided weekly reports."

==================================================

## 6. PENDING WORK AND NEXT STEPS

Include:

- Unfinished tasks
- Tasks still in progress
- Planned improvements
- Future priorities
- Next steps

Use only information from the weekly reports.

If no future work is mentioned, write:

"No specific future work was documented in the provided weekly reports."

==================================================

## 7. MONTHLY CONCLUSION

Provide a short professional conclusion describing the overall progress achieved during the month.

==================================================
FINAL REQUIREMENT
==================================================

The final output MUST be a COMPLETE CONSOLIDATED MONTHLY REPORT.

It must NOT be a short summary.

It must preserve meaningful work, technical details, progress, achievements, challenges, and future tasks from ALL uploaded reports.

The goal is to intelligently MERGE and ORGANIZE the weekly reports into ONE professional monthly report.

Do not invent information.

Here are the weekly reports:

${combinedReports}
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
      // SEND RESPONSE
      // ======================================

      res.json({
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
        "\nREPORT GENERATION ERROR:"
      );

      console.error(
        error
      );

      // ======================================
      // CLEANUP FILES
      // ======================================

      cleanupFiles(
        req.files
      );

      // ======================================
      // SEND ERROR
      // ======================================

      res.status(500).json({
        success: false,

        message:
          "Failed to generate monthly report.",

        error:
          error.message,
      });
    }
  }
);

// ==========================================
// START SERVER
// ==========================================

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