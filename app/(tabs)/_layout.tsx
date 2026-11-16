import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors, t, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculamos el espacio inferior real del dispositivo (botones de Android o barra de gestos)
  // Si insets.bottom es 0 (algunos dispositivos Android con botones físicos/navegación), damos 16px mínimos
  const bottomSpacing = Math.max(insets.bottom, 16) + 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#09090b', // Contraste máximo sobre la pastilla verde neón
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomSpacing,
          left: 16,
          right: 16,
          height: 74, // Altura generosa para fácil pulsación (16 a 50+ años)
          borderRadius: 9999, // Estilo cápsula/pastilla Bento Grid
          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.4 : 0.12,
          shadowRadius: 12,
        },
        tabBarItemStyle: {
          borderRadius: 9999,
          marginHorizontal: 2,
          paddingVertical: 4,
        },
        tabBarActiveBackgroundColor: colors.accent, // Verde Neón (#a3e635) activo
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabExplore') || 'Explorar',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'compass' : 'compass-outline'} 
              size={25} 
              color={focused ? '#09090b' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: t('tabMatches') || 'Mis Partidos',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'football' : 'football-outline'} 
              size={25} 
              color={focused ? '#09090b' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabChat') || 'Mensajes',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
              size={25} 
              color={focused ? '#09090b' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile') || 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={25} 
              color={focused ? '#09090b' : color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}