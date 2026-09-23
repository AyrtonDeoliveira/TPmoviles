import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { color, degrade, espacio, radio, tipografia } from './theme';
import { ApiError, Sesion } from './api';
import { Caracteristica, PLAN_GRATUITO, PLAN_PRO } from './planes';

type Props = {
  sesion: Sesion;
  onCerrar: () => void;
  onSuscribirse: () => Promise<void>;
};

const BENEFICIOS: { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string }[] = [
  { icono: 'flash', titulo: 'Más productividad', detalle: 'Convertí ideas en resultados reales' },
  { icono: 'stats-chart', titulo: 'Mejores decisiones', detalle: 'Con análisis de mercado y redes sociales' },
  { icono: 'star', titulo: 'Crecimiento constante', detalle: 'Herramientas que evolucionan con vos' },
];

export default function PantallaPaywall({ sesion, onCerrar, onSuscribirse }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const esPro = sesion.plan.id === 'pro';

  const suscribirse = async () => {
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      await onSuscribirse();
      setExito(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo activar el plan. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  if (exito) {
    return (
      <View style={[styles.pantalla, styles.exito]}>
        <View style={styles.exitoIcono}>
          <Ionicons name="checkmark" size={44} color={color.blanco} />
        </View>
        <Text style={[tipografia.h1, { textAlign: 'center' }]}>
          ¡Ya sos <Text style={{ color: color.naranja }}>Pro</Text>!
        </Text>
        <Text style={[tipografia.subtitulo, styles.exitoTexto]}>
          Activamos tu plan (pago simulado del MVP). Ya podés usar todas las herramientas.
        </Text>
        <Pressable style={styles.exitoBoton} onPress={onCerrar}>
          <LinearGradient colors={degrade.acceso} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.botonPro}>
            <Text style={styles.botonProTexto}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.botonVolver} onPress={onCerrar} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={color.textoPrimario} />
        </Pressable>
        <View style={styles.logoBloque}>
          <View style={styles.logoFila}>
            <Text style={styles.logoEm}>Em</Text>
            <Text style={styles.logoPrendex}>Prendex</Text>
            <Ionicons name="trending-up" size={16} color={color.naranja} style={{ marginLeft: 2 }} />
          </View>
          <Text style={tipografia.chico}>Ideas hoy, proyectos mañana</Text>
        </View>
        <Pressable onPress={onCerrar} hitSlop={8}>
          <Text style={styles.ahoraNo}>Ahora no</Text>
        </Pressable>
      </View>

      <Text style={[tipografia.h1, styles.titulo]}>
        Llevá tus ideas al <Text style={{ color: color.naranja }}>siguiente nivel</Text>
      </Text>
      <Text style={[tipografia.subtitulo, styles.subtitulo]}>Desbloqueá todo el potencial de EmPrendex con un plan Pro.</Text>

      {/* Planes */}
      <View style={styles.planes}>
        <View style={[styles.tarjetaPlan, styles.tarjetaGratis]}>
          <Text style={styles.planNombre}>{PLAN_GRATUITO.nombre}</Text>
          <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>{PLAN_GRATUITO.lema}</Text>
          <Text style={styles.precio}>{PLAN_GRATUITO.precio}</Text>
          <Text style={tipografia.subtitulo}>{PLAN_GRATUITO.periodo}</Text>
          <View style={styles.divisor} />
          <Lista caracteristicas={PLAN_GRATUITO.caracteristicas} colorCheck={color.verde} />
          <View style={{ flex: 1 }} />
          <View style={styles.botonActual}>
            <Text style={styles.botonActualTexto}>{esPro ? 'Plan inicial' : 'Tu plan actual'}</Text>
          </View>
        </View>

        <View style={[styles.tarjetaPlan, styles.tarjetaPro]}>
          <LinearGradient colors={degrade.acceso} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.insignia}>
            <Text style={styles.insigniaTexto}>MÁS POPULAR</Text>
          </LinearGradient>
          <Text style={styles.planNombre}>{PLAN_PRO.nombre}</Text>
          <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>{PLAN_PRO.lema}</Text>
          <View style={styles.precioFila}>
            <Text style={styles.precio}>{PLAN_PRO.precio}</Text>
            <Text style={tipografia.subtitulo}> {PLAN_PRO.periodo}</Text>
          </View>
          <View style={styles.divisor} />
          <Lista caracteristicas={PLAN_PRO.caracteristicas} colorCheck={color.naranja} />
          <View style={{ flex: 1 }} />
          {esPro ? (
            <View style={styles.botonActual}>
              <Text style={styles.botonActualTexto}>Tu plan actual</Text>
            </View>
          ) : (
            <Pressable onPress={suscribirse} disabled={cargando} style={({ pressed }) => (pressed || cargando) && { opacity: 0.75 }}>
              <LinearGradient colors={degrade.acceso} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.botonPro}>
                {cargando ? (
                  <ActivityIndicator color={color.blanco} />
                ) : (
                  <>
                    <Text style={styles.botonProTexto}>Suscribirme ahora</Text>
                    <Ionicons name="arrow-forward" size={16} color={color.blanco} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={18} color={color.peligro} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      {/* Beneficios */}
      <View style={styles.beneficios}>
        {BENEFICIOS.map((b) => (
          <View key={b.titulo} style={styles.beneficio}>
            <View style={styles.beneficioChip}>
              <Ionicons name={b.icono} size={22} color="#c58ae0" />
            </View>
            <Text style={styles.beneficioTitulo}>{b.titulo}</Text>
            <Text style={[tipografia.chico, { textAlign: 'center' }]}>{b.detalle}</Text>
          </View>
        ))}
      </View>

      {/* Pie */}
      <View style={styles.pie}>
        <View style={styles.pieSeguro}>
          <Ionicons name="lock-closed" size={13} color={color.textoTerciario} />
          <Text style={tipografia.chico}>Pago simulado · sin datos bancarios (demo del MVP)</Text>
        </View>
        <View style={styles.pieLinks}>
          <Text style={styles.pieLink}>Términos y condiciones</Text>
          <Text style={tipografia.chico}>|</Text>
          <Text style={styles.pieLink}>Política de privacidad</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Lista({ caracteristicas, colorCheck }: { caracteristicas: Caracteristica[]; colorCheck: string }) {
  return (
    <View style={{ gap: espacio.md }}>
      {caracteristicas.map((c) => (
        <View key={c.texto} style={styles.item}>
          <Ionicons
            name={c.incluida ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={c.incluida ? colorCheck : 'rgba(143,128,147,0.55)'}
          />
          <Text style={[styles.itemTexto, !c.incluida && { color: color.textoTerciario }]}>{c.texto}</Text>
        </View>
      ))}
    </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  logoBloque: { alignItems: 'center' },
  logoFila: { flexDirection: 'row', alignItems: 'center' },
  logoEm: { fontSize: 20, fontWeight: '800', color: color.textoPrimario },
  logoPrendex: { fontSize: 20, fontWeight: '800', color: color.naranja },
  ahoraNo: {
    fontSize: 13,
    color: color.violetaMalva,
    fontWeight: '600',
  },
  titulo: {
    textAlign: 'center',
    marginTop: espacio.xl,
    fontSize: 24,
  },
  subtitulo: {
    textAlign: 'center',
    marginTop: espacio.sm,
    color: color.violetaMalva,
    paddingHorizontal: espacio.lg,
  },
  planes: {
    marginTop: espacio.xl,
    flexDirection: 'row',
    gap: espacio.sm,
    alignItems: 'stretch',
  },
  tarjetaPlan: {
    flex: 1,
    borderRadius: radio.xl,
    padding: espacio.md,
    paddingTop: espacio.lg,
    borderWidth: 1,
  },
  tarjetaGratis: {
    backgroundColor: color.fondoSuave,
    borderColor: color.borde,
  },
  tarjetaPro: {
    backgroundColor: 'rgba(217,120,69,0.08)',
    borderColor: color.naranja,
    borderWidth: 1.5,
    boxShadow: '0px 0px 18px rgba(217,120,69,0.25)',
  },
  insignia: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: 3,
  },
  insigniaTexto: {
    fontSize: 9,
    fontWeight: '800',
    color: color.blanco,
    letterSpacing: 0.5,
  },
  planNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: color.textoPrimario,
  },
  precioFila: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  precio: {
    marginTop: espacio.sm,
    fontSize: 30,
    fontWeight: '800',
    color: color.textoPrimario,
  },
  divisor: {
    height: 1,
    backgroundColor: color.borde,
    marginVertical: espacio.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
  },
  itemTexto: {
    flex: 1,
    fontSize: 12,
    color: color.textoPrimario,
    lineHeight: 16,
  },
  botonActual: {
    marginTop: espacio.lg,
    height: 44,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: 'rgba(111,58,134,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonActualTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: color.violetaMalva,
  },
  botonPro: {
    marginTop: espacio.lg,
    height: 44,
    borderRadius: radio.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: espacio.sm,
  },
  botonProTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: color.blanco,
  },
  error: {
    marginTop: espacio.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: 'rgba(200,90,90,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,90,90,0.5)',
    borderRadius: radio.md,
    padding: espacio.md,
  },
  errorTexto: { flex: 1, fontSize: 13, color: color.peligro },
  beneficios: {
    marginTop: espacio.xl,
    flexDirection: 'row',
    gap: espacio.sm,
  },
  beneficio: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  beneficioChip: {
    width: 48,
    height: 48,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: 'rgba(118,86,111,0.5)',
    backgroundColor: 'rgba(111,58,134,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  beneficioTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: color.textoPrimario,
    textAlign: 'center',
  },
  pie: {
    marginTop: espacio.xl,
    alignItems: 'center',
    gap: espacio.sm,
  },
  pieSeguro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pieLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
  },
  pieLink: {
    fontSize: 11,
    color: color.textoTerciario,
  },
  exito: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio.xl,
  },
  exitoIcono: {
    width: 88,
    height: 88,
    borderRadius: radio.pill,
    backgroundColor: color.verde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.xl,
  },
  exitoTexto: {
    textAlign: 'center',
    marginTop: espacio.sm,
    maxWidth: 280,
  },
  exitoBoton: {
    alignSelf: 'stretch',
    marginTop: espacio.xl,
  },
});
