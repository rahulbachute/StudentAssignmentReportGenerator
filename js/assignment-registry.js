/**
 * Standalone Student Assignment Report Generator
 * File: js/assignment-registry.js
 * 
 * Defines the canonical 22 assignment slots with verified IDs, official titles,
 * course codes, and slugs. Independent of MEILP runtime code.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AssignmentRegistry = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_SUBJECT = 'Design of Machine Elements';
  var DEFAULT_COURSE_CODE = 'PCC303-MEC';
  var DEFAULT_BRANCH = 'Mechanical Engineering';
  var DEFAULT_CLASS = 'Third Year (T.E. Mechanical)';
  var DEFAULT_ACADEMIC_YEAR = '2026–2027';

  var OFFICIAL_ASSIGNMENTS = [
    {
      srNo: 1,
      id: 'EC-01',
      slug: 'elevator',
      title: 'Safety Verification of Elevator Suspension Cables',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 2,
      id: 'EC-02',
      slug: 'motorcycle',
      title: 'Determine factor of safety of motorcycle stand and verify whether design is safe',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 3,
      id: 'EC-03',
      slug: 'materials-selection',
      title: 'Engineering Materials Selection in Two-Wheeler Components',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 4,
      id: 'EC-04',
      slug: 'borewell-pump',
      title: 'Ergonomic Design and Safety Verification of a Borewell Pump Hand Lever',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 5,
      id: 'EC-05',
      slug: 'failure-analysis',
      title: 'Failure Analysis and Material Selection of a Failed Mechanical Component',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 6,
      id: 'EC-06',
      slug: 'stress-concentration',
      title: 'Stress Concentration Analysis of a Plate with a Central Hole',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 7,
      id: 'EC-07',
      slug: 'shafts',
      title: 'Design of Shaft for a Real-World Engineering Application',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 8,
      id: 'EC-08',
      slug: 'Keys',
      title: 'Design and Analysis of Keys Used in Real Mechanical Systems for Torque Transmission',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 9,
      id: 'EC-09',
      slug: 'coupling',
      title: 'Identification and Selection of Couplings Used in Mechanical Power Transmission',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 10,
      id: 'EC-10',
      slug: 'cotter-joint',
      title: 'Design of a Cotter Joint for a Bicycle',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 11,
      id: 'EA-11',
      slug: 'kunckle joint',
      title: 'Design and Analysis of a Knuckle Joint for a Tractor–Trailer',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 12,
      id: 'EA-12',
      slug: 'helical-spring-design',
      title: 'Design of a Helical Compression Spring for Motorcycle Suspension',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 13,
      id: 'EA-13',
      slug: 'leaf-spring-design',
      title: 'Construction and Design Verification of a Leaf Spring',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 14,
      id: 'EA-14',
      slug: 'spring-selection',
      title: 'Comparative Study and Selection of Springs for Engineering Applications',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 15,
      id: 'EA-15',
      slug: 'suspension-system-design',
      title: 'Analysis of an Automobile Suspension System',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 16,
      id: 'EA-16',
      slug: 'shaft-fatigue-design',
      title: 'Fatigue Design of an Automotive Propeller Shaft',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 17,
      id: 'EA-17',
      slug: 'connecting-rod-fatigue',
      title: 'Fatigue Analysis of a Connecting Rod',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 18,
      id: 'EA-18',
      slug: 'bench-vice',
      title: 'Torque Requirement and Efficiency Estimation of a Bench Vice Screw Mechanism',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 19,
      id: 'EA-19',
      slug: 'c-clamp-friction',
      title: 'Analysis of C-Clamp Screw and Collar Friction Effects',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 20,
      id: 'EA-20',
      slug: 'hydraulic-press',
      title: 'Design of a Power Screw for a Hydraulic Press',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 21,
      id: 'EC-21',
      slug: 'recirculating-ball-steering',
      title: 'Design of Automotive Steering Gear (Recirculating Ball Type)',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    },
    {
      srNo: 22,
      id: 'EA-22',
      slug: 'mobile-scissor-lift',
      title: 'Design of a 2-Ton Mobile Scissor Lift Power Screw',
      subject: DEFAULT_SUBJECT,
      courseCode: DEFAULT_COURSE_CODE,
      cceMarks: 12.0
    }
  ];

  /**
   * Normalizes an assignment key for lookup.
   */
  function normalizeKey(str) {
    if (!str) return '';
    return String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Pre-index mappings
  var byId = {};
  var bySlug = {};
  var byNormalizedTitle = {};

  OFFICIAL_ASSIGNMENTS.forEach(function (item) {
    byId[normalizeKey(item.id)] = item;
    bySlug[normalizeKey(item.slug)] = item;
    byNormalizedTitle[normalizeKey(item.title)] = item;
  });

  return {
    ASSIGNMENTS: OFFICIAL_ASSIGNMENTS,
    DEFAULT_SUBJECT: DEFAULT_SUBJECT,
    DEFAULT_COURSE_CODE: DEFAULT_COURSE_CODE,
    DEFAULT_BRANCH: DEFAULT_BRANCH,
    DEFAULT_CLASS: DEFAULT_CLASS,
    DEFAULT_ACADEMIC_YEAR: DEFAULT_ACADEMIC_YEAR,

    /**
     * Resolves an assignment by ID, slug, or title without silent substitutions.
     * Returns matching canonical assignment object or null.
     */
    findAssignment: function (query) {
      if (!query) return null;
      var key = normalizeKey(query);
      if (byId[key]) return byId[key];
      if (bySlug[key]) return bySlug[key];
      if (byNormalizedTitle[key]) return byNormalizedTitle[key];

      // Fuzzy prefix check for IDs like "EC-01", "EC01", "EA11", etc.
      for (var i = 0; i < OFFICIAL_ASSIGNMENTS.length; i++) {
        var a = OFFICIAL_ASSIGNMENTS[i];
        if (normalizeKey(a.id) === key || normalizeKey(a.slug) === key) {
          return a;
        }
      }
      return null;
    },

    /**
     * Verifies if an assignment ID is one of the official 22.
     */
    isValidId: function (id) {
      return Boolean(byId[normalizeKey(id)]);
    }
  };
}));
