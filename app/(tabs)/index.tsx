import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabase';

interface Match {
  id: string;
  sport: string;
  location_name: string;
  latitude: number;
  longitude: number;
  date_time: string;
  total_players_needed: number;
  joined_players_count: number;
  notes: string | null;
  status: string;
  profiles?: {
    full_name: string;
  };
}

export default function HomeScreen() {
  const router = useRouter();

  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedSportFilter, setSelectedSportFilter] = useState('Todos');

  const sportsFilterList = [
    { id: '0', name: 'Todos', icon: 'grid-outline' },
    { id: '1', name: 'Fútbol', icon: 'football' },
    { id: '2', name: 'Padel', icon: 'tennisball' },
    { id: '3', name: 'Tenis', icon: 'baseball' },
    { id: '4', name: 'Basket', icon: 'basketball' },
    { id: '5', name: 'Voleibol', icon: 'trophy-outline' },
    { id: '6', name: 'Ciclismo', icon: 'bicycle' },
    { id: '7', name: 'Running', icon: 'walk' },
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

        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          setUserName(session.user.user_metadata?.full_name || 'Deportista');
        }
      } else {
        setIsLoggedIn(false);
        setUserName(null);
      }
    } catch (e) {
      console.log('Error al obtener usuario:', e);
    }
  };

  const fetchMatches = async () => {
    try {
      let query = supabase
        .from('matches')
        .select(`
          id,
          sport,
          location_name,
          latitude,
          longitude,
          date_time,
          total_players_needed,
          joined_players_count,
          notes,
          status,
          profiles:creator_id (
            full_name
          )
        `)
        .eq('status', 'open')
        .order('date_time', { ascending: true });

      if (selectedSportFilter !== 'Todos') {
        query = query.eq('sport', selectedSportFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedMatches: Match[] = data.map((item: any) => ({
          id: item.id,
          sport: item.sport,
          location_name: item.location_name,
          latitude: item.latitude,
          longitude: item.longitude,
          date_time: item.date_time,
          total_players_needed: item.total_players_needed,
          joined_players_count: item.joined_players_count,
          notes: item.notes,
          status: item.status,
          profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        }));

        setMatches(formattedMatches);
      } else {
        setMatches([]);
      }
    } catch (error: any) {
      console.error('Error cargando encuentros desde Supabase:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchMatches();
  }, [selectedSportFilter]);

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
      
      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const monthName = months[d.getMonth()];
      
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      return `${dayName} ${dayNum} ${monthName} • ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return 'Fecha por confirmar';
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      const msg = 'Debes iniciar sesión para unirte a un partido.';
      if (Platform.OS === 'web') {
        window.alert(msg);
        router.push('/auth/login');
      } else {
        Alert.alert('Sesión Requerida', msg, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => router.push('/auth/login') }
        ]);
      }
      return;
    }

    try {
      const { error } = await supabase.from('match_players').insert([
        {
          match_id: matchId,
          user_id: session.user.id,
          status: 'confirmed',
        }
      ]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya estás registrado en este encuentro.');
        }
        throw error;
      }

      const okMsg = '¡Te has unido al partido correctamente!';
      Platform.OS === 'web' ? window.alert(okMsg) : Alert.alert('¡Excelente!', okMsg);
      fetchMatches();
    } catch (err: any) {
      const errorText = err.message || 'No se pudo completar la solicitud.';
      Platform.OS === 'web' ? window.alert(errorText) : Alert.alert('Atención', errorText);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.phoneContainer}>
        
        {/* CABECERA EN TEMA CLARO */}
        <View style={styles.topHeader}>
          <View>
            {isLoggedIn ? (
              <>
                <Text style={styles.greetingSubtitle}>Bienvenido de vuelta,</Text>
                <Text style={styles.greetingTitle}>{userName || 'Jugador'}</Text>
              </>
            ) : (
              <>
                <Text style={styles.greetingTitle}>Cancha<Text style={{ color: '#65a30d' }}>YA</Text></Text>
                <Text style={styles.greetingSubtitle}>Encuentra partidos cerca de ti</Text>
              </>
            )}
          </View>

          {isLoggedIn ? (
            <TouchableOpacity 
              style={styles.profileBadgeBtn}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={38} color="#18181b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.loginPillBtn}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.loginPillText}>Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FILTROS POR DEPORTE */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {sportsFilterList.map((sport) => {
              const isSelected = selectedSportFilter === sport.name;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                  onPress={() => setSelectedSportFilter(sport.name)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={sport.icon as any} 
                    size={18} 
                    color={isSelected ? '#09090b' : '#52525b'} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* CONTENIDO PRINCIPAL: PARTIDOS REALES */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#84cc16" />
          }
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {selectedSportFilter === 'Todos' ? 'Partidos Disponibles' : `Partidos de ${selectedSportFilter}`}
            </Text>
            <Text style={styles.matchCountBadge}>{matches.length} activos</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#84cc16" />
              <Text style={styles.loadingText}>Cargando convocatorias...</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-clear-outline" size={40} color="#71717a" />
              </View>
              <Text style={styles.emptyTitle}>No hay partidos programados</Text>
              <Text style={styles.emptySubtitle}>
                {selectedSportFilter === 'Todos'
                  ? 'Aún no se han publicado encuentros. ¡Sé el primero en organizar uno!'
                  : `No hay convocatorias abiertas para ${selectedSportFilter} en este momento.`}
              </Text>

              <TouchableOpacity 
                style={styles.emptyCreateBtn}
                onPress={() => router.push('/match/create')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={20} color="#09090b" style={{ marginRight: 8 }} />
                <Text style={styles.emptyCreateBtnText}>Organizar Partido</Text>
              </TouchableOpacity>
            </View>
          ) : (
            matches.map((item) => {
              const spotsLeft = item.total_players_needed - item.joined_players_count;
              const isFull = spotsLeft <= 0;

              return (
                <View key={item.id} style={styles.matchBentoCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.sportTag}>
                      <Ionicons name="trophy-outline" size={16} color="#09090b" style={{ marginRight: 6 }} />
                      <Text style={styles.sportTagText}>{item.sport}</Text>
                    </View>

                    <View style={[styles.spotsBadge, isFull && styles.spotsBadgeFull]}>
                      <Text style={[styles.spotsBadgeText, isFull && styles.spotsBadgeTextFull]}>
                        {isFull ? 'COMPLETO' : `FALTAN ${spotsLeft} JUGADORES`}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.locationTitle} numberOfLines={2}>
                    {item.location_name}
                  </Text>

                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color="#65a30d" style={{ marginRight: 8 }} />
                    <Text style={styles.infoText}>{formatMatchDate(item.date_time)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={18} color="#71717a" style={{ marginRight: 8 }} />
                    <Text style={styles.organizerText}>
                      Organizado por <Text style={{ color: '#18181b', fontWeight: 'bold' }}>{item.profiles?.full_name || 'Jugador CanchaYa'}</Text>
                    </Text>
                  </View>

                  {item.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText} numberOfLines={2}>
                        "{item.notes}"
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity 
                    style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
                    onPress={() => !isFull && handleJoinMatch(item.id)}
                    disabled={isFull}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.joinBtnText, isFull && styles.joinBtnTextDisabled]}>
                      {isFull ? 'Convocatoria Llena' : 'Unirme al Partido'}
                    </Text>
                    {!isFull && (
                      <Ionicons name="arrow-forward" size={20} color="#09090b" style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* FAB VERDE NEÓN */}
        <TouchableOpacity 
          style={styles.fabButton}
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
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    paddingTop: 48,
    paddingHorizontal: 20,
    position: 'relative',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#18181b',
  },
  greetingSubtitle: {
    fontSize: 15,
    color: '#71717a',
    fontWeight: '500',
  },
  profileBadgeBtn: {
    padding: 2,
  },
  loginPillBtn: {
    backgroundColor: '#a3e635',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  loginPillText: {
    color: '#09090b',
    fontWeight: 'bold',
    fontSize: 15,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    elevation: 1,
  },
  filterChipSelected: {
    backgroundColor: '#a3e635',
    borderColor: '#a3e635',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52525b',
  },
  filterChipTextSelected: {
    color: '#09090b',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181b',
  },
  matchCountBadge: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: 'bold',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717a',
    marginTop: 12,
    fontSize: 15,
  },
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    marginTop: 10,
    elevation: 2,
  },
  emptyIconCircle: {
    backgroundColor: '#f4f4f5',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyCreateBtn: {
    backgroundColor: '#a3e635',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCreateBtnText: {
    color: '#09090b',
    fontWeight: 'bold',
    fontSize: 16,
  },
  matchBentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportTag: {
    backgroundColor: '#a3e635',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  sportTagText: {
    color: '#09090b',
    fontWeight: 'bold',
    fontSize: 13,
  },
  spotsBadge: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  spotsBadgeFull: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  spotsBadgeText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  spotsBadgeTextFull: {
    color: '#dc2626',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#27272a',
    fontWeight: '600',
  },
  organizerText: {
    fontSize: 14,
    color: '#71717a',
  },
  notesBox: {
    backgroundColor: '#f4f4f5',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#52525b',
    fontStyle: 'italic',
  },
  joinBtn: {
    backgroundColor: '#a3e635',
    height: 50,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  joinBtnDisabled: {
    backgroundColor: '#e4e4e7',
  },
  joinBtnText: {
    color: '#09090b',
    fontWeight: 'bold',
    fontSize: 16,
  },
  joinBtnTextDisabled: {
    color: '#a1a1aa',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#a3e635',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
});