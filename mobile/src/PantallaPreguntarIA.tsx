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
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from './config';
import { color, espacio, radio, tipografia } from './theme';

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
      <View style={styles.encabezado}>
        <Ionicons name="sparkles" size={20} color={color.violetaVivo} />
        <Text style={tipografia.h1}>Preguntarle a la IA</Text>
      </View>
      <View style={{ height: espacio.lg }} />

      <TextInput
        style={styles.input}
        placeholder="Escribí tu pregunta..."
        placeholderTextColor={color.textoTerciario}
        value={pregunta}
        onChangeText={setPregunta}
        multiline
      />

      <Pressable
        style={({ pressed }) => [styles.boton, (resultado.estado === 'cargando' || pressed) && styles.botonDeshabilitado]}
        onPress={preguntar}
        disabled={resultado.estado === 'cargando'}
      >
        <Text style={tipografia.boton}>{resultado.estado === 'cargando' ? 'Pensando...' : 'Preguntar'}</Text>
      </Pressable>

      <ScrollView style={styles.respuestaBox} contentContainerStyle={{ padding: espacio.lg }}>
        {resultado.estado === 'inicial' && <Text style={tipografia.subtitulo}>La respuesta va a aparecer acá.</Text>}

        {resultado.estado === 'cargando' && (
          <View style={styles.row}>
            <ActivityIndicator color={color.violetaVivo} />
            <Text style={tipografia.subtitulo}>Buscando y generando la respuesta (unos segundos)...</Text>
          </View>
        )}

        {resultado.estado === 'error' && (
          <>
            <Text style={styles.error}>● Error</Text>
            <Text style={tipografia.subtitulo}>{resultado.mensaje}</Text>
          </>
        )}

        {resultado.estado === 'ok' && (
          <>
            <Text style={[tipografia.cuerpo, { lineHeight: 21 }]}>{resultado.respuesta}</Text>
            {resultado.fuentes.length > 0 && (
              <View style={styles.fuentes}>
                <Text style={styles.fuentesTitulo}>Fuentes</Text>
                {resultado.fuentes.map((f, i) => (
                  <Text key={i} style={tipografia.chico} numberOfLines={1}>
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
    backgroundColor: color.fondo,
    padding: espacio.lg,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
  },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
    fontSize: 15,
    color: color.textoPrimario,
    backgroundColor: color.fondoSuave,
    textAlignVertical: 'top',
  },
  boton: {
    marginTop: espacio.md,
    backgroundColor: color.violetaVivo,
    borderRadius: radio.lg,
    paddingVertical: espacio.md,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  respuestaBox: {
    marginTop: espacio.lg,
    flex: 1,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    backgroundColor: color.fondoSuave,
  },
  fuentes: {
    marginTop: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: color.borde,
    paddingTop: espacio.md,
  },
  fuentesTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: color.textoTerciario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: espacio.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
    color: color.peligro,
    marginBottom: espacio.xs,
  },
});
