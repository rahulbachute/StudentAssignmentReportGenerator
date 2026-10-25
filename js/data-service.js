/**
 * Standalone Student Assignment Report Generator
 * File: js/data-service.js
 * 
 * Independent data management service:
 * - Ingests submissions from Google Apps Script read-only endpoint, local JSON file, or built-in demo data.
 * - Enforces access authorization without exposing hard-coded secrets.
 * - Groups submissions student-wise by Roll Number.
 * - Handles multiple attempts per assignment without silently discarding history.
 * - Normalizes prospective late status vs legacy unflagged status.
 * - Prepares the 22 assignment slots for 23-page report generation.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Registry = require('./assignment-registry.js');
    var Roster = require('./official-roster.js');
    module.exports = factory(Registry, Roster, require('./identity-policy.js'));
  } else {
    root.DataService = factory(root.AssignmentRegistry, root.OfficialRoster, root.PortfolioIdentity);
  }
}(typeof self !== 'undefined' ? self : this, function (AssignmentRegistry, OfficialRoster, PortfolioIdentity) {
  'use strict';

  var DataService = function () {
    this.rawSubmissions = [];
    this.evaluations = [];
    this.studentsMap = {};          // Keyed by unique student.id ('TE-A-530501-1', etc.)
    this.unmatchedStudentsMap = {}; // Keyed by rollNumber or name for non-roster items
    this.unmatchedSubmissions = [];  // Non-matching records flagged for manual review
    this.conflictingSubmissions = []; // Conflicting roll number vs name records flagged for review
    this.ambiguousSubmissions = [];   // Ambiguous candidate records flagged for review
    this.externalSubmissions = [];    // Confirmed external-college submissions excluded from official portfolios
    this.testSubmissions = [];        // Confirmed test and benchmark submissions excluded from official portfolios
    this.identityResolutions = {};    // Separate identity resolution store keyed by submissionId
    this.reconciliationStats = null;
    this.isLoaded = false;

    // Official Roster source tracking
    this.officialRosterSource = 'OFFLINE_FIXTURE'; // 'NONE' | 'EXCEL_IMPORT' | 'OFFLINE_FIXTURE' | 'LIVE_SHEET'
    this.isOfficialRosterLive = false;
    this.activeRoster = (OfficialRoster && OfficialRoster.OFFLINE_FIXTURE_STUDENTS) ? OfficialRoster.OFFLINE_FIXTURE_STUDENTS : [];
    this.activeDuplicateRolls = (OfficialRoster && OfficialRoster.DUPLICATE_ROLLS_TE_B) ? OfficialRoster.DUPLICATE_ROLLS_TE_B : [];

    // MEILP Submissions source and live refresh tracking
    this.submissionsSource = 'NONE'; // 'NONE' | 'LIVE_GOOGLE_SHEETS' | 'OFFLINE_FILE' | 'VERIFIED_DEMO'
    this.isSubmissionsLive = false;
    this.lastRefreshTimestamp = null;
    this.lastRefreshEndpoint = null;
    this.lastRefreshAuthKey = null;
    this.lastRefreshError = null;

    // Persistent configuration and administrator setup tracking
    this.defaultEndpoint = DataService.DEFAULT_SERVICE_URL;
    this.configuredEndpoint = null;
    this.configuredAuthKey = null;
    this.autoConnectEnabled = false;
    this.storageAdapter = null;
    this.httpTransport = null;

    // Student vs Faculty role & active session tracking
    this.activeUserRole = null; // 'STUDENT' | 'FACULTY' | null
    this.authenticatedStudent = null; // Authoritative student identity { srNo, rollNumber, studentName, division, prn, id }

    this.initRoster();
  };

  DataService.CONFIG_STORAGE_KEY = 'DES_REPORT_SERVICE_CONFIG';
  DataService.DEFAULT_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbyt5CQK1ru-Y6NuXLef4qIqfy6rmQM_LKENAd1HdBpkbAwKOoksHYsx_-yb3jSMyUvQgQ/exec';

  /**
   * Normalizes boolean/tri-state late status.
   * Returns:
   *   true  -> confirmed LATE Submission
   *   false -> confirmed ON TIME (remark is blank)
   *   null  -> historical / unavailable (remark is blank)
   */
  DataService.prototype.normalizeLateStatus = function (val) {
    if (val === true || val === 'true' || val === 1 || val === '1') {
      return true;
    }
    if (val === false || val === 'false' || val === 0 || val === '0') {
      return false;
    }
    return null;
  };

  /**
   * Parses a single submission record (from Sheet row, JSON payload, or API object).
   */
  DataService.prototype.parseSubmissionRecord = function (raw) {
    var payload = {};
    if (raw.fullJsonPayload || raw['Full JSON Payload'] || raw.jsonPayload) {
      var jsonStr = raw.fullJsonPayload || raw['Full JSON Payload'] || raw.jsonPayload;
      if (typeof jsonStr === 'string') {
        try { payload = JSON.parse(jsonStr); } catch (e) { payload = {}; }
      } else if (typeof jsonStr === 'object') {
        payload = jsonStr;
      }
    } else if (raw.data && typeof raw.data === 'object') {
      payload = raw.data;
    } else {
      payload = raw;
    }

    var subMeta = payload.submission || {};
    var studentInfo = payload.studentInformation || {};
    var challengeMeta = payload.challengeMetadata || {};
    var submissionData = payload.submissionData || {};

    var rollNumber = String(
      raw.rollNumber || raw['Roll Number'] || studentInfo.rollNumber || raw.studentId || ''
    ).trim();

    var studentName = String(
      raw.studentName || raw['Student Name'] || studentInfo.name || studentInfo.fullName || ''
    ).trim();

    var division = String(
      raw.division || raw['Division'] || studentInfo.division || ''
    ).trim();

    var challengeId = String(
      raw.challengeId || raw['Challenge ID'] || challengeMeta.id || payload.challengeId || ''
    ).trim();

    var challengeTitle = String(
      raw.challengeTitle || raw['Challenge Title'] || challengeMeta.title || ''
    ).trim();

    var attemptNumber = parseInt(
      raw.attemptNumber || raw['Attempt Number'] || raw.attemptNo || raw['Attempt No'] || subMeta.attemptNumber || payload.attemptNumber || 1,
      10
    );
    if (isNaN(attemptNumber) || attemptNumber < 1) attemptNumber = 1;

    // Resolve date
    var timestamp = raw.timestamp || raw['Timestamp'] || subMeta.submittedAt || payload.submittedAt || null;
    var submittedDate = null;
    if (timestamp) {
      var d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        submittedDate = d;
      }
    }

    // Resolve late status according to prospective stamping rules
    var explicitLate = null;
    if (subMeta.isLate !== undefined) {
      explicitLate = this.normalizeLateStatus(subMeta.isLate);
    } else if (subMeta.submittedLate !== undefined) {
      explicitLate = this.normalizeLateStatus(subMeta.submittedLate);
    } else if (raw.isLate !== undefined) {
      explicitLate = this.normalizeLateStatus(raw.isLate);
    } else if (raw.submittedLate !== undefined) {
      explicitLate = this.normalizeLateStatus(raw.submittedLate);
    }

    // Map to canonical assignment
    var canonicalAssignment = AssignmentRegistry.findAssignment(challengeId) ||
                              AssignmentRegistry.findAssignment(challengeTitle) ||
                              AssignmentRegistry.findAssignment(challengeMeta.slug);

    var assignedId = canonicalAssignment ? canonicalAssignment.id : challengeId;
    var assignedTitle = canonicalAssignment ? canonicalAssignment.title : challengeTitle;

    var submissionId = raw.submissionId || raw['Submission ID'] || subMeta.submissionId || ('sub-' + rollNumber + '-' + assignedId);
    var submissionHash = raw.submissionHash || raw['Submission Hash'] || subMeta.submissionHash || '';
    var completionPercent = parseFloat(raw.completionPercent || raw['Completion %'] || submissionData.completionPercent || 100);
    var email = String(raw.email || raw['Email'] || raw['Email (optional)'] || studentInfo.email || '').trim();
    var status = String(raw.status || raw['Status'] || subMeta.status || 'Submitted').trim();

    var reportActivities = Array.isArray(submissionData.activityResponses) ? submissionData.activityResponses.slice() : [];
    var reflection = submissionData.reflection;
    if (reflection && (typeof reflection !== 'object' || Object.keys(reflection).length)) {
      reportActivities.push({ title: 'Submission Reflection', component: 'reflection', response: reflection });
    }
    return {
      sourceSubmissionId: raw.submissionId || raw['Submission ID'] || subMeta.submissionId || '',
      submissionId: submissionId,
      submissionHash: submissionHash,
      prn: PortfolioIdentity.identity(raw).prn,
      rollNumber: rollNumber,
      studentName: studentName,
      division: division,
      challengeId: assignedId,
      challengeTitle: assignedTitle,
      canonicalAssignment: canonicalAssignment,
      attemptNumber: attemptNumber,
      submittedDate: submittedDate,
      submittedDateStr: submittedDate ? submittedDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
      isLate: explicitLate, // true, false, or null
      completionPercent: isNaN(completionPercent) ? 100 : completionPercent,
      email: email,
      status: status,
      activityResponses: reportActivities,
      reflection: submissionData.reflection || [],
      rawPayload: payload
    };
  };

  /**
   * Initializes studentsMap with the active roster students.
   */
  DataService.prototype.initRoster = function () {
    this.studentsMap = {};
    this.unmatchedStudentsMap = {};
    this.unmatchedSubmissions = [];
    this.conflictingSubmissions = [];
    this.ambiguousSubmissions = [];
    this.externalSubmissions = [];
    this.testSubmissions = [];
    this.identityResolutions = {};
    this.reconciliationStats = null;

    var rosterList = this.activeRoster || [];
    for (var i = 0; i < rosterList.length; i++) {
      var s = rosterList[i];
      this.studentsMap[s.id] = {
        id: s.id,
        srNo: s.srNo,
        rollNumber: s.rollNumber,
        studentName: s.studentName,
        division: s.division,
        dseId: s.dseId || null,
        prn: s.prn || null,
        class: AssignmentRegistry.DEFAULT_CLASS,
        branch: AssignmentRegistry.DEFAULT_BRANCH,
        academicYear: AssignmentRegistry.DEFAULT_ACADEMIC_YEAR,
        subjectName: AssignmentRegistry.DEFAULT_SUBJECT,
        submissionsBySlot: {},
        allSubmissions: [],
        isOfficialRoster: true,
        isLiveRoster: this.isOfficialRosterLive
      };
    }


  };

  /**
   * Loads official roster from an Excel workbook (.xlsx).
   * Validates roll numbers, student names, divisions, duplicate records, missing values.
   */
  DataService.prototype.loadRosterFromExcel = function (workbookOrData, callback, xlsxLib) {
    try {
      var parsed = OfficialRoster.parseRosterFromWorkbook(workbookOrData, xlsxLib);
      if (!parsed.success) {
        var errMsg = (parsed.validationErrors && parsed.validationErrors.length > 0)
          ? parsed.validationErrors.join('; ')
          : 'Failed to extract valid roster records from Excel workbook.';
        if (callback) callback(new Error(errMsg));
        return { success: false, error: errMsg };
      }

      this.activeRoster = parsed.students;
      this.activeDuplicateRolls = parsed.duplicateRolls || [];
      this.officialRosterSource = 'EXCEL_IMPORT';
      this.isOfficialRosterLive = true;
      this.initRoster();

      // If submissions were already loaded, re-reconcile against the new roster
      if (this.rawSubmissions && this.rawSubmissions.length > 0) {
        this.loadSubmissionsArray(this.rawSubmissions, this.evaluations);
      }

      if (callback) callback(null, parsed);
      return parsed;
    } catch (err) {
      if (callback) callback(err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Explicitly sets the offline test fixture as the active roster.
   */
  DataService.prototype.loadRosterFromFixture = function () {
    this.activeRoster = (OfficialRoster && OfficialRoster.OFFLINE_FIXTURE_STUDENTS) ? OfficialRoster.OFFLINE_FIXTURE_STUDENTS : [];
    this.activeDuplicateRolls = (OfficialRoster && OfficialRoster.DUPLICATE_ROLLS_TE_B) ? OfficialRoster.DUPLICATE_ROLLS_TE_B : [];
    this.officialRosterSource = 'OFFLINE_FIXTURE';
    this.isOfficialRosterLive = false;
    this.initRoster();

    if (this.rawSubmissions && this.rawSubmissions.length > 0) {
      this.loadSubmissionsArray(this.rawSubmissions, this.evaluations);
    }
    return this.getStudentsSummary();
  };

  /**
   * Explicitly sets a custom roster (e.g. from live Google Sheet or API).
   */
  DataService.prototype.setCustomRoster = function (studentsArray, duplicateRollsArray, sourceName, isLive) {
    if (!Array.isArray(studentsArray) || studentsArray.length === 0) return;

    this.activeRoster = studentsArray;
    if (Array.isArray(duplicateRollsArray)) {
      this.activeDuplicateRolls = duplicateRollsArray;
    } else {
      var rollCounts = {};
      this.activeDuplicateRolls = [];
      for (var i = 0; i < studentsArray.length; i++) {
        var r = String(studentsArray[i].rollNumber || '').trim();
        rollCounts[r] = (rollCounts[r] || 0) + 1;
        if (rollCounts[r] === 2) {
          this.activeDuplicateRolls.push(r);
        }
      }
    }

    this.officialRosterSource = sourceName || 'CUSTOM_ROSTER';
    this.isOfficialRosterLive = isLive === true;
    this.initRoster();

    if (this.rawSubmissions && this.rawSubmissions.length > 0) {
      this.loadSubmissionsArray(this.rawSubmissions, this.evaluations);
    }
  };

  /**
   * Helper: Counts matching string tokens between two token arrays.
   */
  function countCommonTokens(tokensA, tokensB) {
    if (!tokensA || !tokensB) return 0;
    var count = 0;
    for (var i = 0; i < tokensA.length; i++) {
      if (tokensB.indexOf(tokensA[i]) !== -1) {
        count++;
      }
    }
    return count;
  }

  /**
   * Matches exact recorded identities and approved aliases conservatively.
   * Retains diagnostic provenance without merging ambiguous identities.
   */
  DataService.prototype.matchSubmissionToRoster = function (record) {
    var match = PortfolioIdentity.resolve(record, this.activeRoster || [], OfficialRoster);
    if (match.student) match.student = this.studentsMap[match.student.id];
    return match;

  };

  /**
   * Ingests an array of raw submission items and reconciles against the official attendance roster.
   */
  DataService.prototype.loadSubmissionsArray = function (items, evaluations, trustedSelection) {
    if (!Array.isArray(items)) {
      throw new Error('Submissions data must be an array of records.');
    }

    this.rawSubmissions = items;
    this.evaluations = Array.isArray(evaluations) ? evaluations : [];
    this.initRoster();

    var groupSafety = PortfolioIdentity.assessGroups(items, this.activeRoster || [], OfficialRoster);
    var ruleBreakdown = {};
    var matchedRecords = 0;

    for (var i = 0; i < items.length; i++) {
      var record = this.parseSubmissionRecord(items[i]);
      if (!record.rollNumber && !record.studentName) continue;

      var match = this.matchSubmissionToRoster(record);
      if (trustedSelection && trustedSelection.isOfficialRoster !== false && this.isScopedIdentifierAssociation(items[i], trustedSelection, match)) {
        match = { status: 'MATCHED', student: this.studentsMap[trustedSelection.id], rule: 'VERIFIED_IDENTIFIER', reason: 'Server validated the recorded university identifier; credential omitted from public response.' };
      }

      if (match.status === 'MATCHED' && match.student) {
        matchedRecords++;
        ruleBreakdown[match.rule] = (ruleBreakdown[match.rule] || 0) + 1;
        var student = match.student;

        // Store identity resolution separately from raw submission fields
        record.identityResolution = {
          submissionId: record.submissionId,
          challengeId: record.challengeId,
          originalSubmittedIdentifiers: {
            studentName: record.studentName,
            rollNumber: record.rollNumber,
            division: record.division
          },
          resolvedOfficialStudentIdentity: {
            studentName: student.studentName,
            rollNumber: student.rollNumber,
            division: student.division,
            id: student.id,
            dseId: student.dseId || null,
            prn: student.prn || null
          },
          classification: 'MATCHED_OFFICIAL_COLLEGE',
          reconciliationRule: match.rule,
          ruleId: match.ruleId || match.rule,
          reconciliationReason: match.reason,
          resolutionEvidence: match.evidence || match.reason,
          resolvedAt: new Date().toISOString()
        };

        this.identityResolutions[record.submissionId] = record.identityResolution;
        student.allSubmissions.push(record);

        var slotId = record.challengeId;
        if (!student.submissionsBySlot[slotId]) {
          student.submissionsBySlot[slotId] = [];
        }
        student.submissionsBySlot[slotId].push(record);
      } else {
        if (match.status === 'AMBIGUOUS') this.ambiguousSubmissions.push({ record: record, match: match });
        else if (match.status === 'CONFLICT') this.conflictingSubmissions.push({ record: record, match: match });
        else this.unmatchedSubmissions.push({ record: record, match: match });
        var unKey = PortfolioIdentity.key(record);
        if (!this.unmatchedStudentsMap[unKey]) {
          this.unmatchedStudentsMap[unKey] = {
            id: unKey, rollNumber: record.rollNumber || 'Not Available',
            studentName: record.studentName || 'Not Available', division: record.division || 'Not Available',
            class: AssignmentRegistry.DEFAULT_CLASS, branch: AssignmentRegistry.DEFAULT_BRANCH,
            academicYear: AssignmentRegistry.DEFAULT_ACADEMIC_YEAR, subjectName: AssignmentRegistry.DEFAULT_SUBJECT,
            submissionsBySlot: {}, allSubmissions: [], isOfficialRoster: false, isUnlisted: true,
            matchStatus: match.status, matchReason: match.reason,
            retrievalBlockedReason: groupSafety[unKey] || null, retrievalAvailable: !groupSafety[unKey]
          };
        }
        var unStudent = this.unmatchedStudentsMap[unKey];
        if (match.retrievalBlockedReason) {
          if (!unStudent.excludedSubmissions) unStudent.excludedSubmissions = [];
          unStudent.excludedSubmissions.push({
            submissionId: record.submissionId,
            challengeId: record.challengeId,
            reason: match.retrievalBlockedReason
          });
        } else {
          unStudent.allSubmissions.push(record);
          if (!unStudent.submissionsBySlot[record.challengeId]) unStudent.submissionsBySlot[record.challengeId] = [];
          unStudent.submissionsBySlot[record.challengeId].push(record);
        }
      }
    }

    // Sort attempts by attemptNumber ascending for each student slot (roster + unmatched)
    var allStudentGroups = [this.studentsMap, this.unmatchedStudentsMap];
    for (var g = 0; g < allStudentGroups.length; g++) {
      var map = allStudentGroups[g];
      var keys = Object.keys(map);
      for (var r = 0; r < keys.length; r++) {
        var st = map[keys[r]];
        var slotKeys = Object.keys(st.submissionsBySlot);
        for (var s = 0; s < slotKeys.length; s++) {
          st.submissionsBySlot[slotKeys[s]].sort(function (a, b) {
            if (a.attemptNumber !== b.attemptNumber) {
              return a.attemptNumber - b.attemptNumber;
            }
            var tA = a.submittedDate ? a.submittedDate.getTime() : 0;
            var tB = b.submittedDate ? b.submittedDate.getTime() : 0;
            return tA - tB;
          });
        }
      }
    }

    // Calculate reconciliation statistics
    var rosterKeys = Object.keys(this.studentsMap);
    var studentsWithSubmissions = 0;
    var studentsZeroSubmissions = 0;
    for (var rk = 0; rk < rosterKeys.length; rk++) {
      if (this.studentsMap[rosterKeys[rk]].allSubmissions.length > 0) {
        studentsWithSubmissions++;
      } else {
        studentsZeroSubmissions++;
      }
    }

    this.reconciliationStats = {
      totalRecords: items.length,
      matchedRecords: matchedRecords,
      conflictingRecords: this.conflictingSubmissions.length,
      ambiguousRecords: this.ambiguousSubmissions.length,
      unmatchedRecords: this.unmatchedSubmissions.length,
      externalRecords: this.externalSubmissions.length,
      testRecords: this.testSubmissions.length,
      totalRosterStudents: rosterKeys.length,
      studentsWithSubmissions: studentsWithSubmissions,
      studentsZeroSubmissions: studentsZeroSubmissions,
      ruleBreakdown: ruleBreakdown
    };

    this.isLoaded = true;
    return this.getStudentsSummary();
  };

  /**
   * Returns a list of all official roster students (plus any unmatched items) for selection dropdowns.
   * Sorted division-wise (TE-A, TE-B, TE-C) and by Sr. No.
   */
  DataService.prototype.getStudentsSummary = function () {
    var self = this;
    var list = [];

    // Security Hardening: In STUDENT role, never expose full roster or other students' summaries
    if (this.activeUserRole === 'STUDENT' && this.authenticatedStudent) {
      var authRoll = String(this.authenticatedStudent.rollNumber).trim();
      var authId = this.authenticatedStudent.id || authRoll;
      var singleStudent = this.studentsMap[authId] || this.unmatchedStudentsMap[authId];
      if (singleStudent) {
        var subSlotsCount = 0;
        AssignmentRegistry.ASSIGNMENTS.forEach(function (slot) {
          if (singleStudent.submissionsBySlot[slot.id] && singleStudent.submissionsBySlot[slot.id].length > 0) {
            subSlotsCount++;
          }
        });
        return [{
          id: singleStudent.id,
          srNo: singleStudent.srNo,
          rollNumber: singleStudent.rollNumber,
          studentName: singleStudent.studentName,
          division: singleStudent.division,
          isOfficialRoster: singleStudent.isOfficialRoster !== false,
          totalAssignments: AssignmentRegistry.ASSIGNMENTS.length,
          submittedSlotsCount: subSlotsCount,
          totalSubmissionsCount: singleStudent.allSubmissions.length,
          hasSubmissions: singleStudent.allSubmissions.length > 0
        }];
      }
      return [{
        id: this.authenticatedStudent.id || authRoll,
        srNo: this.authenticatedStudent.srNo || 1,
        rollNumber: this.authenticatedStudent.rollNumber,
        studentName: this.authenticatedStudent.studentName,
        division: this.authenticatedStudent.division,
        isOfficialRoster: this.authenticatedStudent.isOfficialRoster !== false,
        totalAssignments: AssignmentRegistry.ASSIGNMENTS.length,
        submittedSlotsCount: 0,
        totalSubmissionsCount: 0,
        hasSubmissions: false
      }];
    }

    // All official roster students (216 total)
    var rosterIds = Object.keys(this.studentsMap).filter(function (id) {
      return self.studentsMap[id].isOfficialRoster !== false && !self.studentsMap[id].isUnmapped;
    }).sort(function (a, b) {
      var stA = self.studentsMap[a];
      var stB = self.studentsMap[b];
      if (stA.division !== stB.division) {
        return stA.division.localeCompare(stB.division);
      }
      return stA.srNo - stB.srNo;
    });

    rosterIds.forEach(function (id) {
      var st = self.studentsMap[id];
      var submittedSlotsCount = 0;
      AssignmentRegistry.ASSIGNMENTS.forEach(function (slot) {
        if (st.submissionsBySlot[slot.id] && st.submissionsBySlot[slot.id].length > 0) {
          submittedSlotsCount++;
        }
      });

      list.push({
        id: st.id,
        srNo: st.srNo,
        rollNumber: st.rollNumber,
        studentName: st.studentName,
        division: st.division,
        class: st.class,
        branch: st.branch,
        submittedSlotsCount: submittedSlotsCount,
        totalSlots: 22,
        totalAttempts: st.allSubmissions.length,
        hasSubmissions: st.allSubmissions.length > 0,
        isOfficialRoster: true
      });
    });

    // Unmatched students (if any)
    var unKeys = Object.keys(this.unmatchedStudentsMap);
    unKeys.forEach(function (uk) {
      var ust = self.unmatchedStudentsMap[uk];
      var uSubCount = 0;
      AssignmentRegistry.ASSIGNMENTS.forEach(function (slot) {
        if (ust.submissionsBySlot[slot.id] && ust.submissionsBySlot[slot.id].length > 0) {
          uSubCount++;
        }
      });

      list.push({
        id: ust.id,
        srNo: ust.srNo,
        rollNumber: ust.rollNumber,
        studentName: ust.studentName,
        division: ust.division,
        class: ust.class,
        branch: ust.branch,
        submittedSlotsCount: uSubCount,
        totalSlots: 22,
        totalAttempts: ust.allSubmissions.length,
        hasSubmissions: ust.allSubmissions.length > 0,
        isOfficialRoster: false,
        matchStatus: ust.matchStatus,
        matchReason: ust.matchReason
      });
    });

    return list;
  };

  /**
   * Returns official roster students grouped division-wise (TE-A, TE-B, TE-C).
   */
  DataService.prototype.getStudentsByDivision = function () {
    var summary = this.getStudentsSummary();
    var grouped = {
      'TE-A': [],
      'TE-B': [],
      'TE-C': []
    };
    summary.forEach(function (s) {
      if (s.isOfficialRoster !== false && grouped[s.division]) {
        grouped[s.division].push(s);
      }
    });
    return grouped;
  };

  /**
   * Returns official roster students for a specific division (TE-A, TE-B, TE-C).
   * Used by the agreed student workflow to populate the student-name dropdown.
   * Always accesses the full official roster sorted by Sr. No. ascending.
   * 
   * @param {string} division - 'TE-A', 'TE-B', or 'TE-C'
   * @returns {Array<Object>} Array of { id, srNo, rollNumber, studentName, division, prn, hasSubmissions }
   */
  DataService.prototype.getRosterByDivision = function (division, includeUnmapped) {
    if (!division || typeof division !== 'string') return [];
    var cleanDiv = division.trim().toUpperCase();

    // Standardize 'A' -> 'TE-A', 'B' -> 'TE-B', 'C' -> 'TE-C'
    if (cleanDiv === 'A' || cleanDiv === 'B' || cleanDiv === 'C') {
      cleanDiv = 'TE-' + cleanDiv;
    }

    var sourceList = [];
    if (this.activeRoster && this.activeRoster.length > 0) {
      sourceList = this.activeRoster.slice();

    } else if (this.studentsMap) {
      for (var k in this.studentsMap) {
        var entry = this.studentsMap[k];
        if (!includeUnmapped && entry.isUnmapped) continue;
        sourceList.push(entry);
      }
    }

    var filtered = [];
    for (var i = 0; i < sourceList.length; i++) {
      var st = sourceList[i];
      var stDiv = (st.division || '').trim().toUpperCase();
      if (stDiv === cleanDiv) {
        var studentId = st.id || (cleanDiv + '-' + st.rollNumber + '-' + (st.srNo || (filtered.length + 1)));
        var mapEntry = this.studentsMap ? (this.studentsMap[studentId] || this.studentsMap[st.rollNumber]) : null;
        filtered.push({
          id: studentId,
          srNo: st.srNo || (filtered.length + 1),
          rollNumber: st.rollNumber,
          studentName: st.studentName,
          originalName: st.originalName || st.studentName,
          division: cleanDiv,
          prn: st.prn || (mapEntry ? mapEntry.prn : ''),
          hasSubmissions: mapEntry ? (mapEntry.allSubmissions && mapEntry.allSubmissions.length > 0) : false,
          isOfficialRoster: st.isOfficialRoster !== false,
          isUnmapped: st.isUnmapped === true,
          ruleId: st.ruleId || null
        });
      }
    }

    filtered.sort(function (a, b) {
      return (a.srNo || 0) - (b.srNo || 0);
    });

    return filtered;
  };

  /**
   * Returns all students for the dropdown (official roster students + unmapped college students).
   * Populates the division dropdown without duplicates or automatic identity merging.
   * 
   * @param {string} division - 'TE-A', 'TE-B', or 'TE-C'
   * @returns {Array<Object>} Combined list for dropdown
   */
  DataService.prototype.getDropdownStudentsByDivision = function (division) {
    if (division === 'UNLISTED') return this.getUnlistedStudents();
    return this.getRosterByDivision(division, false);
  };

  DataService.prototype.getUnlistedStudents = function () {
    var entries = Object.keys(this.unmatchedStudentsMap).map(function (id) {
      var st = this.unmatchedStudentsMap[id];
      return Object.assign({}, st, { submissionCount: st && st.submissionsBySlot ? Object.keys(st.submissionsBySlot).length : ((st && st.submissionCount) || 0) });
    }, this);
    (this.unlistedDirectory || []).forEach(function (st) {
      if (!entries.some(function (e) { return e.id === st.id; })) entries.push(st);
    });
    return entries.sort(function (a, b) { return a.studentName.localeCompare(b.studentName) || a.id.localeCompare(b.id); });
  };

  DataService.prototype.discoverUnlistedStudents = function (callback, forceRefresh) {
    if (!forceRefresh && this.unlistedDirectory && this.unlistedDirectory.length > 0) {
      if (callback) callback(null, this.getUnlistedStudents());
      return;
    }
    var self = this, check = this.validateEndpointUrl(this.configuredEndpoint || this.defaultEndpoint);
    if (!check.valid) return callback(new Error('Configure the student report service endpoint.'));
    function done(err, res) {
      try {
        if (err) throw err;
        var data = JSON.parse(res.responseText);
        if (res.status !== 200 || !data.success || data.identityPolicy !== 'exact-v1' || !Array.isArray(data.students)) {
          throw new Error('Live Unlisted Students discovery requires the Apps Script update in backend/UNLISTED_DEPLOYMENT.md.');
        }
        if (data.students.some(function (st) { return !st.id || st.id.indexOf('UNLISTED-') !== 0 || st.isOfficialRoster !== false; })) {
          throw new Error('Invalid unlisted student directory response.');
        }
        self.unlistedDirectory = data.students;
        callback(null, self.getUnlistedStudents());
      } catch (error) { callback(error); }
    }
    var req = { method: 'POST', url: check.url, headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getUnlistedStudents' }) };
    if (this.httpTransport) return this.httpTransport(req, done);
    fetch(req.url, req).then(function (res) { return res.text().then(function (txt) {
      done(null, { status: res.status, responseText: txt });
    }); }).catch(function (err) { done(err); });
  };

  /**
   * Builds the comprehensive student report package (Index + 22 Assignment Slots).
   * Total 23 pages (Page 1 = Index, Pages 2 to 23 = Assignment Slots).
   * Supports both 6-digit roll number and unique student id (e.g. 'TE-B-530602-71').
   */
  DataService.prototype.getStudentReportPackage = function (rollNumberOrId) {
    var student = null;
    var cleanKey = String(rollNumberOrId || '').trim();

    // Security Hardening: If in STUDENT role, enforce student-specific authorization
    if (this.activeUserRole === 'STUDENT' && this.authenticatedStudent) {
      var authRoll = String(this.authenticatedStudent.rollNumber || '').trim();
      var authId = String(this.authenticatedStudent.id || '').trim();
      if (cleanKey && cleanKey !== authId && (this.authenticatedStudent.isOfficialRoster === false || cleanKey !== authRoll)) {
        // Fail closed: A student cannot request another student's report
        return null;
      }
      if (!cleanKey) {
        cleanKey = authId || authRoll;
      }
    }

    student = this.studentsMap[cleanKey] || this.unmatchedStudentsMap[cleanKey] || null;
    if (!student) {
      var matches = Object.keys(this.studentsMap).map(function (id) { return this.studentsMap[id]; }, this)
        .concat(Object.keys(this.unmatchedStudentsMap).map(function (id) { return this.unmatchedStudentsMap[id]; }, this))
        .filter(function (st) { return st.id === cleanKey || st.rollNumber === cleanKey; });
      if (matches.length === 1) student = matches[0];
    }

    if (!student || student.retrievalBlockedReason) {
      return null;
    }

    var indexRows = [];
    var assignmentSlots = [];
    var currentRunningPage = 2; // Index is Page 1, first assignment begins on Page 2

    for (var i = 0; i < AssignmentRegistry.ASSIGNMENTS.length; i++) {
      var officialSlot = AssignmentRegistry.ASSIGNMENTS[i];
      var attempts = student.submissionsBySlot[officialSlot.id] || [];

      var hasSubmission = attempts.length > 0;
      // Authoritative attempt is the latest attempt
      var activeAttempt = hasSubmission ? attempts[attempts.length - 1] : null;

      // Dynamic page count calculation for this slot:
      // Missing assignments occupy exactly 1 deficit placeholder page.
      // Submitted assignments with extensive activities/calculations paginate across 2 or more pages.
      var slotPageCount = 1;
      if (hasSubmission && activeAttempt && activeAttempt.activityResponses && activeAttempt.activityResponses.length > 0) {
        var partitioned = DataService.partitionActivities(activeAttempt.activityResponses);
        slotPageCount = partitioned.length;
      }

      var startPageNo = currentRunningPage;
      var endPageNo = currentRunningPage + slotPageCount - 1;
      currentRunningPage += slotPageCount;

      // Submission status rule for Index:
      // - LATE Submission only when stored record confirms late === true
      // - Blank ("") for confirmed on-time (late === false)
      // - Blank ("") for legacy / unavailable late status (late === null)
      // - "Not Submitted" for missing assignments
      var statusRemark = '';
      if (!hasSubmission) {
        statusRemark = 'Not Submitted';
      } else if (activeAttempt.isLate === true) {
        statusRemark = 'LATE Submission';
      } else {
        // Confirmed on-time or historical unavailable -> left blank
        statusRemark = '';
      }

      var submissionDateStr = hasSubmission && activeAttempt.submittedDateStr ? activeAttempt.submittedDateStr : '—';

      var slotEvaluation = null;
      if (hasSubmission && activeAttempt && this.evaluations && this.evaluations.length > 0) {
        for (var ev = 0; ev < this.evaluations.length; ev++) {
          var evItem = this.evaluations[ev];
          if ((evItem.submissionId && activeAttempt.submissionId && evItem.submissionId === activeAttempt.submissionId) ||
              (evItem.attemptId && activeAttempt.submissionId && evItem.attemptId === activeAttempt.submissionId)) {
            slotEvaluation = evItem;
            break;
          }
        }
      }
      if (activeAttempt) {
        activeAttempt.evaluation = slotEvaluation;
      }

      indexRows.push({
        srNo: officialSlot.srNo,
        assignmentId: officialSlot.id,
        assignmentTitle: officialSlot.title,
        submissionDate: submissionDateStr,
        statusRemark: statusRemark,
        pageNo: startPageNo,
        pageCount: slotPageCount,
        endPageNo: endPageNo,
        isSubmitted: hasSubmission,
        isLate: hasSubmission ? activeAttempt.isLate : null,
        attemptCount: attempts.length
      });

      assignmentSlots.push({
        srNo: officialSlot.srNo,
        pageNo: startPageNo,
        pageCount: slotPageCount,
        endPageNo: endPageNo,
        assignment: officialSlot,
        isSubmitted: hasSubmission,
        activeSubmission: activeAttempt,
        allAttempts: attempts,
        evaluation: slotEvaluation,
        isLate: hasSubmission ? activeAttempt.isLate : null,
        statusRemark: statusRemark
      });
    }

    var totalPages = currentRunningPage - 1;

    return {
      studentInfo: {
        id: student.id,
        srNo: student.srNo,
        rollNumber: student.rollNumber,
        studentName: student.studentName,
        class: student.class,
        division: student.division,
        academicYear: student.academicYear,
        branch: student.branch,
        subjectName: student.subjectName,
        isOfficialRoster: student.isOfficialRoster !== false
      },
      totalPages: totalPages,
      indexPageNumber: 1,
      indexRows: indexRows,
      assignmentSlots: assignmentSlots,
      submittedCount: indexRows.filter(function (r) { return r.isSubmitted; }).length,
      missingCount: indexRows.filter(function (r) { return !r.isSubmitted; }).length,
      lateCount: indexRows.filter(function (r) { return r.isLate === true; }).length,
      excludedSubmissions: student.excludedSubmissions || []
    };
  };

  /**
   * Estimates the visual layout weight of an activity row for pagination.
   */
  DataService.estimateActivityWeight = function (act) {
    var weight = 1.0;
    if (!act) return weight;
    var resp = act.response;
    if (!resp) return weight;

    var comp = act.component || '';
    if (comp === 'information-card' || comp === 'project-charter') {
      return 0.5;
    }
    if (comp.includes('image-label') || comp.includes('component-identification') || comp.includes('label')) {
      return 0.8;
    }
    if (comp.includes('text-mcq') || comp.includes('mcq')) {
      return 0.8;
    }
    if (comp.includes('calculation') || comp.includes('inputs')) {
      return 0.9;
    }

    // Faculty-assessed answers or text fields: weight based on actual text length
    var textLen = 0;
    if (typeof resp === 'string') {
      textLen = resp.length;
    } else if (typeof resp === 'object') {
      var keys = Object.keys(resp).filter(function (k) {
        return !['startedAt', 'updatedAt', 'activityType', 'activityId', 'attemptNumber', 'timeTakenSeconds'].includes(k);
      });
      keys.forEach(function (k) {
        if (resp[k]) textLen += String(resp[k]).length;
      });
    }

    var weight = 1.0;
    if (textLen > 1200) weight += 3.0;
    else if (textLen > 600) weight += 2.0;
    else if (textLen > 250) weight += 1.0;
    else if (textLen > 100) weight += 0.5;

    return weight;
  };

  /**
   * Partitions an assignment's activities into discrete printable pages.
   * Ensures Page 1 (with title and student profile) and continuation pages
   * flow cleanly without clipping or cramped text.
   */
  DataService.partitionActivities = function (activities) {
    if (!activities || activities.length === 0) {
      return [[]];
    }

    var expanded = [];
    activities.forEach(function (act) {
      var response = act.response;
      var text = typeof response === 'string' ? response : JSON.stringify(response);
      if (!text || (text.length <= 1400 && text.split('\n').length <= 20)) { expanded.push(act); return; }
      // Original responses stay untouched; generic continuation rows preserve
      // long strings and serialize nested values without summary-only rendering.
      var chunks = [], points = Array.from(text);
      for (var offset = 0; offset < points.length; offset += 900) chunks.push(points.slice(offset, offset + 900).join(''));
      var bounded = [];
      chunks.forEach(function (chunk) {
        var lines = chunk.split('\n'), part = '';
        lines.forEach(function (line, i) {
          part += line + (i < lines.length - 1 ? '\n' : '');
          if ((i + 1) % 15 === 0) { bounded.push(part); part = ''; }
        });
        if (part) bounded.push(part);
      });
      bounded.forEach(function (chunk, index) {
        expanded.push(Object.assign({}, act, { component: 'portfolio-continuation',
          title: (act.title || act.name || 'Response') + ' (part ' + (index + 1) + '/' + bounded.length + ')',
          response: { reflection: chunk }, _portfolioContinuation: true }));
      });
    });
    if (expanded.some(function (act) { return act._portfolioContinuation; })) {
      var result = [], batch = [];
      expanded.forEach(function (act) {
        if (act._portfolioContinuation) {
          if (batch.length) { result = result.concat(DataService.partitionActivities(batch)); batch = []; }
          result.push([act]);
        } else batch.push(act);
      });
      if (batch.length) result = result.concat(DataService.partitionActivities(batch));
      return result;
    }
    var weights = activities.map(DataService.estimateActivityWeight);
    var totalWeight = weights.reduce(function (sum, w) { return sum + w; }, 0);

    // Single page threshold: if total weight <= 11.0 and acts <= 9, fits cleanly on 1 page!
    if (activities.length <= 9 && totalWeight <= 11.0) {
      return [activities];
    }

    var pages = [];
    var currentBatch = [];
    var currentBatchWeight = 0;
    var isFirstPage = true;

    for (var i = 0; i < activities.length; i++) {
      var act = activities[i];
      var w = weights[i];
      // First page max weight ~11.0 (or max 7 items); continuation max ~14.0 (or max 8 items)
      var maxWeight = isFirstPage ? 11.0 : 14.0;
      var maxCount = isFirstPage ? 7 : 8;

      if (currentBatch.length > 0 && (currentBatchWeight + w > maxWeight || currentBatch.length >= maxCount)) {
        pages.push(currentBatch);
        currentBatch = [act];
        currentBatchWeight = w;
        isFirstPage = false;
      } else {
        currentBatch.push(act);
        currentBatchWeight += w;
      }
    }

    if (currentBatch.length > 0) {
      pages.push(currentBatch);
    }

    // Rebalance if the last page has only 1 item and previous page has >= 4 items
    if (pages.length > 1) {
      var lastPage = pages[pages.length - 1];
      var prevPage = pages[pages.length - 2];
      if (lastPage.length === 1 && prevPage.length >= 4) {
        lastPage.unshift(prevPage.pop());
      }
    }

    return pages;
  };

  /**
   * Validates an endpoint URL format.
   * Must be a valid HTTP or HTTPS URL.
   */
  DataService.prototype.validateEndpointUrl = function (url) {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return { valid: false, error: 'Apps Script Web App Endpoint URL is required.' };
    }
    var clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) {
      return { valid: false, error: 'Invalid endpoint URL: Must start with https:// or http:// (e.g. https://script.google.com/macros/s/.../exec).' };
    }
    return { valid: true, url: clean };
  };

  /**
   * Sets custom configuration storage adapter (for Node.js testing or custom storage).
   */
  DataService.prototype.setStorageAdapter = function (storage) {
    this.storageAdapter = storage;
  };

  /**
   * Helper to retrieve or create in-memory storage adapter.
   */
  DataService.prototype.getMemoryStorage = function () {
    if (!this._memoryStorage) {
      this._memoryStorage = {
        _data: {},
        getItem: function (k) { return this._data[k] || null; },
        setItem: function (k, v) { this._data[k] = String(v); },
        removeItem: function (k) { delete this._data[k]; }
      };
    }
    return this._memoryStorage;
  };

  /**
   * Gets active storage adapter based on requested mode ('session', 'local', or 'memory').
   * Defaults to custom storageAdapter if injected (e.g. for unit testing).
   */
  DataService.prototype.getStorageAdapter = function (mode) {
    if (this.storageAdapter) {
      return this.storageAdapter;
    }
    if (mode === 'session') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage;
      }
    } else if (mode === 'local') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } else if (mode === 'memory') {
      return this.getMemoryStorage();
    }

    // Default fallback cascade: sessionStorage -> localStorage -> memory
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return this.getMemoryStorage();
  };

  /**
   * Saves configuration to storage and memory.
   * 
   * SECURITY ADVISORY:
   * Browser storage (localStorage/sessionStorage) is convenience caching for administrative
   * workflows and does NOT provide hardware security or encrypted enclave protection.
   * Any user with physical access, developer tools, or browser extensions on this machine
   * can inspect stored keys. For shared faculty workstations, always use 'session' mode
   * (cleared automatically on tab close) or 'memory' mode, and invoke clearConfiguration().
   * 
   * @param {string} endpointUrl - Read-only Apps Script Web App URL
   * @param {string} authKey - Secret report service access key
   * @param {Object} options - Configuration options:
   *   - storageMode: 'session' | 'local' | 'memory' (defaults to 'session' for safety)
   *   - autoConnect: boolean
   *   - configuredBy: string
   */
  DataService.prototype.saveConfiguration = function (endpointUrl, authKey, options) {
    options = options || {};
    var urlCheck = this.validateEndpointUrl(endpointUrl);
    if (!urlCheck.valid) {
      throw new Error(urlCheck.error);
    }
    if (!authKey || typeof authKey !== 'string' || !authKey.trim()) {
      throw new Error('Access key is required to authorize read-only sheet access.');
    }

    var cleanUrl = urlCheck.url;
    var cleanKey = authKey.trim();
    var mode = options.storageMode || (options.sessionOnly ? 'session' : 'local');

    this.configuredEndpoint = cleanUrl;
    this.configuredAuthKey = cleanKey;
    this.lastRefreshEndpoint = cleanUrl;
    this.lastRefreshAuthKey = cleanKey;
    this.autoConnectEnabled = options.autoConnect === true;
    this.storageMode = mode;

    var configRecord = {
      endpointUrl: cleanUrl,
      authKey: cleanKey,
      storageMode: mode,
      configuredAt: new Date().toISOString(),
      configuredBy: options.configuredBy || 'Administrator',
      autoConnect: options.autoConnect === true
    };

    var recordJson = JSON.stringify(configRecord);

    if (this.storageAdapter && this.storageAdapter.setItem) {
      this.storageAdapter.setItem(DataService.CONFIG_STORAGE_KEY, recordJson);
    } else {
      // Store in selected browser storage tier
      if (mode === 'session') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(DataService.CONFIG_STORAGE_KEY, recordJson);
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
        }
      } else if (mode === 'local') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(DataService.CONFIG_STORAGE_KEY, recordJson);
        }
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
        }
      } else if (mode === 'memory') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
        }
        this.getMemoryStorage().setItem(DataService.CONFIG_STORAGE_KEY, recordJson);
      }
    }

    return this.getConfigurationStatus();
  };

  /**
   * Loads configuration from storage.
   * Priority: custom storageAdapter -> sessionStorage -> localStorage -> memoryStorage.
   * Automatically populates configuredEndpoint and configuredAuthKey if valid.
   */
  DataService.prototype.loadConfiguration = function () {
    var raw = null;
    var foundMode = 'none';

    if (this.storageAdapter && this.storageAdapter.getItem) {
      raw = this.storageAdapter.getItem(DataService.CONFIG_STORAGE_KEY);
      foundMode = 'custom';
    } else {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        raw = window.sessionStorage.getItem(DataService.CONFIG_STORAGE_KEY);
        if (raw) foundMode = 'session';
      }
      if (!raw && typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(DataService.CONFIG_STORAGE_KEY);
        if (raw) foundMode = 'local';
      }
      if (!raw && this._memoryStorage) {
        raw = this._memoryStorage.getItem(DataService.CONFIG_STORAGE_KEY);
        if (raw) foundMode = 'memory';
      }
    }

    if (!raw) {
      this.storageMode = 'none';
      return this.getConfigurationStatus();
    }

    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.endpointUrl && parsed.authKey) {
        var urlCheck = this.validateEndpointUrl(parsed.endpointUrl);
        if (urlCheck.valid && typeof parsed.authKey === 'string' && parsed.authKey.trim()) {
          this.configuredEndpoint = urlCheck.url;
          this.configuredAuthKey = parsed.authKey.trim();
          this.lastRefreshEndpoint = this.configuredEndpoint;
          this.lastRefreshAuthKey = this.configuredAuthKey;
          this.autoConnectEnabled = parsed.autoConnect === true;
          this.storageMode = parsed.storageMode || foundMode;
        }
      }
    } catch (e) {
      // Malformed configuration ignored
    }

    return this.getConfigurationStatus();
  };

  /**
   * Checks whether valid configuration is currently loaded.
   */
  DataService.prototype.hasValidConfiguration = function () {
    return Boolean(
      this.configuredEndpoint &&
      this.validateEndpointUrl(this.configuredEndpoint).valid &&
      this.configuredAuthKey &&
      this.configuredAuthKey.trim().length > 0
    );
  };

  /**
   * Clears saved configuration from all storage tiers and memory.
   * Completely purges keys from sessionStorage, localStorage, and runtime memory.
   */
  DataService.prototype.clearConfiguration = function () {
    this.configuredEndpoint = null;
    this.configuredAuthKey = null;
    this.lastRefreshEndpoint = null;
    this.lastRefreshAuthKey = null;
    this.autoConnectEnabled = false;
    this.storageMode = 'none';
    this.activeUserRole = null;
    this.authenticatedStudent = null;

    if (this.storageAdapter && this.storageAdapter.removeItem) {
      this.storageAdapter.removeItem(DataService.CONFIG_STORAGE_KEY);
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
    }
    if (this._memoryStorage) {
      this._memoryStorage.removeItem(DataService.CONFIG_STORAGE_KEY);
    }

    return this.getConfigurationStatus();
  };

  /**
   * Returns configuration status metadata.
   * GUARANTEE: Never exposes the secret access key in plaintext.
   */
  DataService.prototype.getConfigurationStatus = function () {
    var hasConfig = this.hasValidConfiguration();
    return {
      isConfigured: hasConfig,
      endpointUrl: this.configuredEndpoint || null,
      defaultEndpointUrl: DataService.DEFAULT_SERVICE_URL,
      authKeyConfigured: Boolean(this.configuredAuthKey),
      authKeyMasked: this.configuredAuthKey ? '••••••••••••' : null,
      autoConnect: Boolean(this.autoConnectEnabled),
      storageMode: this.storageMode || 'none',
      requiresAdminSetup: !hasConfig
    };
  };

  /**
   * Tests endpoint connectivity and authorization without replacing loaded submissions.
   */
  DataService.prototype.testConnection = function (endpointUrl, authKey, callback) {
    var testUrl = (endpointUrl || this.configuredEndpoint || DataService.DEFAULT_SERVICE_URL || '').trim();
    var testKey = (authKey || this.configuredAuthKey || '').trim();

    var urlCheck = this.validateEndpointUrl(testUrl);
    if (!urlCheck.valid) {
      return callback(new Error(urlCheck.error));
    }
    if (!testKey) {
      return callback(new Error('Access key is required to test connection.'));
    }

    var cleanUrl = urlCheck.url;
    var cleanKey = testKey;
    var postData = JSON.stringify({
      action: 'status',
      authKey: cleanKey
    });

    var handleTestRes = function (err, res) {
      if (err) {
        return callback(new Error('Network error connecting to Apps Script endpoint. Check URL, internet connection, and CORS settings.'));
      }
      if (!res || res.status !== 200) {
        return callback(new Error('Server responded with HTTP ' + (res ? res.status : 'Unknown') + ': ' + ((res && res.statusText) || 'Error')));
      }
      try {
        var parsed = JSON.parse(res.responseText);
        if (!parsed.success) {
          return callback(new Error(parsed.error || 'Connection rejected by server.'));
        }
        return callback(null, {
          success: true,
          service: parsed.service || 'Standalone Student Assignment Report Service',
          version: parsed.version || 'unknown',
          readOnly: parsed.readOnly === true
        });
      } catch (e) {
        return callback(new Error('Invalid response received from endpoint: ' + e.message));
      }
    };

    if (typeof this.httpTransport === 'function') {
      this.httpTransport({
        method: 'POST',
        url: cleanUrl,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData
      }, handleTestRes);
      return;
    }

    if (typeof fetch === 'function') {
      fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData
      })
      .then(function (r) {
        return r.text().then(function (t) {
          handleTestRes(null, { status: r.status, statusText: r.statusText, responseText: t });
        });
      })
      .catch(function (err) {
        handleTestRes(err, null);
      });
      return;
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', cleanUrl, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          handleTestRes(null, { status: xhr.status, statusText: xhr.statusText, responseText: xhr.responseText });
        }
      };
      xhr.onerror = function () {
        handleTestRes(new Error('Network error'), null);
      };
      xhr.send(postData);
      return;
    }

    callback(new Error('No HTTP transport available.'));
  };

  /**
   * Secure Student Authentication & Portfolio Retrieval.
   * 
   * Enforces server-side student authorization:
   * 1. Requires valid Google ID token (institutional login) or registered University PRN.
   * 2. Server verifies credential and derives authoritative student roll number server-side.
   * 3. Browser-supplied roll numbers are NEVER trusted.
   * 4. Server returns ONLY the authorized student's submissions and evaluations.
   * 5. Sets role to 'STUDENT' and restricts client-side access strictly to the authenticated student.
   * 
   * @param {Object} credentials - { idToken, prn, studentToken, endpointUrl }
   * @param {Function} callback - function(err, reportPackage, studentInfo)
   */
  DataService.prototype.authenticateStudent = function (credentials, callback) {
    if (!credentials || typeof credentials !== 'object') {
      var argErr = new Error('Credentials object is required for student authentication.');
      if (callback) return callback(argErr);
      return;
    }

    var targetUrl = (credentials.endpointUrl || this.configuredEndpoint || '').trim();
    var urlCheck = this.validateEndpointUrl(targetUrl);
    if (!urlCheck.valid) {
      var urlErr = new Error(urlCheck.error);
      this.lastRefreshError = urlErr.message;
      if (callback) return callback(urlErr);
      return;
    }

    var idToken = credentials.idToken ? String(credentials.idToken).trim() : '';
    var prn = String(credentials.prn || credentials.studentToken || credentials.studentCredential || '').trim();

    if (!idToken && !prn) {
      var credErr = new Error('Authentication failed: Institutional Google Sign-In or valid University PRN is required.');
      this.lastRefreshError = credErr.message;
      if (callback) return callback(credErr);
      return;
    }

    var cleanUrl = urlCheck.url;
    var postData = JSON.stringify({
      action: 'getStudentReport',
      idToken: idToken || undefined,
      prn: prn || undefined
    });

    var self = this;
    var authRequestSerial = self.portfolioRequestSerial = (self.portfolioRequestSerial || 0) + 1;

    function handleStudentResponse(err, res) {
      if (authRequestSerial !== self.portfolioRequestSerial) return callback(new Error('Portfolio selection changed.'));
      if (err) {
        self.activeUserRole = null;
        self.authenticatedStudent = null;
        self.lastRefreshError = 'Network error connecting to student report service. Check URL and connectivity.';
        return callback(new Error(self.lastRefreshError));
      }

      if (!res) {
        self.activeUserRole = null;
        self.authenticatedStudent = null;
        self.lastRefreshError = 'No response received from student report service.';
        return callback(new Error(self.lastRefreshError));
      }

      if (res.status === 401) {
        self.activeUserRole = null;
        self.authenticatedStudent = null;
        self.lastRefreshError = 'Authentication Failed: Unable to verify student identity. Ensure you sign in with your official college Google account or enter a valid registered PRN.';
        return callback(new Error(self.lastRefreshError));
      }

      if (res.status !== 200) {
        self.activeUserRole = null;
        self.authenticatedStudent = null;
        self.lastRefreshError = 'Server responded with HTTP ' + res.status + ': ' + (res.statusText || 'Error');
        return callback(new Error(self.lastRefreshError));
      }

      try {
        var data = JSON.parse(res.responseText);
        if (!data.success || !data.authenticated || !data.student) {
          self.activeUserRole = null;
          self.authenticatedStudent = null;
          self.lastRefreshError = data.error || 'Authentication Failed: Unable to verify student identity.';
          return callback(new Error(self.lastRefreshError));
        }

        var authId = data.student.id;
        var selected = self.studentsMap[authId];
        if (!selected || selected.isOfficialRoster === false ||
            PortfolioIdentity.norm(data.student.studentName) !== PortfolioIdentity.norm(selected.studentName) ||
            PortfolioIdentity.normRoll(data.student.rollNumber) !== PortfolioIdentity.normRoll(selected.rollNumber) ||
            PortfolioIdentity.division(data.student.division) !== PortfolioIdentity.division(selected.division)) {
          throw new Error('Credential response does not match the approved local roster. Refresh the approved roster before retrying.');
        }
        if (!Array.isArray(data.submissions)) throw new Error('Missing scoped submissions array.');
        data.submissions.forEach(function (raw) {
          if (raw.portfolioIdentity && raw.portfolioIdentity.studentId !== authId) throw new Error('Response rejected: conflicting server association.');
          var match = PortfolioIdentity.resolve(raw, self.activeRoster, OfficialRoster);
          if ((!match.student || match.student.id !== authId) && !(data.identityPolicy === 'exact-v1' && self.isScopedIdentifierAssociation(raw, selected, match))) {
            throw new Error('Response rejected: submission belongs to a different or ambiguous identity.');
          }
        });
        var allowedIds = data.submissions.map(function (raw) { return self.parseSubmissionRecord(raw).submissionId; });
        var evaluations = (data.evaluations || []).filter(function (ev) { return ev.submissionId && allowedIds.indexOf(ev.submissionId) !== -1; });
        self.loadSubmissionsArray(data.submissions, evaluations, data.identityPolicy === 'exact-v1' ? selected : null);
        self.activeUserRole = 'STUDENT';
        self.authenticatedStudent = data.student;
        self.submissionsSource = 'LIVE_GOOGLE_SHEETS';
        self.isSubmissionsLive = true;
        self.lastRefreshTimestamp = new Date();
        self.lastRefreshEndpoint = cleanUrl;
        self.lastRefreshError = null;
        var reportPackage = self.getStudentReportPackage(authId);
        if (!reportPackage) throw new Error('Unable to generate the selected official portfolio.');

        callback(null, reportPackage, data.student);
      } catch (parseErr) {
        self.activeUserRole = null;
        self.authenticatedStudent = null;
        self.lastRefreshError = 'Invalid response from report service: ' + parseErr.message;
        callback(new Error(self.lastRefreshError));
      }
    }

    // Transport execution
    if (typeof this.httpTransport === 'function') {
      this.httpTransport({
        method: 'POST',
        url: cleanUrl,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData
      }, handleStudentResponse);
      return;
    }

    if (typeof fetch === 'function') {
      fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData
      })
      .then(function (response) {
        return response.text().then(function (text) {
          handleStudentResponse(null, {
            status: response.status,
            statusText: response.statusText,
            responseText: text
          });
        });
      })
      .catch(function (fetchErr) {
        handleStudentResponse(fetchErr, null);
      });
      return;
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', cleanUrl, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          handleStudentResponse(null, {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
      };
      xhr.onerror = function () {
        handleStudentResponse(new Error('Network error connecting to student report service.'), null);
      };
      xhr.send(postData);
      return;
    }

    var envErr = new Error('No HTTP transport available (neither fetch nor XMLHttpRequest).');
    this.lastRefreshError = envErr.message;
    callback(envErr);
  };

  /**
   * Retrieves and generates the selected student's 23-page portfolio.
   * Primary method for the agreed student workflow:
   * 1. Student selects division.
   * 2. Student selects name from dropdown.
   * 3. Portfolio is retrieved and 23-page report package is generated.
   * 
   * Zero faculty credentials required or exposed.
   * In remote mode, queries only the selected student's records.
   * 
   * @param {string|Object} studentIdentifier - Student unique ID, roll number, or student object
   * @param {Function} callback - function(err, reportPackage, student)
   */
  DataService.prototype.isScopedIdentifierAssociation = function (raw, selected, localMatch) {
    var binding = raw.portfolioIdentity || {}, ident = PortfolioIdentity.identity(raw);
    if (!selected) return false;
    if (selected.isOfficialRoster !== false) {
      return binding.studentId === selected.id && binding.rule === 'VERIFIED_IDENTIFIER' && !localMatch.student && !localMatch.retrievalBlockedReason &&
        (!ident.rollNumber || PortfolioIdentity.normRoll(ident.rollNumber) === PortfolioIdentity.normRoll(selected.rollNumber)) &&
        (!ident.division || PortfolioIdentity.division(ident.division) === PortfolioIdentity.division(selected.division));
    }
    var sName = PortfolioIdentity.norm(selected.studentName).toLowerCase();
    var rName = PortfolioIdentity.norm(ident.studentName).toLowerCase();
    return !localMatch.student && sName === rName && (!binding.studentId || binding.studentId === selected.id);
  };

  DataService.prototype.fetchStudentPortfolio = function (studentIdentifier, callback) {
    if (!studentIdentifier) {
      var err = new Error('Please select a student from Official Students or Unlisted Students.');
      if (callback) return callback(err);
      return;
    }

    // Resolve student target from studentsMap or activeRoster
    var targetStudent = null;
    var targetId = typeof studentIdentifier === 'object' ? (studentIdentifier.id || studentIdentifier.rollNumber) : String(studentIdentifier).trim();

    if (typeof studentIdentifier === 'object' && studentIdentifier.rollNumber && studentIdentifier.studentName) {
      targetStudent = studentIdentifier;
    }

    if (!targetStudent && this.studentsMap && this.studentsMap[targetId]) {
      targetStudent = this.studentsMap[targetId];
    }

    if (!targetStudent) {
      var choices = Object.keys(this.studentsMap).map(function (id) { return this.studentsMap[id]; }, this)
        .concat(this.getUnlistedStudents()).filter(function (st) { return st.id === targetId || st.rollNumber === targetId; });
      if (choices.length === 1) targetStudent = choices[0];
    }

    if (!targetStudent) {
      var notFoundErr = new Error('Student not found in the current directory. Refresh the student list and select its current identity ID.');
      if (callback) return callback(notFoundErr);
      return;
    }

    if (targetStudent.retrievalBlockedReason) return callback(new Error(targetStudent.retrievalBlockedReason));

    var cleanRoll = String(targetStudent.rollNumber || '').trim();
    var cleanDiv = String(targetStudent.division || 'TE-A').trim();
    var cleanName = String(targetStudent.studentName || '').trim();
    var cleanId = targetStudent.id || (cleanDiv + '-' + cleanRoll + '-' + (targetStudent.srNo || 1));

    var resolvedStudent = {
      srNo: targetStudent.srNo || 1,
      rollNumber: cleanRoll,
      studentName: cleanName,
      originalName: targetStudent.originalName || cleanName,
      division: cleanDiv,
      prn: targetStudent.prn || '',
      id: cleanId,
      isOfficialRoster: targetStudent.isOfficialRoster !== false,
      isUnmapped: targetStudent.isUnmapped === true,
      ruleId: targetStudent.ruleId || null
    };

    var self = this;
    var requestSerial = this.portfolioRequestSerial = (this.portfolioRequestSerial || 0) + 1;

    // Check if remote read-only Apps Script URL is configured
    var remoteUrl = (this.configuredEndpoint || '').trim();
    var urlCheck = this.validateEndpointUrl(remoteUrl);

    if (urlCheck.valid) {
      var postData = JSON.stringify({
        action: 'getStudentReport',
        studentId: cleanId,
        rollNumber: cleanRoll,
        division: cleanDiv,
        studentName: cleanName,
        prn: targetStudent.prn || '',
        identityCategory: resolvedStudent.isOfficialRoster === false ? 'UNLISTED' : 'OFFICIAL'
      });

      function handleRemoteReportResponse(err, res) {
        if (requestSerial !== self.portfolioRequestSerial) return callback(new Error('Portfolio selection changed.')); 
        if (err || !res) {
          var msg = err ? err.message : 'No response from student report service.';
          self.activeUserRole = null;
          self.authenticatedStudent = null;
          return callback(new Error('Unable to retrieve portfolio from server: ' + msg));
        }

        if (res.status === 405) {
          self.activeUserRole = null;
          self.authenticatedStudent = null;
          return callback(new Error('Server configuration error: HTTP POST required by Apps Script endpoint.'));
        }

        if (res.status !== 200 && res.status !== 404) {
          self.activeUserRole = null;
          self.authenticatedStudent = null;
          return callback(new Error('Server responded with HTTP ' + res.status + ': ' + (res.statusText || 'Error')));
        }

        try {
          var data = JSON.parse(res.responseText);
          if (!data.success) {
            self.activeUserRole = null;
            self.authenticatedStudent = null;
            return callback(new Error((resolvedStudent.isOfficialRoster === false ?
              'Unlisted portfolio unavailable for "' + cleanName + '". Deploy the IdentityPolicy integration described in backend/UNLISTED_DEPLOYMENT.md, then refresh the Unlisted Students list. Server: ' : '') + (data.error || 'Server rejected student portfolio request.')));

          }

          if (!data.student || data.student.id !== cleanId || !Array.isArray(data.submissions)) {
            throw new Error('Selected student identity was not confirmed by the backend. Deploy the IdentityPolicy integration.');
          }
          if (resolvedStudent.isOfficialRoster === false && data.submissions.length === 0) {
            throw new Error('No retrievable submissions for this unlisted student. Refresh the list and retry.');
          }
          data.submissions.forEach(function (raw) {
            if (raw.portfolioIdentity && raw.portfolioIdentity.studentId !== cleanId) throw new Error('Response rejected: conflicting server association.');
            var match = PortfolioIdentity.resolve(raw, self.activeRoster, OfficialRoster);
            var expected = match.student ? match.student.id : PortfolioIdentity.key(raw);
            if (expected !== cleanId && !(data.identityPolicy === 'exact-v1' && self.isScopedIdentifierAssociation(raw, resolvedStudent, match))) {
              if (typeof console !== 'undefined' && console.warn) {
                console.warn('[DataService] Identity mismatch on submission:', {
                  cleanId: cleanId,
                  expected: expected,
                  rawIdentity: PortfolioIdentity.identity(raw),
                  portfolioIdentity: raw.portfolioIdentity,
                  matchStatus: match.status
                });
              }
              throw new Error('Response rejected: submission belongs to a different or ambiguous identity.');
            }
          });
          var allowedSubmissionIds = data.submissions.map(function (raw) { return self.parseSubmissionRecord(raw).submissionId; });
          var safeEvaluations = (data.evaluations || []).filter(function (ev) {
            return ev.submissionId && allowedSubmissionIds.indexOf(ev.submissionId) !== -1;
          });
          self.loadSubmissionsArray(data.submissions, safeEvaluations, data.identityPolicy === 'exact-v1' ? resolvedStudent : null);
          if (data.excludedSubmissions && Array.isArray(data.excludedSubmissions)) {
            resolvedStudent.excludedSubmissions = data.excludedSubmissions;
            if (self.unmatchedStudentsMap[cleanId]) self.unmatchedStudentsMap[cleanId].excludedSubmissions = data.excludedSubmissions;
          }
          self.submissionsSource = 'LIVE_GOOGLE_SHEETS';
          self.isSubmissionsLive = true;
          self.activeUserRole = 'STUDENT';
          self.authenticatedStudent = resolvedStudent;
          var pkg = self.getStudentReportPackage(cleanId);
          if (!pkg) throw new Error('Selected student package could not be generated.');

          callback(null, pkg, data.student || resolvedStudent);
        } catch (parseErr) {
          self.activeUserRole = null;
          self.authenticatedStudent = null;
          callback(new Error('Invalid response from student report service: ' + parseErr.message));
        }
      }

      if (typeof this.httpTransport === 'function') {
        this.httpTransport({
          method: 'POST',
          url: urlCheck.url,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: postData
        }, handleRemoteReportResponse);
        return;
      }

      var timeoutMs = this.requestTimeoutMs || 35000;
      var timerId = null;
      var aborted = false;

      if (typeof fetch === 'function') {
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        if (controller) {
          timerId = setTimeout(function () {
            aborted = true;
            controller.abort();
          }, timeoutMs);
        }

        fetch(urlCheck.url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: postData,
          signal: controller ? controller.signal : undefined
        })
        .then(function (response) {
          if (timerId) clearTimeout(timerId);
          return response.text().then(function (text) {
            handleRemoteReportResponse(null, {
              status: response.status,
              statusText: response.statusText,
              responseText: text
            });
          });
        })
        .catch(function (fetchErr) {
          if (timerId) clearTimeout(timerId);
          if (aborted || (fetchErr && fetchErr.name === 'AbortError')) {
            handleRemoteReportResponse(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + 's. The student report service took too long to respond. Please check your network connection and click Generate Portfolio to retry.'), null);
          } else {
            handleRemoteReportResponse(fetchErr, null);
          }
        });
        return;
      }
    }

    // Local / Offline / Demo mode:
    this.activeUserRole = 'STUDENT';
    this.authenticatedStudent = resolvedStudent;

    var localPkg = this.getStudentReportPackage(cleanId) || this.getStudentReportPackage(cleanRoll);
    if (!localPkg || (resolvedStudent.isOfficialRoster === false && localPkg.submittedCount === 0)) {
      if (callback) return callback(new Error('Unable to generate report package for student: ' + cleanName));
      return;
    }

    if (callback) {
      callback(null, localPkg, this.authenticatedStudent);
    }
  };

  /**
   * Signs out the active student and restores a clean unauthenticated state.
   */
  DataService.prototype.signOutStudent = function () {
    this.portfolioRequestSerial = (this.portfolioRequestSerial || 0) + 1;
    this.activeUserRole = null;
    this.authenticatedStudent = null;
    this.rawSubmissions = [];
    this.evaluations = [];
    this.submissionsSource = 'NONE';
    this.isSubmissionsLive = false;
    this.initRoster();
  };

  /**
   * Fetches submission data from a separate read-only Google Apps Script web app endpoint.
   * Enforces server-side authentication with the user-provided or configured access key.
   */
  DataService.prototype.fetchFromRemoteAppsScript = function (endpointUrl, authKey, callback) {
    var targetUrl = (endpointUrl || this.configuredEndpoint || '').trim();
    var targetKey = (authKey || this.configuredAuthKey || '').trim();

    var urlCheck = this.validateEndpointUrl(targetUrl);
    if (!urlCheck.valid) {
      var urlErr = new Error(urlCheck.error);
      this.lastRefreshError = urlErr.message;
      if (callback) return callback(urlErr);
      return;
    }

    if (!targetKey) {
      var keyErr = new Error('Access key is required to authorize read-only sheet access.');
      this.lastRefreshError = keyErr.message;
      if (callback) return callback(keyErr);
      return;
    }

    var cleanUrl = urlCheck.url;
    var cleanKey = targetKey;

    // Consistency: Update configured/refresh endpoint & key
    this.configuredEndpoint = cleanUrl;
    this.configuredAuthKey = cleanKey;
    this.lastRefreshEndpoint = cleanUrl;
    this.lastRefreshAuthKey = cleanKey;

    var postData = JSON.stringify({
      action: 'getReportData',
      authKey: cleanKey
    });

    var self = this;

    // Check if custom transport provided (e.g. for mock testing or server-side transport)
    if (typeof this.httpTransport === 'function') {
      this.httpTransport({
        method: 'POST',
        url: cleanUrl,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData
      }, function (err, res) {
        self._handleRemoteResponse(err, res, cleanUrl, cleanKey, callback);
      });
      return;
    }

    // Modern fetch support (if fetch is available, e.g. modern browsers and Node 18+)
    if (typeof fetch === 'function') {
      fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData
      })
      .then(function (response) {
        return response.text().then(function (text) {
          self._handleRemoteResponse(null, {
            status: response.status,
            statusText: response.statusText,
            responseText: text
          }, cleanUrl, cleanKey, callback);
        });
      })
      .catch(function (fetchErr) {
        self._handleRemoteResponse(fetchErr, null, cleanUrl, cleanKey, callback);
      });
      return;
    }

    // Fallback to XMLHttpRequest (legacy browser environments)
    if (typeof XMLHttpRequest !== 'undefined') {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', cleanUrl, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          self._handleRemoteResponse(null, {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          }, cleanUrl, cleanKey, callback);
        }
      };
      xhr.onerror = function () {
        self._handleRemoteResponse(new Error('Network error connecting to Apps Script endpoint.'), null, cleanUrl, cleanKey, callback);
      };
      xhr.send(postData);
      return;
    }

    var envErr = new Error('No HTTP transport available (neither fetch nor XMLHttpRequest).');
    this.lastRefreshError = envErr.message;
    callback(envErr);
  };

  /**
   * Internal dispatcher for processing remote response from Apps Script endpoint.
   */
  DataService.prototype._handleRemoteResponse = function (err, res, cleanUrl, cleanKey, callback) {
    if (err) {
      this.isSubmissionsLive = false;
      this.lastRefreshError = 'Network error connecting to Apps Script endpoint. Check URL, internet connection, and CORS settings.';
      return callback(new Error(this.lastRefreshError));
    }

    if (!res) {
      this.isSubmissionsLive = false;
      this.lastRefreshError = 'No response received from Apps Script endpoint.';
      return callback(new Error(this.lastRefreshError));
    }

    if (res.status === 401) {
      this.isSubmissionsLive = false;
      this.lastRefreshError = 'Unauthorized: Invalid or missing report service access key.';
      return callback(new Error(this.lastRefreshError));
    }

    if (res.status !== 200) {
      this.isSubmissionsLive = false;
      this.lastRefreshError = 'Server responded with HTTP ' + res.status + ': ' + (res.statusText || 'Error');
      return callback(new Error(this.lastRefreshError));
    }

    try {
      var data = JSON.parse(res.responseText);
      if (!data.success) {
        this.isSubmissionsLive = false;
        this.lastRefreshError = data.error || 'Access denied or failed to retrieve submissions.';
        return callback(new Error(this.lastRefreshError));
      }

      // If the endpoint also returned live roster sheets, update roster dynamically
      if (data.roster && Array.isArray(data.roster) && data.roster.length > 0) {
        this.setCustomRoster(data.roster, null, 'LIVE_SHEET', true);
      }

      var summary = this.loadSubmissionsArray(data.submissions || data.data || [], data.evaluations || []);

      this.activeUserRole = 'FACULTY';
      this.submissionsSource = 'LIVE_GOOGLE_SHEETS';
      this.isSubmissionsLive = true;
      this.lastRefreshTimestamp = new Date();
      this.lastRefreshEndpoint = cleanUrl;
      this.lastRefreshAuthKey = cleanKey;
      this.lastRefreshError = null;

      callback(null, summary);
    } catch (e) {
      this.isSubmissionsLive = false;
      this.lastRefreshError = 'Invalid response received from Apps Script endpoint: ' + e.message;
      callback(new Error(this.lastRefreshError));
    }
  };

  /**
   * Refreshes submission data using the stored connection endpoint and credentials.
   * Guarantees that refresh failure reports an error clearly and does not present stale data as fresh.
   */
  DataService.prototype.refreshData = function (callback) {
    var endpoint = this.lastRefreshEndpoint || this.configuredEndpoint;
    var authKey = this.lastRefreshAuthKey || this.configuredAuthKey;

    if (!endpoint || !authKey) {
      var err = new Error('No active live Google Sheets connection configured. Please connect first.');
      if (callback) {
        callback(err);
        return;
      }
      throw err;
    }
    this.fetchFromRemoteAppsScript(endpoint, authKey, callback);
  };

  /**
   * Returns list of students with zero submissions.
   */
  DataService.prototype.getZeroSubmissionStudents = function () {
    var zeros = [];
    for (var id in this.studentsMap) {
      var st = this.studentsMap[id];
      if (!st.allSubmissions || st.allSubmissions.length === 0) {
        zeros.push({
          id: st.id,
          srNo: st.srNo,
          rollNumber: st.rollNumber,
          studentName: st.studentName,
          division: st.division,
          isOfficialRoster: st.isOfficialRoster
        });
      }
    }
    return zeros;
  };

  /**
   * Returns complete data reconciliation and audit report.
   */
  DataService.prototype.getReconciliationReport = function () {
    var divCounts = { 'TE-A': 0, 'TE-B': 0, 'TE-C': 0 };
    for (var id in this.studentsMap) {
      var div = this.studentsMap[id].division;
      divCounts[div] = (divCounts[div] || 0) + 1;
    }

    var stats = this.reconciliationStats || {
      totalRecords: this.rawSubmissions ? this.rawSubmissions.length : 0,
      matchedRecords: 0,
      conflictingRecords: this.conflictingSubmissions.length,
      ambiguousRecords: this.ambiguousSubmissions.length,
      unmatchedRecords: this.unmatchedSubmissions.length,
      totalRosterStudents: Object.keys(this.studentsMap).length,
      studentsWithSubmissions: 0,
      studentsZeroSubmissions: Object.keys(this.studentsMap).length
    };

    return {
      rosterSource: this.officialRosterSource,
      isOfficialRosterLive: this.isOfficialRosterLive,
      totalRosterStudents: Object.keys(this.studentsMap).length,
      divisionCounts: divCounts,
      submissionsSource: this.submissionsSource,
      isSubmissionsLive: this.isSubmissionsLive,
      lastRefreshTimestamp: this.lastRefreshTimestamp,
      lastRefreshError: this.lastRefreshError,
      totalSubmissions: this.rawSubmissions ? this.rawSubmissions.length : 0,
      matchedRecords: stats.matchedRecords,
      conflictingRecords: this.conflictingSubmissions.length,
      ambiguousRecords: this.ambiguousSubmissions.length,
      unmatchedRecords: this.unmatchedSubmissions.length,
      externalRecords: this.externalSubmissions.length,
      testRecords: this.testSubmissions.length,
      studentsWithSubmissions: stats.studentsWithSubmissions,
      studentsZeroSubmissions: stats.studentsZeroSubmissions,
      conflictingSubmissions: this.conflictingSubmissions,
      ambiguousSubmissions: this.ambiguousSubmissions,
      unmatchedSubmissions: this.unmatchedSubmissions,
      externalSubmissions: this.externalSubmissions,
      testSubmissions: this.testSubmissions,
      identityResolutionsCount: Object.keys(this.identityResolutions || {}).length,
      zeroSubmissionStudents: this.getZeroSubmissionStudents()
    };
  };

  /**
   * Returns the dictionary of separate identity resolutions for mapped submissions.
   */
  DataService.prototype.getIdentityResolutions = function () {
    return this.identityResolutions || {};
  };

  /**
   * Detects the file type ('json', 'csv', 'xlsx', or other extension) based on
   * the file name extension and, where appropriate, initial content heuristic.
   */
  DataService.prototype.detectFileType = function (fileName, fileContent) {
    var ext = '';
    if (fileName && typeof fileName === 'string') {
      var lastDot = fileName.lastIndexOf('.');
      if (lastDot !== -1) {
        ext = fileName.slice(lastDot).toLowerCase().trim();
      }
    }

    if (ext === '.json') return 'json';
    if (ext === '.csv') return 'csv';
    if (ext === '.xlsx' || ext === '.xls') return 'xlsx';

    // Content-based heuristic if extension is ambiguous or missing
    if (typeof fileContent === 'string') {
      var trimmed = fileContent.trim();
      if (trimmed.charCodeAt(0) === 0xFEFF) {
        trimmed = trimmed.slice(1).trim();
      }
      var firstChar = trimmed.charAt(0);
      if (firstChar === '{' || firstChar === '[') {
        return 'json';
      }
      var firstLineEnd = trimmed.indexOf('\n');
      var firstLine = (firstLineEnd !== -1 ? trimmed.slice(0, firstLineEnd) : trimmed).trim();
      if (firstLine.indexOf(',') !== -1 && (
        firstLine.indexOf('Timestamp') !== -1 ||
        firstLine.indexOf('Roll Number') !== -1 ||
        firstLine.indexOf('Challenge ID') !== -1 ||
        firstLine.indexOf('Submission ID') !== -1
      )) {
        return 'csv';
      }
    }

    return ext ? ext.replace('.', '') : 'unknown';
  };

  /**
   * Robust, RFC-4180 compliant CSV parser.
   * Handles:
   * - UTF-8 Byte Order Mark (BOM: \uFEFF)
   * - Quoted fields containing commas
   * - Escaped quotation marks ("")
   * - Fields containing embedded line breaks (\r\n, \n, \r)
   * - Empty cells and trailing empty columns
   * - Preserves large embedded JSON payloads in cells
   */
  DataService.prototype.parseCSV = function (text) {
    if (!text || typeof text !== 'string') return [];
    var p = 0;
    if (text.charCodeAt(0) === 0xFEFF) p = 1; // Strip UTF-8 BOM
    var len = text.length;
    var rows = [];
    var row = [];

    while (p < len) {
      var field = '';

      // Check for quoted field (allowing optional horizontal whitespace before opening quote)
      var qCheck = p;
      while (qCheck < len && (text.charCodeAt(qCheck) === 32 /* ' ' */ || text.charCodeAt(qCheck) === 9 /* '\t' */)) {
        qCheck++;
      }

      if (qCheck < len && text.charCodeAt(qCheck) === 34 /* " */) {
        p = qCheck + 1; // skip leading horizontal whitespace and opening quote
        var start = p;
        var hasEscapedQuotes = false;
        while (p < len) {
          var nextQuote = text.indexOf('"', p);
          if (nextQuote === -1) {
            // Unclosed quote until EOF - gracefully take remainder
            field = hasEscapedQuotes ? text.slice(start).replace(/""/g, '"') : text.slice(start);
            p = len;
            break;
          }
          if (nextQuote + 1 < len && text.charCodeAt(nextQuote + 1) === 34 /* "" */) {
            hasEscapedQuotes = true;
            p = nextQuote + 2;
          } else {
            // Closing quote found
            field = hasEscapedQuotes
              ? text.slice(start, nextQuote).replace(/""/g, '"')
              : text.slice(start, nextQuote);
            p = nextQuote + 1;
            // Skip optional horizontal whitespace after closing quote before delimiter
            while (p < len && (text.charCodeAt(p) === 32 || text.charCodeAt(p) === 9)) {
              p++;
            }
            break;
          }
        }
      } else {
        // Unquoted field: scan to next comma, newline or EOF
        var start = p;
        while (p < len) {
          var code = text.charCodeAt(p);
          if (code === 44 /* , */ || code === 10 /* \n */ || code === 13 /* \r */) {
            break;
          }
          p++;
        }
        field = text.slice(start, p);
      }

      row.push(field);

      if (p < len) {
        var code = text.charCodeAt(p);
        if (code === 44 /* , */) {
          p++;
          if (p >= len) {
            // Trailing comma at EOF -> empty trailing field
            row.push('');
          }
        } else if (code === 13 /* \r */) {
          p++;
          if (p < len && text.charCodeAt(p) === 10 /* \n */) p++;
          rows.push(row);
          row = [];
        } else if (code === 10 /* \n */) {
          p++;
          rows.push(row);
          row = [];
        }
      }
    }

    if (row.length > 0) {
      if (!(row.length === 1 && row[0].trim() === '')) {
        rows.push(row);
      }
    }

    return rows;
  };

  /**
   * Validates CSV headers against expected Student_Submissions structure.
   * Throws a specific validation error if required columns are missing.
   */
  DataService.prototype.validateCSVHeaders = function (rawHeaders) {
    if (!Array.isArray(rawHeaders) || rawHeaders.length === 0) {
      throw new Error('CSV validation failed: Header row is empty or missing.');
    }

    var cleanHeaders = rawHeaders.map(function (h) {
      return String(h || '').trim();
    });

    var headerMap = {};
    cleanHeaders.forEach(function (h, idx) {
      if (h) {
        headerMap[h] = idx;
        headerMap[h.toLowerCase()] = idx;
      }
    });

    var expectedRules = [
      { name: 'Timestamp', check: function () { return headerMap['Timestamp'] !== undefined || headerMap['timestamp'] !== undefined; } },
      { name: 'Submission ID', check: function () { return headerMap['Submission ID'] !== undefined || headerMap['submission id'] !== undefined; } },
      { name: 'Submission Hash', check: function () { return headerMap['Submission Hash'] !== undefined || headerMap['submission hash'] !== undefined; } },
      { name: 'Student Name', check: function () { return headerMap['Student Name'] !== undefined || headerMap['student name'] !== undefined; } },
      { name: 'Roll Number', check: function () { return headerMap['Roll Number'] !== undefined || headerMap['roll number'] !== undefined; } },
      { name: 'Division', check: function () { return headerMap['Division'] !== undefined || headerMap['division'] !== undefined; } },
      { name: 'Attempt Mode', check: function () { return headerMap['Attempt Mode'] !== undefined || headerMap['attempt mode'] !== undefined; } },
      { name: 'Challenge ID', check: function () { return headerMap['Challenge ID'] !== undefined || headerMap['challenge id'] !== undefined; } },
      { name: 'Challenge Title', check: function () { return headerMap['Challenge Title'] !== undefined || headerMap['challenge title'] !== undefined; } },
      { name: 'Attempt Number', check: function () { return headerMap['Attempt Number'] !== undefined || headerMap['attempt number'] !== undefined || headerMap['Attempt No'] !== undefined || headerMap['attempt no'] !== undefined; } },
      { name: 'Completion %', check: function () { return headerMap['Completion %'] !== undefined || headerMap['completion %'] !== undefined || headerMap['Completion Percent'] !== undefined; } },
      { name: 'Status', check: function () { return headerMap['Status'] !== undefined || headerMap['status'] !== undefined; } },
      { name: 'Full JSON Payload', check: function () { return headerMap['Full JSON Payload'] !== undefined || headerMap['full json payload'] !== undefined; } },
      { name: 'Email', check: function () { return headerMap['Email'] !== undefined || headerMap['email'] !== undefined || headerMap['Email (optional)'] !== undefined || headerMap['email (optional)'] !== undefined; } }
    ];

    var missing = [];
    expectedRules.forEach(function (rule) {
      if (!rule.check()) {
        missing.push(rule.name);
      }
    });

    if (missing.length > 0) {
      throw new Error('CSV validation failed: Missing required column(s): ' + missing.map(function (m) { return '"' + m + '"'; }).join(', ') + '. Please ensure the file has the official Student_Submissions headers.');
    }

    return headerMap;
  };

  /**
   * Ingests submission records from parsed CSV text.
   * Parses the CSV tabular structure first, then separately parses the
   * Full JSON Payload contained within each relevant row cell.
   * If a row contains malformed payload JSON, reports the affected row
   * in warnings and preserves the record rather than silently discarding it.
   */
  DataService.prototype.loadSubmissionsFromCSV = function (csvText) {
    if (typeof csvText !== 'string' || !csvText.trim()) {
      throw new Error('CSV file is empty or cannot be read.');
    }

    var rows = this.parseCSV(csvText);
    if (!rows || rows.length === 0) {
      throw new Error('CSV file contains no readable data.');
    }

    var rawHeaders = rows[0];
    var headerMap = this.validateCSVHeaders(rawHeaders);

    function getVal(row, colName, fallbackColName) {
      var idx = headerMap[colName];
      if (idx === undefined && fallbackColName) {
        idx = headerMap[fallbackColName];
      }
      if (idx !== undefined && idx < row.length) {
        return row[idx];
      }
      return '';
    }

    var items = [];
    var warnings = [];

    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) {
        continue;
      }

      var timestamp = getVal(row, 'Timestamp', 'timestamp');
      var submissionId = getVal(row, 'Submission ID', 'submission id');
      var submissionHash = getVal(row, 'Submission Hash', 'submission hash');
      var studentName = getVal(row, 'Student Name', 'student name');
      var rollNumber = getVal(row, 'Roll Number', 'roll number');
      var division = getVal(row, 'Division', 'division');
      var attemptMode = getVal(row, 'Attempt Mode', 'attempt mode');
      var challengeId = getVal(row, 'Challenge ID', 'challenge id');
      var challengeTitle = getVal(row, 'Challenge Title', 'challenge title');
      var attemptNumber = getVal(row, 'Attempt Number', 'Attempt No') || getVal(row, 'attempt number', 'attempt no');
      var completionPercent = getVal(row, 'Completion %', 'completion %');
      var status = getVal(row, 'Status', 'status');
      var payloadStr = getVal(row, 'Full JSON Payload', 'full json payload');
      var email = getVal(row, 'Email', 'Email (optional)') || getVal(row, 'email', 'email (optional)');

      var parsedPayload = null;
      if (payloadStr && typeof payloadStr === 'string' && payloadStr.trim()) {
        try {
          parsedPayload = JSON.parse(payloadStr.trim());
        } catch (err) {
          warnings.push({
            row: r + 1, // 1-indexed row number in CSV file
            rollNumber: rollNumber,
            challengeId: challengeId,
            error: 'Malformed JSON payload at row ' + (r + 1) + ': ' + err.message
          });
          parsedPayload = null;
        }
      }

      var item = {
        'Timestamp': timestamp,
        timestamp: timestamp,
        'Submission ID': submissionId,
        submissionId: submissionId,
        'Submission Hash': submissionHash,
        submissionHash: submissionHash,
        'Student Name': studentName,
        studentName: studentName,
        'Roll Number': rollNumber,
        rollNumber: rollNumber,
        'Division': division,
        division: division,
        'Attempt Mode': attemptMode,
        attemptMode: attemptMode,
        'Challenge ID': challengeId,
        challengeId: challengeId,
        'Challenge Title': challengeTitle,
        challengeTitle: challengeTitle,
        'Attempt Number': attemptNumber,
        attemptNumber: attemptNumber,
        'Completion %': completionPercent,
        completionPercent: completionPercent,
        'Status': status,
        status: status,
        'Full JSON Payload': payloadStr,
        fullJsonPayload: payloadStr,
        'Email': email,
        email: email
      };

      if (parsedPayload) {
        item.data = parsedPayload;
      }

      items.push(item);
    }

    var summary = this.loadSubmissionsArray(items);

    return {
      students: summary,
      recordCount: items.length,
      warnings: warnings
    };
  };

  /**
   * Unified file ingestion method:
   * Explicitly detects file type and routes to the appropriate parser.
   * - .json -> JSON parser
   * - .csv -> CSV parser
   * - .xlsx / .xls -> informative workbook error
   * - Other -> unsupported format error
   * A CSV file is NEVER passed to JSON.parse().
   */
  DataService.prototype.parseFile = function (fileContent, fileName) {
    if (!fileContent || typeof fileContent !== 'string') {
      throw new Error('File content is empty or unreadable.');
    }

    var format = this.detectFileType(fileName, fileContent);

    if (format === 'json') {
      var raw;
      try {
        raw = JSON.parse(fileContent);
      } catch (err) {
        throw new Error('Failed to parse JSON file: ' + err.message);
      }
      var items = Array.isArray(raw) ? raw : (raw.submissions || raw.data || [raw]);
      var summary = this.loadSubmissionsArray(items);
      return {
        format: 'json',
        students: summary,
        recordCount: items.length,
        warnings: []
      };
    } else if (format === 'csv') {
      var csvResult = this.loadSubmissionsFromCSV(fileContent);
      return {
        format: 'csv',
        students: csvResult.students,
        recordCount: csvResult.recordCount,
        warnings: csvResult.warnings
      };
    } else if (format === 'xlsx' || format === 'xls') {
      throw new Error('Excel workbook files (.xlsx / .xls) cannot be read directly in this submission parser. Please export or save your spreadsheet as CSV (.csv) or JSON (.json), and upload the exported file. (To import the official attendance roll-call roster, use the dedicated "Import Official Attendance Roster" control).');
    } else {
      throw new Error('Unsupported file format "' + format + '". Please upload an exported CSV (.csv) or JSON (.json) file.');
    }
  };

  return DataService;
}));
