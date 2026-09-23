import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, tipografia } from './theme';
import {
  ApiError,
  crearProyecto,
  DatosProyecto,
  editarProyecto,
  eliminarProyecto,
  listarProyectos,
  Proyecto,
  Sesion,
} from './api';
import { etapaInfo, formatearFecha } from './proyectosUI';
import FormularioProyecto from './FormularioProyecto';
import DetalleProyecto from './DetalleProyecto';

type Props = {
  sesion: Sesion;
  // Se llama cuando el plan gratuito ya no alcanza (límite de proyectos).
  onVerPlanes: () => void;
  // Abre el dashboard de un proyecto puntual.
  onVerDashboard: (proyectoId: string) => void;
};

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'detalle'; id: string }
  | { tipo: 'crear' }
  | { tipo: 'editar'; id: string };

export default function PantallaProyectos({ sesion, onVerPlanes, onVerDashboard }: Props) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });

  const token = sesion.accessToken;
  const limite = sesion.plan.workspaces;
  const llegoAlLimite = limite !== null && proyectos.length >= limite;
  const esPro = sesion.plan.id === 'pro';

  const cargar = useCallback(async () => {
    try {
      setProyectos(await listarProyectos(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus proyectos.');
    }
  }, [token]);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  useEffect(() => {
    if (vista.tipo === 'lista') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setVista(vista.tipo === 'editar' ? { tipo: 'detalle', id: vista.id } : { tipo: 'lista' });
      return true;
    });
    return () => sub.remove();
  }, [vista]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const proyectoActual = vista.tipo === 'detalle' || vista.tipo === 'editar' ? proyectos.find((p) => p.id === vista.id) : undefined;

  if (vista.tipo === 'crear') {
    return (
      <FormularioProyecto
        onCancelar={() => setVista({ tipo: 'lista' })}
        onGuardar={async (datos: DatosProyecto) => {
          try {
            const nuevo = await crearProyecto(token, datos);
            setProyectos((prev) => [nuevo, ...prev]);
            setVista({ tipo: 'detalle', id: nuevo.id });
          } catch (err) {
            // Límite del plan: se manda al usuario a ver los planes.
            if (err instanceof ApiError && err.codigo === 'limite_plan') {
              setVista({ tipo: 'lista' });
              if (!esPro) onVerPlanes();
            }
            throw err;
          }
        }}
      />
    );
  }

  if (vista.tipo === 'editar' && proyectoActual) {
    return (
      <FormularioProyecto
        proyecto={proyectoActual}
        onCancelar={() => setVista({ tipo: 'detalle', id: proyectoActual.id })}
        onGuardar={async (datos: DatosProyecto) => {
          const actualizado = await editarProyecto(token, proyectoActual.id, datos);
          setProyectos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
          setVista({ tipo: 'detalle', id: actualizado.id });
        }}
      />
    );
  }

  if (vista.tipo === 'detalle' && proyectoActual) {
    return (
      <DetalleProyecto
        proyecto={proyectoActual}
        onVolver={() => setVista({ tipo: 'lista' })}
        onVerDashboard={() => onVerDashboard(proyectoActual.id)}
        onEditar={() => setVista({ tipo: 'editar', id: proyectoActual.id })}
        onEliminar={async () => {
          await eliminarProyecto(token, proyectoActual.id);
          setProyectos((prev) => prev.filter((p) => p.id !== proyectoActual.id));
          setVista({ tipo: 'lista' });
        }}
      />
    );
  }

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={color.naranja} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={tipografia.h1}>
            Tus <Text style={{ color: color.naranja }}>proyectos</Text>
          </Text>
          <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>
            {limite !== null ? `${proyectos.length} de ${limite} en tu plan ${sesion.plan.nombre}` : `${proyectos.length} proyectos`}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.botonNuevo, pressed && { opacity: 0.75 }]}
          onPress={() => (llegoAlLimite && !esPro ? onVerPlanes() : setVista({ tipo: 'crear' }))}
        >
          <Ionicons name="add" size={20} color={color.blanco} />
          <Text style={styles.botonNuevoTexto}>Nuevo</Text>
        </Pressable>
      </View>

      {llegoAlLimite && (
        <Pressable style={styles.avisoLimite} onPress={esPro ? undefined : onVerPlanes}>
          <Ionicons name="lock-closed-outline" size={18} color={color.naranja} />
          <Text style={styles.avisoLimiteTexto}>
            {esPro
              ? `Llegaste al límite de ${limite} proyectos de tu plan.`
              : `Tu plan Gratuito permite ${limite} proyecto. Pasate a Pro para tener hasta 5.`}
          </Text>
          {!esPro && <Ionicons name="chevron-forward" size={16} color={color.naranja} />}
        </Pressable>
      )}

      {cargando && <ActivityIndicator color={color.naranja} style={{ marginTop: espacio.xxl }} />}

      {!cargando && error && (
        <View style={styles.estado}>
          <Ionicons name="cloud-offline-outline" size={32} color={color.peligro} />
          <Text style={[tipografia.subtitulo, styles.estadoTexto]}>{error}</Text>
          <Pressable style={styles.botonReintentar} onPress={refrescar}>
            <Text style={styles.botonReintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {!cargando && !error && proyectos.length === 0 && (
        <View style={styles.estado}>
          <View style={styles.vacioIcono}>
            <Ionicons name="folder-open-outline" size={32} color={color.naranja} />
          </View>
          <Text style={tipografia.h2}>Todavía no tenés proyectos</Text>
          <Text style={[tipografia.subtitulo, styles.estadoTexto]}>
            Creá tu primer proyecto para empezar a analizar tu emprendimiento.
          </Text>
          <Pressable style={styles.botonCrear} onPress={() => setVista({ tipo: 'crear' })}>
            <Ionicons name="add" size={18} color={color.blanco} />
            <Text style={tipografia.boton}>Crear mi primer proyecto</Text>
          </Pressable>
        </View>
      )}

      {proyectos.map((p) => {
        const etapa = etapaInfo(p.etapa);
        return (
          <Pressable
            key={p.id}
            style={({ pressed }) => [styles.tarjeta, pressed && { opacity: 0.7 }]}
            onPress={() => setVista({ tipo: 'detalle', id: p.id })}
          >
            <View style={styles.tarjetaIcono}>
              <Ionicons name={etapa.icono} size={22} color={color.naranja} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={tipografia.h2} numberOfLines={1}>
                {p.nombre}
              </Text>
              <Text style={tipografia.subtitulo} numberOfLines={1}>
                {p.categoria} · {p.ciudad}
              </Text>
              <View style={styles.tarjetaPie}>
                <View style={styles.insignia}>
                  <Text style={styles.insigniaTexto}>{etapa.etiqueta}</Text>
                </View>
                <Text style={tipografia.chico}>Actualizado: {formatearFecha(p.actualizadoEn)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.textoTerciario} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, marginBottom: espacio.lg },
  botonNuevo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.naranja,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.lg,
    paddingVertical: 10,
  },
  botonNuevoTexto: { fontSize: 14, fontWeight: '700', color: color.blanco },
  avisoLimite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: 'rgba(217,120,69,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(217,120,69,0.5)',
    borderRadius: radio.lg,
    padding: espacio.md,
    marginBottom: espacio.md,
  },
  avisoLimiteTexto: { flex: 1, fontSize: 13, color: color.textoPrimario },
  estado: { alignItems: 'center', marginTop: espacio.xxl, gap: espacio.sm },
  estadoTexto: { textAlign: 'center', maxWidth: 280 },
  vacioIcono: {
    width: 72,
    height: 72,
    borderRadius: radio.xl,
    backgroundColor: 'rgba(217,120,69,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.sm,
  },
  botonCrear: {
    marginTop: espacio.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.naranja,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.xl,
    paddingVertical: 14,
  },
  botonReintentar: {
    marginTop: espacio.sm,
    borderWidth: 1,
    borderColor: color.violetaMalva,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.lg,
    paddingVertical: 8,
  },
  botonReintentarTexto: { fontSize: 13, fontWeight: '600', color: color.textoPrimario },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  tarjetaIcono: {
    width: 48,
    height: 48,
    borderRadius: radio.md,
    backgroundColor: 'rgba(217,120,69,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaPie: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: 6 },
  insignia: {
    backgroundColor: `${color.violetaVivo}44`,
    borderRadius: radio.pill,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
  },
  insigniaTexto: { fontSize: 11, fontWeight: '700', color: '#c58ae0' },
});
