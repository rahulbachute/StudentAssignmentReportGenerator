const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const DS = require('../js/data-service');
const P = require('../js/identity-policy');
const Roster = require('../js/official-roster');
const Renderer = require('../js/report-renderer');
const Registry = require('../js/assignment-registry');
const root = path.resolve(__dirname, '..');
const official = { id: 'TE-A-100001-1', rollNumber: '100001', studentName: 'Ada Rao', division: 'TE-A', srNo: 1, prn: 'VERIFIED-1' };
const duplicate = { id: 'TE-A-100001-2', rollNumber: '100001', studentName: 'Bea Rao', division: 'TE-A', srNo: 2 };
const roster = [official, duplicate];
const raw = (name = 'Mira Shah', roll = '909', div = 'B', assignment = 'EC-01', id = 'mira-1', attempt = 1, response = 'Actual answer') => ({ studentName: name, rollNumber: roll, division: div,
  challengeId: assignment, submissionId: id, attemptNumber: attempt,
  timestamp: '2026-10-25T00:00:00Z', fullJsonPayload: JSON.stringify({submissionData: {activityResponses: [{title:'Reasoning', component:'reflection',response}]}}) });
const a = raw(), b = raw('Mira Shaha', '909', 'B', 'EC-01', 'other');
const rows = [a, b, raw('Mira Shah','909','B','EC-02','mira-2'), raw('Mira Shah','909','B','EC-01','mira-3',2,'Latest answer'), raw('Ada Rao','100001','TE-A','EC-01','ada'), raw('Bea Rao','100001','TE-A','EC-01','bea')];
const headers = ['Timestamp','Submission ID','Student Name','Roll Number','Division','Challenge ID','Attempt Number','Full JSON Payload'];
function spreadsheet(items = rows, evaluations = []) {
  const subs = [headers].concat(items.map(r => [r.timestamp,r.submissionId,r.studentName,r.rollNumber,r.division,r.challengeId,r.attemptNumber,r.fullJsonPayload]));
  const evalHeaders = ['Submission ID','Roll Number','Marks'];
  return {getSheetByName(name) { const values = name === 'Student_Submissions' ? subs : name === 'Faculty_Evaluation' ? [evalHeaders].concat(evaluations) : null;
    return values ? {getDataRange(){return {getValues(){return values;}};}} : null; }};
}
const ctx = { OfficialRoster: Roster, PortfolioIdentity: P, Logger: {log(){}}, ContentService: {MimeType:{JSON:'json'},createTextOutput(text){return {setMimeType(){}, getContent(){return text;}};}} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'backend/StandaloneReportService.gs'),'utf8'),ctx);
ctx.getLiveRoster = () => roster;
const decode = output => JSON.parse(output.getContent());
function service(items = []) { const ds = new DS(); ds.setCustomRoster(roster,[], 'TEST', true); ds.loadSubmissionsArray(items); return ds; }
function transport(ds, ss = spreadsheet()) {
  ds.configuredEndpoint = DS.DEFAULT_SERVICE_URL;
  ds.httpTransport = (req, cb) => {
    const body = JSON.parse(req.body);
    const data = body.action === 'getUnlistedStudents' ? ctx.handleGetUnlistedStudents(ss) : ctx.handleGetStudentReport(ss,body);
    cb(null,{status:200,responseText:data.getContent()});
  };
}
function fetch(ds,id) { let result; ds.fetchStudentPortfolio(id,(err,pkg,student)=>{result={err,pkg,student};}); assert(result); return result; }
let count = 0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
test('official match requires unique compatible identifiers',()=>{assert.equal(P.resolve(raw('Ada Rao','100001','A'),roster).student.id,official.id);});
test('unmatched submission is selectable separately from official divisions',()=>{const ds=service([a]);assert.equal(ds.getDropdownStudentsByDivision('UNLISTED').length,1);assert.equal(ds.getDropdownStudentsByDivision('TE-A').length,2);});
test('verified PRN permits exact identifier based name mismatch',()=>{const r=raw('Changed Name','100001','A');r.prn='VERIFIED-1';assert.equal(P.resolve(r,roster).student.id,official.id);});
test('similar names sharing a roll remain distinct',()=>{const ds=service([a,b]);assert.equal(ds.getUnlistedStudents().length,2);assert.notEqual(P.key(a),P.key(b));assert.equal(ds.getStudentReportPackage('909'),null);});
test('conflicting official roll and name remain unlisted',()=>{assert.equal(P.resolve(raw('Ada Rao','100002','A'),roster).student,null);assert.equal(P.resolve(raw('Unknown Rao','100001','A'),roster).student,null);});
test('sheet and embedded identity disagreement remains unlisted',()=>{const r=raw('Ada Rao','100001','A');r.fullJsonPayload=JSON.stringify({studentInformation:{name:'Bea Rao'}});assert.equal(P.resolve(r,roster).status,'AMBIGUOUS');});
test('multiple unlisted assignments group under stable exact tuple',()=>{const ds=service(rows);const st=ds.getUnlistedStudents().find(s=>s.id===P.key(a));assert.equal(st.submissionCount,2);assert.equal(st.allSubmissions.length,3);const reverse=service([...rows].reverse());assert.equal(reverse.getUnlistedStudents().find(s=>s.studentName==='Mira Shah').id,st.id);});
test('latest attempt authoritative and original attempts retained',()=>{const ds=service(rows);const pkg=ds.getStudentReportPackage(P.key(a));assert.equal(pkg.assignmentSlots[0].activeSubmission.attemptNumber,2);assert.equal(pkg.assignmentSlots[0].allAttempts.length,2);assert.equal(ds.rawSubmissions.length,rows.length);});
test('backend directory returns metadata without answer payloads or credentials',()=>{const dir=decode(ctx.handleGetUnlistedStudents(spreadsheet()));assert.equal(dir.students.length,2);assert(!JSON.stringify(dir).includes('Actual answer'));assert.equal(dir.students[0].isOfficialRoster,false);});
test('supported unlisted retrieval uses real backend code and existing renderer',()=>{const ds=service();transport(ds);ds.discoverUnlistedStudents(err=>assert.ifError(err));const result=fetch(ds,P.key(a));assert.ifError(result.err);assert.equal(result.pkg.submittedCount,2);assert(Renderer.renderCompletePackage(result.pkg).includes('Latest answer'));assert.equal(result.pkg.studentInfo.isOfficialRoster,false);});
test('official duplicate rolls never disclose the other student records',()=>{const data=decode(ctx.handleGetStudentReport(spreadsheet(),{studentId:official.id,studentName:official.studentName,rollNumber:official.rollNumber,division:official.division}));assert.deepEqual(data.submissions.map(s=>s.submissionId),['ada']);});
test('unlisted retrieval never discloses similar name records',()=>{const data=decode(ctx.handleGetStudentReport(spreadsheet(),{studentId:P.key(a),identityCategory:'UNLISTED'}));assert.deepEqual(data.submissions.map(s=>s.submissionId),['mira-1','mira-2','mira-3']);});
test('tampered official selector and roll-only duplicates fail closed',()=>{assert.equal(decode(ctx.handleGetStudentReport(spreadsheet(),{studentId:official.id,studentName:duplicate.studentName})).success,false);assert.equal(ctx.lookupStudentFromRoster(spreadsheet(),'','100001','A',''),null);});
test('unlisted without live retrievable data fails with deployment action',()=>{const ds=service([a]);ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:false,error:'Student Not Found'})});const r=fetch(ds,P.key(a));assert(r.err.message.includes('Deploy'));assert(!r.pkg);});
test('network failure cannot silently render a locally cached live portfolio',()=>{const ds=service([a]);ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;ds.httpTransport=(req,cb)=>cb(new Error('offline'));assert(fetch(ds,P.key(a)).err);});
test('foreign backend record rejected before ingestion',()=>{const ds=service([a]);ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:true,student:{id:P.key(a)},submissions:[b]})});assert(fetch(ds,P.key(a)).err.message.includes('different'));assert.equal(ds.rawSubmissions[0],a);});
test('empty unlisted backend response rejected',()=>{const ds=service([a]);ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:true,student:{id:P.key(a)},submissions:[]})});assert(fetch(ds,P.key(a)).err);});
test('all 22 canonical slots and index exist',()=>{const pkg=service([a]).getStudentReportPackage(P.key(a));assert.equal(pkg.assignmentSlots.length,22);assert.deepEqual(pkg.assignmentSlots.map(s=>s.assignment.id),Registry.ASSIGNMENTS.map(s=>s.id));assert.equal(pkg.indexRows.length,22);assert(Renderer.renderCompletePackage(pkg).includes('NOT SUBMITTED'));});
const longText=('A complete engineering answer with evidence. '.repeat(300))+'END_OF_LONG_ANSWER';
let longPackage;
test('long answer continuation preserves every character without modifying original',()=>{const r=raw('Mira Shah','909','B','EC-01','long',1,longText);const ds=service([r]);longPackage=ds.getStudentReportPackage(P.key(r));const pages=DS.partitionActivities(longPackage.assignmentSlots[0].activeSubmission.activityResponses);assert(pages.length>1);assert.equal(pages.flat().map(a=>a.response.reflection).join(''),longText);assert.equal(JSON.parse(r.fullJsonPayload).submissionData.activityResponses[0].response,longText);assert(Renderer.renderCompletePackage(longPackage).includes('END_OF_LONG_ANSWER'));});
test('index equals rendered physical page markers including continuation pages',()=>{const html=Renderer.renderCompletePackage(longPackage);const numbers=[...html.matchAll(/data-page="(\d+)"/g)].map(m=>+m[1]);assert.deepEqual(numbers,Array.from({length:longPackage.totalPages},(_,i)=>i+1));longPackage.assignmentSlots.forEach((s,i)=>assert.equal(s.pageNo,longPackage.indexRows[i].pageNo));});
test('zero-submission official receives 23-page portfolio through backend',()=>{const ds=service();transport(ds,spreadsheet([]));const r=fetch(ds,official.id);assert.ifError(r.err);assert.equal(r.pkg.totalPages,23);assert.equal(r.pkg.missingCount,22);});
test('evaluation IDs must be globally unique and scoped to selected student',()=>{const ss=spreadsheet(rows,[['other','909',99],['mira-1','909',7]]);const data=decode(ctx.handleGetStudentReport(ss,{studentId:P.key(a),identityCategory:'UNLISTED'}));assert.deepEqual(data.evaluations.map(e=>e.submissionId),['mira-1']);const repeated=spreadsheet([a,{...b,submissionId:a.submissionId}],[['mira-1','909',99]]);assert.equal(decode(ctx.handleGetStudentReport(repeated,{studentId:P.key(a),identityCategory:'UNLISTED'})).evaluations.length,0);});
test('missing identifiers stay missing and do not invent division A',()=>{const ds=service([{studentName:'Only Name',submissionId:'name1',challengeId:'EC-01'}]);const st=ds.getUnlistedStudents()[0];assert.equal(st.division,'Not Available');assert.equal(st.rollNumber,'Not Available');assert.equal(ds.rawSubmissions[0].division,undefined);});
test('stale asynchronous response cannot replace later selection',()=>{const ds=service(rows);ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;const pending=[];ds.httpTransport=(req,cb)=>pending.push([JSON.parse(req.body),cb]);let results=[];ds.fetchStudentPortfolio(P.key(a),err=>results.push(err));ds.fetchStudentPortfolio(P.key(b),err=>results.push(err));for(const [body,cb] of pending.reverse())cb(null,{status:200,responseText:ctx.handleGetStudentReport(spreadsheet(),body).getContent()});assert.equal(ds.authenticatedStudent.id,P.key(b));assert(results.some(Boolean));});
test('conflicting embedded identities are not grouped together',()=>{const x=raw(''),y=raw('');x.fullJsonPayload=JSON.stringify({studentInformation:{name:'Inner One'}});y.fullJsonPayload=JSON.stringify({studentInformation:{name:'Inner Two'}});assert.notEqual(P.key(x),P.key(y));assert.equal(service([x,y]).getUnlistedStudents().length,2);});
test('separate reflection fields are retained in shared renderer',()=>{const x=raw();x.fullJsonPayload=JSON.stringify({submissionData:{reflection:'An actual separate reflection'}});const pkg=service([x]).getStudentReportPackage(P.key(x));assert(Renderer.renderCompletePackage(pkg).includes('An actual separate reflection'));});
test('empty activity data does not fabricate completed work or verified identity',()=>{const x=raw();x.fullJsonPayload='{}';const pkg=service([x]).getStudentReportPackage(P.key(x));const html=Renderer.renderCompletePackage(pkg);assert(html.includes('No activity responses recorded'));assert(!html.includes('Verified Local Authenticated'));assert(html.includes('attendance match unconfirmed'));});
test('inline app scripts compile and identity policy loads before data service',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);assert(html.indexOf('js/identity-policy.js')<html.indexOf('js/data-service.js'));});
test('verified PRN name mismatch works through backend projection and frontend validation',()=>{const x=raw('Changed Name','100001','A');x.fullJsonPayload=JSON.stringify({studentInformation:{name:'Changed Name',rollNumber:'100001',division:'A',prn:'VERIFIED-1'},submissionData:{activityResponses:[{title:'Actual work',response:'Verified record answer'}]}});const ds=service();transport(ds,spreadsheet([x]));const result=fetch(ds,official.id);assert.ifError(result.err);assert.equal(result.pkg.submittedCount,1);assert(Renderer.renderCompletePackage(result.pkg).includes('Verified record answer'));});
test('Apps Script companion files initialize as globals without Node exports',()=>{const globalContext={};vm.createContext(globalContext);for(const file of ['js/official-roster.js','js/identity-policy.js','backend/StandaloneReportService.gs'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),globalContext);assert.equal(globalContext.OfficialRoster.STUDENTS.length,216);assert.equal(typeof globalContext.PortfolioIdentity.resolve,'function');assert.equal(typeof globalContext.handleGetStudentReport,'function');});
test('contradictory known PRN cannot override exact name and roll',()=>{const x=raw('Ada Rao','100001','A');x.prn='OTHER-PRN';assert.equal(P.resolve(x,roster).student,null);});
test('public official responses omit roster credentials, email and unnecessary metadata',()=>{official.email='private@example.invalid';official.privateConfiguration='do-not-project';try{const data=decode(ctx.handleGetStudentReport(spreadsheet(),{studentId:official.id}));assert.equal(data.student.prn,undefined);assert.equal(data.student.email,undefined);assert.equal(data.student.privateConfiguration,undefined);assert(!JSON.stringify(data).includes('VERIFIED-1'));assert(!JSON.stringify(data).includes('private@example.invalid'));}finally{delete official.email;delete official.privateConfiguration;}});
test('verified server association preserves name mismatch without returning credential',()=>{const x=raw('Changed Name','100001','A');x.fullJsonPayload=JSON.stringify({studentInformation:{prn:'VERIFIED-1'},submissionData:{activityResponses:[{response:'Actual verified work'}]}});const data=decode(ctx.handleGetStudentReport(spreadsheet([x]),{studentId:official.id}));assert(data.success);assert.equal(data.submissions[0].portfolioIdentity.rule,'VERIFIED_IDENTIFIER');assert(!JSON.stringify(data).includes('VERIFIED-1'));assert.equal(JSON.parse(x.fullJsonPayload).studentInformation.prn,'VERIFIED-1');});
test('unlisted student whose submissions use different email addresses but have consistent reliable identity evidence allows retrieval',()=>{
  const x = raw(), y = raw('Mira Shah', '909', 'B', 'EC-02', 'conflicting-email');
  x.fullJsonPayload = JSON.stringify({studentInformation:{email:'one@example.invalid'}});
  y.fullJsonPayload = JSON.stringify({studentInformation:{email:'two@example.invalid'}});
  const data = decode(ctx.handleGetStudentReport(spreadsheet([x,y]), { studentId: P.key(x), identityCategory: 'UNLISTED' }));
  assert.equal(data.success, true);
  assert.equal(data.submissions.length, 2);
  assert.deepEqual(data.submissions.map(s => s.submissionId), ['mira-1', 'conflicting-email']);
  assert(!JSON.stringify(data).includes('one@example.invalid'));
  assert(!JSON.stringify(data).includes('two@example.invalid'));
});
test('conflicting emails cannot silently combine two indistinguishable unlisted people with incomplete identity',()=>{
  const x = { studentName: '', rollNumber: '999', division: 'A', challengeId: 'EC-01', submissionId: 'inc-1', fullJsonPayload: JSON.stringify({studentInformation:{name:'',email:'one@example.invalid'}}) };
  const y = { studentName: '', rollNumber: '999', division: 'B', challengeId: 'EC-02', submissionId: 'inc-2', fullJsonPayload: JSON.stringify({studentInformation:{name:'',email:'two@example.invalid'}}) };
  const ss = spreadsheet([x, y]);
  const list = decode(ctx.handleGetUnlistedStudents(ss));
  assert.equal(list.students.length, 2);
  assert.notEqual(list.students[0].id, list.students[1].id);
  assert(!JSON.stringify(list).includes('one@example.invalid'));
  assert(!JSON.stringify(list).includes('two@example.invalid'));
  const xDup = { studentName: '', rollNumber: '999', challengeId: 'EC-01', submissionId: 'inc-dup', fullJsonPayload: JSON.stringify({studentInformation:{name:'',email:'one@example.invalid'}}) };
  const yDup = { studentName: '', rollNumber: '999', challengeId: 'EC-02', submissionId: 'inc-dup', fullJsonPayload: JSON.stringify({studentInformation:{name:'',email:'two@example.invalid'}}) };
  const dupList = decode(ctx.handleGetUnlistedStudents(spreadsheet([xDup, yDup])));
  assert.equal(dupList.students.length, 1);
  assert.equal(dupList.students[0].retrievalAvailable, false);
  assert(dupList.students[0].retrievalBlockedReason.includes('EMAIL') || dupList.students[0].retrievalBlockedReason.includes('reviewed stable student identifier'));
});
test('sheet and embedded contradiction fails safely at portfolio endpoint',()=>{const x=raw();x.fullJsonPayload=JSON.stringify({studentInformation:{name:'Someone Else'}});const ss=spreadsheet([x]);const list=decode(ctx.handleGetUnlistedStudents(ss));assert.equal(list.students[0].retrievalAvailable,false);const data=decode(ctx.handleGetStudentReport(ss,{studentId:list.students[0].id,identityCategory:'UNLISTED'}));assert.equal(data.success,false);assert.equal(data.submissions,undefined);});
test('incomplete identity without original submission ID cannot use generated fallback as proof',()=>{const x={studentName:'Only Name',challengeId:'EC-01'};const ds=service([x]);const st=ds.getUnlistedStudents()[0];assert.equal(st.retrievalAvailable,false);assert.equal(ds.getStudentReportPackage(st.id),null);assert(fetch(ds,st.id).err.message.includes('genuine submission ID'));});
test('imported JSON cannot forge a server-verified association',()=>{const x=raw('Changed Name','100001','A');x.portfolioIdentity={studentId:official.id,rule:'VERIFIED_IDENTIFIER'};const ds=service([x]);assert.equal(ds.studentsMap[official.id].allSubmissions.length,0);assert.equal(ds.getUnlistedStudents().length,1);});
test('binding cannot override another uniquely resolved official student',()=>{const ds=service();ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;const x=raw('Bea Rao','100001','A');x.portfolioIdentity={studentId:official.id,rule:'VERIFIED_IDENTIFIER'};ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:true,identityPolicy:'exact-v1',student:{id:official.id},submissions:[x]})});assert(fetch(ds,official.id).err);});
test('binding without expected server policy version is not trusted',()=>{const ds=service();ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;const x=raw('Changed Name','100001','A');x.portfolioIdentity={studentId:official.id,rule:'VERIFIED_IDENTIFIER'};ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:true,student:{id:official.id},submissions:[x]})});assert(fetch(ds,official.id).err);});
test('old exclusion annotations do not hide or rename actual unlisted records',()=>{const ds=new DS();const items=[raw('Rutika Shivaji Jadhav','20','A','EC-01','external'),raw('j','610','B','EC-01','benchmark'),raw('Samarth Supekar','530512','A','EC-01','approved-unlisted')];ds.loadSubmissionsArray(items);assert.equal(ds.getUnlistedStudents().length,3);items.forEach(x=>{const pkg=ds.getStudentReportPackage(P.key(x));assert(pkg);assert.equal(pkg.studentInfo.studentName,x.studentName);assert.equal(pkg.submittedCount,1);assert.equal(pkg.studentInfo.isOfficialRoster,false);});});
test('unapproved partial official name remains unlisted and separate from official roll',()=>{const ds=new DS();const x=raw('Prithviraj Adhane','530501','A');ds.loadSubmissionsArray([x]);assert.equal(ds.studentsMap['TE-A-530501-1'].allSubmissions.length,0);assert.equal(ds.getUnlistedStudents()[0].studentName,'Prithviraj Adhane');assert.equal(ds.getStudentReportPackage('530501'),null);});
test('public discovery and student endpoints do not bypass administrative key validation',()=>{ctx.getTargetSpreadsheet=()=>spreadsheet();ctx.PropertiesService={getScriptProperties(){return {getProperty(name){return name==='REPORT_SERVICE_ACCESS_KEY'?'synthetic-private-admin-key':'';}};}};function request(body){return decode(ctx.handleRequest({postData:{contents:JSON.stringify(body)}},'POST'));}assert(request({action:'getUnlistedStudents'}).success);assert(request({action:'getStudentReport',identityCategory:'UNLISTED',studentId:P.key(a)}).success);const denied=request({action:'getReportData'});assert.equal(denied.success,false);assert(denied.error.includes('Unauthorized'));assert(!JSON.stringify(denied).includes('synthetic-private-admin-key'));});
test('credential route shares scoped validation and does not expose credential values',()=>{const x=raw('Changed Name','100001','A');x.fullJsonPayload=JSON.stringify({studentInformation:{prn:'VERIFIED-1'},submissionData:{activityResponses:[{response:'Credential scoped answer'}]}});const ds=service();transport(ds,spreadsheet([x]));let result;ds.authenticateStudent({prn:'VERIFIED-1'},(err,pkg,student)=>result={err,pkg,student});assert.ifError(result.err);assert.equal(result.pkg.submittedCount,1);assert.equal(result.student.id,official.id);assert.equal(result.student.prn,undefined);});
test('credential route rejects foreign records before replacing source state',()=>{const ds=service([a]);ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:true,authenticated:true,student:official,submissions:[raw('Bea Rao','100001','A')]})});let err;ds.authenticateStudent({prn:'VERIFIED-1'},e=>err=e);assert(err);assert.equal(ds.rawSubmissions[0],a);});
test('explicit name selection never claims credential authentication',()=>{const data=decode(ctx.handleGetStudentReport(spreadsheet(),{studentId:official.id,prn:'VERIFIED-1'}));assert(data.success);assert.equal(data.authenticated,false);});
test('sheet PRN columns establish server association without being projected',()=>{const x=raw('Changed Name','100001','A');x.PRN='VERIFIED-1';const ss=spreadsheet([x]);const original=ss.getSheetByName.bind(ss);ss.getSheetByName=name=>{const sheet=original(name);if(name!=='Student_Submissions')return sheet;const rows=sheet.getDataRange().getValues().map(row=>row.slice());rows[0].push('PRN');rows[1].push('VERIFIED-1');return {getDataRange(){return {getValues(){return rows;}};}};};const data=decode(ctx.handleGetStudentReport(ss,{studentId:official.id}));assert(data.success);assert.equal(data.submissions.length,1);assert.equal(data.submissions[0].portfolioIdentity.rule,'VERIFIED_IDENTIFIER');assert(!JSON.stringify(data).includes('VERIFIED-1'));});
test('name and roll cannot override contradictory known credential in unlisted retrieval',()=>{const x=raw('Ada Rao','100001','A');x.fullJsonPayload=JSON.stringify({studentInformation:{prn:'CONTRADICTORY'}});const data=decode(ctx.handleGetStudentReport(spreadsheet([x]),{identityCategory:'UNLISTED',studentId:P.key(x)}));assert.equal(data.success,false);assert(data.error.includes('contradicts'));});
test('nameless records do not establish official identity from roll alone',()=>{const x=raw('','100001','A');const ds=service([x]);assert.equal(ds.studentsMap[official.id].allSubmissions.length,0);assert.equal(ds.studentsMap[duplicate.id].allSubmissions.length,0);assert.equal(ds.rawSubmissions[0],x);});
test('conflicting server association cannot accompany otherwise matching official data',()=>{const ds=service();ds.configuredEndpoint=DS.DEFAULT_SERVICE_URL;const x=raw('Ada Rao','100001','A');x.portfolioIdentity={studentId:duplicate.id,rule:'EXACT_IDENTITY'};ds.httpTransport=(req,cb)=>cb(null,{status:200,responseText:JSON.stringify({success:true,identityPolicy:'exact-v1',student:{id:official.id},submissions:[x]})});assert(fetch(ds,official.id).err.message.includes('conflicting server association'));});
test('duplicate source IDs cannot combine incomplete unlisted identities',()=>{const x=raw('','909','B','EC-01','duplicated'),y=raw('','909','B','EC-02','duplicated');const ss=spreadsheet([x,y]);const data=decode(ctx.handleGetStudentReport(ss,{studentId:P.key(x),identityCategory:'UNLISTED'}));assert.equal(data.success,false);assert(data.error.includes('globally unique'));assert.equal(service([x,y]).getStudentReportPackage(P.key(x)),null);});
test('original payload submission ID supports incomplete identities without a sheet ID cell',()=>{const x=raw('Only Name','','','EC-01','');x.fullJsonPayload=JSON.stringify({submission:{submissionId:'original-payload-id'},submissionData:{activityResponses:[{response:'Actual source answer'}]}});const ss=spreadsheet([x]);const data=decode(ctx.handleGetStudentReport(ss,{studentId:P.key(x),identityCategory:'UNLISTED'}));assert(data.success);assert.equal(data.submissions[0].submissionId,'original-payload-id');const ds=service();transport(ds,ss);ds.discoverUnlistedStudents(err=>assert.ifError(err));const result=fetch(ds,P.key(x));assert.ifError(result.err);assert.equal(result.pkg.submittedCount,1);});

// --- SECTION 6: MANDATORY IDENTITY REGRESSION TESTS (CHECKS 1 TO 16) ---
test('regression 1: leading-zero differences such as 02 versus 2 are equivalent and resolve safely',()=>{
  assert.equal(P.normRoll('02'),'2');
  assert.equal(P.normRoll('2'),'2');
  assert.equal(P.normRoll('002'),'2');
  const rSheet = raw('Aditi Nair','2','TE-A','EC-01','aditi-1');
  rSheet.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'02',division:'TE-A'}});
  const match = P.resolve(rSheet, Roster.STUDENTS, Roster);
  assert.equal(match.retrievalBlockedReason, null);
  const kA = P.key(rSheet);
  const rPayload = raw('Aditi Nair','02','TE-A','EC-01','aditi-1');
  rPayload.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'2',division:'TE-A'}});
  assert.equal(kA, P.key(rPayload));
});

test('regression 2: distinct numeric identifiers remain different, and distinct names never merge',()=>{
  assert.notEqual(P.normRoll('2'), P.normRoll('22'));
  assert.notEqual(P.normRoll('2'), P.normRoll('530502'));
  assert.notEqual(P.normRoll('22'), P.normRoll('530502'));
  const rRahul = raw('Rahul','2','TE-A','EC-01','sub-rahul');
  const rRahulB = raw('Rahul B','2','TE-A','EC-01','sub-rahul-b');
  const rRahulBachute = raw('Rahul Bachute','2','TE-A','EC-01','sub-rahul-bachute');
  const k1 = P.key(rRahul), k2 = P.key(rRahulB), k3 = P.key(rRahulBachute);
  assert.notEqual(k1, k2);
  assert.notEqual(k1, k3);
  assert.notEqual(k2, k3);
});

test('regression 3: whitespace and case differences in names are normalized without affecting identity',()=>{
  assert.equal(P.norm('  aditi   nair  '), 'ADITI NAIR');
  assert.equal(P.norm('Aditi Nair'), 'ADITI NAIR');
  const rSpaced = raw('  aditi   nair  ','2','TE-A','EC-01','sub-sp');
  const rClean = raw('Aditi Nair','2','TE-A','EC-01','sub-cl');
  assert.equal(P.key(rSpaced), P.key(rClean));
});

test('regression 4: missing middle initials and surnames remain unlisted without authorized alias',()=>{
  const rAditi = raw('Aditi Nair','2','TE-A','EC-01','sub-aditi');
  const matchAditi = P.resolve(rAditi, Roster.STUDENTS, Roster);
  assert.equal(matchAditi.student, null); // Does not force match to official 'Aditi S Nair'
  const rPrithvi = raw('Prithviraj Adhane','530501','TE-A','EC-01','sub-prithvi');
  const matchPrithvi = P.resolve(rPrithvi, Roster.STUDENTS, Roster);
  assert.equal(matchPrithvi.student, null); // Does not force match to 'Adhane Prithviraj Jitendra'
});

test('regression 5: equivalent documented division formats canonicalize safely',()=>{
  assert.equal(P.division('A'), 'TE-A');
  assert.equal(P.division('TE-A'), 'TE-A');
  assert.equal(P.division('TE A'), 'TE-A');
  assert.equal(P.division('TEA'), 'TE-A');
  assert.equal(P.division('TE - A'), 'TE-A');
  assert.equal(P.division('DIV A'), 'TE-A');
  assert.equal(P.division('DIVISION A'), 'TE-A');
  assert.equal(P.division('B'), 'TE-B');
  assert.equal(P.division('TE-B'), 'TE-B');
  assert.equal(P.division('TE B'), 'TE-B');
  assert.equal(P.division('C'), 'TE-C');
  assert.equal(P.division('TE-C'), 'TE-C');
  assert.equal(P.division('TE C'), 'TE-C');
  const rA = raw('Mira Shah','909','A','EC-01','sub-a');
  const rTEA = raw('Mira Shah','909','TE-A','EC-01','sub-tea');
  assert.equal(P.key(rA), P.key(rTEA));
});

test('regression 6: conflicting divisions TE-A versus TE-B block retrieval and prevent cross-division match',()=>{
  assert.notEqual(P.division('TE-A'), P.division('TE-B'));
  const rDivMismatch = raw('Mira Shah','909','TE-A','EC-01','sub-div-mismatch');
  rDivMismatch.fullJsonPayload = JSON.stringify({studentInformation:{name:'Mira Shah',rollNumber:'909',division:'TE-B'}});
  const match = P.resolve(rDivMismatch, Roster.STUDENTS, Roster);
  assert(match.retrievalBlockedReason && match.retrievalBlockedReason.includes('disagree'));
});

test('regression 7: conflicting PRNs or DSE IDs trigger review and block portfolio retrieval',()=>{
  const rPrnMismatch = raw('Mira Shah','909','TE-A','EC-01','sub-prn-mismatch');
  rPrnMismatch.prn = '72500001A';
  rPrnMismatch.fullJsonPayload = JSON.stringify({studentInformation:{name:'Mira Shah',rollNumber:'909',division:'TE-A',prn:'72500002B'}});
  const match = P.resolve(rPrnMismatch, Roster.STUDENTS, Roster);
  assert(match.retrievalBlockedReason && match.retrievalBlockedReason.includes('disagree'));
});

test('regression 8: same roll number with different names produces distinct identities without collision',()=>{
  const rStudent1 = raw('Mira Shah','909','TE-B','EC-01','sub-mira');
  const rStudent2 = raw('Tara Shah','909','TE-B','EC-01','sub-tara');
  assert.notEqual(P.key(rStudent1), P.key(rStudent2));
  const ds = service([rStudent1, rStudent2]);
  assert.equal(ds.getUnlistedStudents().length, 2);
});

test('regression 9: distinct submitted names produce distinct identities without collision',()=>{
  const rRoll1 = raw('Rahul','909','TE-B','EC-01','sub-roll1');
  const rRoll2 = raw('Rahul B','909','TE-B','EC-01','sub-roll2');
  assert.notEqual(P.key(rRoll1), P.key(rRoll2));
  const ds = service([rRoll1, rRoll2]);
  assert.equal(ds.getUnlistedStudents().length, 2);
});

test('regression 10: same submitted name across divisions groups safely without partition',()=>{
  const rDivA = raw('Rahul Bachute','10','TE-A','EC-01','sub-div-a');
  const rDivB = raw('Rahul Bachute','10','TE-B','EC-01','sub-div-b');
  assert.equal(P.key(rDivA), P.key(rDivB));
  const ds = service([rDivA, rDivB]);
  assert.equal(ds.getUnlistedStudents().length, 1);
});

test('regression 11: spreadsheet-versus-embedded-payload genuine conflicts fail safely with review required',()=>{
  const rGenuineConflict = raw('Mira Shah','2','TE-A','EC-01','sub-gen-conflict');
  rGenuineConflict.fullJsonPayload = JSON.stringify({studentInformation:{name:'Mira Shah',rollNumber:'22',division:'TE-A'}});
  const match = P.resolve(rGenuineConflict, Roster.STUDENTS, Roster);
  assert(match.retrievalBlockedReason && match.retrievalBlockedReason.includes('disagree'));
});

test('regression 12: multiple submissions belonging to one reliably identified unlisted student group correctly',()=>{
  const sub1 = raw('Aditi Nair','2','TE-A','EC-01','aditi-sub-1');
  sub1.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'02',division:'A'}});
  const sub2 = raw('Aditi Nair','02','A','EC-02','aditi-sub-2');
  sub2.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'2',division:'TE-A'}});
  const sub3 = raw('Aditi Nair','2','TE A','EC-03','aditi-sub-3');
  sub3.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'02',division:'TE A'}});
  const ds = service([sub1, sub2, sub3]);
  const unlistedList = ds.getUnlistedStudents();
  assert.equal(unlistedList.length, 1);
  assert.equal(unlistedList[0].submissionCount, 3);
  assert.equal(unlistedList[0].retrievalAvailable, true);
});

test('regression 13: repeated attempts at the same assignment maintain latest-attempt rule and preserve original history',()=>{
  const att1 = raw('Aditi Nair','2','TE-A','EC-01','aditi-att-1',1,'First Attempt Content');
  att1.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'02',division:'A'},submissionData:{activityResponses:[{title:'Act',response:'First Attempt Content'}]}});
  const att2 = raw('Aditi Nair','2','TE-A','EC-01','aditi-att-2',2,'Second Attempt Content');
  att2.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'02',division:'A'},submissionData:{activityResponses:[{title:'Act',response:'Second Attempt Content'}]}});
  const ds = service([att1, att2]);
  const pkg = ds.getStudentReportPackage(P.key(att1));
  assert.equal(pkg.assignmentSlots[0].activeSubmission.attemptNumber, 2);
  assert.equal(pkg.assignmentSlots[0].allAttempts.length, 2);
  assert(Renderer.renderCompletePackage(pkg).includes('Second Attempt Content'));
});

test('regression 14: unlisted identities resembling official students remain in unlisted category without auto-aliasing',()=>{
  const rSim = raw('Aditi Nair','2','TE-A','EC-01','sim-1');
  const ds = new DS();
  ds.loadSubmissionsArray([rSim]);
  assert.equal(ds.studentsMap['TE-A-530502-2'].allSubmissions.length, 0); // Official Aditi S Nair has 0 submissions
  const unlisted = ds.getUnlistedStudents();
  assert.equal(unlisted.length, 1);
  assert.equal(unlisted[0].studentName, 'Aditi Nair');
  assert.equal(unlisted[0].isOfficialRoster, false);
});

test('regression 15: frontend and Apps Script produce identical canonical identity keys',()=>{
  const sampleRecords = [
    raw('Aditi Nair','2','TE-A'),
    raw('Aditi Nair','02','A'),
    raw('Rahul Patil','44','DIV A'),
    raw('Suraj Bhosale','530520','TE-A')
  ];
  sampleRecords.forEach(r => {
    const feKey = P.key(r);
    const beKey = ctx.PortfolioIdentity.key(r);
    assert.equal(feKey, beKey);
  });
});

test('regression 16: cross-student retrieval is prevented across all official and unlisted retrieval routes',()=>{
  const aditiSub = raw('Aditi Nair','2','TE-A','EC-01','aditi-secret');
  aditiSub.fullJsonPayload = JSON.stringify({studentInformation:{name:'Aditi Nair',rollNumber:'02',division:'A'}});
  const ss = spreadsheet([aditiSub, raw('Ada Rao','100001','TE-A','EC-01','ada-secret')]);
  const officialRes = decode(ctx.handleGetStudentReport(ss, { studentId: official.id, rollNumber: official.rollNumber, division: official.division, studentName: official.studentName }));
  assert(!officialRes.submissions.some(s => s.submissionId === 'aditi-secret'));
  const unlistedRes = decode(ctx.handleGetStudentReport(ss, { studentId: P.key(aditiSub), identityCategory: 'UNLISTED' }));
  assert(!unlistedRes.submissions.some(s => s.submissionId === 'ada-secret'));
});

test('regression 17: partial retrieval when only some submissions can be safely associated and excluded records reported',()=>{
  const s1 = raw('Mira Shah', '909', 'B', 'EC-01', 'mira-valid-1');
  const s2 = raw('Mira Shah', '909', 'B', 'EC-02', 'mira-valid-2');
  const s3 = raw('Mira Shah', '909', 'B', 'EC-03', 'mira-conflicted');
  s3.fullJsonPayload = JSON.stringify({ studentInformation: { name: 'Someone Else', rollNumber: '909', division: 'B' } });
  const ss = spreadsheet([s1, s2, s3]);
  const data = decode(ctx.handleGetStudentReport(ss, { studentId: P.key(s1), identityCategory: 'UNLISTED' }));
  assert.equal(data.success, true);
  assert.equal(data.submissions.length, 2);
  assert.deepEqual(data.submissions.map(s => s.submissionId), ['mira-valid-1', 'mira-valid-2']);
  assert(!data.submissions.some(s => s.submissionId === 'mira-conflicted'));
  assert(data.excludedSubmissions && data.excludedSubmissions.length === 1);
  assert.equal(data.excludedSubmissions[0].submissionId, 'mira-conflicted');
});

test('regression 18: two different students with distinct names remain distinct identities',()=>{
  const st1 = raw('Rahul B', '101', 'A', 'EC-01', 'rahul-b');
  const st2 = raw('Rahul Bachute', '102', 'B', 'EC-01', 'rahul-bachute');
  assert.notEqual(P.key(st1), P.key(st2));
  const ds = new DS();
  ds.loadSubmissionsArray([st1, st2]);
  assert.equal(ds.getUnlistedStudents().length, 2);
});

test('regression 19: same roll number associated with conflicting names remain distinct identities',()=>{
  const r1 = raw('SHUBHAM SABLE', '23', 'B', 'EC-01', 'sable');
  const r2 = raw('Sudarshan Somnath Bomble', '23', 'A', 'EC-01', 'bomble');
  assert.notEqual(P.key(r1), P.key(r2));
  const ds = new DS();
  ds.loadSubmissionsArray([r1, r2]);
  assert.equal(ds.getUnlistedStudents().length, 2);
});

test('regression 20: ambiguous records with conflicting credentials remain separate and blocked from automatic merge',()=>{
  const c1 = raw('Candidate X', '505', 'A', 'EC-01', 'cand-1');
  const c2 = raw('Candidate X', '505', 'A', 'EC-02', 'cand-2');
  c1.fullJsonPayload = JSON.stringify({studentInformation:{prn:'PRN-ALPHA'}});
  c2.fullJsonPayload = JSON.stringify({studentInformation:{prn:'PRN-BETA'}});
  const ss = spreadsheet([c1, c2]);
  const dir = decode(ctx.handleGetUnlistedStudents(ss));
  assert.equal(dir.students.length, 1);
  assert.equal(dir.students[0].retrievalAvailable, false);
  assert(dir.students[0].retrievalBlockedReason.includes('PRN'));
});

test('regression 21: Aditi Nair exact retrieval scenario with roll 2 vs 02 and non-matching official roster',()=>{
  // Sheet has rollNumber 2, Division A, studentName Aditi Nair
  // Payload has rollNumber 02, Division A, studentName Aditi Nair
  // Official roster has Aditi S Nair (roll 530502) in TE-A
  const sub1 = raw('Aditi Nair', '2', 'A', 'EC-01', 'aditi-sub-1');
  sub1.fullJsonPayload = JSON.stringify({
    studentInformation: { name: 'Aditi Nair', rollNumber: '02', division: 'A' },
    submissionData: { activityResponses: [{ title: 'Design thinking', component: 'reflection', response: 'Aditi reflection' }] }
  });
  const sub2 = raw('Aditi Nair', '2', 'A', 'EC-02', 'aditi-sub-2');
  sub2.fullJsonPayload = JSON.stringify({
    studentInformation: { name: 'Aditi Nair', rollNumber: '02', division: 'A' },
    submissionData: { activityResponses: [{ title: 'System flow', component: 'reflection', response: 'Aditi architecture' }] }
  });

  // Verify resolution against official roster does NOT falsely match Aditi S Nair
  const match = P.resolve(sub1, Roster.STUDENTS, Roster);
  assert.equal(match.student, null, 'Aditi Nair must not match Aditi S Nair without authorized alias');
  assert.equal(match.status, 'CONFLICT');
  assert.equal(match.rule, 'CONFLICTING_ROLL_NUMBER');

  // Verify key normalization on 2 vs 02
  const key1 = P.key(sub1);
  const key2 = P.key(sub2);
  assert.equal(key1, key2, 'Leading zero must normalize so sub1 and sub2 share exact unlisted key');
  assert.equal(key1, 'UNLISTED-' + encodeURIComponent(JSON.stringify(['aditi nair'])));

  // Backend retrieval
  const ss = spreadsheet([sub1, sub2]);
  const res = decode(ctx.handleGetStudentReport(ss, {
    studentId: key1,
    identityCategory: 'UNLISTED',
    studentName: 'Aditi Nair',
    rollNumber: '2',
    division: 'A'
  }));
  assert.equal(res.success, true);
  assert.equal(res.submissions.length, 2);
  assert.equal(res.student.isUnlisted, true);
  assert.equal(res.student.isOfficialRoster, false);

  // Frontend portfolio generation
  const ds = new DS();
  ds.setCustomRoster(Roster.STUDENTS, [], 'OFFICIAL', false);
  transport(ds, ss);
  ds.unmatchedStudentsMap[key1] = res.student;
  const result = fetch(ds, key1);
  assert.ifError(result.err);
  assert.equal(result.pkg.studentInfo.studentName, 'Aditi Nair');
  assert.equal(result.pkg.submittedCount, 2);
  assert.equal(result.pkg.missingCount, 20);
  assert.equal(result.pkg.assignmentSlots.length, 22);
});

test('regression 22: request timeout handling in fetchStudentPortfolio aborts cleanly and returns error',()=>{
  const ds = new DS();
  ds.configuredEndpoint = DS.DEFAULT_SERVICE_URL;
  ds.requestTimeoutMs = 50; // 50ms timeout for test
  ds.httpTransport = (req, cb) => {
    // Simulate delayed response exceeding timeout
    setTimeout(() => {
      cb(new Error('Request timed out after 1s.'));
    }, 100);
  };
  let errorReceived = null;
  ds.fetchStudentPortfolio('TEST-ID', (err) => {
    errorReceived = err;
  });
  assert(errorReceived);
  assert(errorReceived.message.includes('timed out') || errorReceived.message.includes('not found'));
});

test('regression 23: in-memory caching for discoverUnlistedStudents prevents repeat network calls',()=>{
  const ds = new DS();
  ds.configuredEndpoint = DS.DEFAULT_SERVICE_URL;
  let transportCalls = 0;
  ds.httpTransport = (req, cb) => {
    transportCalls++;
    cb(null, {
      status: 200,
      responseText: JSON.stringify({
        success: true,
        identityPolicy: 'exact-v1',
        students: [{ id: 'UNLISTED-1', studentName: 'Cached Student', rollNumber: '1', division: 'A', isOfficialRoster: false }]
      })
    });
  };

  // First call fetches from network
  ds.discoverUnlistedStudents((err, students) => {
    assert.ifError(err);
    assert.equal(students.length, 1);
    assert.equal(transportCalls, 1);
  });

  // Second call without forceRefresh uses in-memory cache
  ds.discoverUnlistedStudents((err, students) => {
    assert.ifError(err);
    assert.equal(students.length, 1);
    assert.equal(transportCalls, 1, 'Repeated call must use in-memory cache');
  });

  // Third call with forceRefresh = true fetches again
  ds.discoverUnlistedStudents((err, students) => {
    assert.ifError(err);
    assert.equal(students.length, 1);
    assert.equal(transportCalls, 2, 'forceRefresh must query network');
  }, true);
});

test('regression 24: single conflicted submission is isolated into excludedSubmissions while valid submissions succeed',()=>{
  const sValid = raw('Rohan Joshi', '45', 'A', 'EC-01', 'sub-valid');
  const sConflicted = raw('Rohan Joshi', '45', 'A', 'EC-02', 'sub-conflict');
  sConflicted.fullJsonPayload = JSON.stringify({ studentInformation: { name: 'Completely Different Name', rollNumber: '45', division: 'A' } });

  const ss = spreadsheet([sValid, sConflicted]);
  const data = decode(ctx.handleGetStudentReport(ss, { studentId: P.key(sValid), identityCategory: 'UNLISTED' }));
  assert.equal(data.success, true);
  assert.equal(data.submissions.length, 1);
  assert.equal(data.submissions[0].submissionId, 'sub-valid');
  assert.equal(data.excludedSubmissions.length, 1);
  assert.equal(data.excludedSubmissions[0].submissionId, 'sub-conflict');
  assert(data.excludedSubmissions[0].reason.includes('embedded'));
});

test('regression 25: performance benchmark verification for single-pass portfolio retrieval',()=>{
  // Create 500 synthetic submissions across 50 students
  const syntheticItems = [];
  for (let i = 1; i <= 50; i++) {
    for (let c = 1; c <= 10; c++) {
      syntheticItems.push(raw('Student ' + i, String(i), 'A', 'EC-0' + c, 'sub-' + i + '-' + c));
    }
  }
  const ss = spreadsheet(syntheticItems);
  const targetKey = P.key(syntheticItems[0]);

  const startTime = Date.now();
  const data = decode(ctx.handleGetStudentReport(ss, { studentId: targetKey, identityCategory: 'UNLISTED', studentName: 'Student 1', rollNumber: '1', division: 'A' }));
  const elapsed = Date.now() - startTime;

  assert.equal(data.success, true);
  assert.equal(data.submissions.length, 10);
  assert(elapsed < 100, `Single-pass targeted retrieval took ${elapsed}ms; must be < 100ms`);
});

// Optional print fixture output goes outside the publishable app and contains synthetic data only.
if(process.env.PORTFOLIO_PRINT_FIXTURES){const out=process.env.PORTFOLIO_PRINT_FIXTURES;fs.mkdirSync(out,{recursive:true});const zero=service().getStudentReportPackage(official.id);const css=fs.readFileSync(path.join(root,'css/report-generator.css'),'utf8');for(const [name,pkg] of [['long',longPackage],['zero',zero]])fs.writeFileSync(path.join(out,name+'.html'),'<!doctype html><meta charset="utf-8"><style>'+css+'</style>'+Renderer.renderCompletePackage(pkg));fs.writeFileSync(path.join(out,'expected.json'),JSON.stringify({long:longPackage.totalPages,zero:23,longIndex:longPackage.indexRows,zeroIndex:zero.indexRows,longAnswer:longText,longChunks:DS.partitionActivities(longPackage.assignmentSlots[0].activeSubmission.activityResponses).flat().map(act=>act.response.reflection)}));}
console.log(`TOTAL TESTS: ${count} | PASSED: ${count} | FAILED: 0`);
