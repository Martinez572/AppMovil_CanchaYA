import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const TAB_ITEMS: Record<
  string,
  {
    label: string;
    path: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: {
    label: 'Explorar',
    path: '/(tabs)',
    iconActive: 'compass',
    iconInactive: 'compass-outline',
  },
  matches: {
    label: 'Partidos',
    path: '/(tabs)/matches',
    iconActive: 'football',
    iconInactive: 'football-outline',
  },
  chat: {
    label: 'Chat',
    path: '/(tabs)/chat',
    iconActive: 'chatbubbles',
    iconInactive: 'chatbubbles-outline',
  },
  profile: {
    label: 'Perfil',
    path: '/(tabs)/profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
};

function CustomFloatingTabBar({ state }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomSpacing = Math.max(insets.bottom, 12) + 8;

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          bottom: bottomSpacing,
          backgroundColor: isDark
            ? 'rgba(24, 24, 27, 0.96)'
            : 'rgba(255, 255, 255, 0.96)',
          borderColor: colors.cardBorder,
          shadowOpacity: isDark ? 0.45 : 0.12,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const config = TAB_ITEMS[route.name];
        if (!config) return null;

        const isFocused = state.index === index;

        const handlePress = () => {
          if (!isFocused) {
            router.navigate(config.path as any);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            style={[
              styles.tabButton,
              isFocused && { backgroundColor: colors.accent },
            ]}
          >
            <Ionicons
              name={isFocused ? config.iconActive : config.iconInactive}
              size={24}
              color={isFocused ? '#09090b' : colors.textPrimary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                { color: isFocused ? '#09090b' : colors.textPrimary },
                isFocused && { fontWeight: '800' },
              ]}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomFloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});