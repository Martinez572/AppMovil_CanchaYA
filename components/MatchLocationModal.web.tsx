import { Ionicons } from '@expo/vector-icons';
import {
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface MatchLocationModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  sportName: string;
  placeLabel?: string;
}

export function MatchLocationModal({
  visible,
  onClose,
  latitude,
  longitude,
  sportName,
  placeLabel,
}: MatchLocationModalProps) {
  const { colors, isDark } = useTheme();

  const lat = latitude || 1.2136; // Pasto por defecto
  const lng = longitude || -77.2811;

  // Abre Google Maps en una nueva pestaña del navegador
  const openExternalMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  // URL de mapa embebido compatible 100% con navegadores web
  const embedMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008}%2C${lat - 0.008}%2C${lng + 0.008}%2C${lat + 0.008}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* Cabecera del Modal */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Ubicación de la Cancha
              </Text>
              <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
                {placeLabel || `Punto marcado para ${sportName}`}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? '#27272a' : '#f4f4f5' },
              ]}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Mapa Interactivo Web */}
          <View style={[styles.mapWrapper, { borderColor: colors.cardBorder }]}>
            <iframe
              src={embedMapUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Ubicación del Partido"
            />
          </View>

          {/* Botón de acción principal en forma de pastilla */}
          <Pressable
            onPress={openExternalMaps}
            style={[styles.gpsButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="navigate" size={22} color="#09090b" />
            <Text style={styles.gpsButtonText}>Abrir en Google Maps</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 32,
    borderWidth: 1,
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrapper: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 18,
  },
  gpsButton: {
    height: 56,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  gpsButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090b',
  },
});