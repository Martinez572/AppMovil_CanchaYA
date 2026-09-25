import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            backgroundColor: 'rgba(24, 24, 27, 0.95)',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(63, 63, 70, 0.5)',
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
            elevation: 10,
          },
          tabBarActiveTintColor: '#a3e635',
          tabBarInactiveTintColor: '#a1a1aa',
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Explorar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Partidos',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'football' : 'football-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Mi Perfil',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}