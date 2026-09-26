import { buildCareerMapModel } from '../ui/career-map-view-model.js';
import { buildFounderDashboardModel } from '../ui/founder-dashboard-view-model.js';

export const V32_ROUTES=Object.freeze([
  'home','living-hospital','missions','shifts','career','progress','debriefs',
  'organizations','instructor-live','founder','settings'
]);

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[char]));

function pageHead(kicker,title,description,tools=''){
  return `<header class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="toolbar">${tools}</div></header>`;
}

function safety(){
  return '<div class="banner v32-safety"><strong>Educational simulation only.</strong> CareSyncD is not for real-patient diagnosis, monitoring, treatment, or clinical decision support. Do not enter PHI or real patient identifiers.</div>';
}

export function buildLivingHospitalPage({units=[]}={}){
  return `${safety()}${pageHead('CareSyncD v3.2 Preview','The Living Hospital','Choose a specialty environment. The hospital world continues around the learner with evolving patients, staffing, census, transfers, interruptions, and consequence memory.','<span class="tag v32-preview-badge">v3.2 Preview</span>')}
  <div class="grid cards v32-unit-grid">${units.map(unit=>`<article class="card v32-unit-card" data-unit-id="${esc(unit.id)}"><div class="eyebrow">${esc(unit.population)}</div><h2>${esc(unit.title)}</h2><p>${esc(unit.environment)}</p><div class="tag-row">${(unit.learningFocus||[]).map(item=>`<span class="tag">${esc(item)}</span>`).join('')}</div><p class="v32-case-count"><strong>${unit.caseTemplates?.length??0}</strong> authored learning cases available in this unit catalog.</p></article>`).join('')}</div>`;
}

function competencyLabel(key){
  return ({clinicalJudgment:'Clinical Judgment',operations:'Operations',communication:'Communication',leadership:'Leadership'})[key]||key;
}

export function buildCareerPage(input={}){
  const map=buildCareerMapModel(input);
  const specialty=map.specialty.map(node=>`<article class="career-node ${esc(node.state)}"><div class="eyebrow">${esc(node.state)}</div><h3>${esc(node.title)}</h3>${node.unitId?`<span class="tag">${esc(node.unitId)}</span>`:''}${node.blockers.length?`<p>${node.blockers.map(esc).join(' · ')}</p>`:'<p>Requirements currently satisfied.</p>'}</article>`).join('');
  const leadership=map.leadership.map(node=>`<article class="career-node ${esc(node.state)}"><div class="eyebrow">${esc(node.state)}</div><h3>${esc(node.title)}</h3>${node.blockers.length?`<p>${node.blockers.map(esc).join(' · ')}</p>`:'<p>Requirements currently satisfied.</p>'}</article>`).join('');
  const domains=['clinicalJudgment','operations','communication','leadership'];
  return `${safety()}${pageHead('Competency-gated progression','Career','Advance through specialty and leadership pathways by demonstrating performance and competencies—not XP alone.')}
  <section class="card"><h2>Four competency domains</h2><div class="metric-row">${domains.map(domain=>`<div class="metric"><span>${esc(competencyLabel(domain))}</span><strong>${Number(input.competencySummary?.[domain]?.score??0)}%</strong></div>`).join('')}</div></section>
  <section class="v32-section"><h2>Specialty pathways</h2><div class="career-grid">${specialty}</div></section>
  <section class="v32-section"><h2>Leadership pathway</h2><div class="career-grid">${leadership}</div></section>`;
}

export function buildFounderPage(snapshot){
  const model=buildFounderDashboardModel(snapshot);
  const f=model.funnel||{};
  return `${pageHead('Private business intelligence','Founder Command Center','Subscriber, conversion, acquisition, and learning intelligence. This preview never fabricates customer or revenue data.','<span class="tag">Founder / Super Admin</span>')}
  <div class="banner">Development preview: metrics below reflect only data supplied by the authenticated backend. Empty values mean no data has been loaded here.</div>
  <div class="metric-row"><div class="metric"><span>Subscribers</span><strong>${model.metrics.totalSubscribers}</strong></div><div class="metric"><span>Active</span><strong>${model.metrics.activeSubscribers}</strong></div><div class="metric"><span>Payment issues</span><strong>${model.metrics.paymentIssues}</strong></div><div class="metric"><span>Shifts completed</span><strong>${model.metrics.shiftsCompleted}</strong></div></div>
  <section class="card"><h2>Conversion funnel</h2><div class="funnel-row">${[['Visitor',f.visitor],['Demo',f.demo],['Account',f.account],['Checkout',f.checkout],['Subscriber',f.subscriber],['Active Learner',f.activeLearner],['Renewal',f.renewal]].map(([label,value])=>`<div class="funnel-stage"><span>${esc(label)}</span><strong>${Number(value??0)}</strong></div>`).join('')}</div></section>
  <section class="card v32-section"><h2>Identified subscribers</h2>${model.subscriberRows.length?`<table class="table"><thead><tr><th>Name</th><th>Plan</th><th>Cadence</th><th>Status</th></tr></thead><tbody>${model.subscriberRows.map(row=>`<tr><td>${esc(row.displayName||row.email||row.accountId)}</td><td>${esc(row.planId)}</td><td>${esc(row.cadence)}</td><td>${esc(row.status)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No identified subscriber records loaded in this preview session.</div>'}</section>`;
}

export function buildOrganizationsPage(){
  return `${pageHead('Instructor & school workspace','Organizations','Manage seats, instructors, learners, Cohorts, and Assignments while keeping every learner scoped to the correct organization.')}
  <div class="grid cards"><section class="card"><div class="eyebrow">Seats</div><h2>Organization access</h2><p>Organization/School plans can allocate learner seats without deleting personal learning history when a seat is later removed.</p></section><section class="card"><div class="eyebrow">Cohorts</div><h2>Instructor groups</h2><p>Instructors see only learners assigned to their cohorts. Organization administrators remain scoped to their own organization.</p></section><section class="card"><div class="eyebrow">Assignments</div><h2>Structured learning</h2><p>Assignments can specify unit, difficulty, due date, competency requirements, minimum completed shifts, and availability windows.</p></section></div>`;
}

export function buildInstructorLivePage(){
  return `${safety()}${pageHead('Transparent simulation lab','Instructor Live','Optional live observation is enabled only for assigned sessions and is always visible to the learner.')}
  <div class="banner"><strong>Instructor Observation</strong> is never hidden. When active, the learner receives a persistent “Instructor Observation Active” disclosure.</div>
  <div class="grid cards"><section class="card"><h2>Live observation</h2><p>See the simulation clock, assignment context, learner actions, active tasks, staffing pressure, escalation events, and timeline frames. Observation is visible to the learner.</p></section><section class="card"><h2>Reconnect safely</h2><p>If instructor connectivity drops, the learner simulation continues locally. The instructor reconnects and catches up from the ordered event stream.</p></section><section class="card"><h2>Simulation Lab</h2><p>Explicit lab sessions may inject authored operational events such as a call-off or surge. Every injection is timestamped and audited; instructors cannot directly force a patient outcome.</p></section></div>`;
}

export function buildV32Page(route,context={}){
  switch(route){
    case 'living-hospital': return buildLivingHospitalPage({units:context.units||[]});
    case 'career': return buildCareerPage(context.career||{});
    case 'founder': return buildFounderPage(context.founderSnapshot);
    case 'organizations': return buildOrganizationsPage();
    case 'instructor-live': return buildInstructorLivePage();
    default:return null;
  }
}
