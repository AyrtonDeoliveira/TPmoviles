import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API_URL } from './config';

// ⚠️ Pantalla de prueba (temporal) — le pega a POST /dev/preguntar, que junta
// Brave (busca en la web) + Gemini (arma la respuesta citando fuentes).
// Se va a sacar cuando Lu tenga las pantallas reales del análisis.

type Fuente = { titulo: string; url: string };
type Resultado =
  | { estado: 'inicial' }
  | { estado: 'cargando' }
  | { estado: 'ok'; respuesta: string; modelo: string; fuentes: Fuente[] }
  | { estado: 'error'; mensaje: string };

export default function PantallaPreguntarIA() {
  const [pregunta, setPregunta] = useState('');
  const [resultado, setResultado] = useState<Resultado>({ estado: 'inicial' });

  const preguntar = async () => {
    const texto = pregunta.trim();
    if (!texto) return;
    setResultado({ estado: 'cargando' });
    try {
      const res = await fetch(`${API_URL}/dev/preguntar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setResultado({ estado: 'ok', respuesta: data.respuesta, modelo: data.modelo, fuentes: data.fuentes ?? [] });
    } catch (err: any) {
      setResultado({ estado: 'error', mensaje: String(err?.message ?? err) });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.titulo}>Preguntarle a la IA</Text>
      <Text style={styles.subtitulo}>Busca en la web (Brave) y arma la respuesta (Gemini)</Text>

      <TextInput
        style={styles.input}
        placeholder="Escribí tu pregunta..."
        placeholderTextColor="#9ca3af"
        value={pregunta}
        onChangeText={setPregunta}
        multiline
      />

      <Pressable
        style={[styles.boton, resultado.estado === 'cargando' && styles.botonDeshabilitado]}
        onPress={preguntar}
        disabled={resultado.estado === 'cargando'}
      >
        <Text style={styles.botonTexto}>{resultado.estado === 'cargando' ? 'Pensando...' : 'Preguntar'}</Text>
      </Pressable>

      <ScrollView style={styles.respuestaBox} contentContainerStyle={{ padding: 16 }}>
        {resultado.estado === 'inicial' && <Text style={styles.info}>La respuesta va a aparecer acá.</Text>}

        {resultado.estado === 'cargando' && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.info}>Buscando y generando la respuesta (unos segundos)...</Text>
          </View>
        )}

        {resultado.estado === 'error' && (
          <>
            <Text style={styles.error}>● Error</Text>
            <Text style={styles.info}>{resultado.mensaje}</Text>
          </>
        )}

        {resultado.estado === 'ok' && (
          <>
            <Text style={styles.respuestaTexto}>{resultado.respuesta}</Text>
            {resultado.fuentes.length > 0 && (
              <View style={styles.fuentes}>
                <Text style={styles.fuentesTitulo}>Fuentes</Text>
                {resultado.fuentes.map((f, i) => (
                  <Text key={i} style={styles.fuente} numberOfLines={1}>
                    {i + 1}. {f.titulo}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  subtitulo: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: '#6b7280',
  },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1a1a2e',
    textAlignVertical: 'top',
  },
  boton: {
    marginTop: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  respuestaBox: {
    marginTop: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  respuestaTexto: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1a1a2e',
  },
  fuentes: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  fuentesTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fuente: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  info: {
    fontSize: 13,
    color: '#6b7280',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
    color: '#b91c1c',
    marginBottom: 4,
  },
});
