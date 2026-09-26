import './app.js';
import { buildV32Page } from './src/app/v32-shell.js';
import { listUnitDefinitions } from './src/living-hospital/unit-catalog.js';

const V32_ONLY_ROUTES=new Set(['living-hospital','career','organizations','instructor-live','founder']);
const app=document.querySelector('#app-content');
const route=()=>location.hash.replace(/^#\/?/,'')||'home';

const emptyCompetencies=()=>({
  clinicalJudgment:{score:0},operations:{score:0},communication:{score:0},leadership:{score:0}
});

function emptyFounderSnapshot(){
  return {
    asOf:new Date().toISOString(),
    subscribers:{total:0,status:{active:0,paymentIssue:0,canceled:0,expired:0},new30d:0,byPlan:{},byCadence:{}},
    funnel:{visitor:0,demo:0,account:0,checkout:0,subscriber:0,activeLearner:0,renewal:0},
    acquisition:{},
    learning:{shiftsStarted:0,shiftsCompleted:0,completedByUnit:{}},
    identifiedSubscribers:[]
  };
}

function previewContext(){
  return {
    units:listUnitDefinitions(),
    career:{completedNodeIds:[],performance:{overall:0},competencySummary:emptyCompetencies(),xp:0},
    founderSnapshot:emptyFounderSnapshot()
  };
}

function markActiveNav(current){
  document.querySelectorAll('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav===current));
}

let observer;
export function renderV32Route(){
  const current=route();
  if(!V32_ONLY_ROUTES.has(current)) return false;
  const html=buildV32Page(current,previewContext());
  if(!html||!app) return false;
  observer?.disconnect();
  app.innerHTML=html;
  markActiveNav(current);
  app.focus({preventScroll:true});
  observer?.observe(app,{childList:true,subtree:true});
  return true;
}

observer=new MutationObserver(()=>{
  if(V32_ONLY_ROUTES.has(route())) renderV32Route();
});
observer.observe(app,{childList:true,subtree:true});

addEventListener('hashchange',renderV32Route);
addEventListener('pageshow',renderV32Route);
queueMicrotask(renderV32Route);
setTimeout(renderV32Route,100);
