import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { color, degrade, espacio, radio, sombra, tipografia } from './theme';
import { Sesion } from './api';

type Props = {
  sesion: Sesion;
  onVolver: () => void;
  onCerrarSesion: () => void;
  onCambiarPlan: () => void;
};

type Beneficio = { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string };

// Usuario, plan y uso vienen de GET /me. Los beneficios son los límites
// aprobados de cada plan (backend/src/plans/limites.js).
function beneficiosDelPlan(sesion: Sesion): Beneficio[] {
  const proyectos = sesion.plan.workspaces ?? 0;
  const base: Beneficio[] = [
    { icono: 'reader-outline', titulo: `${proyectos} ${proyectos === 1 ? 'proyecto' : 'proyectos'}`, detalle: 'Organizá y gestioná tus ideas' },
    { icono: 'cloud-outline', titulo: `${formatearMb(sesion.plan.almacenamientoMb)} en la nube`, detalle: 'Guarda archivos e imágenes' },
  ];
  if (sesion.plan.id === 'pro') {
    return [
      { icono: 'stats-chart', titulo: 'Análisis de mercado', detalle: 'Investigación y validación' },
      { icono: 'bulb-outline', titulo: 'Ideas con IA', detalle: 'Generación de ideas y estrategias' },
      { icono: 'logo-instagram', titulo: 'Análisis de redes', detalle: 'Métricas y crecimiento' },
      ...base,
      { icono: 'headset-outline', titulo: 'Soporte prioritario', detalle: 'Ayuda cuando la necesites' },
    ];
  }
  return [
    { icono: 'stats-chart', titulo: 'Vista previa de análisis', detalle: '1 análisis de prueba por mes' },
    ...base,
    { icono: 'rocket-outline', titulo: 'Pasate a Pro', detalle: 'Análisis completos y más espacio' },
  ];
}

function formatearMb(mb: number) {
  if (mb >= 1000) return `${mb / 1000} GB`;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

export default function PantallaCuenta({ sesion, onVolver, onCerrarSesion, onCambiarPlan }: Props) {
  const porcentaje = Math.min(100, (sesion.usoAlmacenamientoMb / sesion.plan.almacenamientoMb) * 100);
  const beneficios = beneficiosDelPlan(sesion);
  const esPro = sesion.plan.id === 'pro';

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.botonVolver} onPress={onVolver} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={color.textoPrimario} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={tipografia.h1}>
            Mi <Text style={{ color: color.naranja }}>cuenta</Text>
          </Text>
          <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>Gestioná tu perfil y configuración</Text>
        </View>
        <View style={styles.logoFila}>
          <Text style={styles.logoEm}>Em</Text>
          <Text style={styles.logoPrendex}>Prendex</Text>
        </View>
      </View>

      {/* Perfil */}
      <LinearGradient colors={degrade.hero} style={[styles.tarjetaPerfil, sombra.tarjeta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={color.violetaVivo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.perfilNombre} numberOfLines={2}>
            {sesion.usuario.nombre || 'Sin nombre'}
          </Text>
          <Text style={tipografia.subtitulo} numberOfLines={1}>
            {sesion.usuario.email}
          </Text>
          <Pressable style={styles.botonBorde}>
            <Ionicons name="pencil" size={13} color={color.textoPrimario} />
            <Text style={styles.botonBordeTexto}>Editar perfil</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Almacenamiento (archivos -> naranja) */}
      <View style={styles.tarjeta}>
        <View style={[styles.chipIcono, { backgroundColor: `${color.naranja}33` }]}>
          <Ionicons name="folder" size={22} color={color.naranja} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.filaEntre}>
            <Text style={tipografia.h2}>Almacenamiento</Text>
            <Text style={styles.almacenamientoValor}>
              {formatearMb(sesion.usoAlmacenamientoMb)}{' '}
              <Text style={{ color: color.textoTerciario }}>/ {formatearMb(sesion.plan.almacenamientoMb)}</Text>
            </Text>
          </View>
          <Text style={tipografia.subtitulo}>Espacio utilizado en tu cuenta</Text>
          <View style={styles.barraFondo}>
            <LinearGradient
              colors={degrade.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barraRelleno, { width: `${porcentaje}%` }]}
            />
          </View>
        </View>
      </View>

      {/* Plan actual */}
      <View style={styles.tarjeta}>
        <View style={[styles.chipIcono, { backgroundColor: `${color.violetaVivo}44` }]}>
          <Ionicons name="ribbon" size={22} color="#d8a8f0" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tipografia.h2}>Plan actual</Text>
          <Text style={styles.planNombre}>Plan {sesion.plan.nombre}</Text>
          <Text style={tipografia.subtitulo}>
            {esPro ? 'Acceso completo a todas las herramientas' : 'Funciones básicas para empezar'}
          </Text>
        </View>
        <Pressable style={styles.botonBorde} onPress={onCambiarPlan}>
          <Text style={styles.botonBordeTexto}>Cambiar plan</Text>
        </Pressable>
      </View>

      {/* Beneficios (cuenta -> verde) */}
      <View style={styles.tarjetaBeneficios}>
        <View style={styles.beneficiosHeader}>
          <LinearGradient colors={[color.verde, '#4f8a35']} style={styles.chipEstrella}>
            <Ionicons name="star" size={22} color={color.blanco} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={tipografia.h2}>Beneficios de tu plan</Text>
            <Text style={tipografia.subtitulo}>Aprovechá al máximo EmPrendex</Text>
          </View>
        </View>

        <View style={styles.beneficiosGrilla}>
          {beneficios.map((b) => (
            <View key={b.titulo} style={styles.beneficio}>
              <View style={styles.beneficioChip}>
                <Ionicons name={b.icono} size={18} color={color.verde} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.beneficioTitulo}>{b.titulo}</Text>
                <Text style={tipografia.chico}>{b.detalle}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.botonCerrar, pressed && { opacity: 0.7 }]} onPress={onCerrarSesion}>
        <Ionicons name="log-out-outline" size={22} color={color.peligro} />
        <Text style={styles.botonCerrarTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    padding: espacio.lg,
    paddingBottom: espacio.xxl,
    gap: espacio.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginBottom: espacio.xs,
  },
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
  logoFila: {
    flexDirection: 'row',
  },
  logoEm: {
    fontSize: 16,
    fontWeight: '800',
    color: color.textoPrimario,
  },
  logoPrendex: {
    fontSize: 16,
    fontWeight: '800',
    color: color.naranja,
  },
  tarjetaPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.lg,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: radio.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilNombre: {
    fontSize: 18,
    fontWeight: '700',
    color: color.textoPrimario,
  },
  botonBorde: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: espacio.sm,
    borderWidth: 1,
    borderColor: color.violetaMalva,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: 7,
  },
  botonBordeTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: color.textoPrimario,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  chipIcono: {
    width: 48,
    height: 48,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaEntre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  almacenamientoValor: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textoPrimario,
  },
  barraFondo: {
    marginTop: espacio.sm,
    height: 6,
    borderRadius: radio.pill,
    backgroundColor: color.fondo,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: radio.pill,
  },
  planNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: color.naranja,
    marginVertical: 2,
  },
  tarjetaBeneficios: {
    backgroundColor: 'rgba(130,184,91,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(130,184,91,0.25)',
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  beneficiosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
  },
  chipEstrella: {
    width: 48,
    height: 48,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beneficiosGrilla: {
    marginTop: espacio.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: espacio.md,
    columnGap: espacio.md,
  },
  beneficio: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
  },
  beneficioChip: {
    width: 36,
    height: 36,
    borderRadius: radio.sm,
    backgroundColor: 'rgba(130,184,91,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beneficioTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textoPrimario,
  },
  botonCerrar: {
    marginTop: espacio.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    backgroundColor: 'rgba(200,90,90,0.12)',
    borderWidth: 1,
    borderColor: color.peligro,
    borderRadius: radio.lg,
    paddingVertical: espacio.lg,
  },
  botonCerrarTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: color.peligro,
  },
});
