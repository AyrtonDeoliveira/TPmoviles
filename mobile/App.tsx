import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { API_URL } from './src/config';

type EstadoHealth =
  | { estado: 'cargando' }
  | { estado: 'ok'; data: Record<string, unknown> }
  | { estado: 'error'; mensaje: string };

export default function App() {
  const [health, setHealth] = useState<EstadoHealth>({ estado: 'cargando' });

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth({ estado: 'ok', data }))
      .catch((err) => setHealth({ estado: 'error', mensaje: String(err.message ?? err) }));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>App para emprendedores</Text>
      <Text style={styles.subtitulo}>MVP · proyecto base funcionando</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Backend</Text>
        <Text style={styles.cardUrl}>{API_URL}/health</Text>

        {health.estado === 'cargando' && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.info}>Consultando…</Text>
          </View>
        )}

        {health.estado === 'ok' && (
          <>
            <Text style={styles.ok}>● Conectado</Text>
            <Text style={styles.mono}>{JSON.stringify(health.data, null, 2)}</Text>
          </>
        )}

        {health.estado === 'error' && (
          <>
            <Text style={styles.error}>● Sin conexión</Text>
            <Text style={styles.info}>{health.mensaje}</Text>
            <Text style={styles.hint}>¿Está corriendo el backend? (cd backend && npm run dev)</Text>
          </>
        )}
      </View>

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
  card: {
    marginTop: 32,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardUrl: {
    marginTop: 4,
    fontSize: 12,
    color: '#9ca3af',
  },
  row: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ok: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#15803d',
  },
  error: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#b91c1c',
  },
  info: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
  mono: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
});
