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

interface ChatRoom {
  match_id: string;
  sport: string;
  location_name: string;
  date_time: string;
  joined_players_count: number;
  total_players_needed: number;
}

export default function ChatsListScreen() {
  const router = useRouter();
  const { colors, t } = useTheme();

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserChats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Obtener los partidos a los que pertenece el usuario
      const { data, error } = await supabase
        .from('match_players')
        .select(`
          matches (
            id, sport, location_name, date_time, total_players_needed, joined_players_count
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;

      if (data) {
        const formatted: ChatRoom[] = data
          .map((item: any) => item.matches)
          .filter((m: any) => m !== null)
          .map((m: any) => ({
            match_id: m.id,
            sport: m.sport,
            location_name: m.location_name,
            date_time: m.date_time,
            joined_players_count: m.joined_players_count,
            total_players_needed: m.total_players_needed,
          }));
        setChats(formatted);
      } else {
        setChats([]);
      }
    } catch (e) {
      console.error('Error cargando chats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserChats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserChats();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.phoneContainer}>
        
        {/* Cabecera */}
        <View style={styles.topHeader}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('tabChat') || 'Mensajes'}
          </Text>
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
          ) : chats.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin Chats Activos</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Únete a un partido en la pestaña de Explorar para acceder al chat grupal de la convocatoria.
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
            chats.map((chat) => (
              <TouchableOpacity 
                key={chat.match_id} 
                style={[styles.chatCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push(`/match/${chat.match_id}`)}
                activeOpacity={0.8}
              >
                <View style={[styles.chatAvatarCircle, { backgroundColor: colors.accent }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#09090b" />
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.chatSportTitle, { color: colors.textPrimary }]}>{chat.sport}</Text>
                    <View style={[styles.playersBadge, { backgroundColor: colors.inputBg }]}>
                      <Ionicons name="people-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.playersBadgeText, { color: colors.textSecondary }]}>
                        {chat.joined_players_count}/{chat.total_players_needed}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.chatLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                    {chat.location_name}
                  </Text>
                  <Text style={[styles.chatSubtext, { color: colors.accentDark }]}>
                    Toca para coordinar con el equipo →
                  </Text>
                </View>
              </TouchableOpacity>
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
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 22 },
  primaryPillBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999 },
  primaryPillBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
  chatCard: { borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  chatAvatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  chatSportTitle: { fontSize: 17, fontWeight: 'bold' },
  chatLocation: { fontSize: 14, marginTop: 2 },
  chatSubtext: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  playersBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  playersBadgeText: { fontSize: 12, fontWeight: 'bold' },
});