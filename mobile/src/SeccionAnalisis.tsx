import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, tipografia } from './theme';
import { Analisis } from './api';
import { formatearFecha } from './proyectosUI';

type Props = {
  analisis: Analisis | null;
  onVerPlanes: () => void;
};

const NIVELES = ['bajo', 'base', 'alto'] as const;
const COLOR_NIVEL = { bajo: color.peligro, base: color.dorado, alto: color.verde };
const CALIDAD = { completo: 'Contexto completo', parcial: 'Contexto parcial', insuficiente: 'Contexto insuficiente' };

export default function SeccionAnalisis({ analisis, onVerPlanes }: Props) {
  if (!analisis) {
    return (
      <View style={styles.tarjeta}>
        <Encabezado titulo="Último análisis" />
        <View style={styles.vacio}>
          <Ionicons name="sparkles-outline" size={26} color={color.violetaMalva} />
          <Text style={[tipografia.subtitulo, { textAlign: 'center' }]}>
            Este proyecto todavía no tiene análisis. Cuando lo analices con IA, el resumen y las acciones aparecen acá.
          </Text>
        </View>
      </View>
    );
  }

  const escenario = analisis.escenario90d;

  return (
    <>
      <View style={styles.tarjeta}>
        <Encabezado titulo="Último análisis" derecha={formatearFecha(analisis.fecha)} />
        {analisis.calidadContexto && (
          <View style={styles.insignia}>
            <Text style={styles.insigniaTexto}>{CALIDAD[analisis.calidadContexto]}</Text>
          </View>
        )}
        {!!analisis.resumen && <Text style={[tipografia.cuerpo, styles.resumen]}>{analisis.resumen}</Text>}

        {escenario && (
          <View style={styles.escenario}>
            <View style={styles.escenarioFila}>
              <Text style={styles.escenarioTitulo}>Escenario a 90 días</Text>
              <Text style={[styles.escenarioNivel, { color: COLOR_NIVEL[escenario.nivel] }]}>
                {escenario.nivel.charAt(0).toUpperCase() + escenario.nivel.slice(1)}
              </Text>
            </View>
            <View style={styles.segmentos}>
              {NIVELES.map((n, i) => (
                <View
                  key={n}
                  style={[
                    styles.segmento,
                    i <= NIVELES.indexOf(escenario.nivel) && { backgroundColor: COLOR_NIVEL[escenario.nivel] },
                  ]}
                />
              ))}
            </View>
            <Text style={tipografia.chico}>Estimación cualitativa, no una promesa de resultados.</Text>
          </View>
        )}
      </View>

      {analisis.bloqueado ? (
        <>
          <Lista
            titulo="Vista previa"
            grupos={[
              { icono: 'trending-up', tono: color.verde, etiqueta: 'Fortaleza', texto: analisis.vistaPrevia?.fortaleza?.texto },
              { icono: 'warning-outline', tono: color.peligro, etiqueta: 'Riesgo', texto: analisis.vistaPrevia?.riesgo?.texto },
              { icono: 'bulb-outline', tono: '#c58ae0', etiqueta: 'Oportunidad', texto: analisis.vistaPrevia?.oportunidad?.texto },
            ]}
          />
          <Pressable style={styles.candado} onPress={onVerPlanes}>
            <Ionicons name="lock-closed" size={20} color={color.naranja} />
            <View style={{ flex: 1 }}>
              <Text style={tipografia.h2}>Desbloqueá el análisis completo</Text>
              <Text style={tipografia.subtitulo}>Con Pro ves las 3 acciones para los próximos 30 días, todas las fortalezas, riesgos y oportunidades.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.naranja} />
          </Pressable>
        </>
      ) : (
        <>
          {!!analisis.acciones?.length && (
            <View style={styles.tarjeta}>
              <Encabezado titulo="Acciones para los próximos 30 días" />
              {analisis.acciones.map((a, i) => (
                <View key={a.id} style={[styles.accion, i > 0 && styles.accionSeparada]}>
                  <View style={styles.numero}>
                    <Text style={styles.numeroTexto}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accionTitulo}>{a.titulo}</Text>
                    {!!a.motivo && <Text style={tipografia.subtitulo}>{a.motivo}</Text>}
                    <View style={styles.chips}>
                      {a.impacto && <Chip texto={`Impacto ${a.impacto}`} tono={color.verde} />}
                      {a.esfuerzo && <Chip texto={`Esfuerzo ${a.esfuerzo}`} tono={color.dorado} />}
                    </View>
                    {!!a.metrica && <Text style={tipografia.chico}>Métrica a mirar: {a.metrica}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          <Lista
            titulo="Fortalezas"
            grupos={(analisis.fortalezas ?? []).map((f) => ({ icono: 'trending-up' as const, tono: color.verde, texto: f.texto }))}
          />
          <Lista
            titulo="Riesgos"
            grupos={(analisis.riesgos ?? []).map((r) => ({
              icono: 'warning-outline' as const,
              tono: color.peligro,
              texto: r.texto,
              detalle: `Probabilidad ${r.probabilidad} · impacto ${r.impacto}`,
            }))}
          />
          <Lista
            titulo="Oportunidades"
            grupos={(analisis.oportunidades ?? []).map((o) => ({ icono: 'bulb-outline' as const, tono: '#c58ae0', texto: o.texto }))}
          />

          {!!analisis.advertencias?.length && (
            <Text style={styles.advertencia}>{analisis.advertencias.join(' ')}</Text>
          )}
        </>
      )}
    </>
  );
}

function Encabezado({ titulo, derecha }: { titulo: string; derecha?: string }) {
  return (
    <View style={styles.encabezado}>
      <View style={styles.encabezadoIzq}>
        <View style={styles.chipIcono}>
          <Ionicons name="sparkles" size={16} color={color.violetaVivo} />
        </View>
        <Text style={[tipografia.h2, { flexShrink: 1 }]}>{titulo}</Text>
      </View>
      {!!derecha && <Text style={tipografia.chico}>{derecha}</Text>}
    </View>
  );
}

type Grupo = { icono: keyof typeof Ionicons.glyphMap; tono: string; texto?: string | null; etiqueta?: string; detalle?: string };

function Lista({ titulo, grupos }: { titulo: string; grupos: Grupo[] }) {
  const items = grupos.filter((g) => !!g.texto);
  if (items.length === 0) return null;
  return (
    <View style={styles.tarjeta}>
      <Text style={tipografia.h2}>{titulo}</Text>
      {items.map((g, i) => (
        <View key={i} style={styles.item}>
          <Ionicons name={g.icono} size={18} color={g.tono} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            {!!g.etiqueta && <Text style={[styles.itemEtiqueta, { color: g.tono }]}>{g.etiqueta}</Text>}
            <Text style={tipografia.cuerpo}>{g.texto}</Text>
            {!!g.detalle && <Text style={tipografia.chico}>{g.detalle}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

function Chip({ texto, tono }: { texto: string; tono: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: `${tono}26` }]}>
      <Text style={[styles.chipTexto, { color: tono }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    marginTop: espacio.lg,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.xl,
    padding: espacio.lg,
    gap: espacio.md,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.sm },
  encabezadoIzq: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, flexShrink: 1 },
  chipIcono: {
    width: 32,
    height: 32,
    borderRadius: radio.sm,
    backgroundColor: `${color.violetaVivo}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insignia: {
    alignSelf: 'flex-start',
    backgroundColor: `${color.violetaVivo}44`,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: 3,
  },
  insigniaTexto: { fontSize: 11, fontWeight: '700', color: '#c58ae0' },
  resumen: { lineHeight: 21 },
  escenario: { gap: 6, paddingTop: espacio.md, borderTopWidth: 1, borderTopColor: color.borde },
  escenarioFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  escenarioTitulo: { fontSize: 13, fontWeight: '600', color: color.textoSecundario },
  escenarioNivel: { fontSize: 15, fontWeight: '800' },
  segmentos: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: 6, borderRadius: radio.pill, backgroundColor: color.fondo },
  vacio: { alignItems: 'center', gap: espacio.sm, paddingVertical: espacio.md },
  candado: {
    marginTop: espacio.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: 'rgba(217,120,69,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(217,120,69,0.5)',
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  item: { flexDirection: 'row', gap: espacio.sm },
  itemEtiqueta: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 1 },
  accion: { flexDirection: 'row', gap: espacio.md },
  accionSeparada: { paddingTop: espacio.md, borderTopWidth: 1, borderTopColor: color.borde },
  numero: {
    width: 26,
    height: 26,
    borderRadius: radio.pill,
    backgroundColor: color.naranja,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: { fontSize: 13, fontWeight: '800', color: color.blanco },
  accionTitulo: { fontSize: 14, fontWeight: '700', color: color.textoPrimario, marginBottom: 2 },
  chips: { flexDirection: 'row', gap: espacio.sm, marginVertical: 6, flexWrap: 'wrap' },
  chip: { borderRadius: radio.pill, paddingHorizontal: espacio.sm, paddingVertical: 2 },
  chipTexto: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  advertencia: { marginTop: espacio.lg, fontSize: 12, color: color.textoTerciario, lineHeight: 17 },
});
