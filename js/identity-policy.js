/** Shared deterministic submission identity policy. Also deploy as IdentityPolicy.gs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioIdentity = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function norm(v) { return String(v || '').trim().replace(/\s+/g, ' ').toUpperCase(); }
  function div(v) { var d = norm(v); return /^[ABC]$/.test(d) ? 'TE-' + d : d; }
  function payload(raw) {
    var p = raw.fullJsonPayload || raw['Full JSON Payload'] || raw.jsonPayload || raw.data || raw.rawPayload || raw;
    try { return typeof p === 'string' ? JSON.parse(p) : p || {}; } catch (e) { return {}; }
  }
  function identity(raw) {
    var s = payload(raw).studentInformation || {};
    return {
      studentName: String(raw.studentName || raw['Student Name'] || s.name || s.fullName || '').trim(),
      rollNumber: String(raw.rollNumber || raw['Roll Number'] || s.rollNumber || s.rollNo || '').trim(),
      division: String(raw.division || raw['Division'] || s.division || '').trim(),
      prn: String(raw.prn || raw['PRN'] || raw.dseId || raw['DSE ID'] || s.prn || s.dseId || '').trim()
    };
  }
  function key(raw) {
    var s = identity(raw);
    // Exact tuple; no suffix-roll, fuzzy-name, or roll-only grouping. Incomplete
    // identities stay per submission because there is insufficient grouping evidence.
    var tuple = [norm(s.studentName), norm(s.rollNumber), div(s.division)];
    var embedded = payload(raw).studentInformation || {};
    var inner = [norm(embedded.name || embedded.fullName), norm(embedded.rollNumber || embedded.rollNo), div(embedded.division)];
    if (inner.some(function (v, i) { return v && tuple[i] && v !== tuple[i]; })) tuple.push(inner);
    if (!tuple[0] || (!tuple[1] && !tuple[2])) tuple.push(String(raw.sourceSubmissionId !== undefined ? raw.sourceSubmissionId : (raw.submissionId || raw['Submission ID'] || (payload(raw).submission || {}).submissionId || '')));
    return 'UNLISTED-' + encodeURIComponent(JSON.stringify(tuple));
  }
  function resolve(raw, roster, library) {
    var s = identity(raw), n = norm(s.studentName), r = norm(s.rollNumber), d = div(s.division);
    var info = payload(raw).studentInformation || {};
    // Disagreement between sheet identifiers and embedded identifiers is ambiguous.
    var conflict = ((info.name || info.fullName) && n && norm(info.name || info.fullName) !== n) ||
      ((info.rollNumber || info.rollNo) && r && norm(info.rollNumber || info.rollNo) !== r) ||
      (info.division && d && div(info.division) !== d) ||
      ((raw.prn || raw['PRN']) && info.prn && norm(raw.prn || raw['PRN']) !== norm(info.prn)) ||
      ((raw.dseId || raw['DSE ID']) && info.dseId && norm(raw.dseId || raw['DSE ID']) !== norm(info.dseId));
    var candidates = [], rule = 'EXACT_IDENTITY', credentialContradiction = false;
    function rollAgrees(value, official) {
      return !value || value === official || (/^\d{1,3}$/.test(value) && official.slice(-value.length) === value);
    }
    if (!conflict) {
      // Only exact explicitly recorded aliases; never the legacy token heuristics.
      var aliases = library ? (library.APPROVED_NAME_MAPPINGS || []).concat(library.AUTHORITATIVE_STUDENTS || []) : [];
      var authoritative = library ? (library.AUTHORITATIVE_STUDENTS || []).filter(function (a) {
        return [a.officialName].concat(a.submittedNameVariants || []).some(function (v) { return norm(v) === n; });
      }) : [];
      if (authoritative.length) aliases = authoritative;
      roster.forEach(function (st) {
        var sn = norm(st.studentName), sr = norm(st.rollNumber), sd = div(st.division);
        var exact = n && n === sn && rollAgrees(r, sr) && (!d || d === sd);
        var verified = s.prn && [st.prn, st.dseId].some(function (v) { return v && norm(v) === norm(s.prn); });
        // A supplied credential cannot contradict a known roster credential.
        var credentialOwners = s.prn ? roster.filter(function (owner) {
          return [owner.prn, owner.dseId].some(function (v) { return v && norm(v) === norm(s.prn); });
        }) : [];
        if (s.prn && ((st.prn || st.dseId) && !verified ||
            credentialOwners.length && credentialOwners.indexOf(st) === -1)) {
          if (exact) credentialContradiction = true;
          return;
        }
        var alias = aliases.some(function (a) {
          var names = [a.submittedName, a.officialName].concat(a.alternateNames || [], a.submittedNameVariants || []);
          var ar = norm(a.officialRollNumber || a.rollNumber), ad = div(a.officialDivision || a.division);
          // An approved alias may explicitly document a historically different roll.
          var corrections = { '530563': ['530568'], '530766': ['3'], '530769': ['769'] };
          var rolls = [ar].concat((a.submittedRolls || []).map(norm), corrections[ar] || []);
          var allowedDivisions = [sd].concat((a.submittedDivisions || []).map(div));
          if (ar === '530769') allowedDivisions.push('D');
          return ar === sr && ad === sd && n && names.some(function (v) { return v && norm(v) === n; }) &&
            (rollAgrees(r, sr) || rolls.indexOf(r) !== -1) && (!d || allowedDivisions.indexOf(d) !== -1);
        });
        if (exact || (verified && (!r || r === sr) && (!d || d === sd)) || alias) {
          candidates.push(st);
          if (alias) rule = authoritative.length ? 'AUTHORITATIVE_IDENTITY_RESOLUTION' : 'APPROVED_NAME_MAPPING';
          else if (verified) rule = 'VERIFIED_IDENTIFIER';
        }
      });
    }
    if (candidates.length === 1 && rule === 'EXACT_IDENTITY' && roster.filter(function (st) {
      return norm(st.rollNumber) === r;
    }).length > 1) rule = 'DUPLICATE_ROLL_TE_B_NAME_VERIFIED';
    if (candidates.length === 1) return { status: 'MATCHED', student: candidates[0], rule: rule, candidates: candidates, reason: rule };
    var annotation = library && library.matchAuthoritativeRegistry ? library.matchAuthoritativeRegistry(s) : null;
    var rollCandidates = roster.filter(function (st) { return r && rollAgrees(r, norm(st.rollNumber)) && (!d || d === div(st.division)); });
    var status = conflict || candidates.length > 1 || rollCandidates.length > 1 ? 'AMBIGUOUS' : (rollCandidates.length ? 'CONFLICT' : 'UNMATCHED');
    var reason = 'No unique conservative roster match';
    var diagnosticRule = 'UNLISTED_EXACT_TUPLE';
    if (rollCandidates.length && status === 'CONFLICT') {
      diagnosticRule = 'CONFLICTING_ROLL_NUMBER';
      reason = 'Submitted name does not establish identity with roll candidate: ' + rollCandidates.map(function (st) { return st.studentName; }).join(', ');
    }
    // Preserve audit provenance without resolving, renaming, merging or excluding
    // the original unlisted records. An annotation is never an identity proof.
    if (!conflict && annotation && ['APPROVED_IDENTITY_UNLINKED_TO_ROSTER', 'EXTERNAL_OR_NON_COLLEGE', 'TEST_RECORD'].indexOf(annotation.type) !== -1) {
      status = annotation.type; diagnosticRule = annotation.ruleId; reason = annotation.rationale;
    }
    return { status: status, student: null, rule: diagnosticRule, reason: reason,
      resolvedOfficialName: annotation && annotation.resolvedOfficialName,
      candidates: candidates.length ? candidates : rollCandidates, id: key(raw),
      retrievalBlockedReason: conflict ? 'Identity review required: sheet and embedded submission identifiers disagree. Correct or verify the source identity before retrieving this portfolio.' :
        (credentialContradiction ? 'Identity review required: the recorded university identifier contradicts the exact roster name and roll. A reviewed stable student identifier is required before retrieval.' : null) };
  }

  function assessGroups(items, roster, library) {
    var groups = Object.create(null), idCounts = Object.create(null);
    items.forEach(function (raw) {
      var sourceId = raw.sourceSubmissionId !== undefined ? raw.sourceSubmissionId : (raw.submissionId || raw['Submission ID'] || (payload(raw).submission || {}).submissionId);
      if (sourceId) idCounts[String(sourceId)] = (idCounts[String(sourceId)] || 0) + 1;
    });
    items.forEach(function (raw) {
      var match = resolve(raw, roster, library);
      if (match.student) return;
      var id = key(raw), person = identity(raw), info = payload(raw).studentInformation || {};
      if (!groups[id]) groups[id] = { reason: null, evidence: { email: [], prn: [], dse: [] } };
      var group = groups[id];
      if (match.retrievalBlockedReason) group.reason = match.retrievalBlockedReason;
      var evidence = { email: raw.email || raw['Email'] || info.email, prn: raw.prn || raw['PRN'] || info.prn, dse: raw.dseId || raw['DSE ID'] || info.dseId };
      Object.keys(evidence).forEach(function (field) {
        var value = norm(evidence[field]);
        if (value && group.evidence[field].indexOf(value) === -1) group.evidence[field].push(value);
        if (group.evidence[field].length > 1) group.reason = 'Identity review required: records sharing this name, roll and division contain conflicting ' + field.toUpperCase() + ' identifiers. A reviewed stable student identifier is required; no submissions can be returned safely.';
      });
      var realId = raw.sourceSubmissionId !== undefined ? raw.sourceSubmissionId : (raw.submissionId || raw['Submission ID'] || (payload(raw).submission || {}).submissionId);
      if ((!person.studentName || (!person.rollNumber && !person.division)) && realId && idCounts[String(realId)] > 1) {
        group.reason = 'Identity review required: incomplete identity needs a globally unique original submission ID or a reviewed stable student identifier.';
      }
      if ((!person.studentName || (!person.rollNumber && !person.division)) && !realId) {
        group.reason = 'Identity review required: incomplete identity has no genuine submission ID. Supply a reviewed student identifier or restore the original submission ID.';
      }
    });
    // Do not expose the private evidence used to detect disagreement.
    var result = Object.create(null);
    Object.keys(groups).forEach(function (id) { result[id] = groups[id].reason; });
    return result;
  }

  return { norm: norm, division: div, identity: identity, key: key, resolve: resolve, assessGroups: assessGroups };
}));
