/** Manual-entry sanity bounds, not vessel capacities, operating limits or trip settings. */
export const readingFields = [
  {key:'tankVolumeM3',label:'Tank liquid volume',unit:'m³',min:0,max:100000},
  {key:'tankPressureMbarg',label:'Tank pressure',unit:'mbar(g)',min:-100,max:5000},
  {key:'liquidTemperatureC',label:'LNG temperature',unit:'°C',min:-200,max:60},
  {key:'densityKgM3',label:'LNG density (known value)',unit:'kg/m³',min:300,max:600},
  {key:'bunkerFlowM3h',label:'Bunker liquid flow',unit:'m³/h',min:0,max:10000},
  {key:'bunkerPressureBarg',label:'Bunker manifold pressure',unit:'bar(g)',min:-1,max:30},
  {key:'bunkerTemperatureC',label:'Bunker line temperature',unit:'°C',min:-200,max:80},
  {key:'gasFlowKgh',label:'Gas delivery flow',unit:'kg/h',min:0,max:50000},
  {key:'bufferPressureBarg',label:'ME buffer pressure',unit:'bar(g)',min:-1,max:50},
  {key:'gasTemperatureC',label:'Gas delivery temperature',unit:'°C',min:-200,max:150},
  {key:'enginePowerKw',label:'Total gas consumer power',unit:'kW',min:0,max:100000},
  {key:'bottomC',label:'Tank bottom temperature',unit:'°C',min:-200,max:80},
  {key:'temp30C',label:'Tank 30% temperature',unit:'°C',min:-200,max:80},
  {key:'temp60C',label:'Tank 60% temperature',unit:'°C',min:-200,max:80},
  {key:'temp85C',label:'Tank 85% temperature',unit:'°C',min:-200,max:80},
  {key:'topC',label:'Tank top temperature',unit:'°C',min:-200,max:80},
  {key:'ibsPressureMbarg',label:'IBS pressure',unit:'mbar(g)',min:-100,max:1000},
  {key:'coldGlycolSupplyC',label:'Cold glycol supply temperature',unit:'°C',min:-100,max:100},
  {key:'coldGlycolReturnC',label:'Cold glycol return temperature',unit:'°C',min:-100,max:100},
  {key:'hotGlycolSupplyC',label:'Hot glycol supply temperature',unit:'°C',min:-50,max:200},
  {key:'hotGlycolReturnC',label:'Hot glycol return temperature',unit:'°C',min:-50,max:200},
  {key:'nitrogenPressureBarg',label:'Nitrogen supply pressure',unit:'bar(g)',min:-1,max:50},
  {key:'nitrogenPurityPercent',label:'Nitrogen purity',unit:'%',min:0,max:100},
  {key:'gasDetectorPercentLel',label:'Gas detector (identify sensor in notes)',unit:'% LEL',min:0,max:100},
  {key:'ventPressureMbarg',label:'Vent header pressure',unit:'mbar(g)',min:-100,max:5000},
  {key:'isPressureMbarg',label:'IS pressure',unit:'mbar(g)',min:-100,max:1000},
] as const;

export type ReadingKey=typeof readingFields[number]['key'];
export type Readings=Partial<Record<ReadingKey,number>>&{
  instrumentValues?:Record<string,number>;
  instrumentUnits?:Record<string,string>;
};
export interface LogEntry {id:string;timestamp:string;notes:string;readings:Readings;source:'manual'}
export interface Logbook {version:1;entries:LogEntry[]}
export const STORAGE_KEY='belem-lng.logbook.v1';

const readingKeys=new Set<string>(readingFields.map(field=>field.key));
const decimalPattern=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function isRecord(value:unknown):value is Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===Object.prototype||prototype===null;
}

/** Expand the Number's shortest representation without rounding small readings. */
export function formatReadingDraft(value:number):string {
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Use a finite numeric reading');
  const text=String(value);
  if(!text.includes('e'))return text;
  const [coefficient,exponent]=text.split('e');
  const sign=coefficient.startsWith('-')?'-':'';
  const [whole,fraction='']=(sign?coefficient.slice(1):coefficient).split('.');
  const digits=whole+fraction,point=whole.length+Number(exponent);
  if(point<=0)return sign+'0.'+'0'.repeat(-point)+digits;
  if(point>=digits.length)return sign+digits+'0'.repeat(point-digits.length);
  return sign+digits.slice(0,point)+'.'+digits.slice(point);
}

export function parseReadings(draft:Partial<Record<ReadingKey,string>>,allowEmpty=false):Readings {
  if(!isRecord(draft))throw new Error('Invalid reading draft');
  for(const key of Object.keys(draft))if(!readingKeys.has(key))throw new Error(`Unknown reading: ${key}`);
  const readings:Readings={};
  for(const field of readingFields){
    const raw=draft[field.key];
    if(raw===undefined)continue;
    if(typeof raw!=='string')throw new Error(`${field.label}: enter a number without units`);
    const text=raw.trim();
    if(!text)continue;
    if(!decimalPattern.test(text))throw new Error(`${field.label}: enter a number without units`);
    const value=Number(text);
    if(!Number.isFinite(value)||value<field.min||value>field.max)throw new Error(`${field.label}: input range ${field.min} to ${field.max} ${field.unit}`);
    readings[field.key]=value;
  }
  if(!allowEmpty&&!Object.keys(readings).length)throw new Error('Enter at least one reading');
  return readings;
}

export function normalizeInstrumentTag(tag:string):string {
  const clean=tag.trim().replace(/[\s_-]/g,'').toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9.]{2,31}$/.test(clean)||['PROTO','PROTOTYPE','CONSTRUCTOR'].includes(clean))throw new Error('Use a valid instrument tag');
  return clean;
}

export function parseInstrumentValues(draft:Record<string,string>):Record<string,number> {
  if(!isRecord(draft))throw new Error('Invalid instrument draft');
  const result:Record<string,number>={};
  for(const [tag,raw] of Object.entries(draft)){
    if(typeof raw!=='string')throw new Error('Enter a number without units');
    const text=raw.trim();
    if(!text)continue;
    const clean=normalizeInstrumentTag(tag);
    if(Object.hasOwn(result,clean))throw new Error(`Duplicate instrument tag: ${clean}`);
    if(!decimalPattern.test(text))throw new Error(`${clean}: enter a number without units`);
    const value=Number(text);
    if(!Number.isFinite(value)||Math.abs(value)>1e12)throw new Error(`${clean}: enter a finite reading within ±1000000000000`);
    result[clean]=value;
  }
  return result;
}

function validateInstrumentValues(input:unknown):Record<string,number> {
  if(!isRecord(input))throw new Error('Invalid instrument values');
  const result:Record<string,number>={};
  for(const [tag,value] of Object.entries(input)){
    const clean=normalizeInstrumentTag(tag);
    if(Object.hasOwn(result,clean))throw new Error(`Duplicate instrument tag: ${clean}`);
    if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e12)throw new Error(`${clean}: invalid instrument reading`);
    result[clean]=value;
  }
  return result;
}

function validateInstrumentUnits(input:unknown,values:Record<string,number>):Record<string,string> {
  if(!isRecord(input))throw new Error('Invalid instrument units');
  const result:Record<string,string>={};
  for(const [tag,unit] of Object.entries(input)){
    const clean=normalizeInstrumentTag(tag);
    if(Object.hasOwn(result,clean))throw new Error(`Duplicate instrument unit: ${clean}`);
    if(!Object.hasOwn(values,clean)||typeof unit!=='string'||unit.length>24||/[\r\n<>]/.test(unit))throw new Error(`${clean}: invalid instrument unit`);
    result[clean]=unit;
  }
  return result;
}

function validateTimestamp(timestamp:string):void {
  if(typeof timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp)||!Number.isFinite(Date.parse(timestamp)))throw new Error('Use a valid UTC timestamp, e.g. 2026-10-24T12:00:00Z');
  if(new Date(timestamp).toISOString()!==timestamp.replace(/Z$/,timestamp.includes('.')?'Z':'.000Z'))throw new Error('UTC timestamp contains an invalid calendar date');
}

function validateReadings(input:unknown):Readings {
  if(!isRecord(input))throw new Error('Invalid readings');
  for(const key of Object.keys(input))if(!readingKeys.has(key)&&key!=='instrumentValues'&&key!=='instrumentUnits')throw new Error(`Unknown reading: ${key}`);
  const draft:Partial<Record<ReadingKey,string>>={};
  for(const field of readingFields){
    const value=input[field.key];
    if(value===undefined)continue;
    if(typeof value!=='number')throw new Error(`${field.label}: invalid numeric reading`);
    draft[field.key]=formatReadingDraft(value);
  }
  const clean=parseReadings(draft,true);
  if(input.instrumentValues!==undefined)clean.instrumentValues=validateInstrumentValues(input.instrumentValues);
  if(input.instrumentUnits!==undefined){
    if(!clean.instrumentValues)throw new Error('Instrument units require values');
    clean.instrumentUnits=validateInstrumentUnits(input.instrumentUnits,clean.instrumentValues);
  }
  if(!readingFields.some(field=>clean[field.key]!==undefined)&&!Object.keys(clean.instrumentValues??{}).length)throw new Error('Enter at least one reading');
  return clean;
}

function validateNotes(notes:unknown):string {
  if(typeof notes!=='string'||notes.length>4000)throw new Error('Notes must contain at most 4000 characters');
  return notes;
}

let nextId=0;
export function createLogEntry(readings:Readings,notes:string,timestamp:string):LogEntry {
  validateTimestamp(timestamp);
  const clean=validateReadings(readings),cleanNotes=validateNotes(notes);
  const id=`${timestamp}-${Date.now().toString(36)}-${(++nextId).toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  return {id,timestamp,notes:cleanNotes,readings:clean,source:'manual'};
}

function validateEntry(input:unknown):LogEntry {
  if(!isRecord(input)||typeof input.id!=='string'||!input.id.trim()||input.id.length>256||input.source!=='manual')throw new Error('Invalid observation identity or source');
  if(typeof input.timestamp!=='string')throw new Error('Invalid observation timestamp');
  validateTimestamp(input.timestamp);
  return {id:input.id,timestamp:input.timestamp,notes:validateNotes(input.notes),readings:validateReadings(input.readings),source:'manual'};
}

function validateBook(input:unknown):Logbook {
  if(!isRecord(input)||input.version!==1||!Array.isArray(input.entries))throw new Error('Unsupported logbook format');
  const ids=new Set<string>();
  const entries=input.entries.map(value=>{
    const entry=validateEntry(value);
    if(ids.has(entry.id))throw new Error('Duplicate observation ID in logbook');
    ids.add(entry.id);
    return entry;
  });
  return {version:1,entries:sortEntries(entries)};
}

function sortEntries(entries:LogEntry[]):LogEntry[] {
  return entries.sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
}

export function decodeLogbook(raw:string):Logbook {
  return validateBook(JSON.parse(raw) as unknown);
}

export function addEntry(book:Logbook,entry:LogEntry):Logbook {
  const clean=validateBook(book),added=validateEntry(entry);
  if(clean.entries.some(existing=>existing.id===added.id))throw new Error('Duplicate observation ID in logbook');
  return {version:1,entries:sortEntries([...clean.entries,added])};
}

export function updateEntry(book:Logbook,id:string,readings:Readings,notes:string,timestamp:string):Logbook {
  const clean=validateBook(book),index=clean.entries.findIndex(entry=>entry.id===id);
  if(index===-1)throw new Error('Saved observation not found');
  const original=clean.entries[index];
  // Replace the complete snapshot: omitted fields remain unknown, never carried forward.
  const updated=validateEntry({...original,timestamp,readings,notes});
  return {version:1,entries:sortEntries(clean.entries.map((entry,i)=>i===index?updated:entry))};
}

function csvCell(value:string):string {return `"${value.replace(/"/g,'""')}"`;}
function safeText(value:string):string {return /^\s*[=+@-]/.test(value)?`'${value}`:value;}

export function exportCsv(book:Logbook):string {
  const clean=validateBook(book);
  const tags=[...new Set(clean.entries.flatMap(entry=>Object.keys(entry.readings.instrumentValues??{})))].sort();
  const header=['timestamp_utc','source',...readingFields.map(field=>`${field.key} (${field.unit})`),...tags.flatMap(tag=>[tag,`${tag}_unit`]),'notes'];
  const rows=clean.entries.map(entry=>[
    entry.timestamp,entry.source,
    ...readingFields.map(field=>entry.readings[field.key]===undefined?'':formatReadingDraft(entry.readings[field.key]!)),
    ...tags.flatMap(tag=>[
      entry.readings.instrumentValues?.[tag]===undefined?'':formatReadingDraft(entry.readings.instrumentValues[tag]),
      safeText(entry.readings.instrumentUnits?.[tag]??''),
    ]),
    safeText(entry.notes),
  ]);
  return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
