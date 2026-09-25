import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface UserProfileData {
  full_name: string;
  email: string;
  phone?: string;
  preferred_sport?: string;
  sports_interests?: string[];
  reputation_score?: number;
}

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo perfil:', error);
      }

      setProfile({
        full_name: data?.full_name || session.user.user_metadata?.full_name || 'Deportista CanchaYa',
        email: session.user.email || data?.email || '',
        phone: data?.phone || session.user.user_metadata?.phone || 'No registrado',
        preferred_sport: data?.preferred_sport || session.user.user_metadata?.preferred_sport || 'Fútbol',
        sports_interests: data?.sports_interests || session.user.user_metadata?.sports_interests || ['Fútbol'],
        reputation_score: data?.reputation_score || 5.0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const msg = 'Sesión cerrada correctamente.';
    Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Sesión Cerrada', msg);
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#84cc16" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.phoneContainer}>
          <View style={styles.emptyCard}>
            <Ionicons name="person-circle-outline" size={64} color="#a1a1aa" />
            <Text style={styles.emptyTitle}>Sin Sesión Activa</Text>
            <Text style={styles.emptySubtitle}>Inicia sesión o regístrate para gestionar tu perfil e historial de partidos.</Text>
            
            <TouchableOpacity 
              style={styles.primaryPillBtn} 
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.primaryPillBtnText}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.phoneContainer}>
        
        {/* Cabecera */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          {/* Tarjeta Bento Perfil Real */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={44} color="#09090b" />
            </View>

            <Text style={styles.profileName}>{profile.full_name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>5.0</Text>
                <Text style={styles.statLabel}>Calificación</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profile.phone}</Text>
                <Text style={styles.statLabel}>Celular</Text>
              </View>
            </View>
          </View>

          {/* Deportes de Interés Reales */}
          <Text style={styles.sectionTitle}>Mis Deportes de Interés</Text>
          <View style={styles.sportsGrid}>
            {profile.sports_interests?.map((sport, idx) => (
              <View key={idx} style={styles.sportChip}>
                <Ionicons name="checkmark-circle" size={18} color="#09090b" style={{ marginRight: 6 }} />
                <Text style={styles.sportChipText}>{sport}</Text>
              </View>
            ))}
          </View>

          {/* Opciones */}
          <Text style={styles.sectionTitle}>Ajustes de Cuenta</Text>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#18181b" style={{ marginRight: 12 }} />
              <Text style={styles.optionText}>Seguridad y Contraseña</Text>
              <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 12 }} />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5', alignItems: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingTop: 48, paddingHorizontal: 20 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#18181b' },
  logoutBtn: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 9999, borderWidth: 1, borderColor: '#fca5a5' },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7', elevation: 2, marginBottom: 20 },
  avatarCircle: { backgroundColor: '#a3e635', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#18181b' },
  profileEmail: { fontSize: 14, color: '#71717a', marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, borderTopColor: '#f4f4f5', paddingTop: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: '#18181b' },
  statLabel: { fontSize: 12, color: '#71717a', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#e4e4e7' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#18181b', marginBottom: 12 },
  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sportChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a3e635', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999 },
  sportChipText: { fontSize: 14, fontWeight: 'bold', color: '#09090b' },
  optionsCard: { backgroundColor: '#ffffff', borderRadius: 24, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e4e4e7', elevation: 1 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#18181b' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7', marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#18181b', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#71717a', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  primaryPillBtn: { backgroundColor: '#a3e635', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999 },
  primaryPillBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
});