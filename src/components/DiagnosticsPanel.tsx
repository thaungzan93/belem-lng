import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {DebugRecord,DiagnosticsSnapshot} from '../debug/debug';
import {canCopyText} from '../debug/debug';

interface DiagnosticsPanelProps {
  snapshot: DiagnosticsSnapshot | null;
  records: DebugRecord[];
  busy: boolean;
  status: string;
  error: string;
  onRefresh: () => void;
  onCopy: () => void;
  onExport: () => void;
  onClear: () => void;
}

function Row({label, value}: {label: string; value: string}) {
  return <View style={s.row}><Text style={s.label}>{label}</Text><Text style={s.text}>{value}</Text></View>;
}

/**
 * Presentational diagnostics section for the settings screen. All data and
 * actions come from props so the panel itself touches no storage; App.tsx
 * owns the debug log instance. Copy appears only where a web clipboard
 * exists; native builds use Export (system share sheet) instead.
 */
export function DiagnosticsPanel({snapshot, records, busy, status, error, onRefresh, onCopy, onExport, onClear}: DiagnosticsPanelProps) {
  const settings = snapshot?.simulator?.settings;
  return <View>
    <Text style={s.muted}>The debug log stays on this device. It records app starts, watch-storage failures and render crashes (newest first, at most 200 entries). Export it when reporting a problem; it never leaves the device on its own.</Text>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh diagnostics" onPress={onRefresh} disabled={busy} style={[s.button, busy && s.disabled]}><Text style={s.buttonText}>{busy ? 'Refreshing…' : 'Refresh diagnostics'}</Text></Pressable>
      {canCopyText() && <Pressable accessibilityRole="button" accessibilityLabel="Copy diagnostics" onPress={onCopy} disabled={busy || !snapshot} style={[s.button, (busy || !snapshot) && s.disabled]}><Text style={s.buttonText}>Copy</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Export diagnostics" onPress={onExport} disabled={busy || !snapshot} style={[s.button, (busy || !snapshot) && s.disabled]}><Text style={s.buttonText}>Export</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear debug log" onPress={onClear} disabled={busy} style={[s.button, busy && s.disabled]}><Text style={s.buttonText}>Clear log</Text></Pressable>
    </View>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!status && <Text style={s.success}>{status}</Text>}
    {!snapshot && <Text style={s.text}>Press "Refresh diagnostics" to load the snapshot.</Text>}
    {snapshot && <View style={s.block}>
      <Row label="App version" value={snapshot.appVersion} />
      <Row label="Platform" value={snapshot.platform} />
      <Row label="Snapshot taken" value={snapshot.generatedAt} />
      <Row label="Log entries" value={String(snapshot.recordCount)} />
      <Row label="Last debug save" value={snapshot.lastDebugSaveAt ?? 'never'} />
      <Row label="Last error" value={snapshot.lastErrorAt ?? 'none'} />
      <Row label="Debug storage" value={snapshot.debugStorageError ?? 'ok'} />
      <Row label="Watch storage" value={snapshot.watchStorageError ?? 'ok'} />
      <Row label="Simulator" value={snapshot.simulator ? `${snapshot.simulator.running ? 'running' : 'stopped'} · ${snapshot.simulator.elapsedSeconds.toFixed(0)} s elapsed` : 'unavailable'} />
      {settings && <Row label="Training settings" value={`heat ${settings.heatIngressKw} kW · demand ${settings.demandKgh} kg/h · pump ${settings.pumpFlowM3h} m³/h · bunker ${settings.bunkerFlowM3h} m³/h`} />}
    </View>}
    {records.slice(0, 50).map((record) => <View key={record.id} style={s.entry}>
      <Text style={s.entryHead}>{record.at} · {record.level.toUpperCase()} · {record.source}</Text>
      <Text style={s.text}>{record.message}</Text>
    </View>)}
  </View>;
}
const s = StyleSheet.create({
  muted: {color: '#d0ccd3', fontSize: 12, lineHeight: 19, marginBottom: 10},
  text: {color: '#f0eff2', fontSize: 13, lineHeight: 21},
  label: {color: '#d0ccd3', fontSize: 12, flex: 1, minWidth: 130},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4, borderBottomWidth: 1, borderColor: '#77717f'},
  block: {marginTop: 10},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10},
  button: {backgroundColor: '#676477', borderColor: '#b9b3c5', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, minHeight: 44, justifyContent: 'center'},
  buttonText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  disabled: {opacity: 0.45},
  error: {color: '#ffb0aa', fontSize: 14, marginTop: 10, marginBottom: 8},
  success: {color: '#b4ed50', fontSize: 14, marginTop: 10, marginBottom: 8},
  entry: {paddingVertical: 8, borderBottomWidth: 1, borderColor: '#77717f'},
  entryHead: {color: '#d0ccd3', fontSize: 11, fontFamily: 'monospace', marginBottom: 4},
});
