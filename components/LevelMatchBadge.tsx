import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LevelMatchBadgeProps {
  userLevel?: number; // Ej: 3.0
  sport: string;
}

export default function LevelMatchBadge({ userLevel = 3.0, sport }: LevelMatchBadgeProps) {
  const { colors } = useTheme();

  // Lógica inteligente de recomendación
  let badgeText = 'Nivel Ideal para ti';
  let iconName: any = 'checkmark-circle';
  let isWarning = false;

  if (userLevel >= 4.0) {
    badgeText = 'Partido Competitivo / Exigente';
    iconName = 'flame';
  } else if (userLevel <= 2.0) {
    badgeText = 'Recomendado para Principiantes';
    iconName = 'sparkles';
  }

  return (
    <View style={[styles.badgeContainer, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
      <Ionicons name={iconName} size={15} color={colors.accentDark} style={{ marginRight: 6 }} />
      <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
        IA: <Text style={{ color: colors.accentDark, fontWeight: 'bold' }}>{badgeText}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '500' },
});