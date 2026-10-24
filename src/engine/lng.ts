/** Pure-methane training model. Every default is an editable assumption, not an OEM setting. */
const ATM = 101325, R_CH4 = 8.314462618 / 0.016043, LATENT_KJ_KG = 510;
export const equipmentKeys = ['pump','compressor','vaporizer','gasValve','consumer','bunkering','vent'] as const;
export type EquipmentKey = typeof equipmentKeys[number];
export interface PlantConfig {
  capacityM3:number; densityKgM3:number; heatIngressKw:number; demandKgh:number;
  pumpFlowM3h:number; compressorKgh:number; bunkerFlowM3h:number;
  liquidTemperatureC:number; bufferVolumeM3:number; consumerMinimumBarg:number;
  pumpDischargeBarg:number; compressorDischargeBarg:number; ventKgh:number;
}
export interface PlantFlows {boiloffKgh:number;pumpedKgh:number;compressedKgh:number;deliveredKgh:number;bunkeredKgh:number;ventedKgh:number}
export interface PlantState {
  cfg:PlantConfig; equipment:Record<EquipmentKey,boolean>;
  tank:{liquidMassKg:number;gasMassKg:number;temperatureC:number};
  buffer:{massKg:number;temperatureC:number;volumeM3:number};
  elapsedSeconds:number;esdLatched:boolean;events:string[];lastFlows:PlantFlows;
  ledger:{initialMassKg:number;bunkeredKg:number;consumedKg:number;ventedKg:number};
}
export type PlantCommand = {type:'toggle';equipment:EquipmentKey}|{type:'esd'}|{type:'reset-esd'}|{type:'settings';values:Partial<PlantConfig>};
const zeroFlows=():PlantFlows=>({boiloffKgh:0,pumpedKgh:0,compressedKgh:0,deliveredKgh:0,bunkeredKgh:0,ventedKgh:0});
const gasMass=(pBarg:number,tC:number,volume:number)=>(pBarg*1e5+ATM)*volume/(R_CH4*(tC+273.15));
const pressure=(mass:number,tC:number,volume:number)=>(mass*R_CH4*(tC+273.15)/volume-ATM)/1e5;
const ullageMinimum=(cfg:PlantConfig)=>Math.max(0.01,cfg.capacityM3*0.001);
function clone(s:PlantState):PlantState {return {...s,cfg:{...s.cfg},equipment:{...s.equipment},tank:{...s.tank},buffer:{...s.buffer},events:[...s.events],lastFlows:{...s.lastFlows},ledger:{...s.ledger}};}
function event(s:PlantState,message:string){s.events.unshift(`${s.elapsedSeconds.toFixed(0)} s · ${message}`);s.events=s.events.slice(0,120);}
const ranges:Record<keyof PlantConfig,[number,number]>={capacityM3:[1,100000],densityKgM3:[300,600],heatIngressKw:[0,10000],demandKgh:[0,100000],pumpFlowM3h:[0,10000],compressorKgh:[0,100000],bunkerFlowM3h:[0,10000],liquidTemperatureC:[-170,-120],bufferVolumeM3:[0.01,1000],consumerMinimumBarg:[0,50],pumpDischargeBarg:[0,50],compressorDischargeBarg:[0,50],ventKgh:[0,100000]};
function validateConfig(cfg:PlantConfig){if(Object.keys(cfg).some(k=>!(k in ranges)))throw new Error('Unknown training setting');for(const key of Object.keys(ranges) as (keyof PlantConfig)[]){const value=cfg[key],range=ranges[key];if(!range||!Number.isFinite(value)||value<range[0]||value>range[1])throw new Error(`Invalid ${key}: enter ${range?.[0]??'a supported'}–${range?.[1]??'value'}`);}}
export function createPlant():PlantState {
  const cfg:PlantConfig={capacityM3:14000,densityKgM3:450,heatIngressKw:40,demandKgh:500,pumpFlowM3h:8,compressorKgh:300,bunkerFlowM3h:50,liquidTemperatureC:-160,bufferVolumeM3:10,consumerMinimumBarg:0.2,pumpDischargeBarg:15,compressorDischargeBarg:15,ventKgh:1000};
  const liquidVolume=cfg.capacityM3*0.6;
  const s:PlantState={cfg,equipment:{pump:false,compressor:false,vaporizer:false,gasValve:false,consumer:false,bunkering:false,vent:false},tank:{liquidMassKg:liquidVolume*cfg.densityKgM3,gasMassKg:gasMass(0.3,cfg.liquidTemperatureC,cfg.capacityM3-liquidVolume),temperatureC:cfg.liquidTemperatureC},buffer:{massKg:gasMass(0,30,cfg.bufferVolumeM3),temperatureC:30,volumeM3:cfg.bufferVolumeM3},elapsedSeconds:0,esdLatched:false,events:['0 s · Training plant initialized; all equipment stopped'],lastFlows:zeroFlows(),ledger:{initialMassKg:0,bunkeredKg:0,consumedKg:0,ventedKg:0}};
  s.ledger.initialMassKg=s.tank.liquidMassKg+s.tank.gasMassKg+s.buffer.massKg;return s;
}
export const resetPlant=createPlant;
export function metrics(s:PlantState){
  const tankVolumeM3=s.tank.liquidMassKg/s.cfg.densityKgM3,totalMassKg=s.tank.liquidMassKg+s.tank.gasMassKg+s.buffer.massKg;
  return {tankVolumeM3,tankPressureBarg:pressure(s.tank.gasMassKg,s.tank.temperatureC,s.cfg.capacityM3-tankVolumeM3),bufferPressureBarg:pressure(s.buffer.massKg,s.buffer.temperatureC,s.buffer.volumeM3),liquidMassKg:s.tank.liquidMassKg,gasMassKg:s.tank.gasMassKg,totalMassKg,massResidualKg:totalMassKg-s.ledger.initialMassKg-s.ledger.bunkeredKg+s.ledger.consumedKg+s.ledger.ventedKg,deliveredKgh:s.lastFlows.deliveredKgh};
}
export function commandPlant(previous:PlantState,command:PlantCommand):PlantState {
  const s=clone(previous);s.lastFlows=zeroFlows();
  if(command.type==='toggle'){
    if(!equipmentKeys.includes(command.equipment))throw new Error('Unknown equipment');
    if(s.esdLatched)throw new Error('Reset ESD before issuing equipment commands');
    s.equipment[command.equipment]=!s.equipment[command.equipment];event(s,`${command.equipment} ${s.equipment[command.equipment]?'ON':'OFF'}`);
  }else if(command.type==='esd'){
    s.esdLatched=true;for(const key of equipmentKeys)s.equipment[key]=false;event(s,'ESD latched: fuel transfer, bunkering and commanded vent stopped');
  }else if(command.type==='reset-esd'){
    s.esdLatched=false;event(s,'ESD reset; equipment remains stopped. Start each required item explicitly.');
  }else if(command.type==='settings'){
    const cfg={...s.cfg,...command.values};validateConfig(cfg);
    if(s.tank.liquidMassKg/cfg.densityKgM3>cfg.capacityM3-ullageMinimum(cfg))throw new Error('Settings leave insufficient model ullage; reduce inventory first');
    s.cfg=cfg;s.tank.temperatureC=cfg.liquidTemperatureC;s.buffer.volumeM3=cfg.bufferVolumeM3;event(s,'Training settings updated');
  }else throw new Error('Unknown plant command');
  return s;
}
export function advancePlant(previous:PlantState,seconds:number):PlantState {
  if(!Number.isFinite(seconds)||seconds<=0||seconds>86400)throw new Error('Advance must be >0 and ≤86400 seconds');
  validateConfig(previous.cfg);const s=clone(previous),totals=zeroFlows();
  for(let remaining=seconds;remaining>0;){
    const dt=Math.min(1,remaining),hours=dt/3600,flow=zeroFlows();
    // Fixed-temperature phase change consumes the assumed latent heat; liquid-to-gas transfer is internal.
    const boiled=Math.min(s.tank.liquidMassKg,s.cfg.heatIngressKw*dt/LATENT_KJ_KG);
    s.tank.liquidMassKg-=boiled;s.tank.gasMassKg+=boiled;flow.boiloffKgh=boiled/hours;
    if(!s.esdLatched){
      if(s.equipment.bunkering){const room=Math.max(0,(s.cfg.capacityM3-ullageMinimum(s.cfg))*s.cfg.densityKgM3-s.tank.liquidMassKg),incoming=Math.min(room,s.cfg.bunkerFlowM3h*s.cfg.densityKgM3*hours);s.tank.liquidMassKg+=incoming;s.ledger.bunkeredKg+=incoming;flow.bunkeredKgh=incoming/hours;}
      if(s.equipment.compressor){const room=Math.max(0,gasMass(s.cfg.compressorDischargeBarg,s.buffer.temperatureC,s.buffer.volumeM3)-s.buffer.massKg),ullage=s.cfg.capacityM3-s.tank.liquidMassKg/s.cfg.densityKgM3,available=Math.max(0,s.tank.gasMassKg-gasMass(0,s.tank.temperatureC,ullage)),mass=Math.min(room,available,s.cfg.compressorKgh*hours);s.tank.gasMassKg-=mass;s.buffer.massKg+=mass;flow.compressedKgh=mass/hours;}
      if(s.equipment.pump&&s.equipment.vaporizer){const room=Math.max(0,gasMass(s.cfg.pumpDischargeBarg,s.buffer.temperatureC,s.buffer.volumeM3)-s.buffer.massKg),mass=Math.min(room,s.tank.liquidMassKg,s.cfg.pumpFlowM3h*s.cfg.densityKgM3*hours);s.tank.liquidMassKg-=mass;s.buffer.massKg+=mass;flow.pumpedKgh=mass/hours;}
      if(s.equipment.consumer&&s.equipment.gasValve){const available=Math.max(0,s.buffer.massKg-gasMass(s.cfg.consumerMinimumBarg,s.buffer.temperatureC,s.buffer.volumeM3)),mass=Math.min(available,s.cfg.demandKgh*hours);s.buffer.massKg-=mass;s.ledger.consumedKg+=mass;flow.deliveredKgh=mass/hours;}
      if(s.equipment.vent){const ullage=s.cfg.capacityM3-s.tank.liquidMassKg/s.cfg.densityKgM3,available=Math.max(0,s.tank.gasMassKg-gasMass(0,s.tank.temperatureC,ullage)),mass=Math.min(available,s.cfg.ventKgh*hours);s.tank.gasMassKg-=mass;s.ledger.ventedKg+=mass;flow.ventedKgh=mass/hours;}
    }
    for(const key of Object.keys(totals) as (keyof PlantFlows)[])totals[key]+=flow[key]*dt;
    s.elapsedSeconds+=dt;remaining-=dt;
  }
  for(const key of Object.keys(totals) as (keyof PlantFlows)[])totals[key]/=seconds;
  s.lastFlows=totals;return s;
}
