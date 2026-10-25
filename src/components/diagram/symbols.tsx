import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';

export const mimicColors = {
  background: '#38393b', text: '#f1f1ee', muted: '#c6c5c3',
  panel: '#59595d', border: '#b6b4b8', liquid: '#e49549', gas: '#ebe45b',
  green: '#8fe538', magenta: '#df62e3', neutral: '#b8b6ba', glycol: '#87a8d7',
};
export type Point = [number, number];
export type Medium = 'liquid' | 'gas' | 'glycol' | 'control';
export interface SymbolOptions {
  scale: number;
  state: (id: string) => boolean | undefined;
  flowing: (id: string) => boolean;
  inspect: (id: string) => void;
}

/** All diagram geometry uses native views/text; there is no SVG text drawing path. */
export function createSymbols({scale: s, state, flowing, inspect}: SymbolOptions) {
  const c = mimicColors;
  function frame(x: number, y: number, width: number, height: number): ViewStyle {
    return {position: 'absolute', left: x * s, top: y * s, width: width * s, height: height * s};
  }
  function label(text: string, x: number, y: number, width: number, size = 12, color = c.text, align: 'left' | 'center' | 'right' = 'left') {
    return <Text key={`label-${x}-${y}-${text}`} pointerEvents="none" numberOfLines={2} style={{...frame(x, y, width, size * 2.65), color, fontSize: size * s, lineHeight: size * 1.2 * s, fontWeight: '600', textAlign: align}}>{text}</Text>;
  }
  function line(points: Point[], medium: Medium, route?: string) {
    const color = medium === 'control' ? '#d0d0d0' : c[medium];
    const active = route ? flowing(route) : false;
    const thickness = active ? 3.2 : 2;
    return <View key={`line-${points.flat().join('-')}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {points.slice(1).map(([endX, endY], i) => {
        const [startX, startY] = points[i];
        const horizontal = startY === endY;
        return <View key={i} style={{...frame(Math.min(startX, endX) - thickness / 2, Math.min(startY, endY) - thickness / 2,
          horizontal ? Math.abs(endX - startX) + thickness : thickness,
          horizontal ? thickness : Math.abs(endY - startY) + thickness),
        ...(medium === 'control' ? {borderColor: color, borderStyle: 'dashed', borderWidth: Math.max(0.5, s)} : {backgroundColor: color}), opacity: route && !active ? 0.76 : 1}}/>;
      })}
    </View>;
  }
  function joint(x: number, y: number, medium: 'liquid' | 'gas') {
    return <View key={`joint-${x}-${y}`} style={{...frame(x - 3, y - 3, 6, 6), borderRadius: 4 * s, backgroundColor: c[medium]}}/>;
  }
  function arrow(x: number, y: number, direction: 'left' | 'right' | 'up' | 'down', medium: 'liquid' | 'gas') {
    const transform = direction === 'left' ? '◀' : direction === 'right' ? '▶' : direction === 'up' ? '▲' : '▼';
    return label(transform + '\uFE0E', x - 5, y - 7, 14, 10, c[medium], 'center');
  }
  function box(title: string, x: number, y: number, w: number, h: number, dashed = false) {
    return <View key={`box-${title}`} pointerEvents="none" style={{...frame(x, y, w, h), borderWidth: Math.max(.5, s), borderColor: '#98969b', borderStyle: dashed ? 'dashed' : 'solid', backgroundColor: dashed ? 'transparent' : '#47474b'}}>
      <Text style={{fontSize: 12 * s, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: 5 * s}}>{title}</Text>
    </View>;
  }
  function readout(tag: string, text: string, x: number, y: number, width = 85) {
    return <View key={`readout-${tag}-${x}-${y}`} pointerEvents="none" style={{...frame(x, y, width, 36), backgroundColor: '#26272a', borderColor: '#87868b', borderWidth: Math.max(.4, .6 * s)}}>
      <Text numberOfLines={1} style={{fontSize: 9.5 * s, lineHeight: 12 * s, fontWeight: '600', color: c.text, textAlign: 'center', marginTop: 2 * s}}>{tag}</Text>
      <Text numberOfLines={1} style={{fontSize: 12.5 * s, lineHeight: 17 * s, fontWeight: '700', color: c.text, textAlign: 'center'}}>{text}</Text>
    </View>;
  }
  function valve(id: string, tag: string, x: number, y: number, vertical = false) {
    const value = state(id);
    const color = value === undefined ? c.neutral : value ? c.green : c.magenta;
    return <React.Fragment key={`valve-${id}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Inspect ${tag}`} onPress={() => inspect(id)} hitSlop={5} style={{...frame(x - 15, y - 15, 30, 30), justifyContent: 'center', alignItems: 'center'}}>
        <View pointerEvents="none" style={{width: 24 * s, height: 17 * s, flexDirection: 'row', alignItems: 'center', transform: [{rotate: vertical ? '90deg' : '0deg'}]}}>
          <View style={{width: 0, height: 0, borderTopWidth: 7 * s, borderBottomWidth: 7 * s, borderLeftWidth: 11 * s, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color}}/>
          <View style={{width: 0, height: 0, borderTopWidth: 7 * s, borderBottomWidth: 7 * s, borderRightWidth: 11 * s, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color}}/>
        </View>
        {value !== undefined && <Text pointerEvents="none" style={{position: 'absolute', left: 9 * s, top: -5 * s, fontSize: 9 * s, color, fontWeight: '700'}}>{value ? 'O' : 'C'}</Text>}
      </Pressable>
      {label(tag, vertical ? x + 15 : x - 46, vertical ? y - 9 : y - 31, 94, 9, c.text, vertical ? 'left' : 'center')}
    </React.Fragment>;
  }
  function machine(id: string, tag: string, title: string, x: number, y: number, kind: 'pump' | 'compressor' | 'exchanger' | 'engine' = 'pump', width = 90, height = 60) {
    const value = state(id);
    const color = value === undefined ? c.neutral : value ? c.green : c.magenta;
    const circle = kind === 'pump' || kind === 'compressor';
    return <React.Fragment key={`machine-${id}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Inspect ${tag}`} onPress={() => inspect(id)} style={{...frame(x, y, width, height), alignItems: 'center', justifyContent: 'center'}} hitSlop={4}>
        {kind === 'pump' ? <View pointerEvents="none" style={{position:'absolute',left:(width/2-1)*s,top:0,width:2*s,height:height/2*s,backgroundColor:c.liquid}}/> : <>
          <View pointerEvents="none" style={{position:'absolute',left:0,top:(height/2-1)*s,width:width/2*s,height:2*s,backgroundColor:id.startsWith('vaporizer')?c.liquid:c.gas}}/>
          <View pointerEvents="none" style={{position:'absolute',right:0,top:(height/2-1)*s,width:width/2*s,height:2*s,backgroundColor:c.gas}}/>
        </>}
        <View pointerEvents="none" style={{width: (circle ? 43 : width - 8) * s, height: (circle ? 43 : height - 10) * s, borderWidth: Math.max(.7, 1.6 * s), borderColor: color, borderRadius: (circle ? 24 : 2) * s, backgroundColor: '#414245', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: (kind === 'exchanger' ? 22 : 26) * s, color, fontWeight: '400'}}>{kind === 'pump' ? 'P' : kind === 'compressor' ? 'C' : kind === 'engine' ? 'M/E' : '≋'}</Text>
        </View>
        <View pointerEvents="none" style={{position: 'absolute', right: 0, top: 0, width: 7 * s, height: 7 * s, backgroundColor: color, borderColor: '#c9c9c9', borderWidth: .5 * s}}/>
      </Pressable>
      {label(tag, x - 15, y + height + 1, width + 30, 10, c.text, 'center')}
      {label(title, x - 35, y + height + 15, width + 70, 10, c.muted, 'center')}
    </React.Fragment>;
  }
  function vessel(id: string, tag: string, title: string, x: number, y: number, width: number, height: number) {
    return <React.Fragment key={`vessel-${id}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Inspect ${tag}`} onPress={() => inspect(id)} style={{...frame(x, y, width, height), backgroundColor: '#bdbdc2', borderColor: '#ededf0', borderWidth: Math.max(.8, 1.5 * s), borderRadius: width * .32 * s, alignItems: 'center', justifyContent: 'center'}}>
        <Text pointerEvents="none" style={{color: '#343438', fontWeight: '700', fontSize: 11 * s, textAlign: 'center', paddingHorizontal: 4 * s}}>{tag}{'\n'}{title}{'\n\n'}—</Text>
      </Pressable>
    </React.Fragment>;
  }
  function terminal(id: string, title: string, x: number, y: number, medium: 'liquid' | 'gas', down = false) {
    return <React.Fragment key={`terminal-${id}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Inspect ${title}`} onPress={() => inspect(id)} style={{...frame(x - 8, y - 8, 16, 16), borderWidth: Math.max(.7, s), borderColor: '#e6e6e6', backgroundColor: '#aaa9ad', alignItems: 'center', justifyContent: 'center'}}>
        <Text style={{fontSize: 12 * s, color: c[medium], lineHeight: 13 * s}}>{down ? '▼' : '▲'}</Text>
      </Pressable>
      {label(title, x - 60, down ? y + 13 : y - 37, 120, 10, c.text, 'center')}
    </React.Fragment>;
  }
  return {frame, label, line, joint, arrow, box, readout, valve, machine, vessel, terminal};
}
export type Symbols = ReturnType<typeof createSymbols>;
