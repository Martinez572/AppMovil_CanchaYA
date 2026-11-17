import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchLocationModal } from '../../components/MatchLocationModal';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

interface Player {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setCurrentUserId(uid);

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(
          `
          *,
          profiles:creator_id ( full_name )
        `
        )
        .eq('id', id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);

      const { data: playerData, error: playerError } = await supabase
        .from('match_players')
        .select(
          `
          id, user_id,
          profiles:user_id ( full_name )
        `
        )
        .eq('match_id', id);

      if (playerError) throw playerError;

      if (playerData) {
        const formatted: Player[] = playerData.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
        }));
        setPlayers(formatted);

        if (uid) {
          setIsJoined(formatted.some((p) => p.user_id === uid));
        }
      }
    } catch (e) {
      console.error('Error cargando partido:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [id]);

  // Redirige a la pestaña de Chat abriendo directamente la conversación de este partido
  const handleOpenChatWithCreator = () => {
    if (!currentUserId) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para escribirle al creador.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    router.push({
      pathname: '/(tabs)/chat',
      params: { matchId: id },
    });
  };

  const handleToggleJoin = async () => {
    if (!currentUserId) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para unirte.');
      router.push('/auth/login');
      return;
    }

    setActionLoading(true);

    try {
      if (isJoined) {
        const { error } = await supabase
          .from('match_players')
          .delete()
          .eq('match_id', id)
          .eq('user_id', currentUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('match_players')
          .insert([{ match_id: id, user_id: currentUserId, status: 'confirmed' }]);

        if (error) throw error;
      }

      await fetchMatchDetails();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo procesar la solicitud.');
    } finally {
      setActionLoading(false);
    }
  };

  const getCoordinates = () => {
    if (match?.latitude && match?.longitude) {
      return {
        latitude: Number(match.latitude),
        longitude: Number(match.longitude),
      };
    }
    const coordMatch = match?.location_name?.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
    if (coordMatch) {
      return {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2]),
      };
    }
    return { latitude: 1.2136, longitude: -77.2811 };
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!match) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Partido no encontrado.</Text>
      </View>
    );
  }

  const spotsLeft = match.total_players_needed - players.length;
  const isFull = spotsLeft <= 0;
  const coords = getCoordinates();
  const isRawPoint = match.location_name?.startsWith('Punto (');
  const displayPlaceName = isRawPoint ? 'Ubicación marcada en el mapa' : match.location_name;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.phoneContainer, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        {/* Cabecera */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Detalle del Partido
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 155 }}>
          {/* Tarjeta Principal Bento */}
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.sportChip, { backgroundColor: colors.accent }]}>
                <Ionicons
                  name="trophy-outline"
                  size={18}
                  color="#09090b"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.sportChipText}>{match.sport}</Text>
              </View>

              <View
                style={[
                  styles.spotsBadge,
                  { backgroundColor: colors.inputBg },
                  isFull && { backgroundColor: '#fef2f2' },
                ]}
              >
                <Text
                  style={[
                    styles.spotsBadgeText,
                    { color: colors.accentDark },
                    isFull && { color: '#dc2626' },
                  ]}
                >
                  {isFull ? 'COMPLETO' : `FALTAN ${spotsLeft}`}
                </Text>
              </View>
            </View>

            {/* Botón Bento para abrir el Mapa */}
            <Pressable
              onPress={() => setMapVisible(true)}
              style={[
                styles.locationBanner,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.accent,
                },
              ]}
            >
              <View style={[styles.locationIconBox, { backgroundColor: colors.accent }]}>
                <Ionicons name="location" size={22} color="#09090b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationActionTitle, { color: colors.textPrimary }]}>
                  Ver ubicación en el mapa
                </Text>
                <Text style={[styles.locationActionSub, { color: colors.textSecondary }]}>
                  {displayPlaceName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.accentDark}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                {new Date(match.date_time).toLocaleString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Organizado por{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>
                  {match.profiles?.full_name || 'Jugador'}
                </Text>
              </Text>
            </View>

            {match.notes ? (
              <View style={[styles.notesBox, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.notesText, { color: colors.textPrimary }]}>
                  "{match.notes}"
                </Text>
              </View>
            ) : null}

            {/* Botón directo hacia la sección de Chat */}
            <TouchableOpacity
              onPress={handleOpenChatWithCreator}
              style={[
                styles.chatCreatorPillBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
              ]}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubbles" size={22} color={colors.accentDark} />
              <Text style={[styles.chatCreatorPillText, { color: colors.textPrimary }]}>
                Escribirle al creador
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Jugadores Confirmados */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Jugadores Confirmados ({players.length}/{match.total_players_needed})
          </Text>

          <View
            style={[
              styles.playersCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {players.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.playerItem,
                  idx < players.length - 1 && {
                    borderBottomColor: colors.cardBorder,
                    borderBottomWidth: 1,
                  },
                ]}
              >
                <View style={[styles.playerAvatar, { backgroundColor: colors.accent }]}>
                  <Ionicons name="person" size={18} color="#09090b" />
                </View>
                <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                  {p.profiles?.full_name || 'Jugador'}
                </Text>
                {p.user_id === match.creator_id && (
                  <View style={[styles.organizerBadge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.organizerBadgeText, { color: colors.accentDark }]}>
                      Organizador
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Botón Flotante Principal para Unirse / Salirse */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionPillBtn,
              { backgroundColor: colors.accent },
              isJoined && {
                backgroundColor: '#fef2f2',
                borderWidth: 1,
                borderColor: '#fca5a5',
              },
              !isJoined && isFull && { backgroundColor: colors.cardBorder },
            ]}
            onPress={handleToggleJoin}
            disabled={actionLoading || (!isJoined && isFull)}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color={isJoined ? '#ef4444' : '#09090b'} />
            ) : (
              <Text style={[styles.actionPillBtnText, isJoined && { color: '#ef4444' }]}>
                {isJoined
                  ? 'Salir del Partido'
                  : isFull
                  ? 'Convocatoria Llena'
                  : 'Unirme al Partido'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal con el Mapa Real */}
      <MatchLocationModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        latitude={coords.latitude}
        longitude={coords.longitude}
        sportName={match.sport}
        placeLabel={displayPlaceName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingHorizontal: 20 },
  topHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  mainCard: { borderRadius: 28, padding: 20, borderWidth: 1, marginBottom: 20, elevation: 2 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  sportChipText: { fontSize: 16, fontWeight: 'bold', color: '#09090b' },
  spotsBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  spotsBadgeText: { fontSize: 13, fontWeight: 'bold' },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  locationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationActionTitle: { fontSize: 17, fontWeight: 'bold' },
  locationActionSub: { fontSize: 15, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 16, fontWeight: '600' },
  notesBox: { borderRadius: 16, padding: 14, marginTop: 8, marginBottom: 12 },
  notesText: { fontSize: 16, fontStyle: 'italic' },
  chatCreatorPillBtn: {
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  chatCreatorPillText: { fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  playersCard: { borderRadius: 24, paddingHorizontal: 16, borderWidth: 1, marginBottom: 20 },
  playerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerName: { flex: 1, fontSize: 16, fontWeight: '600' },
  organizerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  organizerBadgeText: { fontSize: 12, fontWeight: 'bold' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionPillBtn: {
    height: 56,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  actionPillBtnText: { fontSize: 18, fontWeight: 'bold', color: '#09090b' },
});