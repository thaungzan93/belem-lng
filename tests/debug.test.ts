import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  appendDebugRecord,canCopyText,copyText,createDebugRecord,DEBUG_MAX_RECORDS,DEBUG_STORAGE_KEY,
  DebugLog,formatDiagnostics,parseDebugRecords,
} from '../src/debug/debug';
import type {DebugRecord,DebugStorage,DiagnosticsContext} from '../src/debug/debug';

function memoryStorage(initial: string | null = null) {
  const store: {value: string | null} = {value: initial};
  const adapter: DebugStorage = {
    getItem: async () => store.value,
    setItem: async (_key, next) => { store.value = next; },
    removeItem: async () => { store.value = null; },
  };
  return {store, adapter};
}

function context(): DiagnosticsContext {
  return {
    appVersion: '0.5.1',
    platform: 'android',
    watchStorageError: null,
    simulator: {running: false, elapsedSeconds: 120, settings: {heatIngressKw: 40, demandKgh: 500, pumpFlowM3h: 8, bunkerFlowM3h: 50}},
  };
}

test('Debug records need a level, source and message, and messages are capped', () => {
  const record = createDebugRecord('error', 'watch-storage', '  failed  ');
  assert.equal(record.level, 'error');
  assert.equal(record.source, 'watch-storage');
  assert.equal(record.message, 'failed');
  assert.equal(createDebugRecord('info', 'lifecycle', 'x'.repeat(600)).message.length, 500);
  assert.throws(() => createDebugRecord('fatal' as never, 'x', 'y'));
  assert.throws(() => createDebugRecord('info', ' ', 'y'));
  assert.throws(() => createDebugRecord('info', 'x', '   '));
});

test('Ring buffer keeps newest first and never exceeds 200 entries', () => {
  let records: DebugRecord[] = [];
  for (let i = 0; i < DEBUG_MAX_RECORDS + 50; i++) records = appendDebugRecord(records, createDebugRecord('info', 'test', `entry ${i}`));
  assert.equal(records.length, DEBUG_MAX_RECORDS);
  assert.equal(records[0].message, 'entry 249');
  assert.equal(records[DEBUG_MAX_RECORDS - 1].message, 'entry 50');
});

test('Stored JSON round-trips, and malformed stored logs fail safe to empty', async () => {
  assert.deepEqual(parseDebugRecords(null), []);
  assert.deepEqual(parseDebugRecords('[]'), []);
  assert.throws(() => parseDebugRecords('{"not":"an array"}'));
  assert.throws(() => parseDebugRecords('[{"id":1}]'));
  const {store, adapter} = memoryStorage();
  const log = new DebugLog(adapter);
  await log.record('warning', 'test', 'first');
  await log.record('error', 'test', 'second');
  assert.equal(store.value?.includes('second'), true);
  const reopened = new DebugLog(adapter);
  const records = await reopened.getRecords();
  assert.equal(records.length, 2);
  assert.equal(records[0].message, 'second');
  assert.equal(records[1].message, 'first');
  assert.equal(records[0].level, 'error');
});

test('A corrupt stored log reports a storage error instead of throwing', async () => {
  const {adapter} = memoryStorage('not json{');
  const log = new DebugLog(adapter);
  assert.deepEqual(await log.getRecords(), []);
  const snapshot = await log.getSnapshot(context());
  assert.match(snapshot.debugStorageError ?? '', /could not be opened/);
  assert.equal(snapshot.recordCount, 0);
});

test('Storage failures never throw into the caller and are reported on the snapshot', async () => {
  const failing: DebugStorage = {
    getItem: async () => null,
    setItem: async () => { throw new Error('disk full'); },
    removeItem: async () => {},
  };
  const log = new DebugLog(failing);
  await log.record('error', 'watch-storage', 'save failed');
  const snapshot = await log.getSnapshot(context());
  assert.match(snapshot.debugStorageError ?? '', /write failed/);
  assert.equal(snapshot.recordCount, 1);
  assert.equal(snapshot.lastErrorAt, snapshot.recordCount ? (await log.getRecords())[0].at : null);
});

test('A later successful save clears a previous storage error', async () => {
  const store: {value: string | null; fail: boolean} = {value: null, fail: true};
  const adapter: DebugStorage = {
    getItem: async () => store.value,
    setItem: async (_key, next) => { if (store.fail) throw new Error('disk full'); store.value = next; },
    removeItem: async () => { store.value = null; },
  };
  const log = new DebugLog(adapter);
  await log.record('error', 'test', 'first');
  assert.match((await log.getSnapshot(context())).debugStorageError ?? '', /write failed/);
  store.fail = false;
  await log.record('info', 'test', 'second');
  assert.equal((await log.getSnapshot(context())).debugStorageError, null);
});

test('Clear empties memory and storage', async () => {
  const {store, adapter} = memoryStorage();
  const log = new DebugLog(adapter);
  await log.record('info', 'test', 'one');
  assert.equal((await log.getRecords()).length, 1);
  await log.clear();
  assert.deepEqual(await log.getRecords(), []);
  assert.equal(store.value, null);
});

test('Snapshot carries version, platform, counts, errors and simulator config', async () => {
  const {adapter} = memoryStorage();
  const log = new DebugLog(adapter);
  await log.record('info', 'lifecycle', 'App started');
  await log.recordError('render', new Error('boom'));
  const snapshot = await log.getSnapshot({...context(), watchStorageError: 'Watch storage could not be opened'});
  assert.equal(snapshot.appVersion, '0.5.1');
  assert.equal(snapshot.platform, 'android');
  assert.equal(snapshot.recordCount, 2);
  assert.equal(snapshot.watchStorageError, 'Watch storage could not be opened');
  assert.equal(snapshot.debugStorageError, null);
  assert.equal(snapshot.lastErrorAt, (await log.getRecords())[0].at);
  assert.equal(snapshot.simulator?.elapsedSeconds, 120);
  assert.equal(snapshot.simulator?.settings.pumpFlowM3h, 8);
  assert.ok(snapshot.lastDebugSaveAt);
  assert.ok(snapshot.generatedAt);
});

test('Formatted diagnostics are one JSON document with snapshot and records', async () => {
  const {adapter} = memoryStorage();
  const log = new DebugLog(adapter);
  await log.record('info', 'test', 'hello');
  const snapshot = await log.getSnapshot(context());
  const parsed = JSON.parse(formatDiagnostics(snapshot, await log.getRecords())) as {snapshot: {appVersion: string}; records: DebugRecord[]};
  assert.equal(parsed.snapshot.appVersion, '0.5.1');
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].message, 'hello');
});

test('Debug storage key is versioned separately from the watch logbook', () => {
  assert.equal(DEBUG_STORAGE_KEY, 'belem-lng.debug.v1');
  assert.notEqual(DEBUG_STORAGE_KEY, 'belem-lng.logbook.v1');
});

test('Copy is unavailable in plain Node and reports the export fallback', async () => {
  assert.equal(canCopyText(), false);
  await assert.rejects(() => copyText('x'), /use Export instead/);
});
