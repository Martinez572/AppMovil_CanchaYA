import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

interface Match {
  id: string;
  sport: string;
  location_name: string;
  date_time: string;
  total_players_needed: number;
  joined_players_count: number;
  notes: string | null;
  profiles?: { full_name: string };
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, t } = useTheme();

  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSportFilter, setSelectedSportFilter] = useState('Todos');

  // Filtros dinámicos con traducciones
  const sportsFilterList = [
    { id: '0', key: 'Todos', labelKey: 'filterAll', icon: 'grid-outline' },
    { id: '1', key: 'Fútbol', labelKey: 'filterSoccer', icon: 'football' },
    { id: '2', key: 'Padel', labelKey: 'filterPadel', icon: 'tennisball' },
    { id: '3', key: 'Tenis', labelKey: 'filterTennis', icon: 'baseball' },
    { id: '4', key: 'Basket', labelKey: 'filterBasketball', icon: 'basketball' },
    { id: '5', key: 'Voleibol', labelKey: 'filterVolleyball', icon: 'trophy-outline' },
    { id: '6', key: 'Ciclismo', labelKey: 'filterCycling', icon: 'bicycle' },
    { id: '7', key: 'Running', labelKey: 'filterRunning', icon: 'walk' },
  ];

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        setUserName(profile?.full_name || session.user.user_metadata?.full_name || t('player'));
      } else {
        setIsLoggedIn(false);
        setUserName(null);
      }
    } catch (e) {
      console.log('Error perfil:', e);
    }
  };

  const fetchMatches = async () => {
    try {
      let query = supabase
        .from('matches')
        .select(`
          id, sport, location_name, date_time,
          total_players_needed, joined_players_count, notes, status,
          profiles:creator_id ( full_name )
        `)
        .eq('status', 'open')
        .order('date_time', { ascending: true });

      if (selectedSportFilter !== 'Todos') {
        query = query.eq('sport', selectedSportFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const formatted: Match[] = data.map((item: any) => ({
          ...item,
          profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        }));
        setMatches(formatted);
      } else {
        setMatches([]);
      }
    } catch (error: any) {
      console.error('Error convocatorias:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchMatches();
    }, [selectedSportFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
    fetchMatches();
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
      return t('dateTbd');
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      const msg = t('loginRequiredMsg');
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert(t('loginRequiredTitle'), msg, [
        { text: t('cancelBtn'), style: 'cancel' },
        { text: t('enter'), onPress: () => router.push('/auth/login') }
      ]);
      return;
    }

    try {
      const { error } = await supabase.from('match_players').insert([
        { match_id: matchId, user_id: session.user.id, status: 'confirmed' }
      ]);

      if (error) {
        if (error.code === '23505') throw new Error(t('alreadyJoined'));
        throw error;
      }

      const okMsg = t('joinSuccess');
      Platform.OS === 'web' ? window.alert(okMsg) : Alert.alert('OK', okMsg);
      fetchMatches();
    } catch (err: any) {
      const errorText = err.message || 'Error';
      Platform.OS === 'web' ? window.alert(errorText) : Alert.alert('Atención', errorText);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.phoneContainer}>
        
        {/* Cabecera */}
        <View style={styles.topHeader}>
          <View>
            {isLoggedIn ? (
              <>
                <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>{t('welcome')}</Text>
                <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>{userName || t('player')}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
                  Cancha<Text style={{ color: colors.accentDark }}>YA</Text>
                </Text>
                <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>{t('findMatches')}</Text>
              </>
            )}
          </View>

          {isLoggedIn ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
              <Ionicons name="person-circle-outline" size={40} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.loginPillBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.loginPillText}>{t('enter')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros Traducidos */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sportsFilterList.map((sport) => {
              const isSelected = selectedSportFilter === sport.key;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.filterChip, 
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => setSelectedSportFilter(sport.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={sport.icon as any} 
                    size={18} 
                    color={isSelected ? '#09090b' : colors.textSecondary} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[
                    styles.filterChipText, 
                    { color: colors.textSecondary },
                    isSelected && { color: '#09090b', fontWeight: 'bold' }
                  ]}>
                    {t(sport.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista de Partidos */}
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 100 }} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('availableMatches')}
            </Text>
            <Text style={[styles.matchCountBadge, { backgroundColor: colors.card, color: colors.accentDark, borderColor: colors.cardBorder }]}>
              {matches.length} {t('activeMatches')}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={{ color: colors.textSecondary, marginTop: 10 }}>{t('loadingMatches')}</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="calendar-clear-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noMatchesTitle')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {selectedSportFilter === 'Todos' ? t('noMatchesSubAll') : t('noMatchesSubFilter')}
              </Text>

              <TouchableOpacity 
                style={[styles.primaryPillBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/match/create')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={20} color="#09090b" style={{ marginRight: 8 }} />
                <Text style={styles.primaryPillBtnText}>{t('organizeMatch')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            matches.map((item) => {
              const spotsLeft = item.total_players_needed - item.joined_players_count;
              const isFull = spotsLeft <= 0;

              return (
                <View key={item.id} style={[styles.matchBentoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.sportTag, { backgroundColor: colors.accent }]}>
                      <Ionicons name="trophy-outline" size={16} color="#09090b" style={{ marginRight: 6 }} />
                      <Text style={styles.sportTagText}>{item.sport}</Text>
                    </View>

                    <View style={[styles.spotsBadge, { backgroundColor: colors.inputBg }, isFull && { backgroundColor: '#fef2f2' }]}>
                      <Text style={[styles.spotsBadgeText, { color: colors.accentDark }, isFull && { color: '#dc2626' }]}>
                        {isFull ? t('fullBadge') : `${t('spotsLeft')}: ${spotsLeft}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.locationTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.location_name}
                  </Text>

                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color={colors.accentDark} style={{ marginRight: 8 }} />
                    <Text style={[styles.infoText, { color: colors.textPrimary }]}>{formatMatchDate(item.date_time)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={[styles.organizerText, { color: colors.textSecondary }]}>
                      {t('organizedBy')} <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{item.profiles?.full_name || t('player')}</Text>
                    </Text>
                  </View>

                  {item.notes ? (
                    <View style={[styles.notesBox, { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.notesText, { color: colors.textSecondary }]}>"{item.notes}"</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity 
                    style={[
                      styles.joinBtn, 
                      { backgroundColor: colors.accent }, 
                      isFull && { backgroundColor: colors.cardBorder }
                    ]}
                    onPress={() => !isFull && handleJoinMatch(item.id)}
                    disabled={isFull}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.joinBtnText, isFull && { color: colors.textSecondary }]}>
                      {isFull ? t('matchFull') : t('joinMatch')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.fabButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/match/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={32} color="#09090b" />
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingTop: 48, paddingHorizontal: 20 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingTitle: { fontSize: 28, fontWeight: 'bold' },
  greetingSubtitle: { fontSize: 15, fontWeight: '500' },
  loginPillBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9999 },
  loginPillText: { color: '#09090b', fontWeight: 'bold', fontSize: 15 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, marginRight: 8, borderWidth: 1 },
  filterChipText: { fontSize: 14, fontWeight: '600' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  matchCountBadge: { fontSize: 13, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: { borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, marginTop: 10, elevation: 2 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  primaryPillBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999, flexDirection: 'row', alignItems: 'center' },
  primaryPillBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
  matchBentoCard: { borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, elevation: 2 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sportTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  sportTagText: { color: '#09090b', fontWeight: 'bold', fontSize: 13 },
  spotsBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  spotsBadgeText: { fontSize: 12, fontWeight: 'bold' },
  locationTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 15, fontWeight: '600' },
  organizerText: { fontSize: 14 },
  notesBox: { borderRadius: 14, padding: 12, marginTop: 6, marginBottom: 12 },
  notesText: { fontSize: 14, fontStyle: 'italic' },
  joinBtn: { height: 50, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  joinBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
  fabButton: { position: 'absolute', bottom: 24, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6 },
});