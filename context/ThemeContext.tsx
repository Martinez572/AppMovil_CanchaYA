import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';
type LanguageMode = 'es' | 'en';

interface ThemeContextType {
  theme: ThemeMode;
  language: LanguageMode;
  toggleTheme: () => void;
  setLanguage: (lang: LanguageMode) => void;
  colors: typeof LightColors;
  t: (key: string) => string;
}

export const LightColors = {
  background: '#f4f4f5',
  card: '#ffffff',
  cardBorder: '#e4e4e7',
  textPrimary: '#18181b',
  textSecondary: '#71717a',
  accent: '#a3e635',
  accentDark: '#65a30d',
  accentText: '#09090b',
  inputBg: '#f4f4f5',
  inputBorder: '#e4e4e7',
  chipBg: '#e4e4e7',
};

export const DarkColors = {
  background: '#09090b',
  card: '#18181b',
  cardBorder: '#27272a',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  accent: '#a3e635',
  accentDark: '#84cc16',
  accentText: '#09090b',
  inputBg: '#27272a',
  inputBorder: '#3f3f46',
  chipBg: '#27272a',
};

// DICCIONARIO COMPLETO ESPAÑOL / INGLÉS
const translations: Record<LanguageMode, Record<string, string>> = {
  es: {
    // Navegación
    tabExplore: 'Explorar',
    tabMyMatches: 'Mis Partidos',
    tabProfile: 'Mi Perfil',

    // Cabecera e Identificación
    welcome: 'Bienvenido de vuelta,',
    player: 'Jugador',
    findMatches: 'Encuentra partidos cerca de ti',
    enter: 'Ingresar',

    // Filtros de Deportes
    filterAll: 'Todos',
    filterSoccer: 'Fútbol',
    filterPadel: 'Padel',
    filterTennis: 'Tenis',
    filterBasketball: 'Basket',
    filterVolleyball: 'Voleibol',
    filterCycling: 'Ciclismo',
    filterRunning: 'Running',

    // Sección de Partidos / Feed
    availableMatches: 'Partidos Disponibles',
    activeMatches: 'activos',
    loadingMatches: 'Cargando convocatorias...',
    noMatchesTitle: 'No hay partidos programados',
    noMatchesSubAll: 'Aún no se han publicado encuentros. ¡Sé el primero en organizar uno!',
    noMatchesSubFilter: 'No hay convocatorias abiertas para este deporte en este momento.',
    organizeMatch: 'Organizar Partido',
    joinMatch: 'Unirme al Partido',
    matchFull: 'Convocatoria Llena',
    spotsLeft: 'FALTAN JUGADORES',
    fullBadge: 'COMPLETO',
    organizedBy: 'Organizado por',
    confirmedBadge: 'CONFIRMADO',

    // Mis Partidos
    myMatchesTitle: 'Mis Partidos',
    myMatchesEmptyTitle: 'Sin partidos registrados',
    myMatchesEmptySub: 'Aún no te has unido a ningún encuentro ni has organizado uno.',
    exploreMatchesBtn: 'Explorar Partidos',
    loadingMyMatches: 'Cargando tus partidos...',

    // Mi Perfil
    myProfileTitle: 'Mi Perfil',
    noActiveSessionTitle: 'Sin Sesión Activa',
    noActiveSessionSub: 'Inicia sesión o regístrate para gestionar tu perfil e historial de partidos.',
    loginBtn: 'Iniciar Sesión',
    logoutBtn: 'Cerrar Sesión',
    ratingLabel: 'Calificación',
    phoneLabel: 'Celular',
    notRegistered: 'No registrado',
    sportsInterestsTitle: 'Mis Deportes de Interés',
    accountSettingsTitle: 'Ajustes de Cuenta',
    themeOption: 'Modo Oscuro / Claro',
    languageOption: 'Idioma',
    securityOption: 'Seguridad y Contraseña',
    sessionClosedMsg: 'Sesión cerrada correctamente.',

    // Acciones y Mensajes
    dateTbd: 'Fecha por confirmar',
    joinSuccess: '¡Te has unido al partido correctamente!',
    alreadyJoined: 'Ya estás registrado en este encuentro.',
    loginRequiredTitle: 'Sesión Requerida',
    loginRequiredMsg: 'Debes iniciar sesión para unirte a un partido.',
    cancelBtn: 'Cancelar',
  },
  en: {
    // Navigation
    tabExplore: 'Explore',
    tabMyMatches: 'My Matches',
    tabProfile: 'My Profile',

    // Header & User Greeting
    welcome: 'Welcome back,',
    player: 'Player',
    findMatches: 'Find matches near you',
    enter: 'Sign In',

    // Sports Filters
    filterAll: 'All',
    filterSoccer: 'Soccer',
    filterPadel: 'Padel',
    filterTennis: 'Tennis',
    filterBasketball: 'Basketball',
    filterVolleyball: 'Volleyball',
    filterCycling: 'Cycling',
    filterRunning: 'Running',

    // Match Feed / Cards
    availableMatches: 'Available Matches',
    activeMatches: 'active',
    loadingMatches: 'Loading match calls...',
    noMatchesTitle: 'No matches scheduled',
    noMatchesSubAll: 'No matches have been published yet. Be the first to organize one!',
    noMatchesSubFilter: 'There are no open match calls for this sport right now.',
    organizeMatch: 'Organize Match',
    joinMatch: 'Join Match',
    matchFull: 'Match Full',
    spotsLeft: 'SPOTS LEFT',
    fullBadge: 'FULL',
    organizedBy: 'Organized by',
    confirmedBadge: 'CONFIRMED',

    // My Matches Screen
    myMatchesTitle: 'My Matches',
    myMatchesEmptyTitle: 'No registered matches',
    myMatchesEmptySub: "You haven't joined or organized any matches yet.",
    exploreMatchesBtn: 'Explore Matches',
    loadingMyMatches: 'Loading your matches...',

    // Profile Screen
    myProfileTitle: 'My Profile',
    noActiveSessionTitle: 'No Active Session',
    noActiveSessionSub: 'Sign in or register to manage your sports profile and match history.',
    loginBtn: 'Log In',
    logoutBtn: 'Log Out',
    ratingLabel: 'Rating',
    phoneLabel: 'Phone',
    notRegistered: 'Not registered',
    sportsInterestsTitle: 'My Sports Interests',
    accountSettingsTitle: 'Account Settings',
    themeOption: 'Dark / Light Mode',
    languageOption: 'Language',
    securityOption: 'Security & Password',
    sessionClosedMsg: 'Session closed successfully.',

    // Actions and Alert Messages
    dateTbd: 'Date to be confirmed',
    joinSuccess: 'You have joined the match successfully!',
    alreadyJoined: 'You are already registered for this match.',
    loginRequiredTitle: 'Login Required',
    loginRequiredMsg: 'You must log in to join a match.',
    cancelBtn: 'Cancel',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [language, setLanguageState] = useState<LanguageMode>('es');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@canchaya_theme');
        const savedLang = await AsyncStorage.getItem('@canchaya_lang');
        if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
        if (savedLang === 'es' || savedLang === 'en') setLanguageState(savedLang);
      } catch (e) {
        console.log('Error cargando preferencias');
      }
    };
    loadPreferences();
  }, []);

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem('@canchaya_theme', nextTheme);
    } catch (e) {}
  };

  const setLanguage = async (lang: LanguageMode) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('@canchaya_lang', lang);
    } catch (e) {}
  };

  const colors = theme === 'light' ? LightColors : DarkColors;

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <ThemeContext.Provider value={{ theme, language, toggleTheme, setLanguage, colors, t }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  return context;
};