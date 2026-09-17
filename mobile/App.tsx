import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PantallaSalud from './src/PantallaSalud';
import PantallaPreguntarIA from './src/PantallaPreguntarIA';

// ⚠️ Este selector de pestañas es TEMPORAL, solo para ir probando cosas del
// backend mientras Lu arma la navegación y las pantallas reales. Se saca
// cuando eso esté listo.
type Pestania = 'salud' | 'preguntarIA';

export default function App() {
  const [pestania, setPestania] = useState<Pestania>('salud');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, pestania === 'salud' && styles.tabActiva]}
          onPress={() => setPestania('salud')}
        >
          <Text style={[styles.tabTexto, pestania === 'salud' && styles.tabTextoActivo]}>Salud</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, pestania === 'preguntarIA' && styles.tabActiva]}
          onPress={() => setPestania('preguntarIA')}
        >
          <Text style={[styles.tabTexto, pestania === 'preguntarIA' && styles.tabTextoActivo]}>Preguntar IA</Text>
        </Pressable>
      </View>

      <View style={styles.contenido}>
        {pestania === 'salud' ? <PantallaSalud /> : <PantallaPreguntarIA />}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 56,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActiva: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextoActivo: {
    color: '#1a1a2e',
  },
  contenido: {
    flex: 1,
  },
});
