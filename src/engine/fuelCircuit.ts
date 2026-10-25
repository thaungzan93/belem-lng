import {advancePlant, commandPlant, createPlant} from './lng';
import type {EquipmentKey, PlantCommand, PlantFlows, PlantState} from './lng';

/** Stable semantic IDs. Source equipment tags belong in the reviewed diagram register. */
export const pumpIds = ['pump1', 'pump2', 'pump3', 'pump4'] as const;
export const compressorIds = ['compressor1', 'compressor2'] as const;
export const vaporizerIds = ['vaporizer1', 'vaporizer2'] as const;
export type PumpId = typeof pumpIds[number];
export type CompressorId = typeof compressorIds[number];
export type VaporizerId = typeof vaporizerIds[number];
export const circuitControlKeys = [
  ...pumpIds, ...compressorIds, ...vaporizerIds,
  'pump1Isolation', 'pump2Isolation', 'pump3Isolation', 'pump4Isolation',
  'pump1Shutoff', 'pump2Shutoff', 'pump3Shutoff', 'pump4Shutoff',
  'compressor1Isolation', 'compressor2Isolation',
  'vaporizer1Isolation', 'vaporizer2Isolation',
  'liquidHeader', 'bogHeader', 'portBunker', 'starboardBunker', 'bunkerShutoff',
  'meGasValve', 'aeGasValve',
] as const;
export type CircuitControlKey = typeof circuitControlKeys[number];
export interface FuelCircuitState {commands: Record<CircuitControlKey, boolean>}
export type FuelCircuitCommand =
  | {type: 'circuit-toggle'; control: CircuitControlKey}
  | {type: 'circuit-set'; control: CircuitControlKey; enabled: boolean};
export type CircuitCommand = PlantCommand | FuelCircuitCommand;

export interface FuelCircuitFlows {
  pumps: Record<PumpId, number>;
  compressors: Record<CompressorId, number>;
  vaporizers: Record<VaporizerId, number>;
  bunkering: {port: number; starboard: number};
  delivery: {me: number; ae: number};
  deliveredKgh: number;
}
export interface FuelCircuitReadiness {
  pumps: Record<PumpId, boolean>;
  compressors: Record<CompressorId, boolean>;
  vaporizers: Record<VaporizerId, boolean>;
  bunkering: {port: boolean; starboard: boolean};
  delivery: {me: boolean; ae: boolean};
}
export interface FuelCircuitDerived {
  equipment: Record<EquipmentKey, boolean>;
  ready: FuelCircuitReadiness;
  flows: FuelCircuitFlows;
}
export interface CircuitPlantState extends PlantState {
  circuit: FuelCircuitState;
  circuitFlows: FuelCircuitFlows;
}

function recordFor<K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map(key => [key, value(key)])) as Record<K, V>;
}
const zeroPlantFlows = (): PlantFlows => ({boiloffKgh: 0, pumpedKgh: 0, compressedKgh: 0, deliveredKgh: 0, bunkeredKgh: 0, ventedKgh: 0});
function zeroCircuitFlows(): FuelCircuitFlows {
  return {
    pumps: recordFor(pumpIds, () => 0), compressors: recordFor(compressorIds, () => 0),
    vaporizers: recordFor(vaporizerIds, () => 0), bunkering: {port: 0, starboard: 0},
    delivery: {me: 0, ae: 0}, deliveredKgh: 0,
  };
}
const stoppedCommands = () => recordFor(circuitControlKeys, () => false);

/** Starts the existing aggregate training inventory with every circuit command stopped/closed. */
export function createCircuit(): CircuitPlantState {
  return {...createPlant(), circuit: {commands: stoppedCommands()}, circuitFlows: zeroCircuitFlows()};
}

function cloneCircuit(previous: CircuitPlantState): CircuitPlantState {
  return {
    ...previous, cfg: {...previous.cfg}, equipment: {...previous.equipment},
    tank: {...previous.tank}, buffer: {...previous.buffer}, ledger: {...previous.ledger},
    events: [...previous.events], lastFlows: zeroPlantFlows(),
    circuit: {commands: {...previous.circuit.commands}}, circuitFlows: zeroCircuitFlows(),
  };
}

/** Aggregate requests are retained even when a closed route prevents actual operation. */
function syncRequests(s: CircuitPlantState): void {
  const c = s.circuit.commands;
  s.equipment.pump = pumpIds.some(id => c[id]);
  s.equipment.compressor = compressorIds.some(id => c[id]);
  s.equipment.vaporizer = vaporizerIds.some(id => c[id]);
  s.equipment.gasValve = c.meGasValve || c.aeGasValve;
  s.equipment.bunkering = c.portBunker || c.starboardBunker;
}

/** Route availability only: pressure, inventory and demand can still make actual flow zero. */
export function circuitReadiness(s: CircuitPlantState): FuelCircuitReadiness {
  const c = s.circuit.commands, available = !s.esdLatched;
  const openPumps = recordFor(pumpIds, id => available && c[id] && c[`${id}Isolation`] && c[`${id}Shutoff`] && c.liquidHeader);
  const openVaporizers = recordFor(vaporizerIds, id => available && c[id] && c[`${id}Isolation`] && c.liquidHeader);
  const hasPump = pumpIds.some(id => openPumps[id]);
  const hasVaporizer = vaporizerIds.some(id => openVaporizers[id]);
  return {
    pumps: recordFor(pumpIds, id => openPumps[id] && hasVaporizer),
    vaporizers: recordFor(vaporizerIds, id => openVaporizers[id] && hasPump),
    compressors: recordFor(compressorIds, id => available && c[id] && c[`${id}Isolation`] && c.bogHeader),
    bunkering: {port: available && c.portBunker && c.bunkerShutoff, starboard: available && c.starboardBunker && c.bunkerShutoff},
    delivery: {me: available && s.equipment.consumer && c.meGasValve, ae: available && s.equipment.consumer && c.aeGasValve},
  };
}

/** Masks the aggregate model with actual circuit connectivity without losing operator requests. */
export function effectiveEquipment(s: CircuitPlantState): Record<EquipmentKey, boolean> {
  const ready = circuitReadiness(s), available = !s.esdLatched;
  return {
    pump: pumpIds.some(id => ready.pumps[id]),
    compressor: compressorIds.some(id => ready.compressors[id]),
    vaporizer: vaporizerIds.some(id => ready.vaporizers[id]),
    gasValve: ready.delivery.me || ready.delivery.ae,
    consumer: available && s.equipment.consumer,
    bunkering: ready.bunkering.port || ready.bunkering.starboard,
    vent: available && s.equipment.vent,
  };
}

export function deriveFuelCircuit(s: CircuitPlantState): FuelCircuitDerived {
  return {equipment: effectiveEquipment(s), ready: circuitReadiness(s), flows: {
    pumps: {...s.circuitFlows.pumps}, compressors: {...s.circuitFlows.compressors},
    vaporizers: {...s.circuitFlows.vaporizers}, bunkering: {...s.circuitFlows.bunkering},
    delivery: {...s.circuitFlows.delivery}, deliveredKgh: s.circuitFlows.deliveredKgh,
  }};
}

function circuitEvent(s: CircuitPlantState, message: string): void {
  s.events.unshift(`${s.elapsedSeconds.toFixed(0)} s · ${message}`);
  s.events = s.events.slice(0, 120);
}

/**
 * Keeps the seven original aggregate controls working. An aggregate ON command selects
 * one representative route and opens its training gates; individual commands never
 * change another device. OFF stops all devices of that aggregate kind.
 */
function legacyToggle(s: CircuitPlantState, equipment: EquipmentKey): boolean {
  const c = s.circuit.commands;
  const enabled = !s.equipment[equipment];
  if (equipment === 'pump') {
    for (const id of pumpIds) c[id] = false;
    if (enabled) {c.pump1 = true; c.pump1Isolation = true; c.pump1Shutoff = true; c.liquidHeader = true;}
  } else if (equipment === 'compressor') {
    for (const id of compressorIds) c[id] = false;
    if (enabled) {c.compressor1 = true; c.compressor1Isolation = true; c.bogHeader = true;}
  } else if (equipment === 'vaporizer') {
    for (const id of vaporizerIds) c[id] = false;
    if (enabled) {c.vaporizer1 = true; c.vaporizer1Isolation = true;}
  } else if (equipment === 'gasValve') {
    c.meGasValve = enabled; c.aeGasValve = false;
  } else if (equipment === 'bunkering') {
    c.portBunker = enabled; c.starboardBunker = false;
    if (enabled) c.bunkerShutoff = true;
  } else return false;
  syncRequests(s);
  circuitEvent(s, `${equipment} aggregate ${enabled ? 'ON; representative training route selected' : 'OFF'}`);
  return true;
}

export function commandCircuit(previous: CircuitPlantState, command: CircuitCommand): CircuitPlantState {
  if (command.type === 'circuit-toggle' || command.type === 'circuit-set') {
    if (!circuitControlKeys.includes(command.control)) throw new Error('Unknown circuit control');
    if (command.type === 'circuit-set' && typeof command.enabled !== 'boolean') throw new Error('Circuit command must be true or false');
    if (previous.esdLatched) throw new Error('Reset ESD before issuing equipment commands');
    const s = cloneCircuit(previous);
    const enabled = command.type === 'circuit-toggle' ? !s.circuit.commands[command.control] : command.enabled;
    s.circuit.commands[command.control] = enabled;
    syncRequests(s);
    circuitEvent(s, `${command.control} ${enabled ? 'ON / OPEN' : 'OFF / CLOSED'} (training command)`);
    return s;
  }
  if (command.type === 'toggle') {
    if (previous.esdLatched) throw new Error('Reset ESD before issuing equipment commands');
    const s = cloneCircuit(previous);
    if (legacyToggle(s, command.equipment)) return s;
  }
  const plant = commandPlant(previous, command);
  const s: CircuitPlantState = {
    ...plant, circuit: {commands: {...previous.circuit.commands}}, circuitFlows: zeroCircuitFlows(),
  };
  if (command.type === 'esd' || command.type === 'reset-esd') {
    s.circuit.commands = stoppedCommands();
    // Reset is a stopped state even if a caller supplied an inconsistent latched snapshot.
    for (const key of Object.keys(s.equipment) as EquipmentKey[]) s.equipment[key] = false;
  }
  syncRequests(s);
  return s;
}

function allocate<K extends string>(total: number, keys: readonly K[], ready: Record<K, boolean>): Record<K, number> {
  const result = recordFor(keys, () => 0), active = keys.filter(key => ready[key]);
  let assigned = 0;
  active.forEach((key, index) => {
    const share = index === active.length - 1 ? total - assigned : total / active.length;
    result[key] = share; assigned += share;
  });
  return result;
}

/**
 * Advances the unchanged single-inventory model once. Its configured rates remain
 * aggregate limits, independent of how many branches are started. Branch flows are
 * equal allocations of the actual calculated transfer, never invented telemetry.
 * Vaporizers repeat the pump-stream mass downstream; they are not additional supply.
 */
export function advanceCircuitPlant(previous: CircuitPlantState, seconds: number): CircuitPlantState {
  const ready = circuitReadiness(previous);
  const plant = advancePlant({...previous, equipment: effectiveEquipment(previous)}, seconds);
  const flows: FuelCircuitFlows = {
    pumps: allocate(plant.lastFlows.pumpedKgh, pumpIds, ready.pumps),
    compressors: allocate(plant.lastFlows.compressedKgh, compressorIds, ready.compressors),
    vaporizers: allocate(plant.lastFlows.pumpedKgh, vaporizerIds, ready.vaporizers),
    bunkering: allocate(plant.lastFlows.bunkeredKgh, ['port', 'starboard'], ready.bunkering),
    delivery: allocate(plant.lastFlows.deliveredKgh, ['me', 'ae'], ready.delivery),
    deliveredKgh: plant.lastFlows.deliveredKgh,
  };
  return {
    ...plant, equipment: {...previous.equipment},
    circuit: {commands: {...previous.circuit.commands}}, circuitFlows: flows,
  };
}
