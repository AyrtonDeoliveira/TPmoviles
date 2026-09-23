import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { color, degrade, espacio, radio, sombra, tipografia } from './theme';
import { ApiError, Proyecto } from './api';
import { etapaInfo, etiquetaObjetivo, formatearFecha } from './proyectosUI';

type Props = {
  proyecto: Proyecto;
  onVolver: () => void;
  onEditar: () => void;
  onVerDashboard: () => void;
  onEliminar: () => Promise<void>;
};

export default function DetalleProyecto({ proyecto: p, onVolver, onEditar, onVerDashboard, onEliminar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const etapa = etapaInfo(p.etapa);

  const eliminar = async () => {
    setError(null);
    setEliminando(true);
    try {
      await onEliminar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el proyecto.');
      setEliminando(false);
      setConfirmando(false);
    }
  };

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.header}>
        <Pressable style={styles.botonVolver} onPress={onVolver} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={color.textoPrimario} />
        </Pressable>
        <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>Proyecto</Text>
      </View>

      <LinearGradient colors={degrade.hero} style={[styles.hero, sombra.tarjeta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroIcono}>
          <Ionicons name={etapa.icono} size={28} color={color.naranja} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroNombre}>{p.nombre}</Text>
          <Text style={tipografia.subtitulo}>
            {p.categoria} · {p.ciudad}, {p.pais}
          </Text>
          <View style={styles.insignia}>
            <Text style={styles.insigniaTexto}>{etapa.etiqueta}</Text>
          </View>
        </View>
      </LinearGradient>

      <Bloque titulo="Qué ofrece" texto={p.oferta} icono="pricetag-outline" />
      <Bloque titulo="Cliente objetivo" texto={p.clienteObjetivo} icono="people-outline" />
      <Bloque titulo="Objetivo a 90 días" texto={etiquetaObjetivo(p.objetivo90d, p.objetivo90dNota)} icono="flag-outline" />
      {!!p.sitioWeb && <Bloque titulo="Sitio web" texto={p.sitioWeb} icono="globe-outline" />}
      {!!p.instagramHandle && <Bloque titulo="Instagram" texto={`@${p.instagramHandle}`} icono="logo-instagram" />}

      <Text style={styles.fechas}>
        Creado el {formatearFecha(p.creadoEn)} · Última actualización: {formatearFecha(p.actualizadoEn)}
      </Text>

      {error && (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={18} color={color.peligro} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      <Pressable style={({ pressed }) => [styles.botonDashboard, pressed && { opacity: 0.75 }]} onPress={onVerDashboard}>
        <Ionicons name="stats-chart" size={16} color={color.blanco} />
        <Text style={tipografia.boton}>Ver dashboard</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.botonEditar, pressed && { opacity: 0.75 }]} onPress={onEditar}>
        <Ionicons name="pencil" size={16} color={color.blanco} />
        <Text style={tipografia.boton}>Editar proyecto</Text>
      </Pressable>

      {confirmando ? (
        <View style={styles.confirmacion}>
          <Text style={styles.confirmacionTexto}>
            ¿Eliminar “{p.nombre}”? Se liberan tus archivos y el cupo de proyectos. No se puede deshacer.
          </Text>
          <View style={styles.confirmacionBotones}>
            <Pressable style={styles.botonNo} onPress={() => setConfirmando(false)} disabled={eliminando}>
              <Text style={styles.botonNoTexto}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.botonSi} onPress={eliminar} disabled={eliminando}>
              {eliminando ? <ActivityIndicator color={color.blanco} /> : <Text style={tipografia.boton}>Sí, eliminar</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={({ pressed }) => [styles.botonEliminar, pressed && { opacity: 0.75 }]} onPress={() => setConfirmando(true)}>
          <Ionicons name="trash-outline" size={18} color={color.peligro} />
          <Text style={styles.botonEliminarTexto}>Eliminar proyecto</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Bloque({ titulo, texto, icono }: { titulo: string; texto: string; icono: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.bloque}>
      <View style={styles.bloqueIcono}>
        <Ionicons name={icono} size={18} color={color.violetaVivo} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bloqueTitulo}>{titulo}</Text>
        <Text style={tipografia.cuerpo}>{texto}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, marginBottom: espacio.lg },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.fondoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  heroIcono: {
    width: 56,
    height: 56,
    borderRadius: radio.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNombre: { fontSize: 20, fontWeight: '800', color: color.textoPrimario, marginBottom: 2 },
  insignia: {
    alignSelf: 'flex-start',
    marginTop: espacio.sm,
    backgroundColor: 'rgba(217,120,69,0.25)',
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: 3,
  },
  insigniaTexto: { fontSize: 11, fontWeight: '700', color: color.naranja },
  bloque: {
    flexDirection: 'row',
    gap: espacio.md,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
    marginTop: espacio.sm,
  },
  bloqueIcono: {
    width: 36,
    height: 36,
    borderRadius: radio.sm,
    backgroundColor: `${color.violetaVivo}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloqueTitulo: { fontSize: 12, fontWeight: '700', color: color.textoTerciario, marginBottom: 2, textTransform: 'uppercase' },
  fechas: { marginTop: espacio.lg, fontSize: 12, color: color.textoTerciario, textAlign: 'center' },
  error: {
    marginTop: espacio.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
    backgroundColor: 'rgba(200,90,90,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,90,90,0.5)',
    borderRadius: radio.md,
    padding: espacio.md,
  },
  errorTexto: { flex: 1, fontSize: 13, color: color.peligro },
  botonDashboard: {
    marginTop: espacio.xl,
    height: 50,
    borderRadius: radio.lg,
    backgroundColor: color.naranja,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
  },
  botonEditar: {
    marginTop: espacio.md,
    height: 50,
    borderRadius: radio.lg,
    backgroundColor: color.violetaVivo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
  },
  botonEliminar: {
    marginTop: espacio.md,
    height: 50,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: color.peligro,
    backgroundColor: 'rgba(200,90,90,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
  },
  botonEliminarTexto: { fontSize: 14, fontWeight: '700', color: color.peligro },
  confirmacion: {
    marginTop: espacio.md,
    borderWidth: 1,
    borderColor: color.peligro,
    backgroundColor: 'rgba(200,90,90,0.10)',
    borderRadius: radio.lg,
    padding: espacio.md,
    gap: espacio.md,
  },
  confirmacionTexto: { fontSize: 13, color: color.textoPrimario, lineHeight: 18 },
  confirmacionBotones: { flexDirection: 'row', gap: espacio.sm },
  botonNo: {
    flex: 1,
    height: 44,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonNoTexto: { fontSize: 14, fontWeight: '600', color: color.textoSecundario },
  botonSi: {
    flex: 1,
    height: 44,
    borderRadius: radio.md,
    backgroundColor: color.peligro,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
