import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

interface ChatThread {
  matchId: string;
  sport: string;
  creatorName: string;
  dateTime: string;
  lastMessage: string;
  lastMessageTime: string;
}

interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export default function ChatTabScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Jugador');

  // Estado de sala activa vs bandeja de chats
  const [activeMatchId, setActiveMatchId] = useState<string | null>(matchId || null);
  const [activeMatchInfo, setActiveMatchInfo] = useState<any>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);

  // Estado de mensajes en tiempo real
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Sincronizar parámetro cuando se navega desde Detalle del Partido
  useEffect(() => {
    if (matchId) {
      setActiveMatchId(matchId);
    }
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      initUserAndThreads();
    }, [])
  );

  // Cargar usuario actual y su lista de conversaciones activas
  const initUserAndThreads = async () => {
    try {
      setLoadingThreads(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setCurrentUserId(null);
        setLoadingThreads(false);
        return;
      }

      const uid = session.user.id;
      setCurrentUserId(uid);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single();

      setCurrentUserName(profile?.full_name || 'Jugador');

      // Buscar partidos donde el usuario ha enviado mensajes, es creador o está inscrito
      const [sentMsgsRes, createdMatchesRes, joinedMatchesRes] = await Promise.all([
        supabase.from('match_messages').select('match_id').eq('sender_id', uid),
        supabase.from('matches').select('id').eq('creator_id', uid),
        supabase.from('match_players').select('match_id').eq('user_id', uid),
      ]);

      const uniqueMatchIds = Array.from(
        new Set([
          ...(sentMsgsRes.data?.map((m) => m.match_id) || []),
          ...(createdMatchesRes.data?.map((m) => m.id) || []),
          ...(joinedMatchesRes.data?.map((m) => m.match_id) || []),
        ])
      );

      if (uniqueMatchIds.length === 0) {
        setThreads([]);
        setLoadingThreads(false);
        return;
      }

      // Obtener detalles de esos partidos y su último mensaje
      const { data: matchesData } = await supabase
        .from('matches')
        .select(
          `
          id, sport, date_time,
          profiles:creator_id ( full_name )
        `
        )
        .in('id', uniqueMatchIds)
        .order('date_time', { ascending: false });

      if (matchesData) {
        const builtThreads: ChatThread[] = await Promise.all(
          matchesData.map(async (m: any) => {
            const creatorObj = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            const { data: lastMsgData } = await supabase
              .from('match_messages')
              .select('content, created_at')
              .eq('match_id', m.id)
              .order('created_at', { ascending: false })
              .limit(1);

            const lastMsg = lastMsgData?.[0];
            return {
              matchId: m.id,
              sport: m.sport,
              creatorName: creatorObj?.full_name || 'Organizador',
              dateTime: m.date_time,
              lastMessage: lastMsg?.content || 'Toca para iniciar la conversación...',
              lastMessageTime: lastMsg?.created_at || m.date_time,
            };
          })
        );
        setThreads(builtThreads);
      }
    } catch (error) {
      console.error('Error cargando bandeja de chats:', error);
    } finally {
      setLoadingThreads(false);
    }
  };

  // Cargar información y suscripción Realtime de la conversación seleccionada
  useEffect(() => {
    if (!activeMatchId) return;

    loadActiveMatchAndMessages(activeMatchId);

    const channel = supabase
      .channel(`tab-chat-room-${activeMatchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_messages',
          filter: `match_id=eq.${activeMatchId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMatchId]);

  const loadActiveMatchAndMessages = async (targetMatchId: string) => {
    try {
      setLoadingMessages(true);
      const { data: matchInfo } = await supabase
        .from('matches')
        .select(
          `
          id, sport, date_time,
          profiles:creator_id ( full_name )
        `
        )
        .eq('id', targetMatchId)
        .single();

      if (matchInfo) {
        const creatorObj = Array.isArray(matchInfo.profiles)
          ? matchInfo.profiles[0]
          : matchInfo.profiles;
        setActiveMatchInfo({
          ...matchInfo,
          creatorName: creatorObj?.full_name || 'Organizador',
        });
      }

      const { data: msgHistory } = await supabase
        .from('match_messages')
        .select('*')
        .eq('match_id', targetMatchId)
        .order('created_at', { ascending: true });

      setMessages(msgHistory || []);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 150);
    } catch (err) {
      console.error('Error cargando sala de chat:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Enviar mensaje en tiempo real
  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !activeMatchId || sending) return;

    if (!currentUserId) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para enviar mensajes.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    setSending(true);
    setNewMessage('');

    const { error } = await supabase.from('match_messages').insert([
      {
        match_id: activeMatchId,
        sender_id: currentUserId,
        sender_name: currentUserName,
        content: trimmed,
      },
    ]);

    if (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta nuevamente.');
      setNewMessage(trimmed);
    }
    setSending(false);
  };

  const handleCloseActiveRoom = () => {
    setActiveMatchId(null);
    setActiveMatchInfo(null);
    router.setParams({ matchId: undefined });
    initUserAndThreads();
  };

  // Si no ha iniciado sesión
  if (!currentUserId && !loadingThreads) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.bentoEmptyCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Ionicons name="chatbubbles-outline" size={52} color={colors.accentDark} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Tus Mensajes en CanchaYa
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Inicia sesión para escribirle a los organizadores y coordinar tus partidos.
          </Text>
          <TouchableOpacity
            style={[styles.pillButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.pillButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // VISTA 1: SALA DE CHAT ACTIVA DE UN PARTIDO
  if (activeMatchId) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.phoneContainer, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
          {/* Cabecera de la Sala */}
          <View style={[styles.roomHeader, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={handleCloseActiveRoom}
              style={[
                styles.circleBackBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={[styles.roomTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {activeMatchInfo?.creatorName || 'Organizador'}
              </Text>
              <Text style={[styles.roomSubtitle, { color: colors.accentDark }]}>
                Partido de {activeMatchInfo?.sport || 'Deporte'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push(`/match/${activeMatchId}`)}
              style={[styles.viewMatchPill, { backgroundColor: colors.inputBg }]}
            >
              <Text style={[styles.viewMatchPillText, { color: colors.textPrimary }]}>
                Ver Partido
              </Text>
            </TouchableOpacity>
          </View>

          {/* Historial de Mensajes */}
          {loadingMessages ? (
            <View style={styles.loaderCenter}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ paddingVertical: 16, paddingBottom: 170 }}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View
                  style={[
                    styles.bentoEmptyCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <Ionicons name="hand-left-outline" size={40} color={colors.accentDark} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Saluda al organizador
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Pregunta por la cancha, el nivel o confirma tu llegada antes de unirte.
                  </Text>
                </View>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageBubble,
                        isMine
                          ? { alignSelf: 'flex-end', backgroundColor: colors.accent }
                          : {
                              alignSelf: 'flex-start',
                              backgroundColor: colors.card,
                              borderColor: colors.cardBorder,
                              borderWidth: 1,
                            },
                      ]}
                    >
                      {!isMine && (
                        <Text style={[styles.senderTag, { color: colors.accentDark }]}>
                          {msg.sender_name}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.messageBody,
                          { color: isMine ? '#09090b' : colors.textPrimary },
                        ]}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Caja de Envío flotando justo encima del Navbar */}
          <View
            style={[
              styles.inputBarWrapper,
              {
                bottom: Math.max(insets.bottom, 12) + 84,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.messageInput, { color: colors.textPrimary }]}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              style={[
                styles.sendCircleBtn,
                {
                  backgroundColor: newMessage.trim() ? colors.accent : colors.inputBg,
                },
              ]}
            >
              <Ionicons
                name="send"
                size={20}
                color={newMessage.trim() ? '#09090b' : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // VISTA 2: BANDEJA DE CONVERSACIONES (LISTA DE CHATS)
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.phoneContainer, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Mensajes</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Tus conversaciones con organizadores y equipos
        </Text>

        {loadingThreads ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : threads.length === 0 ? (
          <View
            style={[
              styles.bentoEmptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Sin conversaciones aún
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Entra a cualquier partido en Explorar y pulsa "Escribirle al creador" para iniciar un chat.
            </Text>
            <TouchableOpacity
              style={[styles.pillButton, { backgroundColor: colors.accent }]}
              onPress={() => router.navigate('/(tabs)')}
            >
              <Text style={styles.pillButtonText}>Explorar Partidos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 130 }}
            showsVerticalScrollIndicator={false}
          >
            {threads.map((item) => (
              <TouchableOpacity
                key={item.matchId}
                onPress={() => setActiveMatchId(item.matchId)}
                style={[
                  styles.threadCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
                activeOpacity={0.85}
              >
                <View style={[styles.threadAvatar, { backgroundColor: colors.accent }]}>
                  <Ionicons name="chatbubbles" size={24} color="#09090b" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.threadTopRow}>
                    <Text style={[styles.threadCreator, { color: colors.textPrimary }]}>
                      {item.creatorName}
                    </Text>
                    <View style={[styles.sportMiniBadge, { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.sportMiniText, { color: colors.accentDark }]}>
                        {item.sport}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.threadLastMsg, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  pageSubtitle: { fontSize: 16, marginBottom: 20 },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bentoEmptyCard: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  pillButton: {
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButtonText: { fontSize: 16, fontWeight: 'bold', color: '#09090b' },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  threadAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threadCreator: { fontSize: 17, fontWeight: 'bold' },
  sportMiniBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 },
  sportMiniText: { fontSize: 13, fontWeight: 'bold' },
  threadLastMsg: { fontSize: 16 },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  circleBackBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomTitle: { fontSize: 19, fontWeight: 'bold' },
  roomSubtitle: { fontSize: 15, fontWeight: '600' },
  viewMatchPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
  viewMatchPillText: { fontSize: 14, fontWeight: 'bold' },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    marginBottom: 10,
  },
  senderTag: { fontSize: 13, fontWeight: 'bold', marginBottom: 3 },
  messageBody: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  inputBarWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    elevation: 6,
  },
  messageInput: { flex: 1, fontSize: 16, height: 44 },
  sendCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});