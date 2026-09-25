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
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      const msg = 'Por favor ingresa tu correo electrónico y contraseña.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Campos Incompletos', msg);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // Navegación segura hacia el inicio
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      const errorMsg = error.message === 'Invalid login credentials' 
        ? 'Correo o contraseña incorrectos. Verifica tus datos.' 
        : error.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      
      Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert('Error de Autenticación', errorMsg);
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
        
        {/* Botón para cerrar o regresar */}
        <TouchableOpacity 
          style={styles.closeBtn} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Tarjeta de Bienvenida / Marca Bento */}
          <View style={styles.headerCard}>
            <View style={styles.logoBadge}>
              <Ionicons name="football" size={36} color="#09090b" />
            </View>
            <Text style={styles.brandTitle}>Cancha<Text style={{ color: '#a3e635' }}>YA</Text></Text>
            <Text style={styles.brandSubtitle}>Ingresa a tu cuenta y arma tu equipo en segundos</Text>
          </View>

          {/* Formulario Estilo Bento */}
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#71717a"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu contraseña"
                placeholderTextColor="#71717a"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Botón Principal en formato Pastilla grande */}
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

          {/* Enlace hacia Registro */}
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
    backgroundColor: '#09090b', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  phoneContainer: { 
    flex: 1, 
    width: '100%', 
    maxWidth: 480, 
    paddingTop: 50, 
    paddingHorizontal: 20 
  },
  closeBtn: { 
    backgroundColor: '#18181b', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  scrollContent: { 
    paddingBottom: 40 
  },
  headerCard: { 
    backgroundColor: '#18181b', 
    borderRadius: 28, 
    padding: 24, 
    alignItems: 'center', 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#27272a' 
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
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#ffffff' 
  },
  brandSubtitle: { 
    fontSize: 16, 
    color: '#a1a1aa', 
    marginTop: 6, 
    textAlign: 'center',
    fontWeight: '500'
  },
  formCard: { 
    backgroundColor: '#18181b', 
    borderRadius: 28, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  inputLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#f4f4f5', 
    marginBottom: 8, 
    marginTop: 12 
  },
  inputContainer: { 
    backgroundColor: '#27272a', 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 56, 
    borderWidth: 1, 
    borderColor: '#3f3f46' 
  },
  inputIcon: { 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#ffffff',
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
    shadowColor: '#a3e635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
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
    color: '#a1a1aa', 
    fontSize: 16 
  },
  registerLink: { 
    color: '#a3e635', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});