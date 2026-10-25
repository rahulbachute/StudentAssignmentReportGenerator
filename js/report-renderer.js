/**
 * Standalone Student Assignment Report Generator
 * File: js/report-renderer.js
 * 
 * Renders assignment-wise reports in the exact MEILP visual aesthetic:
 * - Exact header branding: DES • MEILP badge, College Name, Department, Challenge Report badge, Date
 * - Exact Assignment Title card: rounded border box with bold primary title, Course, and Max CCE marks
 * - Exact Student & Submission Profile card: 6-field structured grid (Name, Roll, Class/Div, Faculty, Year/Attempt, Submission ID)
 * - Exact Performance Summary Strip: 3-box row (Activities Completed, Completion Rate %, CCE Weightage)
 * - Exact Detailed Activity Submissions table: #, Activity/Module, Submitted Values with pill badges, Status badges, Max Marks
 * - Exact Academic Sign-off / Lab Assessment box: Student Signature, Marks Awarded card (______ / 12.0), Faculty Evaluator Signature
 * - Exact Verification Hash & System footer
 * - Clearly labelled NOT SUBMITTED deficit slots preserving 23-page portfolio sequence
 * - Professional Index Page (Page 1) with the 6 mandatory columns
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReportRenderer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatResponseValue(resp, component) {
    if (resp === null || resp === undefined) {
      return '<span class="badge bg-secondary-subtle text-secondary border">Reviewed / Completed</span>';
    }

    // A. MCQs: Display selected option clearly, avoid duplicating question instructions or excess whitespace
    if (component === 'text-mcq') {
      var mcqOpt = '';
      var mcqText = '';
      if (typeof resp === 'object' && !Array.isArray(resp) && resp !== null) {
        if (resp.mcq) mcqOpt = String(resp.mcq).trim();
        if (resp.text) mcqText = String(resp.text).trim();
        else if (resp.answer) mcqText = String(resp.answer).trim();
        else if (resp.selected) mcqText = String(resp.selected).trim();
      } else if (resp !== null && resp !== undefined) {
        mcqText = String(resp).trim();
      }

      var cleanText = mcqText.replace(/\\\[|\\\]/g, '').replace(/\\\(|\\\)/g, '').replace(/\r?\n\s*\r?\n/g, '\n').trim();

      // If mcqOpt is descriptive text itself (e.g. 'Traction Sheave', 'Preload')
      if (mcqOpt && !/^(opt\d+|[a-e]\d+|[a-d])$/i.test(mcqOpt)) {
        return `<div class="small"><span class="badge bg-light text-dark border me-1">Option</span> <strong class="text-dark">${escapeHtml(mcqOpt)}</strong></div>`;
      }

      // If mcqOpt is an option code (like opt1, c1, A)
      if (mcqOpt) {
        var firstLine = cleanText.split('\n')[0].trim();
        if (firstLine.length > 140) {
          var match = firstLine.match(/^(.{30,135}?)(?:[\.\:\;]|\s\-\s|\s*\(Given|\s*Given)/);
          if (match) firstLine = match[1].trim();
          else firstLine = firstLine.slice(0, 137) + '...';
        }
        return `<div class="small"><span class="badge bg-light text-dark border me-1">${escapeHtml(mcqOpt.toUpperCase())}</span> <span class="text-dark">${escapeHtml(firstLine)}</span></div>`;
      }

      var concise = cleanText.split('\n')[0].trim();
      if (concise.length > 140) concise = concise.slice(0, 137) + '...';
      return `<div class="small text-dark">${escapeHtml(concise || 'Completed')}</div>`;
    }

    // B. Component identification / image-label: Display verified count and concise list of actual identified components
    if (component === 'image-label' || component === 'component-identification') {
      var items = [];
      if (resp && resp.answers && typeof resp.answers === 'object') {
        items = Object.values(resp.answers);
      } else if (resp && resp.componentResponses && Array.isArray(resp.componentResponses)) {
        items = resp.componentResponses.map(function(c) { return c.studentAnswer || c.correctAnswer; }).filter(Boolean);
      } else if (typeof resp === 'object' && !Array.isArray(resp)) {
        var filteredKeys = Object.keys(resp).filter(function(k) {
          return !['startedAt', 'updatedAt', 'activityType', 'activityId', 'attemptNumber', 'timeTakenSeconds', 'validation'].includes(k);
        });
        items = filteredKeys.map(function(k) { return resp[k]; });
      }
      var count = items.length || 0;
      var displayList = items.map(function(it) { return escapeHtml(String(it)); }).join(', ');
      return `<div class="small"><span class="badge bg-primary-subtle text-primary border border-primary-subtle me-1">${count} Verified</span> <span class="text-secondary" style="font-size: 7.5pt;">${displayList}</span></div>`;
    }

    // C. Information card / Project charter: Clean 1-line verified badge
    if (component === 'information-card' || component === 'project-charter') {
      var spec = (resp && resp.specification) ? ` (${escapeHtml(resp.specification)})` : '';
      return `<span class="badge bg-secondary-subtle text-secondary border">Charter Verified${spec}</span>`;
    }

    // D. Guided Workflows: Concise completion status and essential engineering results
    if (component && (component.includes('guided-workflow') || component.includes('workflow'))) {
      if (typeof resp === 'object' && !Array.isArray(resp) && resp !== null) {
        var wfKeys = Object.keys(resp).filter(function(k) {
          var v = resp[k];
          return v !== '' && v !== null && v !== undefined && !['startedAt', 'updatedAt', 'activityType', 'activityId', 'attemptNumber', 'timeTakenSeconds'].includes(k);
        });
        if (wfKeys.length === 0) {
          return '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">Workflow Completed</span>';
        }
        var wfTokens = [];
        wfKeys.slice(0, 4).forEach(function(k) {
          var val = resp[k];
          var displayVal = (typeof val === 'object' && val !== null && val.value !== undefined) ? val.value : val;
          var label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          label = label.charAt(0).toUpperCase() + label.slice(1);
          wfTokens.push(`<span class="response-kv"><strong class="text-dark">${escapeHtml(label)}:</strong> <code class="text-dark bg-light px-1 rounded border">${escapeHtml(String(displayVal))}</code></span>`);
        });
        return `<div class="small d-flex flex-wrap gap-1 align-items-center"><span class="badge bg-success-subtle text-success-emphasis border border-success-subtle me-1">Workflow Completed</span>${wfTokens.join(' ')}</div>`;
      }
      return '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">Workflow Completed</span>';
    }

    // E. Calculations / Engineering Calculations: Show non-empty inputs, intermediate, results, and prominent FOS
    if (component && (component.includes('calculation') || component.includes('inputs') || component.includes('load-path'))) {
      if (typeof resp === 'object' && !Array.isArray(resp)) {
        var calcKeys = Object.keys(resp).filter(function(k) {
          var v = resp[k];
          return v !== '' && v !== null && v !== undefined && !['startedAt', 'updatedAt', 'activityType', 'activityId', 'attemptNumber', 'timeTakenSeconds'].includes(k);
        });
        if (calcKeys.length === 0) {
          return '<span class="badge bg-secondary-subtle text-secondary border">Calculations Verified</span>';
        }

        var fosBadge = '';
        var otherTokens = [];
        calcKeys.forEach(function(k) {
          var lk = k.toLowerCase();
          var v = resp[k];
          if (lk.includes('fos') || lk.includes('factorofsafety')) {
            fosBadge = `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle me-1">FOS: ${escapeHtml(String(v))}</span>`;
          } else if (lk.includes('verdict') || lk.includes('safetyassessment')) {
            fosBadge += `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle me-1">${escapeHtml(String(v))}</span>`;
          } else {
            var label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
            label = label.charAt(0).toUpperCase() + label.slice(1);
            otherTokens.push(`<span class="response-kv"><strong class="text-dark">${escapeHtml(label)}:</strong> <code class="text-dark bg-light px-1 rounded border">${escapeHtml(String(v))}</code></span>`);
          }
        });

        return `<div class="small d-flex flex-wrap gap-1 align-items-center">${fosBadge}${otherTokens.join(' ')}</div>`;
      }
    }

    // F. Faculty-Assessed Responses (Reflection, Recommendation, Decision, Engineering Decision Canvas, Selection Justifications)
    // PRESERVE COMPLETE STUDENT ANSWER 100% UNCHANGED WITHOUT TRUNCATION OR PARAPHRASING
    if (typeof resp === 'object' && !Array.isArray(resp)) {
      var allKeys = Object.keys(resp).filter(function(k) {
        return !['startedAt', 'updatedAt', 'activityType', 'activityId', 'attemptNumber', 'timeTakenSeconds', 'validation'].includes(k);
      });

      var decisionHtml = '';
      var textParts = [];

      // Check if selection-cards has a selected material or component
      if (component && (component.includes('selection') || component === 'selection-cards')) {
        var selItem = resp.selection || resp.selected || resp.material || resp.choice || '';
        if (selItem) {
          decisionHtml = `<div class="mb-1"><span class="badge bg-primary-subtle text-primary border fw-bold">${escapeHtml(String(selItem))}</span></div>`;
        }
      }

      allKeys.forEach(function(k) {
        var v = resp[k];
        if (v === '' || v === null || v === undefined) return;
        if (k === 'selection' || k === 'selected' || k === 'material' || k === 'choice') return;
        var vStr = (typeof v === 'object') ? JSON.stringify(v) : String(v);

        if (k === 'decision' || k === 'verdict') {
          decisionHtml += `<div class="mb-1"><span class="badge bg-primary-subtle text-primary border fw-bold">${escapeHtml(vStr)}</span></div>`;
        } else if (/^(r\d+|q\d+|reflection|justification|recommendation|recommendations|summary|report|reasoning)$/i.test(k)) {
          var prefix = (allKeys.length > 2 && /^(r\d+|q\d+)$/i.test(k)) ? `<strong class="text-dark">[${k.toUpperCase()}]: </strong>` : '';
          textParts.push(`<div>${prefix}${escapeHtml(vStr)}</div>`);
        } else {
          var label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          label = label.charAt(0).toUpperCase() + label.slice(1);
          textParts.push(`<span class="response-kv"><strong class="text-dark">${escapeHtml(label)}:</strong> <code class="text-dark bg-light px-1 rounded border">${escapeHtml(vStr)}</code></span>`);
        }
      });

      if (decisionHtml || textParts.length > 0) {
        return `<div class="small text-secondary faculty-assessed-content" style="line-height: 1.25; white-space: pre-wrap;">${decisionHtml}${textParts.join(' ')}</div>`;
      }
    }

    if (Array.isArray(resp)) {
      if (resp.length === 0) {
        return '<span class="badge bg-secondary-subtle text-secondary border">Reviewed / Completed</span>';
      }
      return resp.map(function(item) { return formatResponseValue(item); }).join(', ');
    }

    if (typeof resp === 'string' || typeof resp === 'number' || typeof resp === 'boolean') {
      return `<code class="text-dark bg-light px-2 py-1 rounded border">${escapeHtml(String(resp))}</code>`;
    }

    return escapeHtml(String(resp));
  }

  /**
   * Helper to partition an activity array into discrete pages.
   */
  function partitionActivities(activities) {
    var DS = (typeof DataService !== 'undefined' ? DataService : (typeof window !== 'undefined' ? window.DataService : (typeof global !== 'undefined' ? global.DataService : null)));
    if (!DS && typeof require === 'function') {
      try { DS = require('./data-service.js'); } catch (e) {}
    }
    if (DS && DS.partitionActivities) {
      return DS.partitionActivities(activities);
    }
    if (!activities || activities.length === 0) return [[]];
    return [activities];
  }

  /**
   * Helper to format table rows for a batch of activities.
   */
  function renderActivityRows(activitiesSlice, startIndex) {
    if (!activitiesSlice || activitiesSlice.length === 0) {
      return '<tr><td colspan="5" class="text-muted">No activity responses recorded in this submission.</td></tr>';
    }

    return activitiesSlice.map(function(act, idx) {
      var globalIdx = (startIndex || 0) + idx;
      var isComplete = act.status === 'completed' || act.completed;
      var formattedResp = formatResponseValue(act.response, act.component);
      var maxMarks = act.cceMarks !== undefined ? Number(act.cceMarks).toFixed(1) : "-";

      return `
        <tr>
          <td class="text-center fw-bold text-muted" style="width: 45px;">${globalIdx + 1}</td>
          <td>
            <strong class="text-dark">${escapeHtml(act.title || ('Activity ' + (globalIdx + 1)))}</strong>
            <div class="text-muted small">${escapeHtml(act.component || "activity")}</div>
          </td>
          <td>${formattedResp}</td>
          <td class="text-center" style="width: 110px;">
            ${isComplete
              ? '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">Completed</span>'
              : '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Pending</span>'}
          </td>
          <td class="text-center fw-semibold text-secondary" style="width: 85px;">${maxMarks}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Renders a single assignment report in the exact MEILP modal/document style.
   * Supports multi-page pagination for assignments with extensive activity lists.
   */
  function renderSubmittedSlot(slot, pkg) {
    var student = pkg.studentInfo;
    var sub = slot.activeSubmission;
    var assign = slot.assignment;

    var collegeName = student.collegeName || "Ajeenkya D.Y. Patil School of Engineering, Lohegaon";
    var facultyName = student.facultyName || "Faculty In-Charge";

    // Preserve original student details from authoritative MEILP submission on individual assignment pages
    var dispStudentName = (sub && sub.studentName) ? sub.studentName : student.studentName;
    var dispRollNumber = (sub && sub.rollNumber) ? sub.rollNumber : student.rollNumber;
    var dispDivision = (sub && sub.division) ? sub.division : student.division;
    var subId = (sub && sub.submissionId) ? sub.submissionId : `${assign.id.toLowerCase()}-${dispRollNumber}-${new Date().getTime()}`;
    var subHash = (sub && sub.submissionHash) ? sub.submissionHash : "";

    var activities = (sub && sub.activityResponses) ? sub.activityResponses : [];
    var compAct = activities.length > 0 ? activities.filter(function(a) { return a.status === 'completed' || a.completed; }).length : 0;
    var totAct = activities.length;
    var compPct = (sub && sub.completionPercent !== undefined) ? sub.completionPercent : Math.round((compAct / (totAct || 1)) * 100);

    var lateNoticeHtml = '';
    if (slot.isLate === true) {
      lateNoticeHtml = `
        <div class="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2 rounded-3">
          <span style="font-size: 16px;">⚠️</span>
          <div><strong>LATE SUBMISSION CONFIRMED:</strong> Recorded after assignment due date.</div>
        </div>
      `;
    }

    var activityPages = partitionActivities(activities);
    var pageCount = activityPages.length;
    var sectionParts = [];
    var runningActivityIndex = 0;

    for (var p = 0; p < pageCount; p++) {
      var currentPageNum = slot.pageNo + p;
      var isFirst = (p === 0);
      var isLast = (p === pageCount - 1);
      var currentActivities = activityPages[p];
      var activityRows = renderActivityRows(currentActivities, runningActivityIndex);
      runningActivityIndex += (currentActivities.length > 0 ? currentActivities.length : 4);

      if (isFirst) {
        // Page 1 of this assignment (Full header, title, student profile, summary, activities)
        sectionParts.push(`
          <section class="report-page assignment-page" data-page="${currentPageNum}">
            <div class="page-corner-counter no-print">Page ${currentPageNum} of ${pkg.totalPages}</div>

            <div class="student-report-doc p-2 p-md-3 rounded-3 border">
              
              <!-- Report Official Header (Exact MEILP Style) -->
              <div class="student-report-header text-center pb-2 mb-2">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                  <div class="text-start">
                    <span class="badge bg-dark text-white px-2 py-1 rounded-pill mb-1 d-inline-block">DES • MEILP</span>
                    <h4 class="h6 fw-bold text-dark mb-0 d-inline-block ms-1">${escapeHtml(collegeName)}</h4>
                    <p class="text-muted small mb-0">Department of Mechanical Engineering</p>
                  </div>
                  <div class="text-end">
                    <div class="badge bg-primary text-white px-3 py-1 rounded-2 text-uppercase fw-bold student-report-badge">
                      ${escapeHtml(assign.id)}: REPORT
                    </div>
                    <div class="text-muted small mt-1">Date: ${escapeHtml((sub && sub.submittedDateStr) || '—')}</div>
                  </div>
                </div>
                <div class="p-2 bg-light rounded-3 text-center border title-box">
                  <h3 class="h6 fw-bold text-primary mb-1">${escapeHtml(assign.title)}</h3>
                  <div class="text-secondary small">
                    Course: <strong>${escapeHtml(assign.courseCode || "PCC303-MEC")}</strong> | 
                    Max CCE Marks: <strong>${Number(assign.cceMarks || 12).toFixed(1)}</strong>
                    ${pageCount > 1 ? ` | <span class="badge bg-secondary-subtle text-secondary-emphasis border">Page 1 of ${pageCount}</span>` : ''}
                  </div>
                </div>
              </div>

              ${lateNoticeHtml}

              <!-- Student & Submission Profile Card (Exact MEILP Style - Preserving actual submission record details) -->
              <div class="card mb-2 border shadow-none bg-light-subtle student-profile-card">
                <div class="card-header bg-white py-1 px-3 fw-bold text-dark border-bottom small">
                  <span class="text-primary me-2">🪪</span>Student &amp; Submission Profile
                </div>
                <div class="card-body p-2">
                  <div class="row g-2 small">
                    <div class="col-sm-6 col-md-4">
                      <span class="text-muted d-block">Student Name:</span>
                      <strong class="text-dark">${escapeHtml(dispStudentName)}</strong>
                    </div>
                    <div class="col-sm-6 col-md-4">
                      <span class="text-muted d-block">Roll Number / PRN:</span>
                      <strong class="text-dark">${escapeHtml(dispRollNumber)}</strong>
                    </div>
                    <div class="col-sm-6 col-md-4">
                      <span class="text-muted d-block">Class / Div / Batch:</span>
                      <strong class="text-dark">${escapeHtml([student.class, dispDivision].filter(Boolean).join(" / ") || "A")}</strong>
                    </div>
                    <div class="col-sm-6 col-md-4">
                      <span class="text-muted d-block">Assigned Faculty:</span>
                      <strong class="text-dark">${escapeHtml(facultyName)}</strong>
                    </div>
                    <div class="col-sm-6 col-md-4">
                      <span class="text-muted d-block">Academic Year / Attempt:</span>
                      <strong class="text-dark">${escapeHtml(student.academicYear || "2026-27")} • Individual</strong>
                    </div>
                    <div class="col-sm-6 col-md-4">
                      <span class="text-muted d-block">Submission ID:</span>
                      <code class="text-primary fw-bold">${escapeHtml(subId)}</code>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Performance Summary Strip (Exact MEILP Style) -->
              <div class="row g-2 mb-2 text-center performance-strip-row">
                <div class="col-4">
                  <div class="p-2 border rounded-2 bg-light">
                    <span class="text-muted small d-block mb-1">Activities Completed</span>
                    <h4 class="h6 fw-bold text-dark mb-0">${compAct} / ${totAct}</h4>
                  </div>
                </div>
                <div class="col-4">
                  <div class="p-2 border rounded-2 bg-light">
                    <span class="text-muted small d-block mb-1">Completion Rate</span>
                    <h4 class="h6 fw-bold text-success mb-0">${compPct}%</h4>
                  </div>
                </div>
                <div class="col-4">
                  <div class="p-2 border rounded-2 bg-light">
                    <span class="text-muted small d-block mb-1">CCE Weightage</span>
                    <h4 class="h6 fw-bold text-primary mb-0">${Number(assign.cceMarks || 12).toFixed(1)} Marks</h4>
                  </div>
                </div>
              </div>

              <!-- Detailed Activity Submissions Table (Exact MEILP Style) -->
              <div class="mb-2">
                <h6 class="fw-bold text-dark mb-1">Detailed Activity Submissions ${pageCount > 1 ? '(Part 1)' : ''}</h6>
                <div class="table-responsive">
                  <table class="table table-bordered table-sm align-middle student-report-table mb-0">
                    <thead>
                      <tr>
                        <th class="text-center" style="width: 40px;">#</th>
                        <th style="width: 190px;">ACTIVITY / MODULE</th>
                        <th>SUBMITTED ENGINEERING VALUES / DECISIONS</th>
                        <th class="text-center" style="width: 95px;">STATUS</th>
                        <th class="text-center" style="width: 75px;">MAX MARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${activityRows}
                    </tbody>
                  </table>
                </div>
              </div>

              ${isLast ? `
              <!-- Academic Sign-off / Lab Assessment Box (Exact MEILP Style) -->
              <div class="student-report-signoff p-2 mt-2">
                <div class="row align-items-end g-2 text-center text-md-start">
                  <div class="col-md-4">
                    <div class="border-top border-dark pt-1">
                      <span class="small text-muted d-block">Student Signature</span>
                      <strong>${escapeHtml(dispStudentName)}</strong>
                    </div>
                  </div>
                  <div class="col-md-4 text-center">
                    <div class="p-1 border rounded bg-white d-inline-block px-3">
                      <span class="small text-muted d-block">Marks Awarded</span>
                      <strong class="fs-6 text-primary">______ / ${Number(assign.cceMarks || 12).toFixed(1)}</strong>
                    </div>
                  </div>
                  <div class="col-md-4 text-md-end">
                    <div class="border-top border-dark pt-1">
                      <span class="small text-muted d-block">Faculty Evaluator Signature</span>
                      <strong>${escapeHtml(facultyName)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              ` : ''}

              <!-- Security Hash & Footer (Exact MEILP Style) -->
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 pt-1 border-top text-muted small">
                <span>Verification Hash: <code>${subHash ? escapeHtml(subHash) : (pkg.studentInfo.isOfficialRoster === false ? "Recorded submission; identity unconfirmed" : "Recorded submission; hash unavailable")}</code></span>
                <span>DES Academic Verification System • MEILP v2.0 • Page ${currentPageNum} of ${pkg.totalPages}</span>
              </div>

            </div>
          </section>
        `);
      } else {
        // Continuation Page (Clear continuation header, compact student breadcrumb, repeated table header, and final signoff box)
        sectionParts.push(`
          <section class="report-page assignment-page continuation-page" data-page="${currentPageNum}">
            <div class="page-corner-counter no-print">Page ${currentPageNum} of ${pkg.totalPages}</div>

            <div class="student-report-doc p-2 p-md-3 rounded-3 border">
              
              <!-- Continuation Header with canonical Assignment Code -->
              <div class="student-report-header pb-2 mb-2">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                  <div class="text-start">
                    <span class="badge bg-dark text-white px-2 py-1 rounded me-1">DES • MEILP</span>
                    <strong class="text-dark small">${escapeHtml(collegeName)}</strong>
                  </div>
                  <div class="text-end">
                    <div class="badge bg-primary text-white px-2 py-1 rounded text-uppercase fw-bold">
                      ${escapeHtml(assign.id)}: CONTINUATION
                    </div>
                  </div>
                </div>
                <div class="p-2 bg-light rounded-3 d-flex justify-content-between align-items-center border title-box">
                  <div>
                    <span class="badge bg-primary me-1">${escapeHtml(assign.id)}</span>
                    <strong class="text-primary small">${escapeHtml(assign.title)}</strong>
                    <span class="badge bg-secondary-subtle text-secondary-emphasis border ms-1">Continuation • Page ${p + 1} of ${pageCount}</span>
                  </div>
                  <div class="text-secondary small">
                    Course: <strong>${escapeHtml(assign.courseCode || "PCC303-MEC")}</strong>
                  </div>
                </div>
              </div>

              <!-- Compact Student Breadcrumb -->
              <div class="card mb-2 border shadow-none bg-light-subtle student-breadcrumb">
                <div class="card-body py-1 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2 small">
                  <span><span class="text-muted">Student Name:</span> <strong class="text-dark">${escapeHtml(dispStudentName)}</strong></span>
                  <span><span class="text-muted">Roll:</span> <strong class="text-dark">${escapeHtml(dispRollNumber)}</strong></span>
                  <span><span class="text-muted">Div:</span> <strong class="text-dark">${escapeHtml(dispDivision)}</strong></span>
                  <span><span class="text-muted">Submission ID:</span> <code>${escapeHtml(subId)}</code></span>
                </div>
              </div>

              <!-- Detailed Activity Submissions Table with Repeated Headers -->
              <div class="mb-2">
                <h6 class="fw-bold text-dark mb-1">Detailed Activity Submissions (Continuation)</h6>
                <div class="table-responsive">
                  <table class="table table-bordered table-sm align-middle student-report-table mb-0">
                    <thead>
                      <tr>
                        <th class="text-center" style="width: 40px;">#</th>
                        <th style="width: 190px;">ACTIVITY / MODULE</th>
                        <th>SUBMITTED ENGINEERING VALUES / DECISIONS</th>
                        <th class="text-center" style="width: 95px;">STATUS</th>
                        <th class="text-center" style="width: 75px;">MAX MARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${activityRows}
                    </tbody>
                  </table>
                </div>
              </div>

              ${isLast ? `
              <!-- Academic Sign-off / Lab Assessment Box on Final Continuation Page -->
              <div class="student-report-signoff p-2 mt-2">
                <div class="row align-items-end g-2 text-center text-md-start">
                  <div class="col-md-4">
                    <div class="border-top border-dark pt-1">
                      <span class="small text-muted d-block">Student Signature</span>
                      <strong>${escapeHtml(dispStudentName)}</strong>
                    </div>
                  </div>
                  <div class="col-md-4 text-center">
                    <div class="p-1 border rounded bg-white d-inline-block px-3">
                      <span class="small text-muted d-block">Marks Awarded</span>
                      <strong class="fs-6 text-primary">______ / ${Number(assign.cceMarks || 12).toFixed(1)}</strong>
                    </div>
                  </div>
                  <div class="col-md-4 text-md-end">
                    <div class="border-top border-dark pt-1">
                      <span class="small text-muted d-block">Faculty Evaluator Signature</span>
                      <strong>${escapeHtml(facultyName)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              ` : ''}

              <!-- Security Hash & Footer -->
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 pt-1 border-top text-muted small">
                <span>Verification Hash: <code>${subHash ? escapeHtml(subHash) : (pkg.studentInfo.isOfficialRoster === false ? "Recorded submission; identity unconfirmed" : "Recorded submission; hash unavailable")}</code></span>
                <span>DES Academic Verification System • MEILP v2.0 • Page ${currentPageNum} of ${pkg.totalPages}</span>
              </div>

            </div>
          </section>
        `);
      }
    }

    return sectionParts.join('\n');
  }

  /**
   * Renders an unsubmitted assignment slot matching the exact MEILP design language.
   */
  function renderNotSubmittedSlot(slot, pkg) {
    var student = pkg.studentInfo;
    var assign = slot.assignment;
    var collegeName = student.collegeName || "Ajeenkya D.Y. Patil School of Engineering, Lohegaon";
    var facultyName = student.facultyName || "Faculty In-Charge";

    return `
      <section class="report-page assignment-page not-submitted-page" data-page="${slot.pageNo}">
        <div class="page-corner-counter no-print">Page ${slot.pageNo} of ${pkg.totalPages}</div>

        <div class="student-report-doc p-2 p-md-3 rounded-3 border" style="border-color: #fca5a5 !important;">
          
          <!-- Report Header -->
          <div class="student-report-header text-center pb-2 mb-2">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
              <div class="text-start">
                <span class="badge bg-danger text-white px-2 py-1 rounded-pill mb-1 d-inline-block">DEFICIT RECORD</span>
                <h4 class="h6 fw-bold text-dark mb-0 d-inline-block ms-1">${escapeHtml(collegeName)}</h4>
                <p class="text-muted small mb-0">Department of Mechanical Engineering</p>
              </div>
              <div class="text-end">
                <div class="badge bg-secondary text-white px-3 py-1 rounded-2 text-uppercase fw-bold student-report-badge">
                  ${escapeHtml(assign.id)}: DEFICIT
                </div>
                <div class="text-danger small mt-1 fw-bold">STATUS: NOT SUBMITTED</div>
              </div>
            </div>
            <div class="p-2 bg-light rounded-3 text-center border title-box">
              <h3 class="h6 fw-bold text-dark mb-1">${escapeHtml(assign.title)}</h3>
              <div class="text-secondary small">
                Course: <strong>${escapeHtml(assign.courseCode || "PCC303-MEC")}</strong> | 
                Max CCE Marks: <strong>${Number(assign.cceMarks || 12).toFixed(1)}</strong>
              </div>
            </div>
          </div>

          <!-- Prominent Deficit Notice -->
          <div class="alert alert-danger py-2 px-3 mb-2 rounded-3 text-center" style="background: #fff1f2; border: 1px dashed #f43f5e;">
            <div class="d-flex align-items-center justify-content-center gap-2">
              <span style="font-size: 16px;">🚫</span>
              <strong class="text-danger">ASSIGNMENT NOT SUBMITTED</strong>
              <span class="text-muted small">— Slot ${slot.srNo} retained to preserve portfolio sequence.</span>
            </div>
          </div>

          <!-- Student Profile Card -->
          <div class="card mb-2 border shadow-none bg-light-subtle student-profile-card">
            <div class="card-header bg-white py-1 px-3 fw-bold text-dark border-bottom small">
              <span class="text-primary me-2">🪪</span>Student &amp; Submission Profile
            </div>
            <div class="card-body p-2">
              <div class="row g-2 small">
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Student Name:</span>
                  <strong class="text-dark">${escapeHtml(student.studentName)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Roll Number / PRN:</span>
                  <strong class="text-dark">${escapeHtml(student.rollNumber)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Class / Div:</span>
                  <strong class="text-dark">${escapeHtml([student.class, student.division].filter(Boolean).join(" / ") || "A")}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Assigned Faculty:</span>
                  <strong class="text-dark">${escapeHtml(facultyName)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Academic Year:</span>
                  <strong class="text-dark">${escapeHtml(student.academicYear || "2026-27")}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Record State:</span>
                  <span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Defaulter / Missing</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Faculty Defaulter Action Box -->
          <div class="mb-2">
            <h6 class="fw-bold text-dark mb-1">Faculty Assessment &amp; Defaulter Review</h6>
            <table class="table table-bordered table-sm align-middle student-report-table mb-0">
              <thead>
                <tr>
                  <th>REASON FOR NON-SUBMISSION / FACULTY REMARKS</th>
                  <th class="text-center" style="width: 130px;">RECORDED MARKS</th>
                  <th class="text-center" style="width: 120px;">RE-SUBMISSION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="height: 35px; vertical-align: top;" class="p-1">
                    <div style="border-bottom: 1px dotted #cbd5e1; height: 16px;"></div>
                    <div style="border-bottom: 1px dotted #cbd5e1; height: 16px;"></div>
                  </td>
                  <td class="text-center fw-bold text-danger fs-6 align-middle">0.0 / ${Number(assign.cceMarks || 12).toFixed(1)}</td>
                  <td class="text-center align-middle small text-muted">[ &nbsp; ] Permitted<br>[ &nbsp; ] Rejected</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Academic Sign-off Box -->
          <div class="student-report-signoff p-2 mt-2">
            <div class="row align-items-end g-2 text-center text-md-start">
              <div class="col-md-4">
                <div class="border-top border-dark pt-1">
                  <span class="small text-muted d-block">Student Acknowledgment</span>
                  <strong>${escapeHtml(student.studentName)}</strong>
                </div>
              </div>
              <div class="col-md-4 text-center">
                <div class="p-1 border rounded bg-white d-inline-block px-3">
                  <span class="small text-muted d-block">Marks Recorded</span>
                  <strong class="fs-6 text-danger">0.0 / ${Number(assign.cceMarks || 12).toFixed(1)}</strong>
                </div>
              </div>
              <div class="col-md-4 text-md-end">
                <div class="border-top border-dark pt-1">
                  <span class="small text-muted d-block">Faculty In-Charge Signature</span>
                  <strong>${escapeHtml(facultyName)}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 pt-1 border-top text-muted small">
            <span class="text-danger fw-semibold">DEFICIT SLOT RECORD • NO SUBMISSION RECEIVED</span>
            <span>DES Academic Verification System • MEILP v2.0 • Page ${slot.pageNo} of ${pkg.totalPages}</span>
          </div>

        </div>
      </section>
    `;
  }

  /**
   * Renders Page 1: Official Index Page in matching aesthetic.
   */
  function renderIndexPage(pkg) {
    var student = pkg.studentInfo;
    var collegeName = student.collegeName || "Ajeenkya D.Y. Patil School of Engineering, Lohegaon";

    var rowsHtml = pkg.indexRows.map(function (row) {
      var statusBadge = '';
      if (row.statusRemark === 'LATE Submission') {
        statusBadge = '<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle fw-bold">LATE Submission</span>';
      } else if (row.statusRemark === 'Not Submitted') {
        statusBadge = '<span class="badge bg-secondary-subtle text-secondary border">Not Submitted</span>';
      } else {
        statusBadge = '<span class="text-muted">—</span>';
      }

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${row.srNo}</td>
          <td>
            <span class="badge bg-dark text-white me-1">${escapeHtml(row.assignmentId)}</span>
            <strong class="text-dark">${escapeHtml(row.assignmentTitle)}</strong>
            ${row.attemptCount > 1 ? `<span class="badge bg-info-subtle text-info-emphasis border ms-1">Att: ${row.attemptCount}</span>` : ''}
          </td>
          <td class="text-center">${escapeHtml(row.submissionDate)}</td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-center fw-bold text-primary">Page ${row.pageNo}</td>
          <td class="text-center">
            <div style="border-bottom: 1px dotted #94a3b8; height: 10px; width: 85%; margin: 0 auto;"></div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <section class="report-page index-page" data-page="1">
        <div class="page-corner-counter no-print">Page 1 of ${pkg.totalPages}</div>

        <div class="student-report-doc p-2 rounded-3 border">
          
          <!-- Header -->
          <div class="student-report-header text-center pb-2 mb-2">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
              <div class="text-start">
                <span class="badge bg-dark text-white px-2 py-1 rounded-pill mb-1 d-inline-block">DES • MEILP</span>
                <h4 class="h5 fw-bold text-dark mb-0">${escapeHtml(collegeName)}</h4>
                <p class="text-muted small mb-0">Department of Mechanical Engineering</p>
              </div>
              <div class="text-end">
                <div class="badge bg-primary text-white px-3 py-1 rounded-3 text-uppercase fw-bold student-report-badge">
                  INDEX: CCE PORTFOLIO
                </div>
                <div class="text-muted small mt-1">Academic Year: ${escapeHtml(student.academicYear || "2026–2027")}</div>
              </div>
            </div>
            <div class="p-2 bg-light rounded-3 text-center border">
              <h3 class="h6 fw-bold text-primary mb-1">INDEX OF CONTINUOUS ASSESSMENT ASSIGNMENTS</h3>
              <div class="text-secondary small">
                Subject: <strong>${escapeHtml(student.subjectName || "Design of Machine Elements")}</strong> | 
                Total Assignments: <strong>22 Slots (${pkg.totalPages} Pages)</strong>
              </div>
            </div>
          </div>

          <!-- Student Profile Card -->
          <div class="card mb-2 border shadow-none bg-light-subtle">
            <div class="card-header bg-white py-1 px-3 fw-bold text-dark border-bottom small">
              <span class="text-primary me-2">🪪</span>Student Academic Details
            </div>
            <div class="card-body p-2">
              <div class="row g-2 small">
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Student Name:</span>
                  <strong class="text-dark fs-6">${escapeHtml(student.studentName)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Roll Number / PRN:</span>
                  <strong class="text-dark">${escapeHtml(student.rollNumber)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Class:</span>
                  <strong class="text-dark">${escapeHtml(student.class)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Division:</span>
                  <strong class="text-dark">${escapeHtml(student.division)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Academic Year:</span>
                  <strong class="text-dark">${escapeHtml(student.academicYear)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Branch:</span>
                  <strong class="text-dark">${escapeHtml(student.branch)}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Subject Name:</span>
                  <strong class="text-dark">${escapeHtml(student.subjectName || "Design of Machine Elements")}</strong>
                </div>
                <div class="col-sm-6 col-md-4">
                  <span class="text-muted d-block">Submission Progress:</span>
                  <strong class="text-success">${pkg.submittedCount} / 22 Completed</strong> 
                  ${pkg.lateCount > 0 ? `<span class="badge bg-warning-subtle text-warning-emphasis ms-1">${pkg.lateCount} Late</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Index Table with Exactly 6 Columns -->
          <div class="mb-2">
            <div class="table-responsive">
              <table class="table table-bordered table-sm align-middle student-report-table mb-0">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 45px;">Sr. No.</th>
                    <th>Name of the Assignment</th>
                    <th class="text-center" style="width: 110px;">Date of Submission</th>
                    <th class="text-center" style="width: 130px;">Status / Remarks</th>
                    <th class="text-center" style="width: 85px;">Page No.</th>
                    <th class="text-center" style="width: 120px;">Faculty Signature</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Academic Sign-off Box -->
          <div class="student-report-signoff p-2 mt-2">
            <div class="row align-items-end g-2 text-center text-md-start">
              <div class="col-md-4">
                <div class="border-top border-dark pt-1">
                  <span class="small text-muted d-block">Student Signature</span>
                  <strong>${escapeHtml(student.studentName)}</strong>
                </div>
              </div>
              <div class="col-md-4 text-center">
                <div class="border-top border-dark pt-1">
                  <span class="small text-muted d-block">Subject Teacher Signature</span>
                  <strong>Faculty In-Charge</strong>
                </div>
              </div>
              <div class="col-md-4 text-md-end">
                <div class="border-top border-dark pt-1">
                  <span class="small text-muted d-block">Head of Department</span>
                  <strong>Department of Mechanical Engg.</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 pt-1 border-top text-muted small">
            <span>${pkg.studentInfo.isOfficialRoster === false ? "Unlisted student portfolio: attendance match unconfirmed" : "Official roster portfolio: recorded assessment submissions"}</span>
            <span>DES Academic Verification System • MEILP v2.0 • Page 1 of ${pkg.totalPages}</span>
          </div>

        </div>
      </section>
    `;
  }

  /**
   * Assembles the complete 23-page printable HTML string.
   */
  function renderCompletePackage(pkg) {
    if (!pkg) return '<div class="alert alert-danger">No student report package data provided.</div>';

    var htmlParts = [];
    htmlParts.push(renderIndexPage(pkg));

    for (var i = 0; i < pkg.assignmentSlots.length; i++) {
      var slot = pkg.assignmentSlots[i];
      if (slot.isSubmitted) {
        htmlParts.push(renderSubmittedSlot(slot, pkg));
      } else {
        htmlParts.push(renderNotSubmittedSlot(slot, pkg));
      }
    }

    return htmlParts.join('\n');
  }

  /**
   * Renders only a single assignment slot in this exact style.
   */
  function renderSingleAssignmentReport(slot, pkg) {
    if (!slot || !pkg) return '';
    if (slot.isSubmitted) {
      return renderSubmittedSlot(slot, pkg);
    }
    return renderNotSubmittedSlot(slot, pkg);
  }

  return {
    escapeHtml: escapeHtml,
    formatResponseValue: formatResponseValue,
    partitionActivities: partitionActivities,
    renderIndexPage: renderIndexPage,
    renderSubmittedSlot: renderSubmittedSlot,
    renderNotSubmittedSlot: renderNotSubmittedSlot,
    renderCompletePackage: renderCompletePackage,
    renderSingleAssignmentReport: renderSingleAssignmentReport
  };
}));
