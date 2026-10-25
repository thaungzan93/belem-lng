import React,{useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {metrics,PlantCommand} from './src/engine/lng';
import {advanceCircuitPlant,commandCircuit,createCircuit,deriveFuelCircuit,FuelCircuitCommand} from './src/engine/fuelCircuit';
import {decodeLogbook,Logbook as Book,STORAGE_KEY} from './src/storage/logbook';
import {ShipDiagram} from './src/components/ShipDiagram';
import {WatchLog} from './src/components/WatchLog';
import {deliverFile} from './src/storage/exportFile';
import config from './app.json';

const settingFields=[['heatIngressKw','Training heat ingress','kW'],['demandKgh','Training consumer demand','kg/h'],['pumpFlowM3h','Training pump flow','m³/h'],['bunkerFlowM3h','Training bunker flow','m³/h']] as const;
function Action({title,onPress,disabled=false,active=false}:{title:string;onPress:()=>void;disabled?:boolean;active?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled} style={[s.button,active&&s.active,disabled&&{opacity:0.4}]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
function Value({label,value,unit}:{label:string;value:number|undefined;unit:string}){return <View style={s.value}><Text style={s.small}>{label}</Text><Text style={s.reading}>{value===undefined?'—':value.toLocaleString('en',{maximumFractionDigits:3})} <Text style={s.small}>{unit}</Text></Text></View>;}
export default function App(){
 const {width}=useWindowDimensions();const[diagramHeight,setDiagramHeight]=useState(600);
 const[plant,setPlant]=useState(createCircuit);const plantRef=useRef(plant);
 const[book,setBook]=useState<Book>({version:1,entries:[]});const[ready,setReady]=useState(false);const[storageError,setStorageError]=useState('');const[rawBackup,setRawBackup]=useState('');
 const[watchSaving,setWatchSaving]=useState(false);const watchWriteInFlight=useRef(false);
 const[manual,setManual]=useState(false);const[running,setRunning]=useState(false);const[screen,setScreen]=useState<'diagram'|'watch'|'settings'>('diagram');const[error,setError]=useState('');
 const[settings,setSettings]=useState(()=>Object.fromEntries(settingFields.map(([key])=>[key,String(plant.cfg[key])])) as Record<typeof settingFields[number][0],string>);
 function commit(next:ReturnType<typeof createCircuit>){plantRef.current=next;setPlant(next);}
 async function load(){setReady(false);setStorageError('');let raw:string|null=null;try{raw=await AsyncStorage.getItem(STORAGE_KEY);const next=raw?decodeLogbook(raw):{version:1 as const,entries:[]};setBook(next);setRawBackup('');setReady(true);}catch(e){setRawBackup(raw??'');setStorageError(`Watch storage could not be opened. Existing data has not been overwritten. ${e instanceof Error?e.message:String(e)}`);}}
 useEffect(()=>{void load();},[]);
 async function saveBook(next:Book){
  if(!ready)throw new Error('Watch storage is not ready');
  if(watchWriteInFlight.current)throw new Error('A watch record is still being saved');
  // The ref closes same-tick races; app-level state keeps navigation and all
  // child editors locked until native storage acknowledges the write.
  watchWriteInFlight.current=true;setWatchSaving(true);
  try{const clean=decodeLogbook(JSON.stringify(next));await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(clean));setBook(clean);}
  finally{watchWriteInFlight.current=false;setWatchSaving(false);}
 }
 function act(command:PlantCommand|FuelCircuitCommand){if(manual){setError('Switch to Simulator for training controls.');return;}try{commit(commandCircuit(plantRef.current,command));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
 function step(seconds:number){if(manual)return;try{commit(advanceCircuitPlant(plantRef.current,seconds));setError('');}catch(e){setRunning(false);setError(e instanceof Error?e.message:String(e));}}
 useEffect(()=>{if(!running||manual)return;const timer=setInterval(()=>step(10),1000);return()=>clearInterval(timer);},[running,manual]);
 function navigate(next:typeof screen){if(watchWriteInFlight.current)return;setRunning(false);setScreen(next);setError('');}
 function changeMode(next:boolean){if(watchWriteInFlight.current)return;setManual(next);setRunning(false);}
 function supply(){if(manual)return;try{let next=plantRef.current;for(const equipment of ['pump','vaporizer','compressor','gasValve','consumer'] as const)if(!next.equipment[equipment])next=commandCircuit(next,{type:'toggle',equipment});commit(next);setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}
 function applySettings(){try{const values:Record<string,number>={};for(const[key,label]of settingFields){const text=settings[key].trim();if(!text||!Number.isFinite(Number(text)))throw new Error(`${label}: enter a finite number`);values[key]=Number(text);}act({type:'settings',values});}catch(e){setError(e instanceof Error?e.message:String(e));}}
 const m=metrics(plant),derivedCircuit=deriveFuelCircuit(plant),latest=book.entries[0],r=latest?.readings;
 const values=manual?{tankVolumeM3:r?.tankVolumeM3,tankPressureBarg:r?.tankPressureMbarg===undefined?undefined:r.tankPressureMbarg/1000,bufferPressureBarg:r?.bufferPressureBarg,gasFlowKgh:r?.gasFlowKgh,temperatureC:r?.liquidTemperatureC}:{tankVolumeM3:m.tankVolumeM3,tankPressureBarg:m.tankPressureBarg,bufferPressureBarg:m.bufferPressureBarg,gasFlowKgh:m.deliveredKgh,temperatureC:plant.tank.temperatureC};
 return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="light"/>
  <View style={s.header}><Text style={s.title}>BELEM LNG <Text style={s.version}>{config.expo.version} · REBUILD</Text></Text><Text style={s.small}>{manual?'MANUAL OBSERVATIONS · LOCAL DEVICE':'SIMULATOR · TRAINING ASSUMPTIONS'}</Text></View>
  <View style={s.toolbar}><Action title="Simulator" active={!manual} disabled={watchSaving} onPress={()=>changeMode(false)}/><Action title="Manual observations" active={manual} disabled={watchSaving} onPress={()=>changeMode(true)}/><Action title="Fuel diagram" active={screen==='diagram'} disabled={watchSaving} onPress={()=>navigate('diagram')}/><Action title="Watch log" active={screen==='watch'} disabled={watchSaving} onPress={()=>navigate('watch')}/><Action title="Model and status" active={screen==='settings'} disabled={watchSaving} onPress={()=>navigate('settings')}/></View>
  {!!storageError&&<View style={s.warning}><Text accessibilityRole="alert" style={s.error}>{storageError}</Text><View style={s.row}><Action title="Retry watch storage" onPress={()=>void load()}/>{!!rawBackup&&<Action title="Export unread backup" onPress={()=>void deliverFile(rawBackup,'belem-lng-unparsed-backup.json','application/json').catch(e=>setError(String(e)))}/>}</View></View>}
  {screen==='diagram'?<ScrollView testID="diagram-page" style={{flex:1}} nestedScrollEnabled onLayout={e=>setDiagramHeight(e.nativeEvent.layout.height)} contentContainerStyle={{flexGrow:1}}><View style={{height:Math.max(diagramHeight,width<480?720:600)}}>
   <View style={s.readouts}><Value label="Tank liquid volume" value={values.tankVolumeM3} unit="m³"/><Value label="Tank pressure" value={values.tankPressureBarg} unit="bar(g)"/><Value label={manual?'ME buffer pressure':'Supply buffer (model)'} value={values.bufferPressureBarg} unit="bar(g)"/><Value label="Gas delivery" value={values.gasFlowKgh} unit="kg/h"/></View>
   <ShipDiagram manual={manual} values={values} equipment={plant.equipment} esdLatched={manual?false:plant.esdLatched} circuit={manual?undefined:plant.circuit} derivedCircuit={manual?undefined:derivedCircuit} onCircuitCommand={act} onToggle={equipment=>act({type:'toggle',equipment})} onEsd={()=>act({type:'esd'})} onReset={()=>act({type:'reset-esd'})}/>
   {!manual&&<View style={s.toolbar}><Action title={running?'Pause simulation':'Run 10×'} onPress={()=>setRunning(v=>!v)}/><Action title="Step 1 minute" onPress={()=>step(60)}/><Action title="Start fuel supply" disabled={plant.esdLatched} onPress={supply}/><Text style={s.small}>Simulated {(plant.elapsedSeconds/60).toFixed(1)} min · mass residual {m.massResidualKg.toExponential(2)} kg</Text></View>}
  </View></ScrollView>:<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
   {screen==='watch'?<WatchLog book={book} onSave={saveBook} ready={ready&&!watchSaving}/>:<View>
    <View style={s.panel}><Text style={s.section}>MODEL AND SOURCE STATUS</Text><Text style={s.text}>The line diagrams use the supplied ship HMI photographs and recovered H1843/FGSS drawings. Equipment tags and routes are cited in the diagram inspectors. The original application was not recovered. Installed limits, complete operating sequences and model calibration still require document and commissioning review.</Text><Text style={s.text}>The simulator uses pure methane, ideal-gas ullage/buffer pressure and fixed-temperature latent-heat boiloff. It accounts for fuel mass; it does not model mixture equilibrium, warm membrane cooldown, stratification or a complete energy balance. Values below are training assumptions, not live readings or approved ship settings.</Text><Text style={s.text}>The ME and AE branches share one aggregate training-buffer inventory. Branch flow readouts are model allocations, not independent instrument readings. Closing an isolation valve blocks that route; delivery can continue from gas already in the buffer. Unmodeled instrument values remain unknown.</Text></View>
    <View style={s.panel}><Text style={s.section}>TRAINING SETTINGS · separate from manual observations</Text><View style={s.row}>{settingFields.map(([key,label,unit])=><View key={key} style={s.field}><Text style={s.small}>{label} · {unit}</Text><TextInput accessibilityLabel={label} value={settings[key]} onChangeText={value=>setSettings(current=>({...current,[key]:value}))} editable={!manual} keyboardType="numbers-and-punctuation" style={s.input}/></View>)}</View><View style={s.row}><Action title="Apply training settings" disabled={manual} onPress={applySettings}/><Action title="Reset training plant" disabled={manual} onPress={()=>{const next=createCircuit();commit(next);setRunning(false);setSettings(Object.fromEntries(settingFields.map(([key])=>[key,String(next.cfg[key])])) as typeof settings);setError('');}}/></View><Text style={s.small}>Simulation resets to training defaults when the app is reopened. Watch records persist separately on this device.</Text></View>
    <View style={s.panel}><Text style={s.section}>SIMULATOR MASS LEDGER</Text><Text style={s.text}>Initial {plant.ledger.initialMassKg.toFixed(3)} kg + bunkered {plant.ledger.bunkeredKg.toFixed(3)} kg − consumed {plant.ledger.consumedKg.toFixed(3)} kg − vented {plant.ledger.ventedKg.toFixed(3)} kg = inventory {m.totalMassKg.toFixed(3)} kg.</Text><Text style={s.text}>Residual: {m.massResidualKg.toExponential(3)} kg. ESD is a training command that latches equipment stopped; reset does not restart equipment.</Text></View>
    <View style={s.panel}><Text style={s.section}>TRAINING EVENT LOG</Text>{plant.events.map((event,index)=><Text key={index} style={s.text}>{event}</Text>)}</View>
   </View>}
  </ScrollView>}
  {!!error&&<Text accessibilityRole="alert" style={[s.error,{padding:10}]}>{error}</Text>}
  <View style={s.footer}><Text style={s.small}>{manual?latest?`Latest observation ${latest.timestamp}`:'No observations entered · missing values stay unknown':`Training model · ${plant.esdLatched?'ESD LATCHED':'operator controls available'}`}</Text><Text style={s.small}>{book.entries.length} saved records</Text></View>
 </SafeAreaView></SafeAreaProvider>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#242629'},header:{padding:12,backgroundColor:'#4c4851',borderBottomWidth:1,borderColor:'#939099'},title:{fontSize:19,fontWeight:'700',color:'#b1ff54'},version:{fontSize:11,color:'#ddd'},small:{fontSize:11,color:'#bdc0c8',lineHeight:17},toolbar:{flexDirection:'row',flexWrap:'wrap',gap:7,padding:8,alignItems:'center',backgroundColor:'#35343a'},button:{paddingHorizontal:12,paddingVertical:10,backgroundColor:'#605e6b',borderWidth:1,borderColor:'#aba6b7',minHeight:42,justifyContent:'center'},active:{backgroundColor:'#50652e'},buttonText:{fontSize:12,color:'#fff',fontWeight:'600'},readouts:{flexDirection:'row',flexWrap:'wrap',gap:6,padding:8},value:{flex:1,minWidth:140,padding:8,backgroundColor:'#3f4044',borderWidth:1,borderColor:'#77737e'},reading:{color:'#fff',fontWeight:'700',fontSize:19},content:{padding:12},panel:{padding:14,marginBottom:12,backgroundColor:'#434349',borderWidth:1,borderColor:'#827e88'},section:{fontSize:16,color:'#b1ff54',fontWeight:'700',marginBottom:10},text:{color:'#f0eff2',fontSize:13,lineHeight:21,marginBottom:9},row:{flexDirection:'row',flexWrap:'wrap',gap:10},field:{width:225,marginBottom:12},input:{padding:10,backgroundColor:'#242629',borderWidth:1,borderColor:'#928d9b',color:'#fff',fontSize:14,minHeight:44},footer:{padding:8,borderTopWidth:1,borderColor:'#726e79',backgroundColor:'#35343a',flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:5},error:{color:'#ffb6a3',fontSize:12,lineHeight:19},warning:{padding:10,backgroundColor:'#493b36'}});
