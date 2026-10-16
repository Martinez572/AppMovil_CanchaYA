import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

interface UserMatch {
  id: string;
  sport: string;
  location_name: string;
  date_time: string;
  total_players_needed: number;
  joined_players_count: number;
  notes: string | null;
}

export default function MyMatchesScreen() {
  const router = useRouter();
  const { colors, t } = useTheme();

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

      const { data, error } = await supabase
        .from('match_players')
        .select(`
          matches (
            id, sport, location_name, date_time, total_players_needed, joined_players_count, notes
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
      console.error('Error mis partidos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyMatches();
    }, [])
  );

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.phoneContainer}>
        
        <View style={styles.topHeader}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mis Partidos</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : matches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="football-outline" size={56} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noMatches')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aún no te has unido a ningún encuentro.
              </Text>
              
              <TouchableOpacity 
                style={[styles.primaryPillBtn, { backgroundColor: colors.accent }]} 
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryPillBtnText}>Explorar Partidos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            matches.map((item) => (
              <View key={item.id} style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.sportBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.sportBadgeText}>{item.sport}</Text>
                  </View>
                  <View style={[styles.confirmedBadge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.confirmedText, { color: colors.accentDark }]}>CONFIRMADO</Text>
                  </View>
                </View>

                <Text style={[styles.locationTitle, { color: colors.textPrimary }]}>{item.location_name}</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color={colors.accentDark} style={{ marginRight: 8 }} />
                  <Text style={[styles.infoText, { color: colors.textPrimary }]}>{formatMatchDate(item.date_time)}</Text>
                </View>

                {item.notes ? (
                  <View style={[styles.notesBox, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>"{item.notes}"</Text>
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
  container: { flex: 1, alignItems: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingTop: 48, paddingHorizontal: 20 },
  topHeader: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: { borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  primaryPillBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999 },
  primaryPillBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
  matchCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sportBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  sportBadgeText: { color: '#09090b', fontWeight: 'bold', fontSize: 13 },
  confirmedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  confirmedText: { fontSize: 11, fontWeight: 'bold' },
  locationTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 15, fontWeight: '600' },
  notesBox: { borderRadius: 12, padding: 10, marginTop: 8 },
  notesText: { fontSize: 13, fontStyle: 'italic' },
});