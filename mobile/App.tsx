import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Pantalla inicial vacía del MVP.
// Semana 1: solo verificamos que el proyecto Expo clona, instala y abre.
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>App para emprendedores</Text>
      <Text style={styles.subtitulo}>MVP · proyecto base funcionando</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  subtitulo: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
});
