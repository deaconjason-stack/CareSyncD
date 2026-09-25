const SENSITIVE_KEY = /(password|token|secret|servicerolekey|clientsecret|cardnumber|cvv)/i;

function requiredString(value,field){
  if(typeof value!=='string'||!value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function normalizeTime(value){
  const ms=new Date(value).getTime();
  if(!value||Number.isNaN(ms)) throw new TypeError('occurredAt must be a valid date');
  return new Date(ms).toISOString();
}

function inspectKeys(value,path='data'){
  if(value==null||typeof value!=='object') return;
  if(Array.isArray(value)){
    value.forEach((item,index)=>inspectKeys(item,`${path}[${index}]`));
    return;
  }
  for(const [key,nested] of Object.entries(value)){
    const normalized=key.replace(/[^a-z0-9]/gi,'');
    if(SENSITIVE_KEY.test(normalized)) throw new Error(`Sensitive audit data key is not allowed: ${path}.${key}`);
    inspectKeys(nested,`${path}.${key}`);
  }
}

function clone(value){
  return value==null?{}:JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

export function createAuditEntry({id,actorId,actorRole,action,targetType,targetId,occurredAt,data={}}={}){
  id=requiredString(id,'id');
  actorId=requiredString(actorId,'actorId');
  actorRole=requiredString(actorRole,'actorRole');
  action=requiredString(action,'action');
  targetType=requiredString(targetType,'targetType');
  targetId=requiredString(targetId,'targetId');
  if(!data||typeof data!=='object'||Array.isArray(data)) throw new TypeError('audit data must be an object');
  inspectKeys(data);
  const safeData=deepFreeze(clone(data));
  return deepFreeze({
    id,actorId,actorRole,action,targetType,targetId,
    occurredAt:normalizeTime(occurredAt),
    data:safeData
  });
}
