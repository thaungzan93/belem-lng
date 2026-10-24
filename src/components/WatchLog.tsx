import React,{useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Logbook,LogEntry,Readings,ReadingKey,readingFields,parseReadings,parseInstrumentValues,formatReadingDraft,normalizeInstrumentTag,createLogEntry,addEntry,updateEntry,decodeLogbook,exportCsv} from '../storage/logbook';
import {deliverFile} from '../storage/exportFile';

type Draft=Partial<Record<ReadingKey,string>>;
type StringMap=Record<string,string>;
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
function Button({title,onPress,disabled=false,testID}:{title:string;onPress:()=>void;disabled?:boolean;testID?:string}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
function Field({label,value,onChange,unit='',wide=false,numeric=false,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;unit?:string;wide?:boolean;numeric?:boolean;disabled?:boolean}){
 return <View style={[s.field,wide&&s.wide]}><Text style={s.label}>{label}{unit?` · ${unit}`:''}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} autoCapitalize="none" autoCorrect={false} keyboardType={numeric?'numbers-and-punctuation':'default'} style={s.input}/></View>;
}
function Instruments({values,units,onValue,onUnit,prefix='',disabled=false}:{values:StringMap;units:StringMap;onValue:(tag:string,value:string)=>void;onUnit:(tag:string,value:string)=>void;prefix?:string;disabled?:boolean}){
 const[tag,setTag]=useState(''),[unit,setUnit]=useState(''),[error,setError]=useState('');
 function add(){try{const id=normalizeInstrumentTag(tag);if(id in values)throw new Error('This instrument is already in this record');onValue(id,'');onUnit(id,unit);setTag('');setUnit('');setError('');}catch(e){setError(message(e));}}
 return <View style={s.instruments}><Text style={s.title}>INDIVIDUAL INSTRUMENTS</Text><Text style={s.muted}>Add the tag and unit shown onboard. Blank readings stay unknown.</Text>
 {Object.keys(values).map(id=><View key={id} style={s.instrument}><Text style={s.text}>{id}</Text><View style={s.row}><Field label={`${prefix}${prefix?'reading':'Reading'} ${id}`} value={values[id]} unit={units[id]??''} onChange={value=>onValue(id,value)} numeric disabled={disabled}/><Field label={`${prefix}${prefix?'unit':'Unit'} ${id}`} value={units[id]??''} onChange={value=>onUnit(id,value)} disabled={disabled}/></View></View>)}
 <View style={[s.row,s.space]}><Field label={`${prefix}${prefix?'additional':'Additional'} instrument tag`} value={tag} onChange={setTag} disabled={disabled}/><Field label={`${prefix}${prefix?'additional':'Additional'} instrument unit`} value={unit} onChange={setUnit} disabled={disabled}/><Button title={prefix?'Add instrument to record':'Add instrument field'} onPress={add} disabled={disabled}/></View>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>;
}
function snapshot(draft:Draft,values:StringMap,units:StringMap):Readings{
 const readings=parseReadings(draft,true),instruments=parseInstrumentValues(values);
 if(Object.keys(instruments).length){readings.instrumentValues=instruments;const retained=Object.fromEntries(Object.entries(units).filter(([tag])=>tag in instruments));if(Object.keys(retained).length)readings.instrumentUnits=retained;}
 return readings;
}
function Notes({label,value,onChange,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <View style={s.space}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} multiline maxLength={4000} editable={!disabled} value={value} onChangeText={onChange} style={[s.input,s.notes]}/></View>;
}
function RecordDetails({entry,book,onSave,ready,onClose}:{entry:LogEntry;book:Logbook;onSave:(book:Logbook)=>Promise<void>;ready:boolean;onClose:()=>void}){
 const{width,height}=useWindowDimensions();const[editing,setEditing]=useState(false),[busy,setBusy]=useState(false);
 const[draft,setDraft]=useState<Draft>({}),[values,setValues]=useState<StringMap>({}),[units,setUnits]=useState<StringMap>({});
 const[time,setTime]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('');
 function edit(){setDraft(Object.fromEntries(readingFields.filter(field=>entry.readings[field.key]!==undefined).map(field=>[field.key,formatReadingDraft(entry.readings[field.key]!)])));setValues(Object.fromEntries(Object.entries(entry.readings.instrumentValues??{}).map(([tag,value])=>[tag,formatReadingDraft(value)])));setUnits({...entry.readings.instrumentUnits});setTime(entry.timestamp);setNotes(entry.notes);setError('');setStatus('');setEditing(true);}
 function cancel(){setEditing(false);setError('');setStatus('');}
 async function save(){setBusy(true);setError('');setStatus('');try{await onSave(updateEntry(book,entry.id,snapshot(draft,values,units),notes,time));setEditing(false);setStatus('Record updated on this device.');}catch(e){setError(message(e));}finally{setBusy(false);}}
 return <Modal visible transparent animationType="fade" onRequestClose={()=>{if(!busy)onClose();}}><View style={s.backdrop}><View testID="watch-record-modal" style={[s.window,{width:Math.min(860,width-24),maxHeight:height-24}]}>
 <View style={s.header}><Text style={s.heading}>{editing?'EDIT WATCH RECORD':'WATCH RECORD'}</Text><Button title="Close record" onPress={onClose} disabled={busy}/></View>
 <ScrollView style={s.modalScroll} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
 {editing?<View><Text style={s.muted}>Save changes updates this observation. Clear a reading to mark it unknown. Entry checks are not operating limits.</Text><View style={s.space}><Field label="Record observation time (UTC)" value={time} onChange={setTime} wide disabled={busy}/></View>
 <View style={s.row}>{readingFields.map(field=><Field key={field.key} label={`Record ${field.label}`} unit={field.unit} value={draft[field.key]??''} onChange={value=>setDraft(current=>({...current,[field.key]:value}))} numeric disabled={busy}/>)}</View>
 <Instruments prefix="Record " values={values} units={units} onValue={(tag,value)=>setValues(current=>({...current,[tag]:value}))} onUnit={(tag,value)=>setUnits(current=>({...current,[tag]:value}))} disabled={busy}/><Notes label="Record notes" value={notes} onChange={setNotes} disabled={busy}/>
 </View>:<View><Text style={[s.text,s.timestamp]}>{entry.timestamp}</Text>{readingFields.filter(field=>entry.readings[field.key]!==undefined).map(field=><View key={field.key} style={s.reading}><Text style={s.readingLabel}>{field.label}</Text><Text style={s.text}>{formatReadingDraft(entry.readings[field.key]!)} {field.unit}</Text></View>)}
 {Object.entries(entry.readings.instrumentValues??{}).map(([tag,value])=><View key={tag} style={s.reading}><Text style={s.readingLabel}>{tag}</Text><Text style={s.text}>{formatReadingDraft(value)} {entry.readings.instrumentUnits?.[tag]??''}</Text></View>)}<Text style={[s.muted,s.space]}>Other readings in this snapshot are unknown.</Text><Text style={[s.label,s.space]}>Watch notes</Text><Text style={s.text}>{entry.notes||'No notes recorded.'}</Text></View>}
 </ScrollView><View style={s.footer}>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!status&&<Text style={s.success}>{status}</Text>}<View style={s.row}>{editing?<><Button title={busy?'Saving changes…':'Save changes'} onPress={save} disabled={busy||!ready}/><Button title="Cancel editing" onPress={cancel} disabled={busy}/></>:<Button title="Edit" onPress={edit} disabled={!ready}/>}</View></View>
 </View></View></Modal>;
}

export function WatchLog({book,onSave,ready}:{book:Logbook;onSave:(book:Logbook)=>Promise<void>;ready:boolean}){
 const[draft,setDraft]=useState<Draft>({}),[values,setValues]=useState<StringMap>({}),[units,setUnits]=useState<StringMap>({});
 const[time,setTime]=useState(new Date().toISOString()),[notes,setNotes]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('');
 const[busy,setBusy]=useState(false),[importText,setImportText]=useState(''),[selectedId,setSelectedId]=useState<string|null>(null),[limit,setLimit]=useState(20),[revision,setRevision]=useState(0);
 const selected=book.entries.find(entry=>entry.id===selectedId);
 async function save(){setBusy(true);setError('');setStatus('');try{await onSave(addEntry(book,createLogEntry(snapshot(draft,values,units),notes,time)));setDraft({});setValues({});setUnits({});setTime(new Date().toISOString());setNotes('');setRevision(current=>current+1);setStatus('Reading saved on this device.');}catch(e){setError(message(e));}finally{setBusy(false);}}
 async function backup(kind:'json'|'csv'){setError('');setStatus('');try{const filename=`belem-lng-${new Date().toISOString().replace(/[:.]/g,'-')}.${kind}`;await deliverFile(kind==='json'?JSON.stringify(book,null,2):exportCsv(book),filename,kind==='json'?'application/json':'text/csv');setStatus(`${kind.toUpperCase()} export prepared.`);}catch(e){setError(message(e));}}
 async function restore(){setBusy(true);setError('');setStatus('');try{const incoming=decodeLogbook(importText),byId=new Map(book.entries.map(entry=>[entry.id,entry]));for(const entry of incoming.entries)byId.set(entry.id,entry);await onSave({version:1,entries:[...byId.values()].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp))});setImportText('');setStatus('Backup merged with this device logbook.');}catch(e){setError(message(e));}finally{setBusy(false);}}
 return <View><View style={s.panel}><Text style={s.title}>MANUAL OPERATIONS LOG</Text><Text style={s.muted}>Each observation is a complete snapshot. Blank readings stay unknown. Input ranges validate entries and are not operating limits.</Text>
 <View style={[s.row,s.space]}><Field label="Observation time (UTC)" value={time} onChange={setTime} wide disabled={busy}/><Button title="Use current UTC time" onPress={()=>setTime(new Date().toISOString())} disabled={busy}/></View>
 <View style={s.row}>{readingFields.map(field=><Field key={field.key} label={field.label} unit={field.unit} value={draft[field.key]??''} onChange={value=>setDraft(current=>({...current,[field.key]:value}))} numeric disabled={busy}/>)}</View>
 <Instruments key={revision} values={values} units={units} onValue={(tag,value)=>setValues(current=>({...current,[tag]:value}))} onUnit={(tag,value)=>setUnits(current=>({...current,[tag]:value}))} disabled={busy}/><Notes label="Watch notes" value={notes} onChange={setNotes} disabled={busy}/>
 <View style={[s.row,s.space]}><Button title={busy?'Saving…':'Save reading'} onPress={save} disabled={busy||!ready}/><Button title="Export CSV" onPress={()=>backup('csv')} disabled={busy||!ready}/><Button title="Backup JSON" onPress={()=>backup('json')} disabled={busy||!ready}/></View>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!status&&<Text style={s.success}>{status}</Text>}</View>
 <View style={s.panel}><Text style={s.title}>WATCH HISTORY · {book.entries.length} entries</Text><Text style={s.muted}>Records stay on this device. Export a backup before clearing app or browser storage.</Text>
 {book.entries.slice(0,limit).map(entry=><View key={entry.id} style={s.history}><Text style={[s.text,s.timestamp]}>{entry.timestamp}</Text><Text style={s.muted}>{readingFields.filter(field=>entry.readings[field.key]!==undefined).map(field=>`${field.label}: ${formatReadingDraft(entry.readings[field.key]!)} ${field.unit}`).join(' · ')}</Text>
 {!!entry.readings.instrumentValues&&<Text style={s.muted}>{Object.entries(entry.readings.instrumentValues).map(([tag,value])=>`${tag}: ${formatReadingDraft(value)} ${entry.readings.instrumentUnits?.[tag]??''}`).join(' · ')}</Text>}{!!entry.notes&&<Text style={s.text}>{entry.notes}</Text>}<View style={s.space}><Button title="Open record" testID={`open-record-${entry.id}`} onPress={()=>setSelectedId(entry.id)} disabled={busy||!ready}/></View></View>)}
 {!book.entries.length&&<Text style={[s.text,s.space]}>No readings entered yet.</Text>}{book.entries.length>limit&&<Button title="Show older records" onPress={()=>setLimit(current=>current+20)} disabled={busy}/>}</View>
 <View style={s.panel}><Text style={s.title}>RESTORE BACKUP</Text><Text style={s.muted}>Paste exported JSON to merge by record ID. An incoming record replaces the saved record with that ID.</Text><TextInput accessibilityLabel="Backup JSON" multiline editable={!busy} value={importText} onChangeText={setImportText} autoCapitalize="none" autoCorrect={false} style={[s.input,s.notes,s.space]}/><View style={s.space}><Button title="Merge backup" onPress={restore} disabled={busy||!ready||!importText.trim()}/></View></View>
 {selected&&<RecordDetails key={selected.id} entry={selected} book={book} ready={ready} onSave={onSave} onClose={()=>setSelectedId(null)}/>}
 </View>;
}
const s=StyleSheet.create({
 panel:{backgroundColor:'#424347',borderColor:'#85808a',borderWidth:1,padding:16,marginBottom:16},
 title:{color:'#b4ed50',fontSize:17,fontWeight:'700',marginBottom:8},text:{color:'#f3f2f5',fontSize:14,lineHeight:21},muted:{color:'#d0ccd3',fontSize:12,lineHeight:19},
 label:{color:'#d0ccd3',fontSize:12,marginBottom:5},input:{backgroundColor:'#242629',color:'#fff',borderColor:'#98919f',borderWidth:1,padding:10,minHeight:44,fontSize:14},
 field:{flexBasis:210,flexGrow:1,maxWidth:'100%',marginBottom:10},wide:{flexBasis:'100%',width:'100%'},row:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'flex-start'},space:{marginTop:14},
 button:{backgroundColor:'#676477',borderColor:'#b9b3c5',borderWidth:1,paddingHorizontal:14,paddingVertical:11,minHeight:44,alignSelf:'flex-start',justifyContent:'center'},buttonText:{color:'#fff',fontSize:12,fontWeight:'700'},disabled:{opacity:0.45},
 notes:{minHeight:88,textAlignVertical:'top'},instruments:{marginTop:16,borderTopWidth:1,borderColor:'#77717f',paddingTop:16},instrument:{paddingVertical:10,borderBottomWidth:1,borderColor:'#77717f'},
 error:{color:'#ffb0aa',fontSize:14,marginTop:10,marginBottom:8},success:{color:'#b4ed50',fontSize:14,marginTop:10,marginBottom:8},history:{borderTopWidth:1,borderColor:'#77717f',paddingVertical:14,marginTop:10},timestamp:{fontFamily:'monospace',marginBottom:8},
 backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',alignItems:'center',justifyContent:'center'},window:{backgroundColor:'#424347',borderColor:'#c8c1cf',borderWidth:2,flexShrink:1},header:{backgroundColor:'#817787',flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',padding:8,gap:10},heading:{color:'#fff',fontWeight:'700',fontSize:14,flex:1,minWidth:140},
 modalScroll:{flexShrink:1},modalContent:{padding:16},footer:{padding:14,borderTopWidth:1,borderColor:'#817988'},reading:{flexDirection:'row',flexWrap:'wrap',gap:12,paddingVertical:8,borderBottomWidth:1,borderColor:'#77717f'},readingLabel:{color:'#d0ccd3',fontSize:14,flex:1,minWidth:140},
});
