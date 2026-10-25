import React,{useEffect,useRef,useState} from 'react';
import {LayoutChangeEvent,Modal,Pressable,ScrollView,StyleSheet,Text,View,NativeSyntheticEvent,NativeScrollEvent} from 'react-native';
import type {EquipmentKey} from '../engine/lng';
import type {FuelCircuitState,FuelCircuitDerived,FuelCircuitCommand,CircuitControlKey} from '../engine/fuelCircuit';
import {equipmentById,sourceEquipment} from './diagram/equipment';
import {createSymbols,mimicColors as c} from './diagram/symbols';
import {renderPane,paneNames,DiagramPane,DiagramValues} from './diagram/layouts';
export type DiagramEquipmentKey=EquipmentKey;
export interface ShipDiagramProps {
 manual:boolean;values:DiagramValues;equipment:Record<EquipmentKey,boolean>;esdLatched:boolean;
 onToggle:(key:EquipmentKey)=>void;onEsd:()=>void;onReset:()=>void;
 circuit?:FuelCircuitState;derivedCircuit?:FuelCircuitDerived;onCircuitCommand?:(command:FuelCircuitCommand)=>void;
}
const WIDTH=1280,HEIGHT=800;
const aggregate:[EquipmentKey,string,string][]=[['pump','Fuel pump route','Toggle fuel pump'],['compressor','BOG compressor route','Toggle BOG compressor'],['vaporizer','LNG vaporizer route','Toggle LNG vaporizer'],['gasValve','Gas delivery valve','Toggle gas valve'],['consumer','Gas consumer demand','Toggle gas consumer'],['bunkering','Bunker transfer','Toggle bunkering'],['vent','Tank vent','Toggle tank vent']];
export function ShipDiagram({manual,values,equipment,esdLatched,onToggle,onEsd,onReset,circuit,derivedCircuit,onCircuitCommand}:ShipDiagramProps){
 const[viewport,setViewport]=useState({width:WIDTH,height:HEIGHT}),[zoom,setZoom]=useState(1),[pane,setPane]=useState<DiagramPane>('fuel');
 const[selected,setSelected]=useState<string|null>(null),[controls,setControls]=useState(false);
 const horizontal=useRef<ScrollView>(null),vertical=useRef<ScrollView>(null),offset=useRef({x:0,y:0}),pending=useRef<{x:number;y:number}|null>(null);
 const fit=Math.max(.01,Math.min(viewport.width/WIDTH,viewport.height/HEIGHT)),scale=fit*zoom,cw=WIDTH*scale,ch=HEIGHT*scale;
 useEffect(()=>{const p=pending.current;if(!p)return;pending.current=null;const id=requestAnimationFrame(()=>{horizontal.current?.scrollTo({x:p.x,animated:false});vertical.current?.scrollTo({y:p.y,animated:false});});return()=>cancelAnimationFrame(id);},[zoom,viewport.width,viewport.height]);
 function fitDiagram(){pending.current={x:0,y:0};offset.current={x:0,y:0};setZoom(1);horizontal.current?.scrollTo({x:0,animated:false});vertical.current?.scrollTo({y:0,animated:false});}
 function changeZoom(multiplier:number){const next=Math.max(1,Math.min(6,zoom*multiplier));if(next===zoom)return;const width=WIDTH*fit*next,height=HEIGHT*fit*next;const x=(offset.current.x+viewport.width/2-Math.max(0,(viewport.width-cw)/2))/cw,y=(offset.current.y+viewport.height/2-Math.max(0,(viewport.height-ch)/2))/ch;pending.current={x:Math.max(0,Math.min(width-viewport.width,x*width-viewport.width/2)),y:Math.max(0,Math.min(height-viewport.height,y*height-viewport.height/2))};setZoom(next);}
 function measure(e:LayoutChangeEvent){const {width,height}=e.nativeEvent.layout;if(width<=0||height<=0||(Math.abs(width-viewport.width)<.5&&Math.abs(height-viewport.height)<.5))return;pending.current={x:0,y:0};offset.current={x:0,y:0};setZoom(1);setViewport({width,height});}
 function scroll(axis:'x'|'y',e:NativeSyntheticEvent<NativeScrollEvent>){offset.current={...offset.current,[axis]:axis==='x'?e.nativeEvent.contentOffset.x:e.nativeEvent.contentOffset.y};}
 function state(id:string):boolean|undefined{return !manual&&circuit&&id in circuit.commands?circuit.commands[id as CircuitControlKey]:undefined;}
 function allocation(id:string):number|undefined{if(manual||!derivedCircuit)return;const f=derivedCircuit.flows,base=id.replace(/Isolation$|Shutoff$/,'');if(base in f.pumps)return f.pumps[base as keyof typeof f.pumps];if(base in f.compressors)return f.compressors[base as keyof typeof f.compressors];if(base in f.vaporizers)return f.vaporizers[base as keyof typeof f.vaporizers];if(id==='meGasValve'||id==='me')return f.delivery.me;if(id==='aeGasValve'||id==='ae')return f.delivery.ae;if(id==='portBunker')return f.bunkering.port;if(id==='starboardBunker')return f.bunkering.starboard;return;}
 function flowing(id:string){if(manual||!derivedCircuit)return false;const f=derivedCircuit.flows;if(id==='pump')return Object.values(f.pumps).some(n=>n>0);if(id==='bog')return Object.values(f.compressors).some(n=>n>0);if(id==='bunker')return f.bunkering.port+f.bunkering.starboard>0;return (allocation(id)??0)>0;}
 const symbols=createSymbols({scale,state,flowing,inspect:setSelected});
 const inspected=selected?equipmentById[selected]:undefined,selectedState=inspected?state(inspected.control??inspected.id):undefined,selectedFlow=inspected?allocation(inspected.id):undefined;
 const disabled=manual||esdLatched;
 function action(title:string,onPress:()=>void,off=false,active=false){return <Pressable key={title} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:off,selected:active}} disabled={off} onPress={onPress} style={[s.button,title==='Activate emergency shutdown'&&{backgroundColor:'#853c4e'},active&&s.active,off&&s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;}
 return <View style={s.root}>
  <View style={s.tabs}>{(Object.keys(paneNames) as DiagramPane[]).map(key=>action(paneNames[key],()=>{setPane(key);fitDiagram();},false,pane===key))}{action('Plant controls',()=>setControls(true))}</View>
  <View style={s.tools}>
   {action('Zoom out',()=>changeZoom(1/1.3),zoom<=1)}{action('Zoom in',()=>changeZoom(1.3),zoom>=6)}{action('Fit diagram',fitDiagram)}
   <Text style={s.small}>{Math.round(zoom*100)}% · scroll to pan</Text>
   <Text style={[s.status,{color:manual?c.muted:esdLatched?'#ff9191':c.green}]}>{manual?'MANUAL OBSERVATIONS':esdLatched?'ESD LATCHED':'ESD NORMAL'}</Text>
  </View>
  <View testID="diagram-viewport" onLayout={measure} style={s.viewport}>
   <ScrollView ref={horizontal} horizontal nestedScrollEnabled bounces={false} style={{flex:1}} contentContainerStyle={{minWidth:viewport.width}} onScroll={e=>scroll('x',e)} scrollEventThrottle={16} showsHorizontalScrollIndicator={cw>viewport.width+1}>
    <ScrollView ref={vertical} nestedScrollEnabled bounces={false} style={{width:Math.max(viewport.width,cw),height:viewport.height}} contentContainerStyle={{height:Math.max(viewport.height,ch),alignItems:'center',justifyContent:'center'}} onScroll={e=>scroll('y',e)} scrollEventThrottle={16} showsVerticalScrollIndicator={ch>viewport.height+1}>
     <View testID="ship-diagram-canvas" style={{width:cw,height:ch,backgroundColor:c.background,overflow:'hidden'}}>
      <View pointerEvents="none" style={{...symbols.frame(0,0,WIDTH,28),backgroundColor:'#858287'}}/>
      {symbols.label('Automation · CMA CGM BELEM',15,5,500,12)}
      {symbols.label(manual?'MANUAL · observed values only':'TRAINING · source-connected routes',760,5,500,12,manual?c.muted:c.green,'right')}
      {renderPane(pane,symbols,values,manual,manual?undefined:derivedCircuit)}
     </View>
    </ScrollView>
   </ScrollView>
  </View>
  <View style={s.footer}>
   <Text style={s.small}>Orange liquid · yellow gas · green request on/open · magenta off/closed · grey unknown</Text>
   {action('Activate emergency shutdown',onEsd,manual||esdLatched)}{action('Reset emergency shutdown',onReset,manual||!esdLatched)}
  </View>
  <Modal visible={!!inspected} transparent animationType="fade" onRequestClose={()=>setSelected(null)}>
   <View style={s.shade}><View testID="equipment-inspector" style={s.sheet}>
    <View style={s.sheetHeader}><Text style={s.heading}>{inspected?.tag}</Text>{action('Close inspector',()=>setSelected(null))}</View>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{padding:16}}>
     <Text style={s.title}>{inspected?.title}</Text><Text style={s.body}>{inspected?.detail}</Text>
     <Text style={s.source}>Source: {inspected?.source}</Text>
     <Text style={s.body}>Command: {selectedState===undefined?'NOT RECORDED / NOT MODELED':selectedState?'ON / OPEN':'OFF / CLOSED'}</Text>
     {selectedFlow!==undefined&&<Text testID="branch-flow" style={s.flow}>Training allocation: {selectedFlow.toFixed(3)} kg/h</Text>}
     {inspected?.control&&<Text style={s.body}>A start/open request does not guarantee flow. Required isolations, a connected route, pressure and inventory must permit transfer. Values are model allocations; individual instrument feedback is unknown.</Text>}
     {!inspected?.control&&<Text style={s.body}>Reference view only: this component has no independent operating model or measured feedback.</Text>}
    </ScrollView>
    <View style={s.sheetActions}>{inspected?.control&&action(`Toggle ${inspected.tag}`,()=>onCircuitCommand?.({type:'circuit-toggle',control:inspected.control!}),disabled||!onCircuitCommand)}{manual&&<Text style={s.small}>Manual observations are read-only.</Text>}</View>
   </View></View>
  </Modal>
  <Modal visible={controls} transparent animationType="fade" onRequestClose={()=>setControls(false)}>
   <View style={s.shade}><View testID="plant-controls" style={s.sheet}>
    <View style={s.sheetHeader}><Text style={s.heading}>FGSS PLANT CONTROL</Text>{action('Close controls',()=>setControls(false))}</View>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{padding:14}}>
     <Text style={s.body}>Training route presets · selected individual branches appear on the mimic. Aggregate ON opens one representative route. OFF stops that equipment group.</Text>
     <View style={s.controlGrid}>{aggregate.map(([key,title,label])=><Pressable key={key} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{disabled}} onPress={()=>onToggle(key)} style={[s.aggregate,disabled&&s.disabled]}><Text style={s.body}>{title}</Text><Text style={{color:manual?c.muted:equipment[key]?c.green:c.magenta,fontWeight:'700'}}>{manual?'NOT RECORDED':equipment[key]?'ON / OPEN':'OFF / CLOSED'}</Text></Pressable>)}</View>
     <Text style={s.title}>Individual fuel-pump / BOG / vaporizer branches</Text>
     <View style={s.controlGrid}>{sourceEquipment.filter(e=>e.kind==='machine'&&e.control).map(e=><Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`Branch details ${e.tag}`} onPress={()=>{setControls(false);setSelected(e.id);}} style={s.aggregate}><Text style={s.body}>{e.tag} · {e.title}</Text><Text style={{color:state(e.id)===undefined?c.muted:state(e.id)?c.green:c.magenta}}>{state(e.id)===undefined?'NOT RECORDED':state(e.id)?'START REQUEST ON':'STOPPED'}</Text></Pressable>)}</View>
     <Text style={s.title}>Circuit routes</Text><View style={s.controlGrid}>{sourceEquipment.filter(e=>e.kind==='route').map(e=>action(e.tag,()=>{setControls(false);setSelected(e.id);} ))}</View>
     <Text style={s.body}>ME / AE branches share one training-buffer inventory. Bunker station arm valves, vapour-return thermodynamics, glycol utilities and vendor IGPR feedback are reference-only.</Text>
    </ScrollView>
   </View></View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,minHeight:220,backgroundColor:'#292a2c'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:5,padding:6,backgroundColor:'#666168'},tools:{flexDirection:'row',flexWrap:'wrap',gap:5,padding:5,alignItems:'center',backgroundColor:'#4b4a50'},button:{minHeight:38,minWidth:44,paddingHorizontal:10,paddingVertical:8,justifyContent:'center',alignItems:'center',backgroundColor:'#686773',borderWidth:1,borderColor:'#aaa6b1'},buttonText:{color:'#fff',fontSize:11,fontWeight:'600'},active:{backgroundColor:'#48632f'},disabled:{opacity:.45},small:{color:c.muted,fontSize:10,lineHeight:16},status:{fontSize:11,fontWeight:'700',marginLeft:'auto'},viewport:{flex:1,overflow:'hidden',backgroundColor:'#242528'},footer:{padding:6,flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center',backgroundColor:'#424146'},shade:{flex:1,backgroundColor:'#0009',padding:14,justifyContent:'center',alignItems:'center'},sheet:{width:'100%',maxWidth:650,maxHeight:'88%',backgroundColor:'#46464c',borderWidth:1,borderColor:'#c2bdc7'},sheetHeader:{padding:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,borderBottomWidth:1,borderColor:'#939099'},heading:{fontSize:16,fontWeight:'700',color:c.green,flexShrink:1},title:{fontSize:15,fontWeight:'700',color:'#eee',marginVertical:10},body:{fontSize:13,color:'#eee',lineHeight:20,marginBottom:10},source:{fontSize:12,color:'#cbd8b0',lineHeight:20,marginBottom:16},sheetActions:{padding:12,borderTopWidth:1,borderColor:'#939099',gap:6},flow:{fontSize:18,color:c.green,fontWeight:'700',marginBottom:14},controlGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:15},aggregate:{minWidth:180,flexGrow:1,padding:12,borderWidth:1,borderColor:'#96929c',backgroundColor:'#38383c'}});
