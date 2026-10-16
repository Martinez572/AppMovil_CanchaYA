import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();

  // Estados del Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validar formato de correo
  const validateEmail = (emailStr: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr.trim());
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password.trim()) {
      const msg = 'Por favor ingresa tu correo electrónico y contraseña.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Campos Incompletos', msg);
      return;
    }

    setLoading(true);

    try {
      // 1. Iniciar sesión en Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) throw error;

      if (data?.session) {
        // 2. Esperar 100ms para asegurar la escritura del token en la caché del celular
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 100);
      } else {
        throw new Error('No se pudo confirmar la sesión.');
      }
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      const errorMsg = error.message?.includes('Invalid login credentials')
        ? 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.'
        : error.message || 'Error de autenticación.';

      Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.phoneContainer}>
        
        {/* Cabecera / Botón Cerrar */}
        <View style={styles.topHeader}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#18181b" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* BANNER PRINCIPAL BENTO GRID */}
          <View style={styles.headerCard}>
            <View style={styles.logoBadge}>
              <Ionicons name="football" size={36} color="#09090b" />
            </View>
            <Text style={styles.brandTitle}>Cancha<Text style={{ color: '#65a30d' }}>YA</Text></Text>
            <Text style={styles.brandSubtitle}>Ingresa a tu cuenta para unirte a partidos y completar tus equipos al instante.</Text>
          </View>

          {/* TARJETA DE FORMULARIO BENTO */}
          <View style={styles.formCard}>
            
            {/* Campo: Correo Electrónico */}
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View style={[
              styles.inputContainer,
              email.length > 0 && !validateEmail(email) && styles.inputErrorBorder
            ]}>
              <Ionicons name="mail-outline" size={22} color="#71717a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#a1a1aa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            {email.length > 0 && !validateEmail(email) && (
              <Text style={styles.errorText}>Ingresa un correo con formato válido</Text>
            )}

            {/* Campo: Contraseña */}
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#71717a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu contraseña registrada"
                placeholderTextColor="#a1a1aa"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#71717a" />
              </TouchableOpacity>
            </View>

            {/* BOTÓN PRINCIPAL EN PASTILLA GRANDE */}
            <TouchableOpacity 
              style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#09090b" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
                  <Ionicons name="arrow-forward" size={22} color="#09090b" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

          </View>

          {/* ENLACE HACIA REGISTRO */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿Aún no tienes cuenta?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.registerLink}> Regístrate aquí</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f4f4f5', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  phoneContainer: { 
    flex: 1, 
    width: '100%', 
    maxWidth: 480, 
    paddingTop: 48, 
    paddingHorizontal: 20 
  },
  topHeader: {
    marginBottom: 12
  },
  closeBtn: { 
    backgroundColor: '#ffffff', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e4e4e7',
    elevation: 1
  },
  scrollContent: { 
    paddingBottom: 40 
  },
  headerCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 28, 
    padding: 24, 
    alignItems: 'center', 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e4e4e7',
    elevation: 2
  },
  logoBadge: { 
    backgroundColor: '#a3e635', 
    width: 68, 
    height: 68, 
    borderRadius: 34, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  brandTitle: { 
    fontSize: 30, 
    fontWeight: 'bold', 
    color: '#18181b' 
  },
  brandSubtitle: { 
    fontSize: 15, 
    color: '#71717a', 
    marginTop: 6, 
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22
  },
  formCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 28, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: '#e4e4e7',
    elevation: 2
  },
  inputLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#18181b', 
    marginBottom: 8, 
    marginTop: 10 
  },
  inputContainer: { 
    backgroundColor: '#f4f4f5', 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 56, 
    borderWidth: 1, 
    borderColor: '#e4e4e7' 
  },
  inputErrorBorder: {
    borderColor: '#ef4444'
  },
  inputIcon: { 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#18181b',
    fontWeight: '500'
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500'
  },
  eyeIcon: { 
    padding: 6 
  },
  primaryButton: { 
    backgroundColor: '#a3e635', 
    height: 56, 
    borderRadius: 9999, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 28,
    elevation: 3
  },
  primaryButtonText: { 
    color: '#09090b', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  footerRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 24 
  },
  footerText: { 
    color: '#71717a', 
    fontSize: 16,
    fontWeight: '500'
  },
  registerLink: { 
    color: '#65a30d', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});