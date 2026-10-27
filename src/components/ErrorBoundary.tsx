import React from 'react';
import {Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {DebugLog} from '../debug/debug';
import {canCopyText,copyText,formatDiagnostics} from '../debug/debug';
import {deliverFile} from '../storage/exportFile';

interface ErrorBoundaryProps {debugLog: DebugLog; appVersion: string; children: React.ReactNode}
interface ErrorBoundaryState {error: Error | null; status: string; exportError: string}

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

/**
 * Render-crash recovery screen. A render error used to leave a blank screen
 * with no way to report it; the boundary now records the crash in the debug
 * log and offers diagnostics export. "Try again" re-renders with the same app
 * state, so if the saved state itself is corrupt the screen reappears — in
 * that case export diagnostics, then clear app storage and reopen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {error: null, status: '', exportError: ''};

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {error};
  }

  componentDidCatch(error: Error): void {
    void this.props.debugLog.recordError('render', error);
  }

  private retry = (): void => { this.setState({error: null, status: '', exportError: ''}); };

  private buildDiagnostics = async (): Promise<string> => {
    const records = await this.props.debugLog.getRecords();
    const snapshot = await this.props.debugLog.getSnapshot({
      appVersion: this.props.appVersion,
      platform: Platform.OS,
      watchStorageError: null,
      simulator: null,
    });
    return formatDiagnostics(snapshot, records);
  };

  private copyDiagnostics = async (): Promise<void> => {
    this.setState({status: '', exportError: ''});
    try {
      await copyText(await this.buildDiagnostics());
      this.setState({status: 'Diagnostics copied.'});
    } catch (e) {
      this.setState({exportError: message(e)});
    }
  };

  private exportDiagnostics = async (): Promise<void> => {
    this.setState({status: '', exportError: ''});
    try {
      await deliverFile(await this.buildDiagnostics(), 'belem-lng-diagnostics.json', 'application/json');
      this.setState({status: 'Diagnostics export prepared.'});
    } catch (e) {
      this.setState({exportError: message(e)});
    }
  };

  render(): React.ReactNode {
    const {error, status, exportError} = this.state;
    if (!error) return this.props.children;
    return <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>SOMETHING WENT WRONG</Text>
      <Text style={s.text}>The app hit a render error instead of showing a blank screen. The error was recorded in the offline debug log, which stays on this device.</Text>
      <Text accessibilityRole="alert" style={s.error}>{message(error)}</Text>
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={this.retry} style={s.button}><Text style={s.buttonText}>Try again</Text></Pressable>
        {canCopyText() && <Pressable accessibilityRole="button" accessibilityLabel="Copy diagnostics" onPress={this.copyDiagnostics} style={s.button}><Text style={s.buttonText}>Copy diagnostics</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="Export diagnostics" onPress={this.exportDiagnostics} style={s.button}><Text style={s.buttonText}>Export diagnostics</Text></Pressable>
      </View>
      {!!status && <Text style={s.success}>{status}</Text>}
      {!!exportError && <Text accessibilityRole="alert" style={s.error}>{exportError}</Text>}
      <Text style={s.small}>If "Try again" returns here, export diagnostics, then clear app storage and reopen. Watch records are untouched by this screen.</Text>
    </ScrollView>;
  }
}
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#242629'},
  content: {padding: 16},
  title: {color: '#b1ff54', fontSize: 18, fontWeight: '700', marginBottom: 12},
  text: {color: '#f0eff2', fontSize: 13, lineHeight: 21, marginBottom: 12},
  small: {color: '#bdc0c8', fontSize: 11, lineHeight: 17, marginTop: 12},
  error: {color: '#ffb6a3', fontSize: 12, lineHeight: 19, marginBottom: 12},
  success: {color: '#b4ed50', fontSize: 13, marginTop: 10},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  button: {paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#605e6b', borderWidth: 1, borderColor: '#aba6b7', minHeight: 42, justifyContent: 'center'},
  buttonText: {fontSize: 12, color: '#fff', fontWeight: '600'},
});
