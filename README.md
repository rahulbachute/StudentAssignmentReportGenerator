# Standalone Student Assignment Report Generator

A secure, client-side web application for generating structured academic coursework portfolios and assignment deficit reports. Built for direct browser printing and high-fidelity PDF exports with verified pagination.

---

## Overview

The **Standalone Student Assignment Report Generator** compiles student submissions into canonical assignment portfolios (Page 1: Summary Index, followed by canonical Assignment Slots 1 through 22). It operates as an open-access client-side tool for institutional computer labs and student portals, allowing students to select their division and name to preview and download their official academic assignment reports without requiring password logins.

---

## Key Features

- **Canonical 22-Slot Curriculum Sequence**: Compiles student coursework across all 22 official assignments (`EC-01` to `EA-22`) in strict curricular order.
- **Official Attendance Roster**: Pre-loaded with official enrollment records (216 students across divisions TE-A, TE-B, and TE-C), with automated disambiguation for duplicate roll numbers.
- **Unlisted Students Support**: Separate, dedicated workflow for students whose submitted identities do not match the official attendance sheet. Employs conservative identity matching and deterministic grouping without merging distinct individuals.
- **Accurate Academic Pagination**:
  - Zero-submission official students generate an exact 23-page deficit package (Page 1: Index + 22 individual "NOT SUBMITTED" deficit pages).
  - Extended answers automatically flow onto continuation pages with repeated section headers and uninterrupted formatting.
  - Summary Index start page numbers dynamically align with physical PDF page numbers.
- **Read-Only Data Ingestion**:
  - Connects to Google Apps Script Web App for real-time submission and faculty evaluation data.
  - Contains zero spreadsheet write operations (`appendRow`, `setValue`, `deleteRow`).
  - Supports offline/manual roster import via Excel (.xlsx) and CSV uploads.
- **Data Minimization & Privacy Protection**: Server and client strip sensitive student information (passwords, auth tokens, device IDs, private emails, PRNs) before rendering.

---

## Directory Structure

```text
├── index.html                  # Main application interface and student portal
├── DEPLOYMENT.md               # Controlled production deployment & Google Site integration guide
├── README.md                   # Project documentation and architectural overview
├── css/
│   └── report-generator.css    # Responsive styles, print media rules, and page-break definitions
└── js/
    ├── assignment-registry.js  # Canonical 22-assignment slot definitions and metadata
    ├── data-service.js         # API integration, submission parsing, and portfolio assembly
    ├── identity-policy.js      # Shared deterministic identity policy for roster and unlisted matching
    ├── official-roster.js      # Official 216-student enrollment directory and approved aliases
    ├── report-renderer.js      # DOM/HTML portfolio rendering engine with continuation paging
    └── vendor/
        └── xlsx.full.min.js    # SheetJS library for client-side spreadsheet roster imports
```

---

## Quick Start & Local Usage

1. **Direct Browser Execution**:
   - Open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari).
   - No build step, node runtime, or server installation is required.

2. **Generating a Student Portfolio**:
   - Select the student's division (`TE-A`, `TE-B`, `TE-C`, or `Unlisted Students`).
   - Select the student name from the populated dropdown.
   - Click **Generate Portfolio**.
   - Use the browser's **Print / Save as PDF** feature (Ctrl+P / Cmd+P) with margins set to **Default** and background graphics enabled.

---

## Production Deployment

This application is designed for hosting via **GitHub Pages** or any standard static file host, embedded directly into an institutional Google Site.

For full deployment instructions, configuration options, and administrative controls, refer to [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Security & Access Architecture

- **Public Student Workflow**: Designed for straightforward, unauthenticated lab use. Anyone with the URL can select a name and view that student's coursework summary. The UI clearly reflects this open access model.
- **Single-Student Data Isolation**: The backend service strictly filters submissions to the requested student identity. Cross-student data leakage is prevented at both server and client verification layers.
- **Faculty Administration**: Advanced features (spreadsheet configuration, bulk data review, discrepancy audits) are protected behind an administrator access key verified via constant-time comparison.
