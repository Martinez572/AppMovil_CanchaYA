import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

interface UserProfileData {
  full_name: string;
  email: string;
  phone?: string;
  sports_interests?: string[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, toggleTheme, language, setLanguage, colors, t } = useTheme();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Consulta a la tabla profiles en Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || 'Deportista CanchaYa',
          email: session.user.email || data.email || '',
          phone: data.phone || t('notRegistered'),
          sports_interests: data.sports_interests && data.sports_interests.length > 0 
            ? data.sports_interests 
            : ['Fútbol'],
        });
      } else {
        // Fallback a metadatos de la sesión
        setProfile({
          full_name: session.user.user_metadata?.full_name || t('player'),
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || t('notRegistered'),
          sports_interests: session.user.user_metadata?.sports_interests || ['Fútbol'],
        });
      }
    } catch (e) {
      console.error('Error al cargar perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  // Se reejecuta cada vez que el usuario enfoca la pantalla en la app
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [language])
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    const msg = t('sessionClosedMsg');
    Platform.OS === 'web' ? window.alert(msg) : Alert.alert(t('logoutBtn'), msg);
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.phoneContainer}>
        
        {/* Cabecera */}
        <View style={styles.topHeader}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('myProfileTitle')}</Text>
          {profile && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutHeaderBtn} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          {profile ? (
            <>
              {/* TARJETA DE PERFIL BENTO GRID */}
              <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
                  <Ionicons name="person" size={44} color="#09090b" />
                </View>
                <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profile.full_name}</Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{profile.email}</Text>

                <View style={[styles.statsRow, { borderTopColor: colors.cardBorder }]}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statNumber, { color: colors.textPrimary }]}>5.0 ★</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('ratingLabel')}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{profile.phone}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('phoneLabel')}</Text>
                  </View>
                </View>
              </View>

              {/* DEPORTES DE INTERÉS */}
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('sportsInterestsTitle')}</Text>
              <View style={styles.sportsGrid}>
                {profile.sports_interests?.map((sport, idx) => (
                  <View key={idx} style={[styles.sportChip, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#09090b" style={{ marginRight: 6 }} />
                    <Text style={styles.sportChipText}>{sport}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            /* ESTADO SIN SESIÓN */
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="person-circle-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('noActiveSessionTitle')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t('noActiveSessionSub')}
              </Text>
              
              <TouchableOpacity 
                style={[styles.primaryPillBtn, { backgroundColor: colors.accent }]} 
                onPress={() => router.push('/auth/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryPillBtnText}>{t('loginBtn')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* AJUSTES DE TEMA E IDIOMA */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('accountSettingsTitle')}</Text>
          <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            
            {/* Control Modo Oscuro / Claro */}
            <View style={[styles.optionRow, { borderBottomColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={theme === 'dark' ? "moon-outline" : "sunny-outline"} 
                  size={22} 
                  color={colors.textPrimary} 
                  style={{ marginRight: 12 }} 
                />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{t('themeOption')}</Text>
              </View>
              <Switch
                trackColor={{ false: '#e4e4e7', true: '#a3e635' }}
                thumbColor={theme === 'dark' ? '#09090b' : '#ffffff'}
                onValueChange={toggleTheme}
                value={theme === 'dark'}
              />
            </View>

            {/* Selector de Idioma (ES / EN) */}
            <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="language-outline" size={22} color={colors.textPrimary} style={{ marginRight: 12 }} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{t('languageOption')}</Text>
              </View>

              <View style={[styles.langPillContainer, { backgroundColor: colors.inputBg }]}>
                <TouchableOpacity 
                  style={[styles.langPill, language === 'es' && { backgroundColor: colors.accent }]}
                  onPress={() => setLanguage('es')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langText, { color: colors.textSecondary }, language === 'es' && { color: '#09090b', fontWeight: 'bold' }]}>ES</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.langPill, language === 'en' && { backgroundColor: colors.accent }]}
                  onPress={() => setLanguage('en')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langText, { color: colors.textSecondary }, language === 'en' && { color: '#09090b', fontWeight: 'bold' }]}>EN</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>

          {/* CERRAR SESIÓN */}
          {profile && (
            <TouchableOpacity 
              style={styles.logoutPillBtn} 
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutPillBtnText}>{t('logoutBtn')}</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, paddingTop: 48, paddingHorizontal: 20 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  logoutHeaderBtn: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 9999, borderWidth: 1, borderColor: '#fca5a5' },
  profileCard: { borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, elevation: 2, marginBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 22, fontWeight: 'bold' },
  profileEmail: { fontSize: 14, marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, paddingTop: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sportChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999 },
  sportChipText: { fontSize: 14, fontWeight: 'bold', color: '#09090b' },
  optionsCard: { borderRadius: 24, paddingHorizontal: 16, borderWidth: 1, elevation: 1, marginBottom: 20 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  optionText: { fontSize: 16, fontWeight: '600' },
  langPillContainer: { flexDirection: 'row', borderRadius: 9999, padding: 2 },
  langPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999 },
  langText: { fontSize: 13, fontWeight: 'bold' },
  logoutPillBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2', paddingVertical: 16, borderRadius: 9999, borderWidth: 1, borderColor: '#fca5a5' },
  logoutPillBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  emptyCard: { borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 22 },
  primaryPillBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999 },
  primaryPillBtnText: { color: '#09090b', fontWeight: 'bold', fontSize: 16 },
});