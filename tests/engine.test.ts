import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlant,metrics,advancePlant,commandPlant,resetPlant} from '../src/engine/lng';
import type {PlantState,EquipmentKey,PlantConfig} from '../src/engine/lng';
const close=(a:number,b:number,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
const on=(s:PlantState,...keys:EquipmentKey[])=>keys.reduce((n,equipment)=>n.equipment[equipment]?n:commandPlant(n,{type:'toggle',equipment}),s);
function rebase(s:PlantState){s.ledger={initialMassKg:s.tank.liquidMassKg+s.tank.gasMassKg+s.buffer.massKg,bunkeredKg:0,consumedKg:0,ventedKg:0};return s;}
test('initial pressure agrees with an independent ideal-methane gas calculation',()=>{
  const s=createPlant(),m=metrics(s),gasPa=s.tank.gasMassKg*(8.314462618/0.016043)*(s.tank.temperatureC+273.15)/(s.cfg.capacityM3-m.tankVolumeM3);
  close(m.tankPressureBarg,(gasPa-101325)/100000);close(m.tankPressureBarg,0.3);close(m.bufferPressureBarg,0);close(m.massResidualKg,0);
});
test('passive heat creates the latent-heat boiloff amount without creating fuel mass',()=>{
  const a=createPlant(),b=advancePlant(a,3600),boiled=a.cfg.heatIngressKw*3600/510;
  close(a.tank.liquidMassKg-b.tank.liquidMassKg,boiled);close(b.tank.gasMassKg-a.tank.gasMassKg,boiled);close(metrics(b).massResidualKg,0,1e-5);assert.ok(metrics(b).tankPressureBarg>metrics(a).tankPressureBarg);
});
test('pump requires its vaporizer and closed product valve prevents consumer delivery',()=>{
  let a=commandPlant(on(createPlant(),'pump','consumer'),{type:'settings',values:{heatIngressKw:0}}),b=advancePlant(a,60);close(b.lastFlows.pumpedKgh,0);close(b.lastFlows.deliveredKgh,0);
  a=on(a,'vaporizer');b=advancePlant(a,60);assert.ok(b.lastFlows.pumpedKgh>0);close(b.lastFlows.deliveredKgh,0);assert.ok(metrics(b).bufferPressureBarg>0);
  b=advancePlant(on(b,'gasValve'),60);assert.ok(b.lastFlows.deliveredKgh>0);close(metrics(b).massResidualKg,0,1e-5);
});
test('compressor draws tank gas and has priority over supplemental liquid supply',()=>{
  const a=on(createPlant(),'compressor','pump','vaporizer','consumer','gasValve'),b=advancePlant(a,3600);
  assert.ok(b.lastFlows.compressedKgh>0);assert.ok(b.lastFlows.pumpedKgh>0);assert.ok(b.lastFlows.deliveredKgh>0);close(metrics(b).massResidualKg,0,1e-5);
  assert.ok(metrics(b).bufferPressureBarg<=a.cfg.pumpDischargeBarg+1e-6);
});
test('bunkering and venting close the external mass ledger and respect capacity',()=>{
  const a=commandPlant(on(createPlant(),'bunkering','vent','consumer','pump','vaporizer','gasValve'),{type:'settings',values:{bunkerFlowM3h:10000}}),b=advancePlant(a,3600);
  assert.ok(b.ledger.bunkeredKg>0);assert.ok(b.ledger.ventedKg>0);assert.ok(b.ledger.consumedKg>0);assert.ok(metrics(b).tankVolumeM3<=b.cfg.capacityM3*0.999+1e-6);close(metrics(b).massResidualKg,0,1e-4);
});
test('finite liquid inventory is depleted without negative mass or fabricated delivery',()=>{
  let a=commandPlant(createPlant(),{type:'settings',values:{heatIngressKw:0,consumerMinimumBarg:0}});a.tank.liquidMassKg=0.1;a=rebase(a);
  const b=advancePlant(on(a,'pump','vaporizer','consumer','gasValve'),120);close(b.tank.liquidMassKg,0);close(b.ledger.consumedKg,0.1);assert.ok(b.tank.gasMassKg>=0);assert.ok(b.buffer.massKg>=0);close(metrics(b).massResidualKg,0);
});
test('ESD latches immediately; reset releases it without restarting equipment',()=>{
  const running=advancePlant(on(createPlant(),'pump','vaporizer','compressor','consumer','gasValve','bunkering','vent'),120),trip=commandPlant(running,{type:'esd'});
  assert.ok(trip.esdLatched);assert.ok(Object.values(trip.equipment).every(v=>!v));assert.throws(()=>commandPlant(trip,{type:'toggle',equipment:'pump'}),/Reset ESD/);
  const stopped=advancePlant(trip,600);close(stopped.ledger.bunkeredKg,trip.ledger.bunkeredKg);close(stopped.ledger.consumedKg,trip.ledger.consumedKg);close(stopped.ledger.ventedKg,trip.ledger.ventedKg);assert.ok(stopped.lastFlows.boiloffKgh>0);
  const reset=commandPlant(stopped,{type:'reset-esd'});assert.equal(reset.esdLatched,false);assert.ok(Object.values(reset.equipment).every(v=>!v));close(advancePlant(reset,60).lastFlows.deliveredKgh,0);close(metrics(reset).massResidualKg,0,1e-5);
});
test('substeps are deterministic and input snapshots remain unchanged',()=>{
  const a=on(createPlant(),'compressor','pump','vaporizer','consumer','gasValve'),snapshot=JSON.stringify(a),one=advancePlant(a,120),two=advancePlant(advancePlant(a,60),60);
  close(one.tank.liquidMassKg,two.tank.liquidMassKg);close(one.tank.gasMassKg,two.tank.gasMassKg);close(one.buffer.massKg,two.buffer.massKg);close(one.ledger.consumedKg,two.ledger.consumedKg);assert.equal(JSON.stringify(a),snapshot);
  close(advancePlant(a,0.125).elapsedSeconds,0.125);assert.notEqual(resetPlant(),resetPlant());
});
test('invalid configuration and commands fail before changing the original state',()=>{
  const s=createPlant(),snapshot=JSON.stringify(s);
  for(const seconds of [0,-1,Infinity,NaN,86401])assert.throws(()=>advancePlant(s,seconds));
  for(const values of [{densityKgM3:0},{demandKgh:NaN},{capacityM3:10},{bufferVolumeM3:-1},{liquidTemperatureC:-273.15},{unknown:1}])assert.throws(()=>commandPlant(s,{type:'settings',values:values as Partial<PlantConfig>}));
  for(const key of ['constructor','toString','hasOwnProperty','__proto__']){
    const values=JSON.parse(`{"${key}":123}`) as Partial<PlantConfig>;
    assert.throws(()=>commandPlant(s,{type:'settings',values}),/Unknown training setting/);
    assert.throws(()=>advancePlant({...s,cfg:{...s.cfg,...values}},1),/Unknown training setting/);
  }
  assert.throws(()=>commandPlant(s,{type:'toggle',equipment:'unknown' as EquipmentKey}));assert.equal(JSON.stringify(s),snapshot);
});
