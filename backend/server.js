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
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ==========================================
// GEMINI AI SETUP
// ==========================================

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "WARNING: GEMINI_API_KEY is missing from .env file."
  );
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==========================================
// UPLOAD DIRECTORY
// ==========================================

const uploadDirectory = path.join(
  __dirname,
  "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// ==========================================
// MULTER SETUP
// ==========================================

const upload = multer({
  dest: uploadDirectory,

  limits: {
    files: 4,
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".txt",
    ];

    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          "Only PDF, DOCX, and TXT files are supported."
        )
      );
    }

    cb(null, true);
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
    `Processing file: ${file.originalname}`
  );

  // ------------------------------------------
  // TXT
  // ------------------------------------------

  if (extension === ".txt") {
    return fs.readFileSync(
      file.path,
      "utf8"
    );
  }

  // ------------------------------------------
  // DOCX
  // ------------------------------------------

  if (extension === ".docx") {
    const result =
      await mammoth.extractRawText({
        path: file.path,
      });

    return result.value;
  }

  // ------------------------------------------
  // PDF
  // ------------------------------------------

  if (extension === ".pdf") {
    const buffer = fs.readFileSync(
      file.path
    );

    const data = await pdfParse(buffer);

    return data.text;
  }

  throw new Error(
    `Unsupported file type: ${extension}`
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
          `Deleted temporary file: ${file.originalname}`
        );
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
        "AI Monthly Report Generator backend is running",
      aiProvider: "Google Gemini",
      model: "gemini-3-flash-preview",
      server:
        `http://localhost:${PORT}`,
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
    const uploadedFiles =
      req.files || [];

    try {
      console.log(
        "\n========================================"
      );

      console.log(
        "MONTHLY REPORT REQUEST RECEIVED"
      );

      console.log(
        "========================================"
      );

      console.log(
        `Files received: ${uploadedFiles.length}`
      );

      // ======================================
      // CHECK FILES
      // ======================================

      if (uploadedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Please upload at least one weekly report.",
        });
      }

      // ======================================
      // CHECK GEMINI API KEY
      // ======================================

      if (!process.env.GEMINI_API_KEY) {
        throw new Error(
          "GEMINI_API_KEY is missing from the backend .env file."
        );
      }

      // ======================================
      // EXTRACT ALL REPORTS
      // ======================================

      const reports = [];

      for (
        let index = 0;
        index < uploadedFiles.length;
        index++
      ) {
        const file =
          uploadedFiles[index];

        console.log(
          `Extracting report ${index + 1}/${uploadedFiles.length}`
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

        console.log(
          `Extracted ${text.length} characters from ${file.originalname}`
        );
      }

      // ======================================
      // COMBINE REPORTS
      // ======================================

      const combinedReports =
        reports
          .map(
            (report, index) => `
============================================================
SOURCE WEEKLY REPORT ${index + 1}
============================================================

SOURCE FILE:
${report.filename}

------------------------------------------------------------
REPORT CONTENT
------------------------------------------------------------

${report.content}

------------------------------------------------------------
END OF SOURCE WEEKLY REPORT ${index + 1}
------------------------------------------------------------
`
          )
          .join("\n");

      // ======================================
      // GEMINI PROMPT
      // ======================================

      const prompt = `
You are an expert professional business and cybersecurity report editor.

Your task is to create ONE complete, professional MONTHLY REPORT by intelligently merging and consolidating ALL provided weekly reports.

This is a CONSOLIDATION task.

It is NOT a creative writing task.

It is NOT a task where you should guess missing information.

It is NOT a task where you should invent recommendations and present them as completed work.

============================================================
ABSOLUTE FACTUAL ACCURACY RULES
============================================================

1. Read and analyze EVERY source weekly report completely.

2. Use ONLY information actually present in the provided weekly reports.

3. DO NOT invent facts.

4. DO NOT invent:
- IP addresses
- Host addresses
- Dates
- Numbers
- Percentages
- Statistics
- Bandwidth values
- Session counts
- Application names
- Technology names
- Threat names
- Security events
- Countries
- Websites
- Tasks
- Achievements
- Challenges
- Solutions
- Results
- Future work

5. Preserve numbers exactly as they appear in the source reports.

6. Never change numbers because they look more reasonable.

7. Never add digits to numbers.

8. Never remove digits from numbers.

9. Never invent an IP address.

10. Every IP address in the final report must come directly from the source reports.

11. Preserve application names exactly as provided.

12. Preserve threat names exactly as provided.

13. Preserve security event names exactly as provided.

14. Preserve dates and reporting periods based only on source information.

============================================================
FACT VS INTERPRETATION
============================================================

Clearly distinguish between:

A. Facts directly supported by the source reports.

B. Analysis based on those facts.

C. Recommendations or suggested next steps.

Never present an AI-generated recommendation as a completed task.

For example:

BAD:
"Blocked SuperVPN."

If the source only says SuperVPN was detected, this is incorrect.

GOOD:
"SuperVPN was identified among the observed high-risk applications."

If you want to suggest blocking it, write:

"Recommendation: Review whether SuperVPN should be restricted according to the organization's security policy."

============================================================
NO OVERSTATEMENT
============================================================

Do not make stronger claims than the source data supports.

If the source reports SSL/TLS traffic, do not write:
"Maintained 100% visibility into encrypted traffic."

Instead write:
"SSL/TLS traffic was observed in the reported network activity."

If the source says:
"No Data Leak"

Do not automatically write:
"Data leak prevention was successfully achieved."

Instead write:
"No Data Leak events were reported in the provided data."

============================================================
MONTHLY CONSOLIDATION
============================================================

1. Merge ALL weekly reports into one complete monthly report.

2. Preserve meaningful information from EVERY uploaded report.

3. Do NOT reduce the report to a short summary.

4. The final report should represent the complete work and observed activity across the entire reporting period.

5. If the same information appears multiple times, avoid unnecessary repetition.

6. If a metric changes from one week to another, preserve weekly values and explain the trend.

7. If a task or activity progresses across multiple weeks, describe the progression accurately.

8. Preserve unique information that appears in only one weekly report.

9. Do not merge different IP addresses into one.

10. Do not merge different applications into one.

11. Do not merge different threat events into one.

============================================================
REPORT STRUCTURE
============================================================

# MONTHLY PROGRESS REPORT

## 1. MONTHLY OVERVIEW

Provide a concise overview of the reporting period.

Mention only major activities, observations, trends, and areas supported by the weekly reports.

## 2. CONSOLIDATED WORK AND ACTIVITY OVERVIEW

Consolidate ALL meaningful information from ALL weekly reports.

Group related information logically.

Use relevant subsections supported by the source reports, such as:

### Network and Bandwidth Activity

### Application Usage

### VPN Activity

### Security and Threat Events

### High-Risk Applications

### Web and Internet Activity

### Host and IP Activity

### Geographic Activity

### Data Leak Events

Only include subsections supported by the source reports.

For every subsection:

- Preserve important numerical values.
- Preserve technical details.
- Explain trends accurately.
- Do not invent information.
- Do not overstate conclusions.

## 3. WEEK-BY-WEEK PROGRESS

Provide a chronological summary of each uploaded weekly report.

Use:

### Week 1

### Week 2

### Week 3

### Week 4

Only include weeks that actually exist.

For each week:

- Preserve important metrics.
- Preserve technical information.
- Preserve security events.
- Preserve applications.
- Preserve hosts/IP addresses.
- Do not invent information.

## 4. KEY FINDINGS AND ACHIEVEMENTS

List important findings or achievements directly supported by the weekly reports.

Use precise wording such as:

- Observed
- Recorded
- Detected
- Identified
- Monitored
- Reported

Avoid unsupported claims such as:

- Successfully prevented
- Successfully blocked
- Fully secured
- 100% visibility
- Completely mitigated

unless explicitly supported by the source.

## 5. CHALLENGES AND SOLUTIONS

Describe challenges and solutions ONLY when explicitly mentioned or clearly documented.

If no challenges are documented, write:

"No specific challenges were documented in the provided weekly reports."

## 6. RECOMMENDATIONS AND NEXT STEPS

Only include recommendations when useful and clearly label them as recommendations.

Recommendations are NOT completed tasks.

If no future work or recommendations are supported, write:

"No specific future work was documented in the provided weekly reports."

## 7. MONTHLY CONCLUSION

Provide a short professional conclusion.

The conclusion must summarize only information supported by the weekly reports.

Do not introduce new facts.

============================================================
FINAL QUALITY CONTROL
============================================================

Before returning the final report:

- Verify every important number against the source.
- Verify all IP addresses.
- Verify application names.
- Verify threat names.
- Verify security event names.
- Verify dates.
- Verify calculated totals.
- Ensure recommendations are clearly separated from completed work.
- Ensure no unsupported claims are made.
- Ensure unique information from every weekly report is preserved.
- Ensure observations are not incorrectly presented as achievements.

ACCURACY IS MORE IMPORTANT THAN CREATIVITY.

DO NOT INVENT INFORMATION.

DO NOT CHANGE NUMBERS.

DO NOT INVENT IP ADDRESSES.

DO NOT PRESENT RECOMMENDATIONS AS COMPLETED WORK.

============================================================
SOURCE WEEKLY REPORTS
============================================================

${combinedReports}

============================================================
END OF SOURCE WEEKLY REPORTS
============================================================

Now generate the final complete monthly report.
`;

      // ======================================
      // CALL GEMINI
      // ======================================

      console.log(
        "Sending reports to Google Gemini..."
      );

      const response =
        await ai.models.generateContent({
          model:
            "gemini-3-flash-preview",

          contents: prompt,
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
        "Monthly report generated successfully."
      );

      // ======================================
      // CLEANUP
      // ======================================

      cleanupFiles(
        uploadedFiles
      );

      // ======================================
      // SEND RESPONSE
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
          uploadedFiles.length,

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

      console.error(error);

      // Cleanup uploaded files
      cleanupFiles(
        uploadedFiles
      );

      const errorMessage =
        error?.message ||
        "Unknown server error occurred.";

      return res.status(500).json({
        success: false,

        message:
          "Failed to generate monthly report.",

        error:
          String(errorMessage),
      });
    }
  }
);

// ==========================================
// MULTER / UPLOAD ERROR HANDLER
// ==========================================

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error instanceof multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "File is too large. Maximum size is 10 MB.",
        });
      }

      if (
        error.code ===
        "LIMIT_FILE_COUNT"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Maximum 4 files are allowed.",
        });
      }

      return res.status(400).json({
        success: false,
        error:
          error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Internal server error.",
    });
  }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(
  PORT,
  () => {
    console.log(
      "\n========================================"
    );

    console.log(
      "AI MONTHLY REPORT GENERATOR"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Backend running at: http://localhost:${PORT}`
    );

    console.log(
      `Health check: http://localhost:${PORT}/api/health`
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
      "Maximum file size: 10 MB"
    );

    console.log(
      "========================================\n"
    );
  }
);