import type {PlantConfig} from '../engine/lng';

/**
 * Offline diagnostics: a bounded, persisted ring buffer of app events.
 * No network, no new dependencies. The core never imports AsyncStorage or
 * React Native, so it stays importable in plain Node tests; the app wires
 * it to AsyncStorage through src/debug/storage.ts.
 *
 * Failure safety is the point: a diagnostics failure is remembered on the
 * snapshot and never thrown into app code, so the log can never break the
 * screen it is diagnosing.
 */

export type DebugLevel = 'error' | 'warning' | 'info';
export interface DebugRecord {id: string; at: string; level: DebugLevel; source: string; message: string}
export interface DebugStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface SimulatorSummary {
  running: boolean;
  elapsedSeconds: number;
  settings: Pick<PlantConfig, 'heatIngressKw' | 'demandKgh' | 'pumpFlowM3h' | 'bunkerFlowM3h'>;
}
export interface DiagnosticsContext {
  appVersion: string;
  platform: string;
  watchStorageError: string | null;
  /** Null when the snapshot is taken after a render crash, where the plant state is unavailable. */
  simulator: SimulatorSummary | null;
}
export interface DiagnosticsSnapshot {
  appVersion: string;
  platform: string;
  generatedAt: string;
  recordCount: number;
  lastDebugSaveAt: string | null;
  lastErrorAt: string | null;
  debugStorageError: string | null;
  watchStorageError: string | null;
  simulator: SimulatorSummary | null;
}

export const DEBUG_STORAGE_KEY = 'belem-lng.debug.v1';
export const DEBUG_MAX_RECORDS = 200;
const MAX_MESSAGE_LENGTH = 500;

let nextId = 0;
export function createDebugRecord(level: DebugLevel, source: string, message: string): DebugRecord {
  if (level !== 'error' && level !== 'warning' && level !== 'info') throw new Error('Unknown debug level');
  if (!source.trim()) throw new Error('Debug record needs a source');
  const text = message.trim();
  if (!text) throw new Error('Debug record needs a message');
  const id = `${new Date().toISOString()}-${Date.now().toString(36)}-${(++nextId).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {id, at: new Date().toISOString(), level, source, message: text.slice(0, MAX_MESSAGE_LENGTH)};
}

/** Newest first, capped so the stored log cannot grow without bound. */
export function appendDebugRecord(records: DebugRecord[], record: DebugRecord): DebugRecord[] {
  return [record, ...records].slice(0, DEBUG_MAX_RECORDS);
}

export function parseDebugRecords(raw: string | null): DebugRecord[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Debug log has an unsupported format');
  return parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('Debug log entry is invalid');
    const entry = value as Record<string, unknown>;
    const {id, at, source, message, level} = entry;
    if (typeof id !== 'string' || typeof at !== 'string' || typeof source !== 'string' || typeof message !== 'string') throw new Error('Debug log entry is invalid');
    if (level !== 'error' && level !== 'warning' && level !== 'info') throw new Error('Debug log entry has an unknown level');
    const record: DebugRecord = {id, at, level, source, message};
    return record;
  }).slice(0, DEBUG_MAX_RECORDS);
}

/** One JSON document: snapshot plus records, ready for copy or share-sheet export. */
export function formatDiagnostics(snapshot: DiagnosticsSnapshot, records: DebugRecord[]): string {
  return JSON.stringify({snapshot, records}, null, 2);
}

/** True only where a web clipboard exists; native builds use the share-sheet export instead. */
export function canCopyText(): boolean {
  const nav = (globalThis as {navigator?: {clipboard?: unknown}}).navigator;
  return !!nav?.clipboard;
}

export async function copyText(text: string): Promise<void> {
  const nav = (globalThis as {navigator?: {clipboard?: {writeText: (text: string) => Promise<void>}}}).navigator;
  if (!nav?.clipboard) throw new Error('Copy is unavailable here; use Export instead');
  await nav.clipboard.writeText(text);
}

const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

export class DebugLog {
  private storage: DebugStorage;
  private records: DebugRecord[] | null = null;
  private loaded = false;
  private queue: Promise<void> = Promise.resolve();
  private lastSaveAt: string | null = null;
  private lastError: string | null = null;

  constructor(storage: DebugStorage) { this.storage = storage; }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      this.records = parseDebugRecords(await this.storage.getItem(DEBUG_STORAGE_KEY));
    } catch (e) {
      this.records = [];
      this.lastError = `Debug log could not be opened: ${errorText(e)}`;
    }
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => {});
    return run;
  }

  /** Appends a record and persists the ring. Never throws into app code. */
  record(level: DebugLevel, source: string, message: string): Promise<void> {
    return this.enqueue(async () => {
      try {
        await this.ensureLoaded();
        const entry = createDebugRecord(level, source, message);
        this.records = appendDebugRecord(this.records ?? [], entry);
        await this.persist();
      } catch (e) {
        this.lastError = `Debug log write failed: ${errorText(e)}`;
      }
    });
  }

  recordError(source: string, error: unknown): Promise<void> {
    return this.record('error', source, errorText(error));
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(this.records ?? []));
    this.lastSaveAt = new Date().toISOString();
    this.lastError = null;
  }

  async getRecords(): Promise<DebugRecord[]> {
    await this.ensureLoaded();
    return [...(this.records ?? [])];
  }

  /** Clears memory and storage. Never throws into app code. */
  clear(): Promise<void> {
    return this.enqueue(async () => {
      try {
        await this.storage.removeItem(DEBUG_STORAGE_KEY);
        this.records = [];
        this.lastSaveAt = null;
        this.lastError = null;
      } catch (e) {
        this.lastError = `Debug log clear failed: ${errorText(e)}`;
      }
    });
  }

  async getSnapshot(context: DiagnosticsContext): Promise<DiagnosticsSnapshot> {
    const records = await this.getRecords();
    const lastErrorRecord = records.find((record) => record.level === 'error');
    return {
      appVersion: context.appVersion,
      platform: context.platform,
      generatedAt: new Date().toISOString(),
      recordCount: records.length,
      lastDebugSaveAt: this.lastSaveAt,
      lastErrorAt: lastErrorRecord?.at ?? null,
      debugStorageError: this.lastError,
      watchStorageError: context.watchStorageError,
      simulator: context.simulator,
    };
  }
}
