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

// Importación condicional segura de WebView para mapas
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.log('WebView no disponible');
  }
}

export default function CreateMatchScreen() {
  const router = useRouter();
  
  // Función de cierre directo de la pantalla
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Estados principales del formulario
  const [selectedSport, setSelectedSport] = useState('Fútbol');
  const [selectedMonth, setSelectedMonth] = useState('Septiembre');
  const [selectedDay, setSelectedDay] = useState(25);
  const [selectedYear, setSelectedYear] = useState('2026');
  
  // Estados de Hora
  const [selectedHour, setSelectedHour] = useState('07');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [ampm, setAmpm] = useState('PM');
  const [isInputMode, setIsInputMode] = useState(false);

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Objeto de ubicación georreferenciada
  const [locationData, setLocationData] = useState<{
    lat: number | null;
    lng: number | null;
    address: string;
  }>({
    lat: null,
    lng: null,
    address: '',
  });

  // Modales
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);

  // Estados internos para Fecha
  const [dateTab, setDateTab] = useState<'calendar' | 'month' | 'year'>('calendar');

  const monthsList = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const yearsList = ['2024', '2025', '2026', '2027', '2028'];
  const weekDays = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];

  const calendarDaysMatrix = [
    [null, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27],
    [28, 29, 30, 31, null, null, null]
  ];

  const hoursClock = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

  const sportsList = [
    { id: '1', name: 'Fútbol', icon: 'football', type: 'cancha', defaultPlayers: 10 },
    { id: '2', name: 'Padel', icon: 'tennisball', type: 'cancha', defaultPlayers: 4 },
    { id: '3', name: 'Tenis', icon: 'baseball', type: 'cancha', defaultPlayers: 2 },
    { id: '4', name: 'Basket', icon: 'basketball', type: 'cancha', defaultPlayers: 10 },
    { id: '5', name: 'Ciclismo', icon: 'bicycle', type: 'ruta', defaultPlayers: 6 },
    { id: '6', name: 'Running', icon: 'walk', type: 'ruta', defaultPlayers: 8 },
    { id: '7', name: 'Voleibol', icon: 'trophy-outline', type: 'cancha', defaultPlayers: 12 },
  ];

  const currentSportData = sportsList.find(s => s.name === selectedSport);
  const isRouteType = currentSportData?.type === 'ruta';

  // HTML del mapa interactivo
  const interactiveMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style> body, html { margin: 0; padding: 0; height: 100%; width: 100%; } #map { height: 100%; width: 100%; } </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([1.2136, -77.2811], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        var marker = L.marker([1.2136, -77.2811], {draggable: true}).addTo(map);
        
        var selectedLat = 1.2136;
        var selectedLng = -77.2811;

        map.on('click', function(e) {
          selectedLat = e.latlng.lat;
          selectedLng = e.latlng.lng;
          marker.setLatLng(e.latlng);
          var data = JSON.stringify({ lat: selectedLat, lng: selectedLng, address: 'Punto (' + selectedLat.toFixed(4) + ', ' + selectedLng.toFixed(4) + ')' });
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
          else if (window.parent) window.parent.postMessage(data, "*");
        });

        marker.on('dragend', function(e) {
          var pos = marker.getLatLng();
          selectedLat = pos.lat;
          selectedLng = pos.lng;
          var data = JSON.stringify({ lat: selectedLat, lng: selectedLng, address: 'Punto (' + selectedLat.toFixed(4) + ', ' + selectedLng.toFixed(4) + ')' });
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
          else if (window.parent) window.parent.postMessage(data, "*");
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setLocationData({ lat: data.lat, lng: data.lng, address: data.address });
    } catch (e) {}
  };

  // Función principal de publicación con validación estricta de sesión
  const handlePublish = async () => {
    setIsSubmitting(true);

    try {
      // 1. Verificar si hay un usuario autenticado en Supabase
      const { data: { session } } = await supabase.auth.getSession();

      // Si no ha iniciado sesión, se le notifica e inmediatamente se direcciona a /auth/login
      if (!session || !session.user) {
        setIsSubmitting(false);
        const authMessage = 'Debes iniciar sesión para publicar un partido en CanchaYa.';

        if (Platform.OS === 'web') {
          window.alert(authMessage);
          router.push('/auth/login');
        } else {
          Alert.alert(
            'Sesión requerida',
            authMessage,
            [
              { 
                text: 'Iniciar Sesión', 
                onPress: () => router.push('/auth/login') 
              }
            ],
            { cancelable: false }
          );
        }
        return;
      }

      // 2. Validación de ubicación
      if (locationData.lat === null || locationData.lng === null) {
        const msg = 'Por favor selecciona una ubicación exacta en el mapa.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Ubicación requerida', msg);
        setIsSubmitting(false);
        return;
      }

      const creatorId = session.user.id;

      // 3. Mapeo de fecha y hora
      const monthIndex = monthsList.indexOf(selectedMonth);
      let hour24 = parseInt(selectedHour, 10);
      if (ampm === 'PM' && hour24 < 12) hour24 += 12;
      if (ampm === 'AM' && hour24 === 12) hour24 = 0;

      const matchDate = new Date(
        parseInt(selectedYear, 10),
        monthIndex >= 0 ? monthIndex : 8,
        selectedDay,
        hour24,
        parseInt(selectedMinute, 10)
      );

      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`;

      // 4. Inserción del encuentro en Supabase
      const { error } = await supabase.from('matches').insert([
        {
          creator_id: creatorId,
          sport: selectedSport,
          location_name: locationData.address || 'Ubicación seleccionada en mapa',
          latitude: locationData.lat,
          longitude: locationData.lng,
          google_maps_url: googleMapsUrl,
          date_time: matchDate.toISOString(),
          total_players_needed: currentSportData?.defaultPlayers || 10,
          joined_players_count: 1,
          notes: notes.trim() || null,
          status: 'open',
        },
      ]);

      if (error) throw error;

      const successMsg = '¡Tu partido ha sido publicado con éxito!';
      Platform.OS === 'web' ? window.alert(successMsg) : Alert.alert('¡Éxito!', successMsg);

      handleClose();
    } catch (err: any) {
      console.error('Error al guardar en Supabase:', err);
      const errMsg = err.message || 'Ocurrió un error al conectar con la base de datos.';
      Platform.OS === 'web' ? window.alert(errMsg) : Alert.alert('Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.phoneContainer}>
        
        {/* Cabecera */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={handleClose} 
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#18181b" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Organizar Encuentro</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Selector General de Deportes */}
          <Text style={styles.sectionLabel}>1. ¿Qué deporte vamos a practicar?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsScroll}>
            {sportsList.map((sport) => {
              const isSelected = selectedSport === sport.name;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                  onPress={() => setSelectedSport(sport.name)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={sport.icon as any} size={20} color={isSelected ? '#18181b' : '#52525b'} style={{ marginRight: 8 }} />
                  <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>{sport.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 2. Sección de Ubicación con Mapa Interactivo */}
          <Text style={styles.sectionLabel}>{isRouteType ? '2. Selecciona la Ruta en el Mapa' : '2. Selecciona la Cancha en el Mapa'}</Text>
          <TouchableOpacity 
            style={styles.mapPickerCard} 
            activeOpacity={0.8} 
            onPress={() => setMapModalVisible(true)}
          >
            <View style={styles.mapIconBox}>
              <Ionicons name="map" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.mapPickerTitle}>{locationData.lat !== null ? 'Ubicación Georreferenciada' : 'Abrir Mapa Interactivo'}</Text>
              <Text style={styles.mapPickerSubtitle} numberOfLines={1}>{locationData.address || 'Toca para mover el marcador y fijar el punto'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
          </TouchableOpacity>

          {locationData.lat !== null && locationData.lng !== null ? (
            <View style={styles.selectedLocationPreview}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="location-sharp" size={20} color="#16a34a" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLocationTitle} numberOfLines={1}>Punto fijado correctamente</Text>
                  <Text style={styles.selectedLocationCoords}>Lat: {locationData.lat.toFixed(4)}, Lng: {locationData.lng.toFixed(4)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setMapModalVisible(true)}>
                <Text style={styles.changeLocationText}>Modificar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 3. SECCIÓN FECHA Y HORA */}
          <Text style={styles.sectionLabel}>3. Fecha y Hora del Evento</Text>
          
          <View style={styles.dateTimeGrid}>
            <TouchableOpacity 
              style={styles.dateTimeCard}
              activeOpacity={0.8}
              onPress={() => setDateModalVisible(true)}
            >
              <View style={styles.dateTimeIconBox}>
                <Ionicons name="calendar-outline" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.dateTimeCardTitle}>Fecha</Text>
                <Text style={styles.dateTimeCardValue} numberOfLines={1}>{selectedMonth} {selectedDay}, {selectedYear}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dateTimeCard}
              activeOpacity={0.8}
              onPress={() => setTimeModalVisible(true)}
            >
              <View style={styles.dateTimeIconBox}>
                <Ionicons name="time-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.dateTimeCardTitle}>Hora</Text>
                <Text style={styles.dateTimeCardValue} numberOfLines={1}>{selectedHour}:{selectedMinute} {ampm}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* 4. Notas o Nivel */}
          <Text style={styles.sectionLabel}>4. Notas o Nivel Requerido</Text>
          <View style={[styles.inputContainer, { height: 110, alignItems: 'flex-start', paddingTop: 14 }]}>
            <Ionicons name="document-text-outline" size={20} color="#52525b" style={[styles.inputIcon, { marginTop: 2 }]} />
            <TextInput 
              style={[styles.input, { height: 85, textAlignVertical: 'top' }]}
              placeholder="Ej: Nivel intermedio, ambiente amigable..."
              placeholderTextColor="#a1a1aa"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Botón Principal "Publicar" */}
          <TouchableOpacity 
            style={[styles.publishButton, isSubmitting && { opacity: 0.7 }]} 
            onPress={handlePublish} 
            activeOpacity={0.7}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#09090b" size="small" />
            ) : (
              <>
                <Text style={styles.publishButtonText}>Publicar</Text>
                <Ionicons name="arrow-forward-circle-outline" size={22} color="#09090b" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>

        {/* MODAL 1: MAPA */}
        <Modal visible={mapModalVisible} animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#18181b' }}>Selecciona el Punto Exacto</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ backgroundColor: '#f4f4f5', padding: 8, borderRadius: 9999 }}>
                <Ionicons name="close" size={22} color="#18181b" />
              </TouchableOpacity>
            </View>

            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={interactiveMapHtml}
                style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
                onLoad={() => {
                  window.addEventListener("message", (event) => {
                    try {
                      const data = JSON.parse(event.data);
                      if (data.lat && data.lng) setLocationData({ lat: data.lat, lng: data.lng, address: data.address });
                    } catch(e) {}
                  });
                }}
              />
            ) : (
              WebView && <WebView originWhitelist={['*']} source={{ html: interactiveMapHtml }} style={{ flex: 1 }} onMessage={handleMessage} />
            )}

            <View style={styles.mapFooterModal}>
              <Text style={styles.mapModalInstruction}>
                {locationData.lat !== null ? `Coordenadas: ${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}` : 'Toca el mapa para colocar el marcador'}
              </Text>
              <TouchableOpacity style={styles.mapConfirmBtn} onPress={() => { if (!locationData.lat) { alert('Selecciona una ubicación.'); return; } setMapModalVisible(false); }}>
                <Text style={styles.mapConfirmText}>Confirmar Ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: FECHA */}
        <Modal visible={dateModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.imageStyleModalContent}>
              <View style={styles.imageModalHeader}>
                <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#18181b" />
                </TouchableOpacity>
                <Text style={styles.imageModalTitle}>Selecciona la fecha</Text>
                <View style={{ width: 22 }} />
              </View>

              <View style={styles.dropdownSelectorsRow}>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDateTab('month')}>
                  <Text style={styles.dropdownBtnText}>{selectedMonth}</Text>
                  <Ionicons name="chevron-down" size={14} color="#71717a" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDateTab('year')}>
                  <Text style={styles.dropdownBtnText}>{selectedYear}</Text>
                  <Ionicons name="chevron-down" size={14} color="#71717a" />
                </TouchableOpacity>
              </View>

              {dateTab === 'month' && (
                <ScrollView style={styles.pickerListViewExtended} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  {monthsList.map((m, idx) => (
                    <TouchableOpacity key={idx} style={styles.pickerListItem} onPress={() => { setSelectedMonth(m); setDateTab('calendar'); }}>
                      <Text style={[styles.pickerListText, selectedMonth === m && { color: '#059669', fontWeight: 'bold' }]}>{m}</Text>
                      {selectedMonth === m && <View style={styles.activeDot} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {dateTab === 'year' && (
                <ScrollView style={styles.pickerListViewExtended} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  {yearsList.map((y, idx) => (
                    <TouchableOpacity key={idx} style={styles.pickerListItem} onPress={() => { setSelectedYear(y); setDateTab('calendar'); }}>
                      <Text style={[styles.pickerListText, selectedYear === y && { color: '#059669', fontWeight: 'bold' }]}>{y}</Text>
                      {selectedYear === y && <View style={styles.activeDot} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {dateTab === 'calendar' && (
                <View style={styles.calendarContainer}>
                  <View style={styles.weekDaysRow}>
                    {weekDays.map((wd, i) => (
                      <Text key={i} style={styles.weekDayText}>{wd}</Text>
                    ))}
                  </View>
                  {calendarDaysMatrix.map((week, wIdx) => (
                    <View key={wIdx} style={styles.calendarWeekRow}>
                      {week.map((day, dIdx) => {
                        const isSelected = day === selectedDay;
                        return (
                          <TouchableOpacity
                            key={dIdx}
                            style={[styles.calendarDayCell, isSelected && styles.calendarDayCellSelected]}
                            onPress={() => { if(day) setSelectedDay(day); }}
                          >
                            <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
                              {day || ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.imageModalConfirmBtn} onPress={() => setDateModalVisible(false)}>
                <Text style={styles.imageModalConfirmText}>Confirmar fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL 3: HORA */}
        <Modal visible={timeModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.imageStyleModalContent}>
              <View style={styles.imageModalHeader}>
                <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#18181b" />
                </TouchableOpacity>
                <Text style={styles.imageModalTitle}>Select time</Text>
                <View style={{ width: 22 }} />
              </View>

              <View style={styles.clockTopDisplay}>
                <View style={[styles.digitalBox, !isInputMode && styles.digitalBoxActive]}>
                  <Text style={styles.digitalBoxText}>{selectedHour}</Text>
                </View>
                <Text style={styles.digitalColon}>:</Text>
                <View style={[styles.digitalBox, isInputMode && styles.digitalBoxActive]}>
                  <Text style={styles.digitalBoxText}>{selectedMinute}</Text>
                </View>

                <View style={styles.ampmStack}>
                  <TouchableOpacity onPress={() => setAmpm('AM')} style={[styles.ampmBtnTop, ampm === 'AM' && styles.ampmBtnTopActive]}>
                    <Text style={[styles.ampmTextTop, ampm === 'AM' && styles.ampmTextTopActive]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAmpm('PM')} style={[styles.ampmBtnTop, ampm === 'PM' && styles.ampmBtnTopActive]}>
                    <Text style={[styles.ampmTextTop, ampm === 'PM' && styles.ampmTextTopActive]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!isInputMode ? (
                <View style={styles.clockCircleContainer}>
                  <View style={styles.clockDialFace}>
                    {hoursClock.map((h, index) => {
                      const isSelected = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.clockNodeItem,
                            h === '12' && { top: 10, left: '44%' },
                            h === '1' && { top: 25, right: '28%' },
                            h === '2' && { top: 65, right: '12%' },
                            h === '3' && { top: '43%', right: 12 },
                            h === '4' && { bottom: 65, right: '12%' },
                            h === '5' && { bottom: 25, right: '28%' },
                            h === '6' && { bottom: 10, left: '44%' },
                            h === '7' && { bottom: 25, left: '28%' },
                            h === '8' && { bottom: 65, left: '12%' },
                            h === '9' && { top: '43%', left: 12 },
                            h === '10' && { top: 65, left: '12%' },
                            h === '11' && { top: 25, left: '28%' },
                            isSelected && styles.clockNodeItemSelected
                          ]}
                          onPress={() => setSelectedHour(h)}
                        >
                          <Text style={[styles.clockNodeText, isSelected && styles.clockNodeTextSelected]}>{h}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={styles.clockCenterDot} />
                  </View>
                </View>
              ) : (
                <View style={styles.minuteInputGridView}>
                  <Text style={styles.minuteGridTitle}>Selecciona los Minutos</Text>
                  <View style={styles.minuteChipsRow}>
                    {['00', '15', '30', '45'].map((min) => (
                      <TouchableOpacity 
                        key={min} 
                        style={[styles.minuteChipBtn, selectedMinute === min && styles.minuteChipBtnActive]}
                        onPress={() => setSelectedMinute(min)}
                      >
                        <Text style={[styles.minuteChipText, selectedMinute === min && styles.minuteChipTextActive]}>{min}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.clockModalFooter}>
                <TouchableOpacity onPress={() => setIsInputMode(!isInputMode)} style={styles.footerIconBtn}>
                  <Ionicons name={isInputMode ? "time-outline" : "keypad-outline"} size={22} color="#71717a" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setTimeModalVisible(false)} style={{ marginRight: 20 }}>
                    <Text style={styles.footerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setTimeModalVisible(false)} style={styles.footerOkBtn}>
                    <Text style={styles.footerOkText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center' },
  phoneContainer: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#f4f4f5', paddingTop: 48, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4e4e7', padding: 10, borderRadius: 9999 },
  screenTitle: { fontSize: 22, color: '#18181b', fontWeight: 'bold' },
  scrollContent: { paddingBottom: 60 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#18181b', marginBottom: 10, marginTop: 16 },
  sportsScroll: { marginBottom: 6 },
  sportChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4e4e7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 9999, marginRight: 8, elevation: 1 },
  sportChipSelected: { backgroundColor: '#a3e635', borderColor: '#a3e635' },
  sportChipText: { fontSize: 15, fontWeight: '600', color: '#52525b' },
  sportChipTextSelected: { color: '#18181b', fontWeight: 'bold' },
  mapPickerCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#059669', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  mapIconBox: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 14 },
  mapPickerTitle: { fontSize: 15, fontWeight: 'bold', color: '#18181b' },
  mapPickerSubtitle: { fontSize: 13, color: '#71717a', marginTop: 2 },
  selectedLocationPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  selectedLocationTitle: { fontSize: 14, fontWeight: 'bold', color: '#166534' },
  selectedLocationCoords: { fontSize: 12, color: '#15803d', marginTop: 1 },
  changeLocationText: { fontSize: 13, fontWeight: 'bold', color: '#16a34a', marginLeft: 8 },
  dateTimeGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dateTimeCard: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  dateTimeIconBox: { backgroundColor: '#f4f4f5', padding: 10, borderRadius: 12 },
  dateTimeCardTitle: { fontSize: 12, color: '#71717a', fontWeight: '600' },
  dateTimeCardValue: { fontSize: 14, fontWeight: 'bold', color: '#18181b', marginTop: 2 },
  inputContainer: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#18181b', fontWeight: '500' },
  publishButton: { backgroundColor: '#a3e635', paddingVertical: 18, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: '#a3e635', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  publishButtonText: { color: '#09090b', fontWeight: 'bold', fontSize: 18 },
  mapFooterModal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, alignItems: 'center' },
  mapModalInstruction: { fontSize: 13, color: '#52525b', marginBottom: 12, textAlign: 'center', fontWeight: '500' },
  mapConfirmBtn: { backgroundColor: '#a3e635', width: '100%', paddingVertical: 14, borderRadius: 9999, alignItems: 'center' },
  mapConfirmText: { color: '#09090b', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  imageStyleModalContent: { backgroundColor: '#ffffff', width: '100%', maxWidth: 380, borderRadius: 28, padding: 24, elevation: 8 },
  imageModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  imageModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#18181b' },
  dropdownSelectorsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dropdownBtn: { flex: 1, backgroundColor: '#f4f4f5', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 4 },
  dropdownBtnText: { fontSize: 14, fontWeight: '600', color: '#18181b' },
  pickerListViewExtended: { maxHeight: 220, backgroundColor: '#fafafa', borderRadius: 14, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e4e4e7' },
  pickerListItem: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f2' },
  pickerListText: { fontSize: 15, fontWeight: '500', color: '#3f3f46' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  calendarContainer: { backgroundColor: '#fafafa', borderRadius: 16, padding: 12, marginBottom: 14 },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekDayText: { fontSize: 11, fontWeight: 'bold', color: '#a1a1aa', width: 32, textAlign: 'center' },
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  calendarDayCell: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  calendarDayCellSelected: { backgroundColor: '#059669' },
  calendarDayText: { fontSize: 13, fontWeight: '600', color: '#18181b' },
  calendarDayTextSelected: { color: '#ffffff', fontWeight: 'bold' },
  imageModalConfirmBtn: { backgroundColor: '#a3e635', paddingVertical: 14, borderRadius: 9999, alignItems: 'center' },
  imageModalConfirmText: { color: '#09090b', fontSize: 15, fontWeight: 'bold' },
  clockTopDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  digitalBox: { backgroundColor: '#f4f4f5', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16 },
  digitalBoxActive: { backgroundColor: '#ddd6fe', borderWidth: 1, borderColor: '#8b5cf6' },
  digitalBoxText: { fontSize: 28, fontWeight: 'bold', color: '#18181b' },
  digitalColon: { fontSize: 28, fontWeight: 'bold', color: '#71717a', marginHorizontal: 8 },
  ampmStack: { marginLeft: 12, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 12, overflow: 'hidden' },
  ampmBtnTop: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#ffffff', alignItems: 'center' },
  ampmBtnTopActive: { backgroundColor: '#fbcfe8' },
  ampmTextTop: { fontSize: 12, fontWeight: '600', color: '#71717a' },
  ampmTextTopActive: { color: '#9d174d', fontWeight: 'bold' },
  clockCircleContainer: { width: 240, height: 240, backgroundColor: '#f4f4f5', borderRadius: 120, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  clockDialFace: { width: '100%', height: '100%', position: 'relative' },
  clockNodeItem: { position: 'absolute', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  clockNodeItemSelected: { backgroundColor: '#6d28d9' },
  clockNodeText: { fontSize: 15, fontWeight: '600', color: '#18181b' },
  clockNodeTextSelected: { color: '#ffffff', fontWeight: 'bold' },
  clockCenterDot: { position: 'absolute', top: '48%', left: '48%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#6d28d9' },
  minuteInputGridView: { height: 240, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  minuteGridTitle: { fontSize: 15, fontWeight: 'bold', color: '#3f3f46', marginBottom: 16 },
  minuteChipsRow: { flexDirection: 'row' },
  minuteChipBtn: { backgroundColor: '#f4f4f5', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, marginHorizontal: 6 },
  minuteChipBtnActive: { backgroundColor: '#a3e635' },
  minuteChipText: { fontSize: 16, fontWeight: 'bold', color: '#18181b' },
  minuteChipTextActive: { color: '#09090b' },
  clockModalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f4f4f5', paddingTop: 16 },
  footerIconBtn: { padding: 8 },
  footerCancelText: { fontSize: 15, fontWeight: '600', color: '#71717a' },
  footerOkBtn: { backgroundColor: '#a3e635', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 9999 },
  footerOkText: { fontSize: 15, fontWeight: 'bold', color: '#09090b' },
});