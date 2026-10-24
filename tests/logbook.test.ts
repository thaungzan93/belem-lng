import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  addEntry,createLogEntry,decodeLogbook,exportCsv,formatReadingDraft,
  parseInstrumentValues,parseReadings,readingFields,STORAGE_KEY,updateEntry,
} from '../src/storage/logbook';
import type {Logbook,Readings} from '../src/storage/logbook';

const time='2026-10-24T12:00:00Z';
function fixture():Logbook {
  return {version:1,entries:[
    createLogEntry({tankVolumeM3:8400,tankPressureMbarg:300,instrumentValues:{'45PIT1001':3,'CUSTOM.FLOW':25},instrumentUnits:{'45PIT1001':'bar(g)','CUSTOM.FLOW':'L/min'}},'First watch',time),
    createLogEntry({gasFlowKgh:900,densityKgM3:440},'Other watch','2026-10-23T12:00:00Z'),
  ]};
}

test('Version-one storage retains the 26 common keys and a manual input bound independent of tank capacity',()=>{
  assert.equal(STORAGE_KEY,'belem-lng.logbook.v1');
  assert.equal(readingFields.length,26);
  assert.equal(new Set(readingFields.map(field=>field.key)).size,26);
  assert.deepEqual(parseReadings({tankVolumeM3:'15000'}),{tankVolumeM3:15000});
});

test('Partial drafts preserve zero and blank readings remain unknown',()=>{
  assert.deepEqual(parseReadings({tankVolumeM3:'8400',tankPressureMbarg:' ',gasFlowKgh:'0'}),{tankVolumeM3:8400,gasFlowKgh:0});
  assert.deepEqual(parseReadings({},true),{});
  assert.throws(()=>parseReadings({}));
});

test('Manual parsing rejects units, exponents, nonfinite and outside-bound input',()=>{
  for(const text of ['NaN','Infinity','1e3','100 m3','100001','-1'])assert.throws(()=>parseReadings({tankVolumeM3:text}));
  assert.throws(()=>parseReadings({unrecognised:'1'} as never));
  assert.throws(()=>parseReadings({gasFlowKgh:1} as never));
});

test('Decimal draft formatting retains tiny signed values and full numeric precision without exponent syntax',()=>{
  for(const value of [0,1e-7,-1e-7,1.23456789012345e-9,Number.MIN_VALUE,1e21,-1e21]){
    const text=formatReadingDraft(value);
    assert.ok(!text.includes('e'));
    assert.equal(Number(text),value);
  }
  assert.equal(formatReadingDraft(1e-7),'0.0000001');
  for(const value of [NaN,Infinity,-Infinity,'1'])assert.throws(()=>formatReadingDraft(value as number));
});

test('Instrument parsing normalizes tags, preserves zero/tiny readings and omits cleared fields',()=>{
  assert.deepEqual(parseInstrumentValues({'45-pit_1001':'0',' custom.flow ':'-0.0000001','UNREAD.TAG':' '}),{'45PIT1001':0,'CUSTOM.FLOW':-1e-7});
  assert.deepEqual(parseInstrumentValues({}),{});
  const invalidDrafts:Record<string,string>[]=[{'BAD/TAG':'1'},{['__proto__']:'1'},{'constructor':'1'},{'45PT1001':'1e3'},{'CUSTOM.FLOW':'Infinity'},{'CUSTOM.FLOW':'1000000000001'},{'45_PT1001':'1','45PT1001':'2'}];
  for(const draft of invalidDrafts)assert.throws(()=>parseInstrumentValues(draft));
});

test('Creating an observation retains entered units and detaches the saved snapshot from its draft',()=>{
  const readings:Readings={gasFlowKgh:0,instrumentValues:{'CUSTOM.FLOW':0,'CUSTOM.TEMP':-160},instrumentUnits:{'CUSTOM.FLOW':'L/min'}};
  const saved=createLogEntry(readings,'Watch notes',time);
  assert.equal(saved.source,'manual');
  assert.equal(saved.timestamp,time);
  assert.ok(saved.id.length>0);
  assert.deepEqual(saved.readings,readings);
  readings.gasFlowKgh=500;
  readings.instrumentValues!['CUSTOM.FLOW']=800;
  readings.instrumentUnits!['CUSTOM.FLOW']='kg/h';
  assert.equal(saved.readings.gasFlowKgh,0);
  assert.equal(saved.readings.instrumentValues?.['CUSTOM.FLOW'],0);
  assert.equal(saved.readings.instrumentUnits?.['CUSTOM.FLOW'],'L/min');
  assert.equal(saved.readings.instrumentUnits?.['CUSTOM.TEMP'],undefined);
});

test('UTC observation timestamps reject invalid calendar dates, offsets and ambiguous local time',()=>{
  for(const timestamp of ['2026-02-29T12:00:00Z','2026-02-30T12:00:00Z','2026-13-01T12:00:00Z','2026-10-24T24:00:00Z','2026-10-24T12:00:00+00:00','2026-10-24 12:00','2026-10-24T12:00:00.1Z'])assert.throws(()=>createLogEntry({gasFlowKgh:0},'',timestamp));
  for(const timestamp of ['2024-02-29T12:00:00Z','2026-10-24T12:00:00.123Z'])assert.equal(createLogEntry({gasFlowKgh:0},'',timestamp).timestamp,timestamp);
});

test('Small decimals survive saving, backup restore and an unchanged-reading notes correction',()=>{
  const readings=parseReadings({gasFlowKgh:'0.0000001',liquidTemperatureC:'-0.0000001'});
  const saved=createLogEntry(readings,'Before',time);
  const restored=decodeLogbook(JSON.stringify({version:1,entries:[saved]}));
  assert.deepEqual(restored.entries[0].readings,readings);
  const corrected=updateEntry(restored,saved.id,restored.entries[0].readings,'After',time);
  assert.deepEqual(corrected.entries[0],{...saved,notes:'After'});
  assert.deepEqual(decodeLogbook(JSON.stringify(corrected)),corrected);
});

test('Adding records sorts by observation time, validates identity and does not mutate input',()=>{
  const book=fixture(),before=JSON.stringify(book);
  const added=createLogEntry({gasFlowKgh:0},'Latest','2026-10-25T12:00:00Z');
  const next=addEntry(book,added);
  assert.equal(next.entries.length,3);
  assert.equal(next.entries[0].id,added.id);
  assert.equal(JSON.stringify(book),before);
  assert.throws(()=>addEntry(book,book.entries[0]),/Duplicate observation ID/);
  assert.throws(()=>addEntry(book,{...added,source:'simulator'} as never));
});

test('Editing replaces a complete snapshot, preserving identity/count and clearing omitted fields',()=>{
  const book=fixture(),before=JSON.stringify(book),target=book.entries[0];
  const readings:Readings={tankPressureMbarg:0,instrumentValues:{'CUSTOM.FLOW':0},instrumentUnits:{'CUSTOM.FLOW':'L/min'}};
  const changed=updateEntry(book,target.id,readings,'',time);
  assert.equal(changed.entries.length,book.entries.length);
  assert.equal(changed.entries[0].id,target.id);
  assert.equal(changed.entries[0].source,target.source);
  assert.deepEqual(changed.entries[0].readings,readings);
  assert.equal(changed.entries[0].notes,'');
  assert.equal(changed.entries[0].readings.tankVolumeM3,undefined);
  assert.equal(changed.entries[0].readings.gasFlowKgh,undefined);
  assert.equal(changed.entries[0].readings.densityKgM3,undefined);
  assert.equal(changed.entries[0].readings.instrumentValues?.['45PIT1001'],undefined);
  assert.equal(changed.entries[0].readings.instrumentUnits?.['45PIT1001'],undefined);
  assert.deepEqual(changed.entries[1],book.entries[1]);
  assert.equal(JSON.stringify(book),before);
});

test('Changing observation time re-sorts one existing record without duplication or carry-forward',()=>{
  const book=fixture(),target=book.entries[0];
  const earlier=updateEntry(book,target.id,{bottomC:-150},'Earlier','2026-10-22T12:00:00Z');
  assert.deepEqual(earlier.entries.map(entry=>entry.id),[book.entries[1].id,target.id]);
  assert.deepEqual(earlier.entries[1].readings,{bottomC:-150});
  const latest=updateEntry(earlier,target.id,{bottomC:-145},'Later','2026-10-25T12:00:00Z');
  assert.deepEqual(latest.entries.map(entry=>entry.id),[target.id,book.entries[1].id]);
  assert.deepEqual(latest.entries[1],book.entries[1]);
});

test('Notes-only instrument edits preserve absent/custom units and saved data stays detached from later draft changes',()=>{
  const original=createLogEntry({instrumentValues:{'CUSTOM.FLOW':0,'CUSTOM.TEMP':-160},instrumentUnits:{'CUSTOM.FLOW':'L/min'}},'Before',time);
  const book:Logbook={version:1,entries:[original]};
  const corrected=updateEntry(book,original.id,original.readings,'After',time);
  corrected.entries[0].readings.instrumentValues!['CUSTOM.FLOW']=4;
  corrected.entries[0].readings.instrumentUnits!['CUSTOM.FLOW']='kg/h';
  assert.equal(original.readings.instrumentValues?.['CUSTOM.FLOW'],0);
  assert.equal(original.readings.instrumentUnits?.['CUSTOM.FLOW'],'L/min');
  assert.equal(original.readings.instrumentUnits?.['CUSTOM.TEMP'],undefined);
  assert.equal(original.notes,'Before');
});

test('Missing targets and invalid edits are rejected atomically without adding records',()=>{
  const book=fixture(),before=JSON.stringify(book),id=book.entries[0].id;
  for(const missing of ['', 'missing-id'])assert.throws(()=>updateEntry(book,missing,{gasFlowKgh:0},'',time),/not found/);
  const invalid:unknown[]=[{}, {gasFlowKgh:NaN},{gasFlowKgh:'1'},{tankVolumeM3:-1},{unknown:1},{instrumentValues:{'CUSTOM.FLOW':Infinity}},{instrumentUnits:{'CUSTOM.FLOW':'L/min'}},{instrumentValues:{'CUSTOM.FLOW':0},instrumentUnits:{'MISSING.TAG':'L/min'}},{instrumentValues:{'CUSTOM.FLOW':0},instrumentUnits:{'CUSTOM.FLOW':'bad\nunit'}}];
  for(const readings of invalid)assert.throws(()=>updateEntry(book,id,readings as Readings,'Rejected',time));
  assert.throws(()=>updateEntry(book,id,{gasFlowKgh:0},'Rejected','2026-02-30T12:00:00Z'));
  assert.throws(()=>updateEntry(book,id,{gasFlowKgh:0},'x'.repeat(4001),time));
  assert.equal(JSON.stringify(book),before);
});

test('Malformed backups, wrong sources and invalid numeric structures are rejected',()=>{
  for(const raw of ['{bad','null','[]','{"version":2,"entries":[]}','{"version":1,"entries":{}}'])assert.throws(()=>decodeLogbook(raw));
  const valid=createLogEntry({gasFlowKgh:0},'',time);
  for(const patch of [{id:''},{source:'simulator'},{notes:7},{readings:[]},{readings:{unknown:1}},{readings:{gasFlowKgh:'1000'}},{readings:{gasFlowKgh:null}},{readings:{instrumentUnits:{'CUSTOM.FLOW':'L/min'}}}])assert.throws(()=>decodeLogbook(JSON.stringify({version:1,entries:[{...valid,...patch}]})));
});

test('Duplicate backup IDs are rejected while distinct IDs sharing a timestamp remain independently editable',()=>{
  const first=createLogEntry({gasFlowKgh:0},'First',time);
  const second={...first,id:'separate-observation',notes:'Second'};
  const restored=decodeLogbook(JSON.stringify({version:1,entries:[first,second]}));
  assert.equal(restored.entries.length,2);
  const changed=updateEntry(restored,second.id,{gasFlowKgh:10},'Changed',time);
  assert.deepEqual(changed.entries[0],first);
  assert.equal(changed.entries[1].readings.gasFlowKgh,10);
  for(const duplicate of [first,{...second,id:first.id,timestamp:'2026-10-25T12:00:00Z'}])assert.throws(()=>decodeLogbook(JSON.stringify({version:1,entries:[first,duplicate]})),/Duplicate observation ID/);
});

test('A version-one JSON roundtrip retains mixed known and instrument-only observations and sorted UTC times',()=>{
  const book=fixture();
  book.entries.reverse();
  book.entries.push(createLogEntry({instrumentValues:{'CUSTOM.TEMP':-160}},'No specified unit','2026-10-22T12:00:00.123Z'));
  const before=JSON.stringify(book),restored=decodeLogbook(before);
  assert.deepEqual(restored.entries.map(entry=>entry.timestamp),[time,'2026-10-23T12:00:00Z','2026-10-22T12:00:00.123Z']);
  assert.deepEqual(decodeLogbook(JSON.stringify(restored)),restored);
  assert.equal(restored.entries[2].readings.instrumentUnits,undefined);
  assert.equal(JSON.stringify(book),before);
});

test('CSV exports corrected data with zero/unknown distinction and escapes formulas, quotes and multiline notes',()=>{
  const book=fixture(),target=book.entries[0];
  const changed=updateEntry(book,target.id,{liquidTemperatureC:-160,gasFlowKgh:0,instrumentValues:{'CUSTOM.FLOW':1e-7},instrumentUnits:{'CUSTOM.FLOW':'=custom'}},'=SUM(1,2)\n"watch"',time);
  const csv=exportCsv(changed);
  assert.ok(!csv.includes('45PIT1001'));
  assert.ok(!csv.includes('First watch'));
  assert.ok(csv.includes('"-160"'));
  assert.ok(csv.includes('"0.0000001","\'=custom"'));
  assert.ok(csv.includes('"\'=SUM(1,2)\n""watch"""'));
  const header=csv.split('\r\n')[0].slice(1,-1).split('","');
  const row=csv.split('\r\n')[1].split('\n')[0].slice(1).split('","');
  assert.equal(row[header.indexOf('tankVolumeM3 (m³)')],'');
  assert.equal(row[header.indexOf('gasFlowKgh (kg/h)')],'0');
  assert.equal(row[header.indexOf('CUSTOM.FLOW')],'0.0000001');
});

test('CSV preserves unspecified units and protects leading-whitespace formula-like text without changing numeric signs',()=>{
  const entry=createLogEntry({liquidTemperatureC:-158,instrumentValues:{'CUSTOM.FLOW':0,'CUSTOM.TEMP':-160},instrumentUnits:{'CUSTOM.FLOW':' @unit'}},' \t-possible formula',time);
  const csv=exportCsv({version:1,entries:[entry]});
  assert.ok(csv.includes('"0","\' @unit","-160",""'));
  assert.ok(csv.includes('"\' \t-possible formula"'));
  assert.ok(csv.includes('"-158"'));
  assert.equal(exportCsv({version:1,entries:[]}).split('\r\n').length,1);
});
