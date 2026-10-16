import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://gtjrwioldisigxqxdzvd.supabase.co';
// Asegúrate de colocar tu llave anon completa
const supabaseAnonKey = 'sb_publishable_fqik_vI7BksI2qxsoWpORQ_bDGIDkta';

// Memoria caché de respaldo inmediato para dispositivos móviles
const memoryStore: Record<string, string> = {};

const HybridStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }

    // 1. Intentar responder inmediatamente desde memoria caché
    if (memoryStore[key]) {
      return memoryStore[key];
    }

    // 2. Si no está en memoria, consultar AsyncStorage
    try {
      const val = await AsyncStorage.getItem(key);
      if (val) memoryStore[key] = val;
      return val;
    } catch (e) {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Guardar siempre en memoria inmediatamente
    memoryStore[key] = value;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Fallo no crítico
    }
  },

  removeItem: async (key: string): Promise<void> => {
    delete memoryStore[key];

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Fallo no crítico
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: HybridStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});