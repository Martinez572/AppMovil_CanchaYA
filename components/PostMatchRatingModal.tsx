import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

interface PostMatchRatingModalProps {
  visible: boolean;
  matchId: string;
  sport: string;
  locationName: string;
  onClose: () => void;
}

export default function PostMatchRatingModal({
  visible,
  matchId,
  sport,
  locationName,
  onClose,
}: PostMatchRatingModalProps) {
  const { colors, t } = useTheme();

  const [selectedPerception, setSelectedPerception] = useState<'easy' | 'balanced' | 'hard' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveRating = async () => {
    if (!selectedPerception) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        onClose();
        return;
      }

      // 1. Registrar el feedback post-partido
      const { error } = await supabase.from('post_match_ratings').insert([
        {
          match_id: matchId,
          user_id: session.user.id,
          sport: sport,
          perception: selectedPerception,
        },
      ]);

      if (error && error.code !== '23505') {
        throw error;
      }

      // 2. Ajuste fino del nivel en el perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('sport_levels')
        .eq('id', session.user.id)
        .single();

      const currentLevels = profile?.sport_levels || { Fútbol: 3.0, Padel: 3.0, Tenis: 3.0, Basket: 3.0 };
      let currentScore = currentLevels[sport] || 3.0;

      if (selectedPerception === 'easy') {
        currentScore = Math.min(5.0, currentScore + 0.2); // Sube nivel
      } else if (selectedPerception === 'hard') {
        currentScore = Math.max(1.0, currentScore - 0.2); // Ajusta recomendación hacia partidos más relajados
      }

      currentLevels[sport] = Number(currentScore.toFixed(1));

      await supabase
        .from('profiles')
        .update({ sport_levels: currentLevels })
        .eq('id', session.user.id);

      const successMsg = '¡Gracias! La IA de CanchaYa ajustó tus recomendaciones para futuros partidos.';
      Platform.OS === 'web' ? window.alert(successMsg) : Alert.alert(' LevelMatch AI', successMsg);

      onClose();
    } catch (e: any) {
      console.error('Error al guardar feedback:', e);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          
          {/* Badge IA */}
          <View style={styles.aiHeaderRow}>
            <View style={[styles.aiBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name="sparkles" size={16} color="#09090b" style={{ marginRight: 4 }} />
              <Text style={styles.aiBadgeText}>CanchaYa LevelMatch AI</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            ¿Cómo sentiste el nivel del partido?
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {sport} en {locationName}
          </Text>

          {/* Opciones Tipo Pastilla Gigante */}
          <View style={styles.optionsContainer}>
            
            {/* Opción 1: Muy Relajado */}
            <TouchableOpacity
              style={[
                styles.optionPill,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                selectedPerception === 'easy' && { backgroundColor: colors.accent, borderColor: colors.accent }
              ]}
              onPress={() => setSelectedPerception('easy')}
              activeOpacity={0.85}
            >
              <Ionicons 
                name="happy-outline" 
                size={24} 
                color={selectedPerception === 'easy' ? '#09090b' : colors.textPrimary} 
                style={{ marginRight: 12 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }, selectedPerception === 'easy' && { color: '#09090b' }]}>
                  Muy Relajado
                </Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }, selectedPerception === 'easy' && { color: '#09090b' }]}>
                  Poco exigente para mi nivel
                </Text>
              </View>
            </TouchableOpacity>

            {/* Opción 2: Equilibrado */}
            <TouchableOpacity
              style={[
                styles.optionPill,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                selectedPerception === 'balanced' && { backgroundColor: colors.accent, borderColor: colors.accent }
              ]}
              onPress={() => setSelectedPerception('balanced')}
              activeOpacity={0.85}
            >
              <Ionicons 
                name="checkmark-circle-outline" 
                size={24} 
                color={selectedPerception === 'balanced' ? '#09090b' : colors.textPrimary} 
                style={{ marginRight: 12 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }, selectedPerception === 'balanced' && { color: '#09090b' }]}>
                  Parejo y Equilibrado
                </Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }, selectedPerception === 'balanced' && { color: '#09090b' }]}>
                  Nivel perfecto e intenso
                </Text>
              </View>
            </TouchableOpacity>

            {/* Opción 3: Exigente */}
            <TouchableOpacity
              style={[
                styles.optionPill,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                selectedPerception === 'hard' && { backgroundColor: colors.accent, borderColor: colors.accent }
              ]}
              onPress={() => setSelectedPerception('hard')}
              activeOpacity={0.85}
            >
              <Ionicons 
                name="flame-outline" 
                size={24} 
                color={selectedPerception === 'hard' ? '#09090b' : colors.textPrimary} 
                style={{ marginRight: 12 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }, selectedPerception === 'hard' && { color: '#09090b' }]}>
                  Muy Exigente
                </Text>
                <Text style={[styles.optionSub, { color: colors.textSecondary }, selectedPerception === 'hard' && { color: '#09090b' }]}>
                  Los rivales tenían nivel superior
                </Text>
              </View>
            </TouchableOpacity>

          </View>

          {/* Botón Principal Confirmar */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.accent },
              !selectedPerception && { opacity: 0.5 }
            ]}
            onPress={handleSaveRating}
            disabled={!selectedPerception || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#09090b" />
            ) : (
              <Text style={styles.submitBtnText}>Calibrar Nivel con IA</Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxWidth: 440, borderRadius: 28, padding: 24, borderWidth: 1, elevation: 5 },
  aiHeaderRow: { marginBottom: 12, alignItems: 'flex-start' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  aiBadgeText: { fontSize: 13, fontWeight: 'bold', color: '#09090b' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '500', marginBottom: 20 },
  optionsContainer: { gap: 12, marginBottom: 24 },
  optionPill: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  optionTitle: { fontSize: 16, fontWeight: 'bold' },
  optionSub: { fontSize: 13, marginTop: 2 },
  submitBtn: { height: 56, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  submitBtnText: { color: '#09090b', fontSize: 17, fontWeight: 'bold' },
});