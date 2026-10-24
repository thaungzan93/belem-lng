import React, {useEffect, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

export type DiagramEquipmentKey =
  | 'pump'
  | 'compressor'
  | 'vaporizer'
  | 'gasValve'
  | 'consumer'
  | 'bunkering'
  | 'vent';

export interface ShipDiagramProps {
  manual: boolean;
  values: {
    tankVolumeM3?: number;
    tankPressureBarg?: number;
    bufferPressureBarg?: number;
    gasFlowKgh?: number;
    temperatureC?: number;
  };
  equipment: Record<DiagramEquipmentKey, boolean>;
  esdLatched: boolean;
  onToggle: (key: DiagramEquipmentKey) => void;
  onEsd: () => void;
  onReset: () => void;
}

const WIDTH = 1280;
const HEIGHT = 800;
const palette = {
  background: '#303034',
  panel: '#514d55',
  border: '#aaa3af',
  text: '#eee9ef',
  muted: '#c2bac7',
  green: '#8af000',
  magenta: '#d761db',
  liquid: '#df8b46',
  gas: '#e8df36',
  trip: '#ff7070',
};

function numberText(value: number | undefined, digits: number, unit: string) {
  return value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(digits)} ${unit}`;
}

/** A fixed-coordinate training mimic, drawn entirely with native Views and Text. */
export function ShipDiagram({manual, values, equipment, esdLatched, onToggle, onEsd, onReset}: ShipDiagramProps) {
  const [viewport, setViewport] = useState({width: WIDTH, height: HEIGHT});
  const [zoom, setZoom] = useState(1);
  const horizontal = useRef<ScrollView>(null);
  const vertical = useRef<ScrollView>(null);
  const offset = useRef({x: 0, y: 0});
  const pendingScroll = useRef<{x: number; y: number} | null>(null);
  const fit = Math.max(0.01, Math.min(viewport.width / WIDTH, viewport.height / HEIGHT));
  const scale = fit * zoom;
  const canvasWidth = WIDTH * scale;
  const canvasHeight = HEIGHT * scale;
  const actualFlow = !manual && !esdLatched && (values.gasFlowKgh ?? 0) > 0;

  useEffect(() => {
    const target = pendingScroll.current;
    if (!target) return;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => {
      horizontal.current?.scrollTo({x: target.x, animated: false});
      vertical.current?.scrollTo({y: target.y, animated: false});
    });
    return () => cancelAnimationFrame(frame);
  }, [zoom, viewport.width, viewport.height]);

  function fitDiagram() {
    pendingScroll.current = {x: 0, y: 0};
    offset.current = {x: 0, y: 0};
    setZoom(1);
    horizontal.current?.scrollTo({x: 0, animated: false});
    vertical.current?.scrollTo({y: 0, animated: false});
  }

  function changeZoom(multiplier: number) {
    const next = Math.max(1, Math.min(6, zoom * multiplier));
    if (next === zoom) return;
    const newWidth = WIDTH * fit * next;
    const newHeight = HEIGHT * fit * next;
    const oldLeft = Math.max(0, (viewport.width - canvasWidth) / 2);
    const oldTop = Math.max(0, (viewport.height - canvasHeight) / 2);
    const centerX = (offset.current.x + viewport.width / 2 - oldLeft) / canvasWidth;
    const centerY = (offset.current.y + viewport.height / 2 - oldTop) / canvasHeight;
    pendingScroll.current = {
      x: Math.max(0, Math.min(newWidth - viewport.width, centerX * newWidth - viewport.width / 2)),
      y: Math.max(0, Math.min(newHeight - viewport.height, centerY * newHeight - viewport.height / 2)),
    };
    setZoom(next);
  }

  function measure(event: LayoutChangeEvent) {
    const {width, height} = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    if (Math.abs(width - viewport.width) < 0.5 && Math.abs(height - viewport.height) < 0.5) return;
    pendingScroll.current = {x: 0, y: 0};
    offset.current = {x: 0, y: 0};
    setZoom(1);
    setViewport({width, height});
  }

  function frame(x: number, y: number, width: number, height: number): ViewStyle {
    return {position: 'absolute', left: x * scale, top: y * scale, width: width * scale, height: height * scale};
  }

  function caption(text: string, x: number, y: number, width: number, size = 13, color = palette.text, align: 'left' | 'center' | 'right' = 'left') {
    return <Text style={{...frame(x, y, width, size * 1.7), color, fontSize: size * scale, fontWeight: '600', textAlign: align}}>{text}</Text>;
  }

  function pipe(points: [number, number][], medium: 'liquid' | 'gas', flowing = false) {
    const color = medium === 'liquid' ? palette.liquid : palette.gas;
    return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {points.slice(1).map(([endX, endY], index) => {
        const [startX, startY] = points[index];
        const horizontalLine = startY === endY;
        return <View key={index} style={{
          ...frame(Math.min(startX, endX), Math.min(startY, endY), horizontalLine ? Math.abs(endX - startX) : 2.5, horizontalLine ? 2.5 : Math.abs(endY - startY)),
          backgroundColor: color,
          opacity: flowing ? 1 : 0.68,
        }}/>;
      })}
    </View>;
  }

  function readout(label: string, value: number | undefined, unit: string, x: number, y: number, width: number, digits = 1) {
    return <View style={{...frame(x, y, width, 55), backgroundColor: '#363238', borderColor: '#716a77', borderWidth: Math.max(0.5, scale)}}>
      <Text style={{color: palette.muted, fontSize: 11 * scale, textAlign: 'center', marginTop: 5 * scale}}>{label}</Text>
      <Text style={{color: palette.text, fontSize: 17 * scale, fontWeight: '700', textAlign: 'center', marginTop: 5 * scale}}>{numberText(value, digits, unit)}</Text>
    </View>;
  }

  function device(key: DiagramEquipmentKey, title: string, label: string, x: number, y: number, width: number, height: number, round = false) {
    const disabled = manual || esdLatched;
    const enabled = !manual && !esdLatched && equipment[key];
    const stateColor = manual ? palette.muted : enabled ? palette.green : palette.magenta;
    const status = manual ? 'NOT RECORDED' : key === 'gasValve' || key === 'vent' ? enabled ? 'OPEN' : 'CLOSED' : enabled ? 'ON' : 'OFF';
    return <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, selected: manual ? undefined : enabled}}
      disabled={disabled}
      onPress={() => onToggle(key)}
      hitSlop={6}
      style={{...frame(x, y, width, height), borderRadius: (round ? 22 : 3) * scale, backgroundColor: palette.panel, borderColor: stateColor, borderWidth: Math.max(1, 1.5 * scale), opacity: disabled ? 0.6 : 1}}>
      <View pointerEvents="none" style={{position: 'absolute', left: 10 * scale, top: 17 * scale, width: 24 * scale, height: 24 * scale, borderRadius: 12 * scale, borderWidth: Math.max(1, 2 * scale), borderColor: stateColor}}/>
      <Text style={{position: 'absolute', left: 42 * scale, right: 6 * scale, top: 14 * scale, color: palette.text, fontSize: 12 * scale, fontWeight: '700'}}>{title}</Text>
      <Text style={{position: 'absolute', left: 42 * scale, right: 6 * scale, bottom: 13 * scale, color: stateColor, fontSize: 11 * scale, fontWeight: '700'}}>{status}</Text>
    </Pressable>;
  }

  function scrollPosition(axis: 'x' | 'y', event: NativeSyntheticEvent<NativeScrollEvent>) {
    const value = axis === 'x' ? event.nativeEvent.contentOffset.x : event.nativeEvent.contentOffset.y;
    offset.current = {...offset.current, [axis]: value};
  }

  return <View style={styles.root}>
    <View style={styles.tools}>
      <Text style={styles.toolsLabel}>MIMIC VIEW</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" disabled={zoom <= 1} onPress={() => changeZoom(1 / 1.3)} style={[styles.tool, zoom <= 1 && styles.disabled]}><Text style={styles.toolText}>−</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" disabled={zoom >= 6} onPress={() => changeZoom(1.3)} style={[styles.tool, zoom >= 6 && styles.disabled]}><Text style={styles.toolText}>+</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fit diagram" onPress={fitDiagram} style={styles.tool}><Text style={styles.toolText}>Fit</Text></Pressable>
      <Text style={styles.zoom}>{Math.round(zoom * 100)}% · drag to pan</Text>
    </View>
    <View testID="diagram-viewport" onLayout={measure} style={styles.viewport}>
      <ScrollView
        ref={horizontal}
        horizontal
        nestedScrollEnabled
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={{minWidth: viewport.width}}
        onScroll={event => scrollPosition('x', event)}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={canvasWidth > viewport.width + 1}>
        <ScrollView
          ref={vertical}
          nestedScrollEnabled
          bounces={false}
          style={{width: Math.max(viewport.width, canvasWidth), height: viewport.height}}
          contentContainerStyle={{height: Math.max(viewport.height, canvasHeight), alignItems: 'center', justifyContent: 'center'}}
          onScroll={event => scrollPosition('y', event)}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={canvasHeight > viewport.height + 1}>
          <View testID="ship-diagram-canvas" style={{width: canvasWidth, height: canvasHeight, backgroundColor: palette.background, overflow: 'hidden'}}>
            <View style={{...frame(0, 0, WIDTH, 31), backgroundColor: '#807883'}}/>
            {caption('Automation · CMA CGM BELEM', 15, 7, 450, 13)}
            {caption(manual ? 'MANUAL OBSERVATIONS' : 'FUEL SYSTEM SIMULATOR', 880, 7, 380, 12, manual ? palette.muted : palette.green, 'right')}
            {caption('FGSS OVERVIEW', 450, 49, 400, 23, palette.green, 'center')}

            {pipe([[158, 205], [158, 480]], 'liquid', !manual && equipment.bunkering)}
            {pipe([[300, 480], [300, 330], [460, 330]], 'gas', actualFlow && equipment.compressor)}
            {pipe([[300, 415], [387, 415], [387, 150]], 'gas', !manual && equipment.vent)}
            {pipe([[380, 580], [425, 580]], 'liquid', !manual && equipment.pump)}
            {pipe([[550, 580], [620, 580]], 'liquid', actualFlow && equipment.pump && equipment.vaporizer)}
            {pipe([[610, 330], [900, 330]], 'gas', actualFlow && equipment.compressor)}
            {pipe([[775, 580], [825, 580], [825, 330]], 'gas', actualFlow && equipment.pump && equipment.vaporizer)}
            {pipe([[1050, 330], [1090, 330]], 'gas', actualFlow)}
            {pipe([[1225, 330], [1250, 330], [1250, 530], [1225, 530]], 'gas', actualFlow)}
            <View pointerEvents="none" style={{...frame(820, 325, 12, 12), backgroundColor: palette.gas, borderRadius: 6 * scale}}/>

            {device('bunkering', 'BUNKERING', 'Toggle bunkering', 60, 130, 195, 75)}
            {device('vent', 'TANK VENT', 'Toggle tank vent', 325, 75, 125, 75)}
            {caption('VENT MAST', 330, 165, 120, 11, palette.muted, 'center')}
            {caption('LNG FILLING', 60, 305, 145, 12, palette.liquid)}
            {caption('BOG / VAPOUR', 318, 350, 165, 12, palette.gas)}
            {caption('LIQUID FUEL', 415, 638, 155, 12, palette.liquid)}
            {device('compressor', 'BOG COMPRESSOR', 'Toggle BOG compressor', 460, 280, 150, 100)}
            {device('pump', 'FUEL PUMP', 'Toggle fuel pump', 425, 540, 125, 80)}
            {device('vaporizer', 'LNG VAPORIZER', 'Toggle LNG vaporizer', 620, 530, 155, 100, true)}
            {device('gasValve', 'GAS VALVE', 'Toggle gas valve', 1090, 295, 135, 70)}
            {device('consumer', 'GAS CONSUMER', 'Toggle gas consumer', 1075, 480, 150, 100)}

            <View style={{...frame(80, 480, 300, 210), backgroundColor: '#736d78', borderColor: '#c4bccb', borderWidth: Math.max(1, 2 * scale), borderRadius: 5 * scale}}/>
            {caption('LNG FUEL TANK', 95, 497, 270, 18, palette.text, 'center')}
            {readout('Tank pressure', values.tankPressureBarg, 'bar(g)', 95, 538, 130, 3)}
            {readout('Liquid volume', values.tankVolumeM3, 'm³', 235, 538, 130, 0)}
            {readout('LNG temperature', values.temperatureC, '°C', 95, 605, 270, 1)}

            <View style={{...frame(900, 250, 150, 160), backgroundColor: '#b2aab8', borderColor: '#e5dcea', borderWidth: Math.max(1, 2 * scale), borderRadius: 32 * scale}}/>
            {caption('ME BUFFER', 910, 275, 130, 15, '#353039', 'center')}
            {readout('Buffer pressure', values.bufferPressureBarg, 'bar(g)', 913, 325, 124, 2)}
            {readout('Gas delivery', values.gasFlowKgh, 'kg/h', 890, 437, 170, 0)}

            <View style={{...frame(875, 85, 360, 115), backgroundColor: '#444047', borderColor: '#827987', borderWidth: Math.max(0.5, scale)}}/>
            {caption(manual ? 'OBSERVATION MODE' : esdLatched ? 'ESD LATCHED' : 'ESD NORMAL', 890, 96, 330, 14, manual ? palette.muted : esdLatched ? palette.trip : palette.green, 'center')}
            <Pressable accessibilityRole="button" accessibilityLabel="Activate emergency shutdown" accessibilityState={{disabled: manual || esdLatched}} disabled={manual || esdLatched} onPress={onEsd} style={{...frame(890, 135, 183, 45), backgroundColor: manual ? '#665e69' : '#813c48', borderColor: '#c1a2ac', borderWidth: Math.max(1, scale), justifyContent: 'center', alignItems: 'center', opacity: manual || esdLatched ? 0.55 : 1}}><Text style={{fontSize: 13 * scale, fontWeight: '700', color: palette.text}}>EMERGENCY STOP</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Reset emergency shutdown" accessibilityState={{disabled: manual || !esdLatched}} disabled={manual || !esdLatched} onPress={onReset} style={{...frame(1087, 135, 133, 45), backgroundColor: '#77707d', borderColor: palette.border, borderWidth: Math.max(1, scale), justifyContent: 'center', alignItems: 'center', opacity: manual || !esdLatched ? 0.55 : 1}}><Text style={{fontSize: 13 * scale, fontWeight: '700', color: palette.text}}>RESET ESD</Text></Pressable>

            <View style={{...frame(35, 735, 1210, 40), borderTopWidth: Math.max(0.5, scale), borderTopColor: '#77717c'}}/>
            {caption('Rebuilt training diagram', 45, 747, 380, 14, palette.muted)}
            {caption(manual ? 'Equipment controls disabled · unknown readings: —' : 'Orange: liquid  ·  Yellow: gas  ·  Green: on/open  ·  Magenta: off/closed', 430, 748, 805, 12, palette.muted, 'right')}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: {flex: 1, minHeight: 220, backgroundColor: '#242227'},
  tools: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#47414b'},
  toolsLabel: {fontSize: 10, fontWeight: '700', color: '#d6cddc'},
  tool: {minWidth: 38, minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#aaa1b1', backgroundColor: '#6d6475'},
  toolText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  zoom: {flex: 1, fontSize: 11, color: '#d4cadb'},
  disabled: {opacity: 0.45},
  viewport: {flex: 1, overflow: 'hidden', backgroundColor: '#1d1b20'},
  scroll: {flex: 1},
});
