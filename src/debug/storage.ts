import AsyncStorage from '@react-native-async-storage/async-storage';
import type {DebugStorage} from './debug';

/**
 * AsyncStorage adapter for the debug ring buffer. Kept in its own module so
 * the debug core stays importable in plain Node tests, where the native
 * AsyncStorage module cannot load.
 */
export const asyncDebugStorage: DebugStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
