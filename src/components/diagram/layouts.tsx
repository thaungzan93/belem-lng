import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {Symbols} from './symbols';
import {mimicColors as c} from './symbols';
import type {FuelCircuitDerived} from '../../engine/fuelCircuit';

export type DiagramPane = 'fuel' | 'bunkering' | 'igpr';
export interface DiagramValues {tankVolumeM3?:number;tankPressureBarg?:number;bufferPressureBarg?:number;gasFlowKgh?:number;temperatureC?:number}
export const paneNames:Record<DiagramPane,string>={fuel:'Fuel overview',bunkering:'Bunker stations',igpr:'ME IGPR'};
const reading=(n:number|undefined,unit:string,digits=1)=>n===undefined?'—':`${n.toFixed(digits)} ${unit}`;

/** Geometry is a readable HMI reconstruction; source tags/topology are registered separately. */
export function renderPane(pane:DiagramPane,s:Symbols,values:DiagramValues,manual:boolean,derived?:FuelCircuitDerived){
 const {label,line,readout,valve,machine,vessel,terminal,box,joint}=s;
 const flow=(n:number|undefined)=>manual?'—':reading(n,'kg/h',0);
 if(pane==='fuel')return <View testID="source-pane-fuel" style={StyleSheet.absoluteFill} pointerEvents="box-none">
  {label('FGSS — FUEL GAS SUPPLY',380,35,520,22,c.green,'center')}
  {label('H1843 · source topology / training operation',420,67,440,11,c.muted,'center')}
  {/* Common tank suction, parallel BOG compressor branches and hot-gas header. */}
  {line([[70,500],[70,120],[80,120]],'gas','bog')}
  {line([[150,120],[185,120],[185,370]],'gas','bog')}
  {line([[185,190],[270,190]],'gas','compressor1')}
  {line([[185,370],[270,370]],'gas','compressor2')}
  {line([[360,190],[500,190],[500,115],[940,115],[940,190],[980,190]],'gas','bog')}
  {line([[360,370],[500,370],[500,190]],'gas','compressor2')}
  {vessel('knockout','23VD5501','BOG K.O. DRUM',80,70,70,105)}
  {valve('compressor1Isolation','23V5509',225,190)}
  {valve('compressor2Isolation','23V5510',225,370)}
  {machine('compressor1','23KB5501','BOG COMPRESSOR 1',270,160,'compressor')}
  {machine('compressor2','23KB5502','BOG COMPRESSOR 2',270,340,'compressor')}
  {readout('MODEL ALLOCATION',flow(derived?.flows.compressors.compressor1),370,250,125)}
  {readout('MODEL ALLOCATION',flow(derived?.flows.compressors.compressor2),370,430,125)}
  {box('COLD GLYCOL',260,70,190,50,true)}
  {line([[315,120],[315,155]],'glycol')}
  {label('54PA0201 / 0202 · state —',265,90,180,10,c.muted,'center')}
  {/* Four independent pump discharge branches meet one liquid header. */}
  {line([[100,470],[600,470],[600,190],[650,190]],'liquid','pump')}
  {line([[600,370],[650,370]],'liquid','pump')}{s.arrow(550,470,'right','liquid')}{s.arrow(600,430,'up','liquid')}{s.arrow(875,115,'right','gas')}
  <View style={{...s.frame(45,500,450,235),backgroundColor:'#6b6b70',borderWidth:1,borderColor:'#aaa9ad',borderRadius:6}} pointerEvents="none"/>
  {label('LNG FUEL TANK',160,575,230,18,c.text,'center')}
  {readout('TANK PRESSURE',reading(values.tankPressureBarg,'bar(g)',3),57,695,135)}
  {readout('LIQUID VOLUME',reading(values.tankVolumeM3,'m³',0),200,695,135)}
  {readout('LNG TEMP.',reading(values.temperatureC,'°C'),343,695,135)}
  {[1,2,3,4].map(n=>{const x=100+(n-1)*110;return <React.Fragment key={n}>
   {line([[x,635],[x,470]],'liquid',`pump${n}`)}
   {joint(x,470,'liquid')}
   {valve(`pump${n}Isolation`,`45HV101${n}`,x,555,true)}
   {valve(`pump${n}Shutoff`,`45FV100${n}`,x,510,true)}
   {machine(`pump${n}`,`45PS100${n}`,`FUEL PUMP ${n}`,x-35,610,'pump',70,50)}
  </React.Fragment>;})}
  {/* The LNG vaporizer and NG heater trains are parallel, never series with each other. */}
  {line([[740,190],[820,190]],'gas','vaporizer1')}
  {line([[910,190],[980,190]],'gas','vaporizer1')}
  {line([[740,370],[820,370]],'gas','vaporizer2')}
  {line([[910,370],[940,370],[940,190]],'gas','vaporizer2')}
  {valve('vaporizer1Isolation','45HV6001',625,190)}
  {valve('vaporizer2Isolation','45HV6002',625,370)}
  {machine('vaporizer1','45HA6001','LNG VAPORIZER 1',650,160,'exchanger')}
  {machine('vaporizer2','45HA6002','LNG VAPORIZER 2',650,340,'exchanger')}
  {machine('heater1','45HA6501','NG HEATER 1',820,160,'exchanger')}
  {machine('heater2','45HA6502','NG HEATER 2',820,340,'exchanger')}
  {readout('MODEL ALLOCATION',flow(derived?.flows.vaporizers.vaporizer1),675,250,125)}
  {readout('MODEL ALLOCATION',flow(derived?.flows.vaporizers.vaporizer2),675,430,125)}
  {box('HOT GLYCOL',650,500,250,55,true)}
  {label('53PA0201 / 0202 · utility state —',657,525,235,10,c.muted,'center')}
  {/* AE supply leaves the ME-buffer supply through its pressure-reducing train. */}
  {line([[1075,220],[1210,220]],'gas','me')}
  {line([[1028,300],[1028,380],[1140,380]],'gas','ae')}
  {line([[1185,480],[1185,580]],'gas','ae')}
  {vessel('meBuffer','45VA6501','M/E BUFFER',980,140,95,160)}
  {vessel('aeBuffer','45VA6502','A/E BUFFER',1140,345,90,135)}
  {valve('meGasValve','45HV6503',1120,220)}
  {valve('aeGasValve','45HV6504',1185,530,true)}
  {valve('aeReducing','45PV6501 / 6502',1090,380)}
  {terminal('me','MAIN ENGINE',1210,220,'gas')}
  {terminal('ae','AUXILIARY ENGINES',1185,580,'gas',true)}
  {readout(manual?'M/E OBSERVATION':'SHARED MODEL BUFFER',reading(values.bufferPressureBarg,'bar(g)',2),970,620,270)}
  {readout('GAS DELIVERY',reading(values.gasFlowKgh,'kg/h',0),1000,665,210)}
  {label('A/E pressure — · independent inventory not modeled',950,565,220,10,c.muted,'center')}
  {/* Free-flow source is a separate off-page connection, not the pressure-buffer outlet. */}
  {line([[600,690],[910,690]],'gas')}
  {terminal('boiler','BOILER / FREE FLOW',910,690,'gas')}
  {valve('boilerReducing','45PV6530',770,690)}
  {label('OFF-PAGE FREE FLOW · 1749054',530,710,300,10,c.muted)}
  {label('Flow values = training allocations. Unknown instruments: —',530,755,700,12,c.muted,'right')}
 </View>;
 if(pane==='bunkering')return <View testID="source-pane-bunkering" style={StyleSheet.absoluteFill} pointerEvents="box-none">
  {label('1.3 BUNKER STATION',390,35,500,22,c.green,'center')}
  {box('VACUUM D.W. PIPE',60,90,650,138)}
  {['SR8 VAPORIZER','SR9 BOG KOD','SR10 CLOSED DRAIN','SR11 NG HEATER','SR12 EMERGENCY HEATER','SR13 BOG COMP.','SR14 VENT MAST','SR15 LIQUID','SR16 HOT GAS / VAP.','SR17 CLOSE DRAIN'].map((tag,i)=>readout(tag,'—',75+(i%5)*125,125+Math.floor(i/5)*45,115))}
  {line([[320,740],[320,390],[1185,390],[1185,255]],'liquid','bunker')}
  {line([[875,255],[875,390]],'liquid','portBunker')}
  {line([[320,675],[1185,675],[1185,510]],'liquid','starboardBunker')}
  {line([[875,510],[875,675]],'liquid','starboardBunker')}
  {line([[420,740],[420,425],[1030,425],[1030,255]],'gas')}
  {line([[420,710],[1030,710],[1030,510]],'gas')}
  {line([[120,740],[120,610],[420,610]],'gas')}
  {line([[220,740],[220,260],[760,260],[760,330]],'liquid')}
  {label('PORT SIDE BUNKERING STATION',795,180,430,15,c.text,'center')}
  {label('STARBOARD SIDE BUNKERING STATION',795,455,430,15,c.text,'center')}
  {(['port','starboard'] as const).map(side=>{const y=side==='port'?255:510;return <React.Fragment key={side}>
   {label('LIQUID',830,y-33,90,11,c.text,'center')}{label('VAPOUR',985,y-33,90,11,c.text,'center')}{label('LIQUID',1140,y-33,90,11,c.text,'center')}
   {valve(`${side}Liquid1`,side==='port'?'45HV7401':'45HV7301',875,y+65)}
   {valve(`${side}Vapour`,side==='port'?'23HV7201':'23HV7101',1030,y+65)}
   {valve(`${side}Liquid2`,side==='port'?'45HV7201':'45HV7101',1185,y+65)}
   {readout('PRESS. / TEMP.','—',835,y+90,80)}{readout('PRESS. / TEMP.','—',990,y+90,80)}{readout('PRESS. / TEMP.','—',1145,y+90,80)}
  </React.Fragment>;})}
  {joint(875,390,'liquid')}{joint(320,675,'liquid')}{joint(420,710,'gas')}
  {readout('MODEL PORT TRANSFER',flow(derived?.flows.bunkering.port),475,300,210)}
  {readout('MODEL STBD TRANSFER',flow(derived?.flows.bunkering.starboard),475,565,210)}
  {terminal('bunkerShutoff','LIQUID TO TANK',320,740,'liquid',true)}
  {terminal('igpr','VAPOUR RETURN',420,740,'gas',true)}
  {terminal('igpr','CLOSED DRAIN',220,740,'liquid',true)}
  {terminal('igpr','HOT GAS / VAP. RETURN',120,740,'gas',true)}
  {label('Station arm valves / vacuum feedback are unknown. Use route controls for training transfer.',480,755,770,11,c.muted,'right')}
 </View>;
 return <View testID="source-pane-igpr" style={StyleSheet.absoluteFill} pointerEvents="box-none">
  {label('iGPR Overview',430,35,440,23,c.green,'center')}
  {box('M/E BUFFER TANK · 45VA6501',75,280,235,110)}
  {readout(manual?'OBSERVED PRESSURE':'INDEPENDENT PRESSURE',manual?reading(values.bufferPressureBarg,'bar(g)',2):'—',95,320,195)}
  {readout('TEMPERATURE','—',95,360,195)}
  {readout('ME RPM','—',520,100,145)}{readout('ME LOAD','—',700,100,145)}
  {box('ME GAS MODE',960,100,230,110)}
  {label('Status not observed',980,145,190,15,c.muted,'center')}
  {line([[120,450],[1160,450]],'gas','me')}
  {line([[400,450],[400,340]],'gas')}{line([[470,450],[470,340]],'gas')}{line([[800,450],[800,340]],'gas')}
  {label('N2',375,310,50,12,c.text,'center')}{label('VENT',445,310,60,12,c.text,'center')}{label('VENT',775,310,60,12,c.text,'center')}
  {valve('igpr','N2 / VENT',400,400,true)}
  {valve('meGasValve','45HV6503',300,450)}
  {valve('igpr','M/E SHUT-OFF V/V',550,450)}
  {valve('igpr','REGULATING VALVE',800,450)}
  {machine('igpr','IGPR','MAIN ENGINE',930,385,'engine',145,130)}
  {readout('SOURCE PRESSURE','—',490,500,130)}{readout('OUTLET PRESSURE','—',670,500,130)}
  {readout('GAS DELIVERY',reading(values.gasFlowKgh,'kg/h',0),875,535,220)}
  {box('ME FGSS STATUS INFO',110,605,470,115)}
  {label('Gas mode / transfer / vent conditions: —',130,640,430,16,c.muted)}
  {label('Engine protection and piston feedback: —',130,677,430,13,c.muted)}
  {readout('SHARED TRAINING BUFFER',manual?'—':reading(values.bufferPressureBarg,'bar(g)',2),700,640,390)}
  {label('Photo HMI-962 · vendor internal control / feedback not modeled',480,755,760,12,c.muted,'right')}
 </View>;
}
