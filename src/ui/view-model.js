const RANKS=[['Clinical Explorer',0],['Rapid Responder',250],['Patient Advocate',600],['Clinical Strategist',1100],['Shift Commander',1800],['CareSyncD Elite',2800]];
export function urgencyForPatient(patient={}){
  const v=patient.vitals||{};
  if(v.heartRate===0 || v.spo2<=75 || (v.systolicBP>0&&v.systolicBP<=65) || v.glucose<=30 || v.respiratoryRate<=4)return 'critical';
  if(v.spo2<90 || (v.systolicBP>0&&v.systolicBP<90) || v.glucose<60 || v.respiratoryRate<8 || v.respiratoryRate>=28 || v.heartRate>=120)return 'urgent';
  if(v.spo2<94 || (v.systolicBP>0&&v.systolicBP<100) || v.glucose<70 || v.respiratoryRate>=22 || v.heartRate>=105)return 'concerning';
  return 'stable';
}
export function computeCareerProfile(runs=[]){
  const scores=runs.map(r=>Number(r.final?.score ?? r.score ?? 0));
  const xp=scores.reduce((sum,score)=>sum+Math.max(10,Math.round(score*1.4)),0);
  let rank=RANKS[0][0],nextAt=RANKS[1][1];
  for(let i=0;i<RANKS.length;i++)if(xp>=RANKS[i][1]){rank=RANKS[i][0];nextAt=RANKS[i+1]?.[1]??RANKS[i][1];}
  return {runs:runs.length,xp,rank,nextAt,best:scores.length?Math.max(...scores):0,average:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0};
}
export function formatVital(key,value){if(value==null)return '—';if(key==='spo2')return `${Number(value).toFixed(Number.isInteger(value)?0:1)}%`;if(key==='glucose')return `${Math.round(value)} mg/dL`;if(key==='temperature')return `${Number(value).toFixed(1)} °C`;return String(Math.round(value*10)/10);}
