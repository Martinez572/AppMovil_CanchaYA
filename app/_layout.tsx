import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import '../global.css';

export default function RootLayout() {
  return (
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
  );
}