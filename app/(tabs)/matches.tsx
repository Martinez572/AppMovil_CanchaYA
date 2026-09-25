import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface UserMatch {
  id: string;
  sport: string;
  location_name: string;
  date_time: string;
  total_players_needed: number;
  joined_players_count: number;
  notes: string | null;
  google_maps_url?: string;
}

export default function MyMatchesScreen() {
  const router = useRouter();

  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyMatches = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Consultar los partidos a los que se ha unido el usuario
      const { data, error } = await supabase
        .from('match_players')
        .select(`
          matches (
            id,
            sport,
            location_name,
            date_time,
            total_players_needed,
            joined_players_count,
            notes,
            google_maps_url
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (data) {
        const formatted = data
          .map((item: any) => item.matches)
          .filter((m: any) => m !== null);
        setMatches(formatted);
      } else {
        setMatches([]);
      }
    } catch (e) {
      console.error('Error obteniendo mis partidos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyMatches();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyMatches();
  };

  const formatMatchDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} • ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return 'Fecha por confirmar';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.phoneContainer}>
        
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Mis Partidos</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#84cc16" />
          }
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#84cc16" />
              <Text style={styles.loadingText}>Cargando tus partidos...</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="football-outline" size={56} color="#a1a1aa" />
              <Text style={styles.emptyTitle}>Sin partidos registrados</Text>
              <Text style={styles.emptySubtitle}>Aún no te has unido a ningún encuentro ni has organizado uno.</Text>
              
              <TouchableOpacity 
                style={styles.primaryPillBtn} 
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.primaryPillBtnText}>Explorar Partidos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            matches.map((item) => (
              <View key={item.id} style={styles.matchCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.sportBadge}>
                    <Text style={styles.sportBadgeText}>{item.sport}</Text>
                  </View>
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedText}>CONFIRMADO</Text>
                  </View>
                </View>

                <Text style={styles.locationTitle}>{item.location_name}</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color="#65a30d" style={{ marginRight: 8 }} />
                  <Text style={styles.infoText}>{formatMatchDate(item.date_time)}</Text>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>"{item.notes}"</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5', alignItems: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingTop: 48, paddingHorizontal: 20 },
  topHeader: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#18181b' },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { color: '#71717a', marginTop: 12, fontSize: 15 },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7', marginTop: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#18181b', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#71717a', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  primaryPillBtn: { backgroundColor: '#a3e635', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999 },
  primaryPillBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
  matchCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e4e4e7', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sportBadge: { backgroundColor: '#a3e635', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  sportBadgeText: { color: '#09090b', fontWeight: 'bold', fontSize: 13 },
  confirmedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  confirmedText: { color: '#15803d', fontSize: 11, fontWeight: 'bold' },
  locationTitle: { fontSize: 18, fontWeight: 'bold', color: '#18181b', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 15, color: '#27272a', fontWeight: '600' },
  notesBox: { backgroundColor: '#f4f4f5', borderRadius: 12, padding: 10, marginTop: 8 },
  notesText: { fontSize: 13, color: '#52525b', fontStyle: 'italic' },
});