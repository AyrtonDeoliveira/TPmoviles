import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, sombra, tipografia } from './theme';
import EncabezadoApp from './EncabezadoApp';
import GraficoArea from './GraficoArea';
import SeccionAnalisis from './SeccionAnalisis';
import {
  ApiError,
  DashboardProyecto,
  listarProyectos,
  Metrica,
  MetricasProyecto,
  obtenerDashboard,
  obtenerMetricas,
  Proyecto,
  Sesion,
  TipoMetrica,
} from './api';
import {
  ETIQUETA_ORIGEN,
  formatoMetrica,
  INFO_METRICA,
  puntosDeSerie,
  serieDeTipo,
  textoVariacion,
  variacion,
} from './metricasUI';
import { formatearFecha } from './proyectosUI';

type Props = {
  sesion: Sesion;
  // Proyecto cuyo dashboard se ve. Cada proyecto tiene el suyo, independiente.
  proyectoId: string | null;
  onCambiarProyecto: (id: string) => void;
  onAbrirCuenta: () => void;
  onVerPlanes: () => void;
  onIrAProyectos: () => void;
};

const ORDEN_TIPOS: TipoMetrica[] = [
  'seguidores',
  'alcance',
  'interacciones',
  'visitas_perfil',
  'vistas',
  'consultas',
  'clientes',
  'pedidos',
  'ventas_importe',
];

// Tarjetas fijas (Engage va primero, se calcula aparte).
const TARJETAS: TipoMetrica[] = ['seguidores', 'pedidos', 'ventas_importe'];

type Datos = { metricas: MetricasProyecto; dashboard: DashboardProyecto };

export default function PantallaDashboard({ sesion, proyectoId, onCambiarProyecto, onAbrirCuenta, onVerPlanes, onIrAProyectos }: Props) {
  const token = sesion.accessToken;
  const primerNombre = sesion.usuario.nombre.split(' ')[0] || 'Emprendedor';

  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null);
  const [errorProyectos, setErrorProyectos] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [tipoElegido, setTipoElegido] = useState<TipoMetrica | null>(null);

  const cargarProyectos = useCallback(async () => {
    try {
      setProyectos(await listarProyectos(token));
      setErrorProyectos(null);
    } catch (err) {
      setErrorProyectos(err instanceof ApiError ? err.message : 'No se pudieron cargar tus proyectos.');
    }
  }, [token]);

  useEffect(() => {
    cargarProyectos();
  }, [cargarProyectos]);

  // Si no hay uno elegido (o ya no existe) se usa el más reciente.
  const proyecto = useMemo(() => {
    if (!proyectos || proyectos.length === 0) return null;
    return proyectos.find((p) => p.id === proyectoId) ?? proyectos[0];
  }, [proyectos, proyectoId]);
  const idActivo = proyecto?.id ?? null;

  const cargarDatos = useCallback(
    async (id: string) => {
      const [metricas, dashboard] = await Promise.all([obtenerMetricas(token, id), obtenerDashboard(token, id)]);
      return { metricas, dashboard };
    },
    [token]
  );

  // Al cambiar de proyecto se descarta lo del anterior: nada se mezcla entre dashboards.
  useEffect(() => {
    if (!idActivo) {
      setDatos(null);
      return;
    }
    let vigente = true;
    setDatos(null);
    setErrorDatos(null);
    setTipoElegido(null);
    setCargandoDatos(true);
    cargarDatos(idActivo)
      .then((d) => vigente && setDatos(d))
      .catch((err) => vigente && setErrorDatos(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard.'))
      .finally(() => vigente && setCargandoDatos(false));
    return () => {
      vigente = false;
    };
  }, [idActivo, cargarDatos]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargarProyectos();
    if (idActivo) {
      try {
        setDatos(await cargarDatos(idActivo));
        setErrorDatos(null);
      } catch (err) {
        setErrorDatos(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard.');
      }
    }
    setRefrescando(false);
  };

  const historial = datos?.metricas.historial ?? [];
  const ultimas = datos?.metricas.ultimas ?? [];

  const tiposConDatos = ORDEN_TIPOS.filter((t) => serieDeTipo(historial, t).length > 0);
  const tipoActivo: TipoMetrica | null = tipoElegido && tiposConDatos.includes(tipoElegido) ? tipoElegido : tiposConDatos[0] ?? null;
  const serieActiva = tipoActivo ? serieDeTipo(historial, tipoActivo) : [];
  const origenes = Array.from(new Set(historial.filter((m) => m.estado === 'ok').map((m) => m.origen)));

  const ultimaValida = (tipo: TipoMetrica): Metrica | undefined => {
    const s = serieDeTipo(historial.length ? historial : ultimas, tipo);
    return s[s.length - 1];
  };

  // Engagement = interacciones / alcance, calculado con los últimos valores reales.
  const alcance = ultimaValida('alcance');
  const interacciones = ultimaValida('interacciones');
  const engagement = alcance?.valor && interacciones?.valor != null ? (interacciones.valor / alcance.valor) * 100 : null;

  // Conversión = pedidos / consultas, con los mismos últimos valores que se muestran.
  const consultasUlt = ultimaValida('consultas');
  const pedidosUlt = ultimaValida('pedidos');
  const conversion = consultasUlt?.valor && pedidosUlt?.valor != null ? (pedidosUlt.valor / consultasUlt.valor) * 100 : null;

  const otrasMetricas = ORDEN_TIPOS.filter((t) => !TARJETAS.includes(t) && t !== 'interacciones' && ultimaValida(t));

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={color.naranja} />}
    >
      <EncabezadoApp onAbrirCuenta={onAbrirCuenta} />

      <View style={styles.saludo}>
        <Text style={tipografia.h1} numberOfLines={1}>
          Hola, <Text style={{ color: color.naranja }}>{primerNombre}</Text>
        </Text>
        <Text style={[tipografia.subtitulo, { marginTop: 2 }]} numberOfLines={1}>
          {proyecto ? `Aquí tienes el resumen de ${proyecto.nombre}` : 'Aquí tienes un resumen de tus proyectos'}
        </Text>
      </View>

      {/* Sin proyectos / error */}
      {proyectos === null && !errorProyectos && <ActivityIndicator color={color.naranja} style={{ marginTop: espacio.xxl }} />}

      {errorProyectos && (
        <Estado icono="cloud-offline-outline" tono={color.peligro} texto={errorProyectos} boton="Reintentar" onBoton={refrescar} />
      )}

      {proyectos && proyectos.length === 0 && (
        <Estado
          icono="folder-open-outline"
          tono={color.naranja}
          titulo="Todavía no tenés proyectos"
          texto="El dashboard muestra las métricas y el análisis de cada proyecto. Creá el primero para empezar."
          boton="Crear un proyecto"
          onBoton={onIrAProyectos}
        />
      )}

      {proyecto && proyectos && (
        <>
          {/* Selector de proyecto */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selector}>
            {proyectos.map((p) => {
              const activo = p.id === proyecto.id;
              return (
                <Pressable key={p.id} style={[styles.chipProyecto, activo && styles.chipProyectoActivo]} onPress={() => onCambiarProyecto(p.id)}>
                  <Ionicons name="folder-outline" size={14} color={activo ? color.blanco : color.textoSecundario} />
                  <Text style={[styles.chipProyectoTexto, activo && { color: color.blanco }]} numberOfLines={1}>
                    {p.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {cargandoDatos && <ActivityIndicator color={color.naranja} style={{ marginTop: espacio.xxl }} />}

          {!cargandoDatos && errorDatos && (
            <Estado icono="cloud-offline-outline" tono={color.peligro} texto={errorDatos} boton="Reintentar" onBoton={refrescar} />
          )}

          {datos && (
            <>
              {/* Gráfico general */}
              <View style={[styles.tarjetaChart, sombra.tarjeta]}>
                <View style={styles.filaCentrada}>
                  <View style={styles.chartIconoChip}>
                    <Ionicons name="trending-up" size={18} color={color.violetaVivo} />
                  </View>
                  <Text style={tipografia.h2}>Gráfico general</Text>
                </View>

                {tipoActivo === null ? (
                  <View style={styles.vacio}>
                    <Ionicons name="bar-chart-outline" size={28} color={color.violetaMalva} />
                    <Text style={[tipografia.subtitulo, { textAlign: 'center' }]}>
                      Este proyecto todavía no tiene métricas. Cuando se carguen, acá vas a ver su evolución.
                    </Text>
                  </View>
                ) : (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsMetrica}>
                      {tiposConDatos.map((t) => {
                        const activa = t === tipoActivo;
                        return (
                          <Pressable key={t} style={[styles.tabMetrica, activa && styles.tabMetricaActiva]} onPress={() => setTipoElegido(t)}>
                            <Text style={[styles.tabMetricaTexto, activa && { color: color.blanco }]}>{INFO_METRICA[t].etiqueta}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {serieActiva.length >= 2 ? (
                      <View style={{ marginTop: espacio.md }}>
                        <GraficoArea
                          key={`${idActivo}-${tipoActivo}`}
                          puntos={puntosDeSerie(serieActiva)}
                          formatoValor={(v) => `${formatoMetrica({ tipo: tipoActivo, moneda: serieActiva[0].moneda }, v)}`}
                        />
                      </View>
                    ) : (
                      <View style={styles.unSoloRegistro}>
                        <Text style={styles.valorGrande}>
                          {formatoMetrica({ tipo: tipoActivo, moneda: serieActiva[0].moneda }, serieActiva[0].valor as number)}
                        </Text>
                        <Text style={[tipografia.subtitulo, { textAlign: 'center' }]}>
                          Hay un solo registro de {INFO_METRICA[tipoActivo].etiqueta.toLowerCase()} (
                          {formatearFecha(serieActiva[0].periodo.fin ?? serieActiva[0].registradoEn ?? '')}). El gráfico aparece con al
                          menos 2 registros.
                        </Text>
                      </View>
                    )}

                    <View style={styles.origenes}>
                      {origenes.map((o) => (
                        <Text key={o} style={styles.origenTexto}>
                          {ETIQUETA_ORIGEN[o]}
                        </Text>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Estadísticas */}
              <View style={styles.filaEstadisticas}>
                <TarjetaEngagement valor={engagement} />
                {TARJETAS.map((t) => (
                  <TarjetaEstadistica key={t} tipo={t} ultima={ultimaValida(t)} serie={serieDeTipo(historial, t)} />
                ))}
              </View>

              {(otrasMetricas.length > 0 || conversion !== null) && (
                <View style={styles.otras}>
                  {otrasMetricas.map((t) => {
                    const m = ultimaValida(t)!;
                    return (
                      <View key={t} style={styles.otraMetrica}>
                        <Ionicons name={INFO_METRICA[t].icono} size={14} color={color.violetaMalva} />
                        <Text style={tipografia.chico}>{INFO_METRICA[t].etiqueta}</Text>
                        <Text style={styles.otraValor}>{formatoMetrica(m, m.valor as number)}</Text>
                      </View>
                    );
                  })}
                  {conversion !== null && (
                    <View style={styles.otraMetrica}>
                      <Ionicons name="swap-horizontal-outline" size={14} color={color.violetaMalva} />
                      <Text style={tipografia.chico}>Conversión</Text>
                      <Text style={styles.otraValor}>{conversion.toFixed(1).replace('.', ',')}%</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Análisis real del proyecto */}
              <SeccionAnalisis analisis={datos.dashboard.analisis} onVerPlanes={onVerPlanes} />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function TarjetaEstadistica({ tipo, ultima, serie }: { tipo: TipoMetrica; ultima?: Metrica; serie: Metrica[] }) {
  const v = variacion(serie);
  return (
    <View style={[styles.tarjetaEstadistica, sombra.tarjeta]}>
      <View style={styles.estadisticaIconoChip}>
        <Ionicons name={INFO_METRICA[tipo].icono} size={16} color={color.violetaVivo} />
      </View>
      <Text style={tipografia.chico}>{INFO_METRICA[tipo].etiqueta}</Text>
      <Text style={styles.estadisticaValor} numberOfLines={1}>
        {ultima ? formatoMetrica(ultima, ultima.valor as number) : '—'}
      </Text>
      <Delta v={v} sinDato={!ultima} />
    </View>
  );
}

function TarjetaEngagement({ valor }: { valor: number | null }) {
  return (
    <View style={[styles.tarjetaEstadistica, sombra.tarjeta]}>
      <View style={styles.estadisticaIconoChip}>
        <Ionicons name="pulse-outline" size={16} color={color.violetaVivo} />
      </View>
      <Text style={tipografia.chico}>Engage</Text>
      <Text style={styles.estadisticaValor} numberOfLines={1}>
        {valor === null ? '—' : `${valor.toFixed(1).replace('.', ',')}%`}
      </Text>
      <Delta v={null} sinDato={valor === null} />
    </View>
  );
}

function Delta({ v, sinDato }: { v: number | null; sinDato: boolean }) {
  if (v === null) return <Text style={styles.sinDelta}>{sinDato ? 'Sin datos' : 'Sin comparar'}</Text>;
  const sube = v >= 0;
  return (
    <View style={styles.filaCentrada}>
      <Ionicons name={sube ? 'arrow-up' : 'arrow-down'} size={10} color={sube ? color.verde : color.peligro} />
      <Text style={[styles.estadisticaDelta, { color: sube ? color.verde : color.peligro }]}>{textoVariacion(v)}</Text>
    </View>
  );
}

function Estado({
  icono,
  tono,
  titulo,
  texto,
  boton,
  onBoton,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  tono: string;
  titulo?: string;
  texto: string;
  boton: string;
  onBoton: () => void;
}) {
  return (
    <View style={styles.estado}>
      <Ionicons name={icono} size={32} color={tono} />
      {!!titulo && <Text style={tipografia.h2}>{titulo}</Text>}
      <Text style={[tipografia.subtitulo, { textAlign: 'center', maxWidth: 290 }]}>{texto}</Text>
      <Pressable style={styles.botonEstado} onPress={onBoton}>
        <Text style={styles.botonEstadoTexto}>{boton}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  saludo: { marginTop: espacio.lg },
  selector: { gap: espacio.sm, paddingVertical: espacio.md },
  chipProyecto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
    paddingHorizontal: espacio.md,
    paddingVertical: 8,
    borderRadius: radio.pill,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
  },
  chipProyectoActivo: { backgroundColor: color.violetaVivo, borderColor: color.violetaVivo },
  chipProyectoTexto: { fontSize: 13, fontWeight: '600', color: color.textoSecundario, flexShrink: 1 },
  tarjetaChart: {
    marginTop: espacio.sm,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  filaCentrada: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  chartIconoChip: {
    width: 32,
    height: 32,
    borderRadius: radio.sm,
    backgroundColor: `${color.violetaVivo}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsMetrica: { gap: espacio.xs, marginTop: espacio.md },
  tabMetrica: { paddingHorizontal: espacio.md, paddingVertical: 6, borderRadius: radio.pill, backgroundColor: color.fondo },
  tabMetricaActiva: { backgroundColor: color.naranja },
  tabMetricaTexto: { fontSize: 12, fontWeight: '600', color: color.textoSecundario },
  vacio: { alignItems: 'center', gap: espacio.sm, paddingVertical: espacio.xl },
  unSoloRegistro: { alignItems: 'center', gap: espacio.sm, paddingVertical: espacio.xl },
  valorGrande: { fontSize: 36, fontWeight: '800', color: color.textoPrimario },
  origenes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.md, marginTop: espacio.md },
  origenTexto: { fontSize: 11, color: color.textoTerciario },
  filaEstadisticas: { marginTop: espacio.lg, flexDirection: 'row', gap: espacio.sm },
  tarjetaEstadistica: {
    flex: 1,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.sm,
    gap: 4,
  },
  estadisticaIconoChip: {
    width: 28,
    height: 28,
    borderRadius: radio.pill,
    backgroundColor: `${color.violetaVivo}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  estadisticaValor: { fontSize: 14, fontWeight: '700', color: color.textoPrimario },
  estadisticaDelta: { fontSize: 11, fontWeight: '600' },
  sinDelta: { fontSize: 10, color: color.textoTerciario },
  otras: { marginTop: espacio.md, flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  otraMetrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.md,
    paddingVertical: 6,
  },
  otraValor: { fontSize: 12, fontWeight: '700', color: color.textoPrimario },
  estado: { alignItems: 'center', gap: espacio.sm, marginTop: espacio.xxl },
  botonEstado: {
    marginTop: espacio.sm,
    borderRadius: radio.pill,
    backgroundColor: color.naranja,
    paddingHorizontal: espacio.xl,
    paddingVertical: 10,
  },
  botonEstadoTexto: { fontSize: 14, fontWeight: '700', color: color.blanco },
});
