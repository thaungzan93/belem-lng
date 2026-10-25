// From repository root: node --import tsx docs/evidence/v0.5.1/engine-stress.mjs
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import core from '../../../src/engine/lng.ts';
import circuit from '../../../src/engine/fuelCircuit.ts';

const {metrics} = core;
const {createCircuit, commandCircuit, advanceCircuitPlant, circuitControlKeys} = circuit;
const initialSeed = 87263;
let seed = initialSeed;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let state = createCircuit(), maximumMassResidualKg = 0, esdCycles = 0;
for (let index = 0; index < 2500; index++) {
  if (random() < 0.7) {
    const control = circuitControlKeys[Math.floor(random() * circuitControlKeys.length)];
    state = commandCircuit(state, {type: 'circuit-toggle', control});
  } else {
    state = commandCircuit(state, {type: 'toggle', equipment: random() < 0.5 ? 'consumer' : 'vent'});
  }
  state = advanceCircuitPlant(state, Math.ceil(random() * 90));
  const derived = metrics(state);
  maximumMassResidualKg = Math.max(maximumMassResidualKg, Math.abs(derived.massResidualKg));
  const values = [state.tank.liquidMassKg, state.tank.gasMassKg, state.buffer.massKg, ...Object.values(state.lastFlows)];
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error(`Invalid values at iteration ${index}`);
  if (Math.abs(derived.massResidualKg) > 1e-3) throw new Error(`Mass residual ${derived.massResidualKg}`);
  if (index % 91 === 0) {
    state = commandCircuit(state, {type: 'esd'});
    state = advanceCircuitPlant(state, 17);
    if (Object.entries(state.lastFlows).some(([key, value]) => key !== 'boiloffKgh' && value !== 0)) throw new Error('ESD allowed transfer');
    state = commandCircuit(state, {type: 'reset-esd'});
    if (Object.values(state.circuit.commands).some(Boolean) || Object.values(state.equipment).some(Boolean)) throw new Error('Reset restarted equipment');
    esdCycles++;
  }
}
const report = {
  scope: 'Training circuit randomized command/step check; not vessel or native-runtime validation',
  seed: initialSeed, iterations: 2500, simulatedSeconds: state.elapsedSeconds,
  maximumMassResidualKg, esdCycles, nonnegativeFinite: true, esdTransferBlocked: true, resetRemainsStopped: true,
};
writeFileSync(fileURLToPath(new URL('./engine-stress-report.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
