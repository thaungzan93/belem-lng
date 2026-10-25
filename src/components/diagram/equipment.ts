import type {CircuitControlKey} from '../../engine/fuelCircuit';

export interface SourceEquipment {
  id: string;
  tag: string;
  title: string;
  kind: 'machine' | 'valve' | 'vessel' | 'route' | 'connection';
  source: string;
  detail: string;
  control?: CircuitControlKey;
}
const binder = 'FGSS binder 1749062 · rev.04 · 28 Sep 2023 (As Built)';
const item = (id: string, tag: string, title: string, kind: SourceEquipment['kind'], page: number, detail: string, control?: CircuitControlKey): SourceEquipment =>
  ({id, tag, title, kind, source: `${binder} · PDF p.${page}`, detail, control});

export const sourceEquipment: SourceEquipment[] = [
  item('tank', 'LNG FUEL TANK', 'Fuel inventory', 'vessel', 10, 'Four fuel-pump branches share the tank inventory. Displayed inventory is the training model or a manually entered observation; it is not a live IAS reading.'),
  ...([1, 2, 3, 4] as const).flatMap(n => [
    item(`pump${n}`, `45PS100${n}`, `Fuel pump ${n}`, 'machine', 10, 'Independent training start/stop request. Transfer also requires both branch valves, the liquid-header route and at least one enabled vaporizer branch.', `pump${n}`),
    item(`pump${n}Isolation`, `45HV101${n}`, `Fuel pump ${n} isolation`, 'valve', 10, 'Source discharge isolation valve. The training connectivity gate is independent of the pump request.', `pump${n}Isolation`),
    item(`pump${n}Shutoff`, `45FV100${n}`, `Fuel pump ${n} flow valve`, 'valve', 10, 'Source branch flow/shutoff valve. Training uses an open/closed gate; valve modulation and commissioned control logic are not modelled.', `pump${n}Shutoff`),
  ]),
  ...([1, 2] as const).flatMap(n => [
    item(`compressor${n}`, `23KB550${n}`, `BOG compressor ${n}`, 'machine', 11, 'Parallel BOG branch from the knock-out drum to the shared hot-gas header. Actual allocation is calculated from the common training inventory; compressor maps and stages are not calibrated.', `compressor${n}`),
    item(`compressor${n}Isolation`, n === 1 ? '23V5509' : '23V5510', `BOG compressor ${n} inlet isolation`, 'valve', 11, 'Source compressor inlet isolation. Training branch connectivity requires this valve and the BOG-header route.', `compressor${n}Isolation`),
    item(`vaporizer${n}`, `45HA600${n}`, `LNG vaporizer ${n}`, 'machine', 12, 'Parallel LNG vaporizer branch. The training enable request permits transfer with a connected fuel pump. Hot-glycol heat balance and control sequencing are not modelled.', `vaporizer${n}`),
    item(`vaporizer${n}Isolation`, `45HV600${n}`, `LNG vaporizer ${n} isolation`, 'valve', 12, 'Source inlet isolation valve for this vaporizer branch.', `vaporizer${n}Isolation`),
    item(`heater${n}`, `45HA650${n}`, `NG heater ${n}`, 'machine', 12, 'Source parallel NG-heater train downstream of the vaporizer / hot BOG header. Individual heater operation and telemetry are not yet modelled.'),
  ]),
  item('knockout', '23VD5501', 'BOG knock-out drum', 'vessel', 11, 'BOG suction passes through the common knock-out drum before the two compressor branches. Drum level and protection logic are unknown.'),
  item('meBuffer', '45VA6501', 'M/E buffer tank', 'vessel', 13, 'Source M/E buffer. This version has one shared training gas inventory. An independent M/E buffer pressure is unknown; the shared training pressure is shown separately.'),
  item('aeBuffer', '45VA6502', 'A/E buffer tank', 'vessel', 13, 'Source A/E buffer is supplied from the M/E-buffer branch through the pressure-reducing train. This version has no independent A/E buffer inventory or pressure.'),
  item('meGasValve', '45HV6503', 'M/E gas supply valve', 'valve', 13, 'Source M/E-buffer outlet isolation. Training delivery also requires a consumer request and available shared buffer gas.', 'meGasValve'),
  item('aeGasValve', '45HV6504', 'A/E gas supply valve', 'valve', 13, 'Source A/E-buffer outlet isolation. Delivery is an allocation of the shared training buffer; an independent A/E pressure is unknown.', 'aeGasValve'),
  item('boiler', '45HV6505', 'Boiler gas / free-flow branch', 'connection', 13, 'Source boiler branch has a separate free-flow connection. Independent boiler demand and valve operation are not yet modelled.'),
  item('boilerReducing', '45PV6530', 'Boiler pressure-reducing valve', 'valve', 13, 'Source boiler branch pressure reduction. Its pressure regulation and valve position are unknown.'),
  item('aeReducing', '45PV6501 / 6502', 'A/E pressure-reducing train', 'connection', 13, 'Source A/E branch pressure reduction between the M/E supply and A/E buffer. Independent pressure control is not yet modelled.'),
  item('me', 'MAIN ENGINE', 'M/E fuel gas connection', 'connection', 13, 'Source M/E fuel-gas service. Open ME / IGPR for the photo-derived connection view; individual engine control and interlocks are unknown.'),
  item('ae', 'AUXILIARY ENGINES', 'A/E fuel gas connection', 'connection', 13, 'Source A/E fuel-gas service. Per-engine load, pressure and gas-mode feedback are unknown.'),
  item('hotGlycol', '53TB0201', 'Hot glycol system', 'connection', 14, 'Source hot-glycol tank, parallel 53PA0201/0202 pumps and 53HB0201/0202 steam heaters supply the LNG vaporizers and NG heaters. Utility state is not modelled.'),
  item('coldGlycol', '54TB0201', 'Cold glycol system', 'connection', 15, 'Source cold-glycol tank with parallel 54PA0201/0202 pumps and 54HB0201/0202 coolers serves the BOG skids. Utility state is not modelled.'),
  ...(['port', 'starboard'] as const).flatMap(side => {
    const port = side === 'port';
    return [
      item(`${side}Liquid1`, port ? '45HV7401' : '45HV7301', `${port ? 'Port' : 'Starboard'} liquid arm 1`, 'valve', 16, 'Source station liquid arm isolation. Individual station arm valve positions are unknown; the training model operates a station route as one abstraction.'),
      item(`${side}Liquid2`, port ? '45HV7201' : '45HV7101', `${port ? 'Port' : 'Starboard'} liquid arm 2`, 'valve', 16, 'Source second liquid arm joins the same station liquid header. Individual valve position is unknown.'),
      item(`${side}Vapour`, port ? '23HV7201' : '23HV7101', `${port ? 'Port' : 'Starboard'} vapour arm`, 'valve', 16, 'Source station vapour connection. Vapour-return flow and individual valve feedback are unknown; no vapour-return mass model is implemented.'),
    ];
  }),
  ...([
    ['liquidHeader', 'Liquid header route', 'Connect the common liquid-pump header. This is a training aggregate gate, not an additional source-tagged physical valve.'],
    ['bogHeader', 'BOG header route', 'Connect the common BOG suction route. This is a training aggregate gate; source 23HV1001 / 23HV5515 and drum internals are not separately actuated.'],
    ['portBunker', 'Port station route', 'Training bunkering request for the whole port station. It does not establish individual source arm-valve positions.'],
    ['starboardBunker', 'Starboard station route', 'Training bunkering request for the whole starboard station. It does not establish individual source arm-valve positions.'],
    ['bunkerShutoff', 'Bunker transfer route', 'Shared training bunkering gate. Transfer also needs a selected station route and available tank capacity. No commissioned ESD sequence is implied.'],
  ] as const).map(([id, title, detail]) => ({id, tag: title, title, kind: 'route' as const, source: 'Training connectivity abstraction · no source equipment tag', detail, control: id})),
  {id: 'igpr', tag: 'IGPR', title: 'M/E integrated gas pressure regulation', kind: 'connection', source: 'Owner HMI photograph 962 · connection view; FGSS-03 PDF p.18 (printed sheet 17) confirms M/E service only', detail: 'The photograph establishes panel appearance and connection labels. Individual internal valve identities, commissioned setpoints, engine status and protection logic are not verified. All such feedback remains unknown.'},
];

export const equipmentById = Object.fromEntries(sourceEquipment.map(value => [value.id, value])) as Record<string, SourceEquipment>;
