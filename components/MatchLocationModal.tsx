import { Ionicons } from '@expo/vector-icons';
import {
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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

  // Abre la app nativa de mapas del dispositivo para indicaciones GPS
  const openExternalMaps = () => {
    const label = encodeURIComponent(placeLabel || `Cancha de ${sportName} - CanchaYa`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
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

          {/* Contenedor del Mapa Estilo Bento */}
          <View style={[styles.mapWrapper, { borderColor: colors.cardBorder }]}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: latitude || 1.2136, // Default Pasto, Colombia
                longitude: longitude || -77.2811,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
            >
              <Marker
                coordinate={{
                  latitude: latitude || 1.2136,
                  longitude: longitude || -77.2811,
                }}
                title={placeLabel || `Partido de ${sportName}`}
                description="Punto de encuentro seleccionado por el organizador"
                pinColor="#84cc16"
              />
            </MapView>
          </View>

          {/* Botón de acción principal en forma de pastilla */}
          <Pressable
            onPress={openExternalMaps}
            style={[styles.gpsButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="navigate" size={22} color="#09090b" />
            <Text style={styles.gpsButtonText}>Cómo llegar (Abrir GPS)</Text>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
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
    opacity: 0.85,
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
  map: {
    width: '100%',
    height: '100%',
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