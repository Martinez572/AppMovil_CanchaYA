import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();

  // Estados del Formulario
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('2002-07-04');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Selección múltiple de deportes
  const [selectedSports, setSelectedSports] = useState<string[]>(['Fútbol']);

  // Estados visuales y de carga
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Estados para Modal de Fecha
  const [year, setYear] = useState('2002');
  const [month, setMonth] = useState('07');
  const [day, setDay] = useState('04');

  const sportsList = [
    { id: '1', name: 'Fútbol', icon: 'football' },
    { id: '2', name: 'Padel', icon: 'tennisball' },
    { id: '3', name: 'Tenis', icon: 'baseball' },
    { id: '4', name: 'Basket', icon: 'basketball' },
    { id: '5', name: 'Voleibol', icon: 'trophy-outline' },
    { id: '6', name: 'Ciclismo', icon: 'bicycle' },
    { id: '7', name: 'Running', icon: 'walk' },
  ];

  // Manejador estricto para límites de Día y Mes
  const handleDayChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    if (numeric === '') {
      setDay('');
      return;
    }
    const val = parseInt(numeric, 10);
    if (val > 31) {
      setDay('31');
    } else {
      setDay(numeric);
    }
  };

  const handleMonthChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    if (numeric === '') {
      setMonth('');
      return;
    }
    const val = parseInt(numeric, 10);
    if (val > 12) {
      setMonth('12');
    } else {
      setMonth(numeric);
    }
  };

  const handleYearChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, '');
    setYear(numeric);
  };

  // Alternar selección múltiple de deportes
  const toggleSport = (sportName: string) => {
    if (selectedSports.includes(sportName)) {
      if (selectedSports.length === 1) {
        const msg = 'Debes seleccionar al menos un deporte de interés.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atención', msg);
        return;
      }
      setSelectedSports(selectedSports.filter(s => s !== sportName));
    } else {
      setSelectedSports([...selectedSports, sportName]);
    }
  };

  const handleConfirmDate = () => {
    const parsedDay = (parseInt(day, 10) || 1).toString().padStart(2, '0');
    const parsedMonth = (parseInt(month, 10) || 1).toString().padStart(2, '0');
    const parsedYear = year.length === 4 ? year : '2000';

    const formatted = `${parsedYear}-${parsedMonth}-${parsedDay}`;
    setBirthDate(formatted);
    setDateModalVisible(false);
  };

  // Validar formato sintáctico de email
  const validateEmail = (emailStr: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr.trim());
  };

  const handleRegister = async () => {
    const cleanEmail = email.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();

    // 1. Validar campos requeridos
    if (!cleanFullName || !cleanEmail || !cleanPhone || !password || !confirmPassword) {
      const msg = 'Por favor completa todos los campos del formulario.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Campos Incompletos', msg);
      return;
    }

    // 2. Validar formato de correo
    if (!validateEmail(cleanEmail)) {
      const msg = 'El correo electrónico ingresado no tiene un formato válido (ejemplo@dominio.com).';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Correo Inválido', msg);
      return;
    }

    // 3. Validar longitud de contraseña
    if (password.length < 6) {
      const msg = 'La contraseña debe tener al menos 6 caracteres.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Contraseña Débil', msg);
      return;
    }

    // 4. Coincidencia de contraseñas
    if (password !== confirmPassword) {
      const msg = 'Las contraseñas no coinciden. Por favor verifícalas.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error de Coincidencia', msg);
      return;
    }

    setLoading(true);

    try {
      // Registro en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: cleanPhone,
            birth_date: birthDate,
            preferred_sport: selectedSports[0],
            sports_interests: selectedSports,
          },
        },
      });

      if (error) throw error;

      const successMsg = '¡Cuenta creada con éxito! Bienvenido a CanchaYa.';
      Platform.OS === 'web' ? window.alert(successMsg) : Alert.alert('¡Bienvenido!', successMsg);

      router.replace('/');
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      let errorMsg = error.message || 'No se pudo completar el registro.';
      if (error.message?.includes('invalid')) {
        errorMsg = 'El correo no fue aceptado por el servidor. Revisa que esté bien escrito o deshabilita "Confirm email" en Supabase.';
      }
      Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert('Error de Registro', errorMsg);
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
        
        {/* Cabecera / Volver */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Crear Cuenta</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Banner Principal */}
          <View style={styles.headerCard}>
            <Text style={styles.brandTitle}>Únete a Cancha<Text style={{ color: '#a3e635' }}>YA</Text></Text>
            <Text style={styles.brandSubtitle}>Completa tu perfil deportivo y organiza encuentros de forma rápida.</Text>
          </View>

          {/* TARJETA BENTO 1: Información Personal */}
          <View style={styles.bentoCard}>
            <Text style={styles.cardSectionTitle}>1. Datos Personales</Text>

            <Text style={styles.inputLabel}>Nombre y Apellido</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej: Andrés Martínez"
                placeholderTextColor="#71717a"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <Text style={styles.inputLabel}>Fecha de Nacimiento</Text>
            <TouchableOpacity 
              style={styles.inputContainer} 
              onPress={() => setDateModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <Text style={styles.inputTextValue}>{birthDate}</Text>
              <Ionicons name="chevron-down" size={20} color="#71717a" />
            </TouchableOpacity>
          </View>

          {/* TARJETA BENTO 2: Contacto y Seguridad */}
          <View style={styles.bentoCard}>
            <Text style={styles.cardSectionTitle}>2. Contacto y Seguridad</Text>

            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <View style={[
              styles.inputContainer,
              email.length > 0 && !validateEmail(email) && styles.inputErrorBorder
            ]}>
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
            {email.length > 0 && !validateEmail(email) && (
              <Text style={styles.errorText}>Ingresa un correo válido (ej. usuario@gmail.com)</Text>
            )}

            <Text style={styles.inputLabel}>Número de Celular</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+57 300 123 4567"
                placeholderTextColor="#71717a"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#71717a"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
            <View style={[
              styles.inputContainer, 
              confirmPassword.length > 0 && password !== confirmPassword && styles.inputErrorBorder
            ]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#a1a1aa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#71717a"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
            )}
          </View>

          {/* TARJETA BENTO 3: Deportes de Interés (Selección Múltiple) */}
          <View style={styles.bentoCard}>
            <View style={styles.sportHeaderRow}>
              <Text style={styles.cardSectionTitle}>3. Deportes de Interés</Text>
              <Text style={styles.sportSubtitleBadge}>Multiselección</Text>
            </View>
            <Text style={styles.sportHint}>Selecciona los deportes que sueles practicar:</Text>

            <View style={styles.sportsGrid}>
              {sportsList.map((sport) => {
                const isSelected = selectedSports.includes(sport.name);
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                    onPress={() => toggleSport(sport.name)}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={sport.icon as any} 
                      size={20} 
                      color={isSelected ? '#09090b' : '#a1a1aa'} 
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>
                      {sport.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#09090b" style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* BOTÓN PRINCIPAL */}
          <TouchableOpacity 
            style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
            onPress={handleRegister} 
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#09090b" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Registrarme e Ingresar</Text>
                <Ionicons name="checkmark-circle" size={24} color="#09090b" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>

        {/* MODAL DE FECHA CON LÍMITES ESTRICTOS (Día <= 31, Mes <= 12) */}
        <Modal visible={dateModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Fecha de Nacimiento</Text>

              <View style={styles.dateInputsRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>Día (1-31)</Text>
                  <TextInput 
                    style={styles.dateInput} 
                    keyboardType="number-pad" 
                    maxLength={2} 
                    value={day} 
                    onChangeText={handleDayChange} 
                    placeholder="DD"
                    placeholderTextColor="#71717a"
                  />
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>Mes (1-12)</Text>
                  <TextInput 
                    style={styles.dateInput} 
                    keyboardType="number-pad" 
                    maxLength={2} 
                    value={month} 
                    onChangeText={handleMonthChange} 
                    placeholder="MM"
                    placeholderTextColor="#71717a"
                  />
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>Año</Text>
                  <TextInput 
                    style={styles.dateInput} 
                    keyboardType="number-pad" 
                    maxLength={4} 
                    value={year} 
                    onChangeText={handleYearChange} 
                    placeholder="AAAA"
                    placeholderTextColor="#71717a"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmDate}>
                <Text style={styles.modalConfirmText}>Confirmar Fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
    paddingTop: 48, 
    paddingHorizontal: 20 
  },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  topBarTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#ffffff' 
  },
  backBtn: { 
    backgroundColor: '#18181b', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  scrollContent: { 
    paddingBottom: 60 
  },
  headerCard: { 
    backgroundColor: '#18181b', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  brandTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#ffffff' 
  },
  brandSubtitle: { 
    fontSize: 15, 
    color: '#a1a1aa', 
    marginTop: 6, 
    lineHeight: 22,
    fontWeight: '500' 
  },
  bentoCard: { 
    backgroundColor: '#18181b', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  cardSectionTitle: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#ffffff', 
    marginBottom: 12 
  },
  inputLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#f4f4f5', 
    marginBottom: 8, 
    marginTop: 10 
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
  inputErrorBorder: {
    borderColor: '#ef4444'
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
  inputTextValue: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
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
  sportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sportSubtitleBadge: {
    backgroundColor: '#27272a',
    color: '#a3e635',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46'
  },
  sportHint: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 14,
    marginTop: -4
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  sportChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 9999, 
    borderWidth: 1, 
    borderColor: '#3f3f46',
    marginBottom: 6
  },
  sportChipSelected: { 
    backgroundColor: '#a3e635', 
    borderColor: '#a3e635' 
  },
  sportChipText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#a1a1aa' 
  },
  sportChipTextSelected: { 
    color: '#09090b', 
    fontWeight: 'bold' 
  },
  primaryButton: { 
    backgroundColor: '#a3e635', 
    height: 58, 
    borderRadius: 9999, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#a3e635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  primaryButtonText: { 
    color: '#09090b', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#18181b',
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20
  },
  dateInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  dateCol: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  dateLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600'
  },
  dateInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    width: '100%',
    height: 48,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#3f3f46'
  },
  modalConfirmBtn: {
    backgroundColor: '#a3e635',
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center'
  },
  modalConfirmText: {
    color: '#09090b',
    fontSize: 16,
    fontWeight: 'bold'
  }
});