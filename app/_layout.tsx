import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { ThemeProvider } from '../context/ThemeContext';
import '../global.css';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="match/create" />
      </Stack>
    </ThemeProvider>
  );
}
    <View style={{ flex: 1, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: '100%', maxWidth: 480, flex: 1, backgroundColor: '#f4f4f5', overflow: 'hidden' }}>
        <StatusBar style="dark" />
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: { backgroundColor: '#f4f4f5' } 
          }} 
        />
      </View>
    </View>
