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

app.use(
  cors({
    origin: true,
    methods: [
      "GET",
      "POST",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
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
  dest: "/tmp/uploads/",

  limits: {
    files: 4,
    fileSize: 10 * 1024 * 1024,
  },
});

// ==========================================
// EXTRACT TEXT
// ==========================================

async function extractText(file) {

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  console.log(
    `Processing ${file.originalname}`
  );

  // TXT

  if (extension === ".txt") {

    return fs.readFileSync(
      file.path,
      "utf8"
    );
  }

  // DOCX

  if (extension === ".docx") {

    const result =
      await mammoth.extractRawText({
        path: file.path,
      });

    return result.value;
  }

  // PDF

  if (extension === ".pdf") {

    const buffer =
      fs.readFileSync(file.path);

    const data =
      await pdfParse(buffer);

    return data.text;
  }

  throw new Error(
    `Unsupported file type: ${extension}`
  );
}

// ==========================================
// CLEANUP FILES
// ==========================================

function cleanupFiles(files) {

  if (!files) {
    return;
  }

  for (const file of files) {

    try {

      if (
        file.path &&
        fs.existsSync(file.path)
      ) {
        fs.unlinkSync(file.path);
      }

    } catch (error) {

      console.error(
        "Cleanup error:",
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

    });
  }
);

// ==========================================
// GENERATE REPORT
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
        `Received ${req.files.length} report(s)`
      );

      // ======================================
      // EXTRACT REPORT TEXT
      // ======================================

      const reports = [];

      for (
        const file of req.files
      ) {

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

      // ======================================
      // COMBINE REPORTS
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

IMPORTANT INSTRUCTIONS:

1. Read and analyze ALL weekly reports.

2. Merge information from ALL reports.

3. Do NOT create only a short summary.

4. Preserve important information from EVERY uploaded report.

5. Include:

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

6. If the same task appears in multiple weeks, combine it logically instead of unnecessarily repeating it.

7. If a task progressed across multiple weeks, explain the complete progression.

8. Do not remove important technical details.

9. Preserve information appearing in only one report.

10. Use ONLY information provided in the reports.

11. DO NOT invent information.

Never invent:

- Tasks
- Features
- Technologies
- Statistics
- Dates
- Results
- Problems
- Solutions

12. Remove only unnecessary repetition.

13. Organize related work logically.

14. Maintain chronological progress where useful.

15. Use professional business and technical writing.

16. The final report must represent the COMPLETE work performed during the month.

REPORT STRUCTURE:

# MONTHLY PROGRESS REPORT

## 1. MONTHLY OVERVIEW

Provide a short overview of the overall work performed during the month.

## 2. CONSOLIDATED WORK COMPLETED

Merge ALL meaningful work from ALL weekly reports.

Group related tasks and activities together.

For each major area:

- Explain what was done.
- Include important technical details.
- Explain how the work progressed.
- Combine related activities.
- Preserve important details.

## 3. WEEK-BY-WEEK PROGRESS

### Week 1

Describe important work performed during Week 1.

### Week 2

Describe important work performed during Week 2.

### Week 3

Describe important work performed during Week 3.

### Week 4

Describe important work performed during Week 4.

If fewer reports are uploaded, include only available weeks.

## 4. KEY ACHIEVEMENTS

List important achievements completed during the month.

## 5. CHALLENGES AND SOLUTIONS

Describe challenges, problems, solutions and actions taken.

If no challenges are mentioned, write:

"No specific challenges were documented in the provided weekly reports."

## 6. PENDING WORK AND NEXT STEPS

Include unfinished tasks, tasks in progress, planned improvements and future priorities.

If no future work is mentioned, write:

"No specific future work was documented in the provided weekly reports."

## 7. MONTHLY CONCLUSION

Provide a short professional conclusion describing overall progress.

FINAL REQUIREMENT:

The final output MUST be a COMPLETE CONSOLIDATED MONTHLY REPORT.

It must NOT be a short summary.

Preserve meaningful work, technical details, progress, achievements, challenges and future tasks.

Do not invent information.

Here are the weekly reports:

${combinedReports}

`;

      // ======================================
      // CALL GEMINI
      // ======================================

      console.log(
        "Sending reports to Gemini..."
      );

      const response =
        await ai.models.generateContent({

          model:
            "gemini-3-flash-preview",

          contents:
            prompt,

        });

      // ======================================
      // GET REPORT
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
        "Report generated successfully."
      );

      // ======================================
      // CLEANUP
      // ======================================

      cleanupFiles(
        req.files
      );

      // ======================================
      // RESPONSE
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
        "REPORT GENERATION ERROR:",
        error
      );

      cleanupFiles(
        req.files
      );

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
// EXPORT FOR VERCEL
// ==========================================

module.exports = app;