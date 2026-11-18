import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

interface UserMatchItem {
  id: string;
  sport: string;
  location_name: string;
  date_time: string;
  total_players_needed: number;
  joined_players_count: number;
  creator_id: string;
  profiles?: { full_name: string };
  isCreator: boolean;
}

const QUICK_TAGS = [
  'Excelente nivel',
  'Muy puntuales',
  'Buen ambiente',
  'Cancha impecable',
];

export default function MyMatchesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [upcomingMatches, setUpcomingMatches] = useState<UserMatchItem[]>([]);
  const [pastMatches, setPastMatches] = useState<UserMatchItem[]>([]);

  // Registro local de recordatorios activados por matchId
  const [remindersEnabled, setRemindersEnabled] = useState<Record<string, boolean>>({});
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Estados del Modal de Opinión / Calificación Post-Partido
  const [ratingModalMatch, setRatingModalMatch] = useState<UserMatchItem | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Excelente nivel']);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewedMatchIds, setReviewedMatchIds] = useState<Record<string, boolean>>({});

  // Actualizar el reloj cada minuto para que la cuenta regresiva se mantenga viva
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserMatches();
    }, [])
  );

  // Cargar todos los partidos donde el usuario ingresó o es organizador
  const loadUserMatches = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setCurrentUserId(null);
        setUpcomingMatches([]);
        setPastMatches([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const uid = session.user.id;
      setCurrentUserId(uid);

      // 1. Buscar IDs donde el usuario ingresó en match_players y los que creó
      const [joinedRes, createdRes, reviewsRes] = await Promise.all([
        supabase.from('match_players').select('match_id').eq('user_id', uid),
        supabase.from('matches').select('id').eq('creator_id', uid),
        supabase.from('match_reviews').select('match_id').eq('reviewer_id', uid),
      ]);

      const matchIds = Array.from(
        new Set([
          ...(joinedRes.data?.map((r) => r.match_id) || []),
          ...(createdRes.data?.map((r) => r.id) || []),
        ])
      );

      if (reviewsRes.data) {
        const reviewedMap: Record<string, boolean> = {};
        reviewsRes.data.forEach((rev) => {
          reviewedMap[rev.match_id] = true;
        });
        setReviewedMatchIds(reviewedMap);
      }

      if (matchIds.length === 0) {
        setUpcomingMatches([]);
        setPastMatches([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Obtener los detalles completos de esos partidos
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(
          `
          id, sport, location_name, date_time,
          total_players_needed, joined_players_count, creator_id,
          profiles:creator_id ( full_name )
        `
        )
        .in('id', matchIds)
        .order('date_time', { ascending: true });

      if (error) throw error;

      const currentMs = Date.now();
      const upcoming: UserMatchItem[] = [];
      const past: UserMatchItem[] = [];

      (matchesData || []).forEach((m: any) => {
        const formatted: UserMatchItem = {
          ...m,
          profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
          isCreator: m.creator_id === uid,
        };

        const matchStartMs = new Date(m.date_time).getTime();
        // Consideramos que ya pasó si transcurrieron más de 90 minutos desde su inicio
        if (matchStartMs + 90 * 60 * 1000 < currentMs) {
          past.push(formatted);
        } else {
          upcoming.push(formatted);
        }
      });

      // Ordenar los pasados del más reciente al más antiguo
      past.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());

      setUpcomingMatches(upcoming);
      setPastMatches(past);
    } catch (err) {
      console.error('Error cargando mis partidos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserMatches();
  };

  // Calcular texto legible de cuánto falta para el partido
  const getCountdownBadgeText = (isoDate: string) => {
    const targetMs = new Date(isoDate).getTime();
    const diffMs = targetMs - nowTimestamp;

    if (diffMs <= 0) {
      return '¡En juego ahora!';
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `Faltan ${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `Faltan ${hours}h ${minutes}m`;
    }
    return `¡Empieza en ${minutes} min!`;
  };

  const formatReadableDate = (isoString: string) => {
    const d = new Date(isoString);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} • ${hours}:${minutes} ${ampm}`;
  };

  // Activar o desactivar recordatorio visual para el partido
  const handleToggleReminder = (matchItem: UserMatchItem) => {
    const isCurrentlyActive = !!remindersEnabled[matchItem.id];

    if (isCurrentlyActive) {
      setRemindersEnabled((prev) => ({ ...prev, [matchItem.id]: false }));
      return;
    }

    setRemindersEnabled((prev) => ({ ...prev, [matchItem.id]: true }));

    const alertTitle = 'Recordatorio Activado';
    const alertMsg = `Te avisaremos 1 hora antes de tu partido de ${matchItem.sport} (${formatReadableDate(
      matchItem.date_time
    )}).`;

    if (Platform.OS === 'web') {
      window.alert(`${alertTitle}: ${alertMsg}`);
    } else {
      Alert.alert(alertTitle, alertMsg);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Guardar opinión post-partido en Supabase
  const handleSubmitReview = async () => {
    if (!ratingModalMatch || !currentUserId || submittingReview) return;

    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('match_reviews').insert([
        {
          match_id: ratingModalMatch.id,
          reviewer_id: currentUserId,
          sport: ratingModalMatch.sport,
          rating: ratingStars,
          tags: selectedTags,
          comment: reviewComment.trim() || null,
        },
      ]);

      if (error) throw error;

      setReviewedMatchIds((prev) => ({ ...prev, [ratingModalMatch.id]: true }));
      setRatingModalMatch(null);
      setReviewComment('');
      setRatingStars(5);

      const okText = '¡Gracias por tu opinión! Ayuda a mejorar el emparejamiento en CanchaYa.';
      Platform.OS === 'web' ? window.alert(okText) : Alert.alert('Opinión Enviada', okText);
    } catch (err: any) {
      const errText = err.message || 'No se pudo guardar tu calificación.';
      Platform.OS === 'web' ? window.alert(errText) : Alert.alert('Aviso', errText);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Vista si no ha iniciado sesión
  if (!currentUserId && !loading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.bentoEmptyCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Ionicons name="football-outline" size={52} color={colors.accentDark} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Tus Partidos en CanchaYa
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Inicia sesión para ver tus convocatorias confirmadas, activar recordatorios y calificar tus partidos.
          </Text>
          <TouchableOpacity
            style={[styles.primaryPillBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.primaryPillBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.phoneContainer, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        {/* Cabecera */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Mis Partidos</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              Tus encuentros confirmados e historial
            </Text>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.totalBadgeText}>
              {upcomingMatches.length + pastMatches.length} total
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ color: colors.textPrimary, fontSize: 16, marginTop: 12 }}>
              Cargando tus partidos...
            </Text>
          </View>
        ) : upcomingMatches.length === 0 && pastMatches.length === 0 ? (
          <View
            style={[
              styles.bentoEmptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Ionicons name="calendar-outline" size={52} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aún no tienes partidos
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Únete a una convocatoria en Explorar para ver aquí cuánto falta y activar alertas.
            </Text>
            <TouchableOpacity
              style={[styles.primaryPillBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.navigate('/(tabs)')}
            >
              <Text style={styles.primaryPillBtnText}>Buscar Partidos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
          >
            {/* BLOQUE 1: PRÓXIMOS PARTIDOS CON CUENTA REGRESIVA Y RECORDATORIO */}
            {upcomingMatches.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Próximos Encuentros ({upcomingMatches.length})
                </Text>

                {upcomingMatches.map((item) => {
                  const isReminderOn = !!remindersEnabled[item.id];
                  const countdownLabel = getCountdownBadgeText(item.date_time);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.bentoCard,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      ]}
                    >
                      {/* Fila superior: Deporte + Cuenta regresiva */}
                      <View style={styles.cardTopRow}>
                        <View style={[styles.sportPill, { backgroundColor: colors.accent }]}>
                          <Ionicons name="trophy" size={16} color="#09090b" />
                          <Text style={styles.sportPillText}>{item.sport}</Text>
                        </View>

                        <View
                          style={[
                            styles.countdownPill,
                            {
                              backgroundColor: isDark
                                ? 'rgba(163, 230, 53, 0.16)'
                                : 'rgba(163, 230, 53, 0.28)',
                              borderColor: colors.accent,
                            },
                          ]}
                        >
                          <Ionicons name="alarm-outline" size={16} color={colors.accentDark} />
                          <Text style={[styles.countdownText, { color: colors.textPrimary }]}>
                            {countdownLabel}
                          </Text>
                        </View>
                      </View>

                      {/* Fecha y rol */}
                      <Text style={[styles.dateHeading, { color: colors.textPrimary }]}>
                        {formatReadableDate(item.date_time)}
                      </Text>
                      <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                        {item.isCreator
                          ? 'Organizado por ti'
                          : `Organizador: ${item.profiles?.full_name || 'Jugador'}`}
                      </Text>

                      {/* Botón Grande Tipo Pastilla para Activar Recordatorio */}
                      <TouchableOpacity
                        onPress={() => handleToggleReminder(item)}
                        style={[
                          styles.reminderPillBtn,
                          isReminderOn
                            ? {
                                backgroundColor: colors.accent,
                                borderColor: colors.accent,
                              }
                            : {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.cardBorder,
                              },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={isReminderOn ? 'notifications' : 'notifications-outline'}
                          size={22}
                          color={isReminderOn ? '#09090b' : colors.textPrimary}
                        />
                        <Text
                          style={[
                            styles.reminderPillText,
                            { color: isReminderOn ? '#09090b' : colors.textPrimary },
                          ]}
                        >
                          {isReminderOn
                            ? 'Recordatorio Activado (1h antes)'
                            : 'Activar Recordatorio'}
                        </Text>
                      </TouchableOpacity>

                      {/* Fila inferior de accesos rápidos: Chat y Detalles */}
                      <View style={styles.secondaryActionsRow}>
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: '/(tabs)/chat',
                              params: { matchId: item.id },
                            })
                          }
                          style={[
                            styles.secondaryPillBtn,
                            { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                          ]}
                        >
                          <Ionicons name="chatbubbles-outline" size={20} color={colors.textPrimary} />
                          <Text style={[styles.secondaryPillText, { color: colors.textPrimary }]}>
                            Chat Equipo
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => router.push(`/match/${item.id}`)}
                          style={[
                            styles.secondaryPillBtn,
                            { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                          ]}
                        >
                          <Ionicons name="map-outline" size={20} color={colors.textPrimary} />
                          <Text style={[styles.secondaryPillText, { color: colors.textPrimary }]}>
                            Ver Cancha
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* BLOQUE 2: PARTIDOS YA JUGADOS CON OPCIÓN DE OPINIÓN POST-PARTIDO */}
            {pastMatches.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Partidos Finalizados ({pastMatches.length})
                </Text>

                {pastMatches.map((item) => {
                  const alreadyReviewed = !!reviewedMatchIds[item.id];

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.bentoCard,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      ]}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={[styles.sportPill, { backgroundColor: colors.inputBg }]}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.accentDark} />
                          <Text style={[styles.sportPillText, { color: colors.textPrimary }]}>
                            {item.sport} • Finalizado
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.dateHeading, { color: colors.textPrimary }]}>
                        {formatReadableDate(item.date_time)}
                      </Text>
                      <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                        Organizador: {item.profiles?.full_name || 'Jugador'}
                      </Text>

                      {/* Botón de Calificación / Opinión */}
                      <TouchableOpacity
                        disabled={alreadyReviewed}
                        onPress={() => {
                          setRatingStars(5);
                          setSelectedTags(['Excelente nivel']);
                          setReviewComment('');
                          setRatingModalMatch(item);
                        }}
                        style={[
                          styles.ratePillBtn,
                          {
                            backgroundColor: alreadyReviewed ? colors.inputBg : colors.accent,
                          },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={alreadyReviewed ? 'star' : 'star-outline'}
                          size={22}
                          color={alreadyReviewed ? colors.accentDark : '#09090b'}
                        />
                        <Text
                          style={[
                            styles.ratePillText,
                            { color: alreadyReviewed ? colors.textPrimary : '#09090b' },
                          ]}
                        >
                          {alreadyReviewed
                            ? '¡Opinión Enviada! Gracias'
                            : 'Dar Opinión del Partido'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* MODAL BENTO DE OPINIÓN POST-PARTIDO */}
      <Modal
        visible={!!ratingModalMatch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRatingModalMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBentoCard,
              {
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  ¿Qué tal estuvo el partido?
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {ratingModalMatch?.sport} • Tu opinión calibra el nivel de CanchaYa
                </Text>
              </View>
              <Pressable
                onPress={() => setRatingModalMatch(null)}
                style={[styles.closeCircleBtn, { backgroundColor: colors.inputBg }]}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Selector de Estrellas Grandes */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingStars(star)}
                  style={styles.starTouchTarget}
                >
                  <Ionicons
                    name={star <= ratingStars ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= ratingStars ? '#eab308' : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Etiquetas rápidas */}
            <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>
              Destaca lo mejor del encuentro:
            </Text>
            <View style={styles.tagsWrap}>
              {QUICK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.tagPill,
                      {
                        backgroundColor: active ? colors.accent : colors.inputBg,
                        borderColor: active ? colors.accent : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        { color: active ? '#09090b' : colors.textPrimary },
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Comentario opcional */}
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Escribe un comentario breve (opcional)..."
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                },
              ]}
            />

            {/* Botón Enviar Opinión */}
            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={submittingReview}
              style={[styles.primaryPillBtn, { backgroundColor: colors.accent, marginTop: 14 }]}
            >
              {submittingReview ? (
                <ActivityIndicator color="#09090b" />
              ) : (
                <Text style={styles.primaryPillBtnText}>Enviar Opinión</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: 'bold' },
  pageSubtitle: { fontSize: 16, marginTop: 2 },
  totalBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999 },
  totalBadgeText: { fontSize: 15, fontWeight: 'bold', color: '#09090b' },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bentoEmptyCard: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  primaryPillBtn: {
    height: 54,
    paddingHorizontal: 28,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryPillBtnText: { fontSize: 17, fontWeight: 'bold', color: '#09090b' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 14 },
  bentoCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  sportPillText: { fontSize: 15, fontWeight: 'bold', color: '#09090b' },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  countdownText: { fontSize: 15, fontWeight: 'bold' },
  dateHeading: { fontSize: 19, fontWeight: 'bold', marginBottom: 4 },
  roleText: { fontSize: 16, marginBottom: 16 },
  reminderPillBtn: {
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reminderPillText: { fontSize: 16, fontWeight: 'bold' },
  secondaryActionsRow: { flexDirection: 'row', gap: 10 },
  secondaryPillBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryPillText: { fontSize: 15, fontWeight: 'bold' },
  ratePillBtn: {
    height: 54,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ratePillText: { fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalBentoCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    padding: 22,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 21, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 16, marginTop: 2 },
  closeCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 14,
  },
  starTouchTarget: { padding: 4 },
  modalLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tagPillText: { fontSize: 15, fontWeight: 'bold' },
  commentInput: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    minHeight: 84,
    textAlignVertical: 'top',
  },
});