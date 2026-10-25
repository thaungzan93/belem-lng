import test from 'node:test';
import assert from 'node:assert/strict';
import {metrics, advancePlant, createPlant, commandPlant} from '../src/engine/lng';
import type {EquipmentKey} from '../src/engine/lng';
import {
  createCircuit, commandCircuit, advanceCircuitPlant, deriveFuelCircuit, effectiveEquipment,
  circuitControlKeys, pumpIds, compressorIds, vaporizerIds,
} from '../src/engine/fuelCircuit';
import type {CircuitControlKey, CircuitPlantState, FuelCircuitFlows} from '../src/engine/fuelCircuit';

const close = (a: number, b: number, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const on = (s: CircuitPlantState, ...controls: CircuitControlKey[]) => controls.reduce((next, control) => commandCircuit(next, {type: 'circuit-set', control, enabled: true}), s);
const aggregateOn = (s: CircuitPlantState, ...keys: EquipmentKey[]) => keys.reduce((next, equipment) => next.equipment[equipment] ? next : commandCircuit(next, {type: 'toggle', equipment}), s);
const sum = (values: Record<string, number>) => Object.values(values).reduce((total, value) => total + value, 0);
function conservedFlows(s: CircuitPlantState) {
  close(sum(s.circuitFlows.pumps), s.lastFlows.pumpedKgh);
  close(sum(s.circuitFlows.vaporizers), s.lastFlows.pumpedKgh);
  close(sum(s.circuitFlows.compressors), s.lastFlows.compressedKgh);
  close(sum(s.circuitFlows.bunkering), s.lastFlows.bunkeredKgh);
  close(sum(s.circuitFlows.delivery), s.lastFlows.deliveredKgh);
}

test('the legacy seven controls retain the aggregate inventory behavior', () => {
  let circuit = createCircuit(), core = createPlant();
  for (const equipment of ['pump', 'compressor', 'vaporizer', 'gasValve', 'consumer', 'bunkering', 'vent'] as const) {
    circuit = commandCircuit(circuit, {type: 'toggle', equipment});
    core = commandPlant(core, {type: 'toggle', equipment});
  }
  const actual = advanceCircuitPlant(circuit, 300), expected = advancePlant(core, 300);
  close(actual.tank.liquidMassKg, expected.tank.liquidMassKg);
  close(actual.tank.gasMassKg, expected.tank.gasMassKg);
  close(actual.buffer.massKg, expected.buffer.massKg);
  assert.deepEqual(actual.lastFlows, expected.lastFlows);
  assert.deepEqual(actual.ledger, expected.ledger);
  conservedFlows(actual);
});

test('closed pump isolation blocks its transfer while another pump can carry the route', () => {
  let s = aggregateOn(createCircuit(), 'pump', 'vaporizer');
  s = on(s, 'pump2', 'pump2Isolation', 'pump2Shutoff');
  const both = advanceCircuitPlant(s, 1);
  assert.ok(both.circuitFlows.pumps.pump1 > 0);
  close(both.circuitFlows.pumps.pump1, both.circuitFlows.pumps.pump2);
  const isolated = commandCircuit(s, {type: 'circuit-set', control: 'pump1Isolation', enabled: false});
  const alternate = advanceCircuitPlant(isolated, 1);
  assert.equal(alternate.circuit.commands.pump1, true);
  assert.equal(alternate.equipment.pump, true);
  close(alternate.circuitFlows.pumps.pump1, 0);
  close(alternate.circuitFlows.pumps.pump2, both.lastFlows.pumpedKgh);
  conservedFlows(alternate);
  const shut = commandCircuit(isolated, {type: 'circuit-set', control: 'liquidHeader', enabled: false});
  close(advanceCircuitPlant(shut, 1).lastFlows.pumpedKgh, 0);
  assert.equal(effectiveEquipment(shut).pump, false);
});

test('every pump and vaporizer branch works independently with required gates', () => {
  for (const pump of pumpIds) for (const vaporizer of vaporizerIds) {
    const s = on(createCircuit(), pump, `${pump}Isolation`, `${pump}Shutoff`, 'liquidHeader', vaporizer, `${vaporizer}Isolation`);
    const running = advanceCircuitPlant(s, 1);
    assert.ok(running.circuitFlows.pumps[pump] > 0);
    assert.ok(running.circuitFlows.vaporizers[vaporizer] > 0);
    conservedFlows(running);
    const closed = commandCircuit(s, {type: 'circuit-set', control: `${vaporizer}Isolation`, enabled: false});
    close(advanceCircuitPlant(closed, 1).lastFlows.pumpedKgh, 0);
    const shutoff = commandCircuit(s, {type: 'circuit-set', control: `${pump}Shutoff`, enabled: false});
    close(advanceCircuitPlant(shutoff, 1).lastFlows.pumpedKgh, 0);
  }
  const noVaporizer = on(createCircuit(), 'pump4', 'pump4Isolation', 'pump4Shutoff', 'liquidHeader');
  close(advanceCircuitPlant(noVaporizer, 1).lastFlows.pumpedKgh, 0);
});

test('compressor isolation and BOG header gates work without multiplying aggregate capacity', () => {
  const s = on(createCircuit(), 'compressor1', 'compressor1Isolation', 'compressor2', 'compressor2Isolation', 'bogHeader');
  const both = advanceCircuitPlant(s, 1);
  close(both.lastFlows.compressedKgh, s.cfg.compressorKgh);
  close(both.circuitFlows.compressors.compressor1, s.cfg.compressorKgh / 2);
  close(both.circuitFlows.compressors.compressor2, s.cfg.compressorKgh / 2);
  for (const id of compressorIds) {
    const isolated = commandCircuit(s, {type: 'circuit-set', control: `${id}Isolation`, enabled: false});
    const next = advanceCircuitPlant(isolated, 1);
    close(next.circuitFlows.compressors[id], 0);
    close(next.lastFlows.compressedKgh, s.cfg.compressorKgh);
    conservedFlows(next);
  }
  const blocked = commandCircuit(s, {type: 'circuit-set', control: 'bogHeader', enabled: false});
  close(advanceCircuitPlant(blocked, 1).lastFlows.compressedKgh, 0);
});

test('port and starboard bunker gates share the external inflow and the common shutoff blocks both', () => {
  const blocked = on(createCircuit(), 'portBunker', 'starboardBunker');
  close(advanceCircuitPlant(blocked, 60).ledger.bunkeredKg, 0);
  const both = advanceCircuitPlant(on(blocked, 'bunkerShutoff'), 60);
  assert.ok(both.circuitFlows.bunkering.port > 0);
  close(both.circuitFlows.bunkering.port, both.circuitFlows.bunkering.starboard);
  close(both.ledger.bunkeredKg, both.lastFlows.bunkeredKgh / 60);
  conservedFlows(both);
  const starboard = commandCircuit(on(blocked, 'bunkerShutoff'), {type: 'circuit-set', control: 'portBunker', enabled: false});
  const next = advanceCircuitPlant(starboard, 60);
  close(next.circuitFlows.bunkering.port, 0);
  close(next.circuitFlows.bunkering.starboard, both.lastFlows.bunkeredKgh);
  close(metrics(next).massResidualKg, 0, 1e-5);
});

test('branch flow is actual transfer rather than an enabled indicator', () => {
  let s = aggregateOn(createCircuit(), 'pump', 'compressor', 'vaporizer', 'consumer', 'gasValve');
  s = commandCircuit(s, {type: 'settings', values: {pumpFlowM3h: 0, compressorKgh: 0, heatIngressKw: 0}});
  const next = advanceCircuitPlant(s, 60), derived = deriveFuelCircuit(next);
  assert.equal(derived.ready.pumps.pump1, true);
  assert.equal(derived.ready.compressors.compressor1, true);
  assert.equal(derived.ready.delivery.me, true);
  assert.equal(derived.equipment.pump, true);
  for (const value of Object.values(next.lastFlows)) close(value, 0);
  for (const group of ['pumps', 'compressors', 'vaporizers', 'bunkering', 'delivery'] as const) close(sum(next.circuitFlows[group]), 0);
});

test('ME and AE valve routes use one gas inventory and retain consumer dependency', () => {
  let s = aggregateOn(createCircuit(), 'pump', 'vaporizer');
  s = on(s, 'meGasValve', 'aeGasValve');
  close(advanceCircuitPlant(s, 5).lastFlows.deliveredKgh, 0);
  s = commandCircuit(s, {type: 'toggle', equipment: 'consumer'});
  const both = advanceCircuitPlant(s, 60);
  assert.ok(both.lastFlows.deliveredKgh > 0);
  close(both.circuitFlows.delivery.me, both.circuitFlows.delivery.ae);
  conservedFlows(both);
  const aeOnly = commandCircuit(s, {type: 'circuit-set', control: 'meGasValve', enabled: false});
  const next = advanceCircuitPlant(aeOnly, 60);
  close(next.circuitFlows.delivery.me, 0);
  close(next.circuitFlows.delivery.ae, both.lastFlows.deliveredKgh);
  const blocked = commandCircuit(aeOnly, {type: 'circuit-set', control: 'aeGasValve', enabled: false});
  close(advanceCircuitPlant(blocked, 60).lastFlows.deliveredKgh, 0);
});

test('all active route allocations conserve the external mass ledger across long intervals', () => {
  let s = on(createCircuit(), ...circuitControlKeys);
  s = aggregateOn(s, 'consumer', 'vent');
  const next = advanceCircuitPlant(s, 3600);
  conservedFlows(next);
  close(metrics(next).massResidualKg, 0, 1e-4);
  assert.ok(next.ledger.bunkeredKg > 0 && next.ledger.consumedKg > 0 && next.ledger.ventedKg > 0);
  assert.ok(next.lastFlows.pumpedKgh > 0 && next.lastFlows.compressedKgh > 0);
});

test('ESD clears every route command; reset cannot restart any branch', () => {
  const running = advanceCircuitPlant(aggregateOn(on(createCircuit(), ...circuitControlKeys), 'consumer', 'vent'), 60);
  const tripped = commandCircuit(running, {type: 'esd'});
  assert.ok(tripped.esdLatched);
  assert.ok(Object.values(tripped.circuit.commands).every(value => !value));
  assert.ok(Object.values(tripped.equipment).every(value => !value));
  assert.throws(() => commandCircuit(tripped, {type: 'circuit-set', control: 'pump1', enabled: true}), /Reset ESD/);
  assert.throws(() => commandCircuit(tripped, {type: 'toggle', equipment: 'pump'}), /Reset ESD/);
  const stopped = advanceCircuitPlant(tripped, 60);
  close(stopped.ledger.bunkeredKg, tripped.ledger.bunkeredKg);
  close(stopped.ledger.consumedKg, tripped.ledger.consumedKg);
  close(stopped.ledger.ventedKg, tripped.ledger.ventedKg);
  assert.ok(stopped.lastFlows.boiloffKgh > 0);
  const reset = commandCircuit(stopped, {type: 'reset-esd'});
  assert.equal(reset.esdLatched, false);
  assert.ok(Object.values(reset.circuit.commands).every(value => !value));
  const next = advanceCircuitPlant(reset, 60);
  close(next.lastFlows.pumpedKgh, 0); close(next.lastFlows.compressedKgh, 0); close(next.lastFlows.deliveredKgh, 0);
  close(metrics(next).massResidualKg, 0, 1e-5);
});

test('commands and stepping preserve snapshots, clear old flows, and reject invalid input', () => {
  const s = advanceCircuitPlant(aggregateOn(createCircuit(), 'pump', 'vaporizer', 'consumer', 'gasValve'), 30), snapshot = JSON.stringify(s);
  const command = commandCircuit(s, {type: 'circuit-toggle', control: 'pump2Isolation'});
  assert.equal(JSON.stringify(s), snapshot);
  close(sum(command.circuitFlows.pumps), 0);
  close(command.lastFlows.deliveredKgh, 0);
  const one = advanceCircuitPlant(s, 120), two = advanceCircuitPlant(advanceCircuitPlant(s, 60), 60);
  close(one.tank.liquidMassKg, two.tank.liquidMassKg);
  close(one.buffer.massKg, two.buffer.massKg);
  close(one.ledger.consumedKg, two.ledger.consumedKg);
  assert.equal(JSON.stringify(s), snapshot);
  for (const seconds of [0, -1, Infinity, NaN, 86401]) assert.throws(() => advanceCircuitPlant(s, seconds));
  assert.throws(() => commandCircuit(s, {type: 'circuit-toggle', control: 'unknown' as CircuitControlKey}), /Unknown circuit/);
  assert.throws(() => commandCircuit(s, {type: 'settings', values: {densityKgM3: 0}}), /Invalid/);
  assert.equal(JSON.stringify(s), snapshot);
  const derived = deriveFuelCircuit(s);
  derived.flows.pumps.pump1 = -1;
  assert.equal(JSON.stringify(s), snapshot);
  const flowShape: FuelCircuitFlows = createCircuit().circuitFlows;
  close(flowShape.deliveredKgh, 0);
});
