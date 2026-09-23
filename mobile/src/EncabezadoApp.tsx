import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, radio, tipografia } from './theme';
import { API_URL } from './config';

type EstadoConexion = 'cargando' | 'ok' | 'error';

// Header compartido por todas las pantallas principales (Inicio, Dashboard,
// etc.) — el puntito de estado reemplaza a la vieja pantalla "Salud".
export default function EncabezadoApp({ onAbrirCuenta }: { onAbrirCuenta?: () => void }) {
  const [conexion, setConexion] = useState<EstadoConexion>('cargando');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => setConexion(res.ok ? 'ok' : 'error'))
      .catch(() => setConexion('error'));
  }, []);

  const colorDot = conexion === 'ok' ? color.verde : conexion === 'error' ? color.peligro : color.textoTerciario;

  return (
    <View style={styles.header}>
      <Pressable style={[styles.botonCirculo, { borderColor: color.verde }]}>
        <Ionicons name="help-circle-outline" size={22} color={color.verde} />
      </Pressable>

      <View style={styles.logoBloque}>
        <View style={styles.logoFila}>
          <Text style={styles.logoEm}>Em</Text>
          <Text style={styles.logoPrendex}>Prendex</Text>
          <Ionicons name="trending-up" size={18} color={color.naranja} style={{ marginLeft: 2 }} />
        </View>
        <Text style={tipografia.chico}>Ideas hoy, proyectos mañana</Text>
      </View>

      <Pressable style={[styles.botonCirculo, { borderColor: color.verde }]} onPress={onAbrirCuenta} accessibilityLabel="Mi cuenta">
        <Ionicons name="person-circle-outline" size={24} color={color.verde} />
        <View style={[styles.dotEstado, { backgroundColor: colorDot }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  botonCirculo: {
    width: 40,
    height: 40,
    borderRadius: radio.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEstado: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 10,
    height: 10,
    borderRadius: radio.pill,
    borderWidth: 2,
    borderColor: color.fondo,
  },
  logoBloque: {
    alignItems: 'center',
  },
  logoFila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoEm: {
    fontSize: 22,
    fontWeight: '800',
    color: color.textoPrimario,
  },
  logoPrendex: {
    fontSize: 22,
    fontWeight: '800',
    color: color.naranja,
  },
});
