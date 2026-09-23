import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, sombra, tipografia } from './theme';
import {
  ApiError,
  crearProyecto,
  DatosProyecto,
  guardarVentasIniciales,
  obtenerProyeccionInicial,
  ProyeccionInicial,
  Rango,
  Sesion,
  sugerirNombres,
} from './api';
import { Campo } from './FormularioProyecto';
import { MensajeError } from './ComponentesAuth';

type Props = {
  sesion: Sesion;
  // Se llama con el id del proyecto creado; la app sigue con el paywall.
  onFinalizar: (proyectoId: string) => void;
};

type Camino = 'empezado' | 'idea';
type Paso = 'tipo' | 'tieneNombre' | 'nombreEscrito' | 'ideaCorta' | 'sugerencias' | 'datos' | 'proyeccion';

export default function PantallaOnboarding({ sesion, onFinalizar }: Props) {
  const token = sesion.accessToken;
  const primerNombre = sesion.usuario.nombre.split(' ')[0];

  const [camino, setCamino] = useState<Camino>('empezado');
  const [paso, setPaso] = useState<Paso>('tipo');

  // Nombre (camino "idea")
  const [nombre, setNombre] = useState('');
  const [fuenteNombre, setFuenteNombre] = useState<'escrito' | 'sugerido'>('escrito');
  const [ideaCorta, setIdeaCorta] = useState('');
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [yaSugeridos, setYaSugeridos] = useState<string[]>([]);

  // Datos del proyecto
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [publico, setPublico] = useState('');
  const [ventas, setVentas] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [instagram, setInstagram] = useState('');

  // Guardado + proyección
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [ventasGuardadas, setVentasGuardadas] = useState(false);
  const [proyeccion, setProyeccion] = useState<ProyeccionInicial | null>(null);
  const [errorProyeccion, setErrorProyeccion] = useState<string | null>(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esIdea = camino === 'idea';
  const totalPasos = esIdea ? 4 : 3;
  const numeroPaso =
    paso === 'tipo' ? 1 : paso === 'datos' ? (esIdea ? 3 : 2) : paso === 'proyeccion' ? totalPasos : 2;

  // "Atrás" según el paso. Una vez creado el proyecto (proyección) ya no se vuelve.
  const pasoAnterior = (): Paso | null => {
    switch (paso) {
      case 'tieneNombre':
        return 'tipo';
      case 'nombreEscrito':
      case 'ideaCorta':
        return 'tieneNombre';
      case 'sugerencias':
        return 'ideaCorta';
      case 'datos':
        return esIdea ? (fuenteNombre === 'sugerido' ? 'sugerencias' : 'nombreEscrito') : 'tipo';
      default:
        return null;
    }
  };

  const irAtras = () => {
    const anterior = pasoAnterior();
    if (anterior) {
      setError(null);
      setPaso(anterior);
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      irAtras();
      return true;
    });
    return () => sub.remove();
  });

  const elegirCamino = (c: Camino) => {
    setCamino(c);
    setError(null);
    setPaso(c === 'empezado' ? 'datos' : 'tieneNombre');
  };

  // ----- Nombre -----
  const continuarConNombreEscrito = () => {
    if (nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    setError(null);
    setFuenteNombre('escrito');
    setPaso('datos');
  };

  const pedirSugerencias = async (evitar: string[]) => {
    if (ideaCorta.trim().length < 10) {
      setError('Contanos tu idea en al menos 10 caracteres.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const nuevos = await sugerirNombres(token, ideaCorta.trim(), evitar);
      setSugerencias(nuevos);
      setYaSugeridos([...evitar, ...nuevos]);
      setPaso('sugerencias');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron generar nombres.');
    } finally {
      setCargando(false);
    }
  };

  const elegirSugerido = (n: string) => {
    setNombre(n);
    setFuenteNombre('sugerido');
    setError(null);
    // Lo que ya contó de su idea sirve de punto de partida para la descripción.
    if (!descripcion.trim()) setDescripcion(ideaCorta.trim());
    setPaso('datos');
  };

  // ----- Guardar + proyección -----
  const validarDatos = (): string | null => {
    const largo = (v: string, min: number) => v.trim().length >= min;
    if (!esIdea && !largo(nombre, 2)) return 'Ingresá el nombre de tu proyecto (mínimo 2 caracteres).';
    if (!largo(pais, 2)) return 'Ingresá el país.';
    if (!largo(ciudad, 2)) return 'Ingresá la ciudad o zona.';
    if (!largo(categoria, 2)) return 'Ingresá la categoría (por ejemplo: indumentaria, gastronomía).';
    if (!largo(descripcion, 10)) return 'Describí tu proyecto en al menos 10 caracteres.';
    if (!largo(publico, 10)) return 'Describí a tu público objetivo en al menos 10 caracteres.';
    if (!esIdea && !/^\d{1,7}$/.test(ventas.trim())) {
      return 'Ingresá la cantidad total de ventas hasta hoy como número entero (0 si todavía no vendiste).';
    }
    return null;
  };

  const cargarProyeccion = async (id: string) => {
    setErrorProyeccion(null);
    setProyeccion(null);
    try {
      setProyeccion(await obtenerProyeccionInicial(token, id));
    } catch (err) {
      setErrorProyeccion(err instanceof ApiError ? err.message : 'No se pudo calcular la estimación.');
    }
  };

  const guardarYProyectar = async () => {
    if (cargando) return;
    const problema = validarDatos();
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      let id = proyectoId;
      if (!id) {
        const cantidad = esIdea ? 0 : Number(ventas.trim());
        // El backend exige etapa y objetivo: se ponen por defecto y se pueden
        // cambiar después desde "Editar proyecto".
        const datos: DatosProyecto = {
          nombre: nombre.trim(),
          pais: pais.trim(),
          ciudad: ciudad.trim(),
          categoria: categoria.trim(),
          etapa: esIdea ? 'idea' : cantidad > 0 ? 'ventas' : 'lanzamiento',
          oferta: descripcion.trim(),
          clienteObjetivo: publico.trim(),
          objetivo90d: 'ventas',
          sitioWeb: esIdea ? '' : sitioWeb.trim(),
          instagramHandle: esIdea ? '' : instagram.trim().replace(/^@/, ''),
        };
        id = (await crearProyecto(token, datos)).id;
        setProyectoId(id);
      }
      if (!esIdea && !ventasGuardadas) {
        await guardarVentasIniciales(token, id, Number(ventas.trim()));
        setVentasGuardadas(true);
      }
      setPaso('proyeccion');
      cargarProyeccion(id);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detalles?.length ? err.detalles.join('\n') : err.message);
      else setError('Ocurrió un error inesperado.');
    } finally {
      setCargando(false);
    }
  };

  // ----- UI -----
  const anterior = pasoAnterior();

  return (
    <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {anterior ? (
            <Pressable style={styles.botonVolver} onPress={irAtras} accessibilityLabel="Volver">
              <Ionicons name="arrow-back" size={22} color={color.textoPrimario} />
            </Pressable>
          ) : (
            <View style={styles.botonVolverVacio} />
          )}
          <View style={styles.progreso}>
            {Array.from({ length: totalPasos }, (_, i) => (
              <View key={i} style={[styles.progresoPunto, i < numeroPaso && styles.progresoPuntoActivo]} />
            ))}
          </View>
          <Text style={styles.progresoTexto}>
            {numeroPaso}/{totalPasos}
          </Text>
        </View>

        {paso === 'tipo' && (
          <>
            <Titulo
              partes={['¡Empecemos', primerNombre ? `, ${primerNombre}!` : '!']}
              resaltar={1}
              subtitulo="Contanos en qué punto está tu proyecto y armamos todo a tu medida."
            />
            <Opcion
              icono="rocket-outline"
              titulo="Ya tengo un proyecto empezado"
              detalle="Ya estás en marcha: tenés ideas, clientes o ventas."
              onPress={() => elegirCamino('empezado')}
            />
            <Opcion
              icono="bulb-outline"
              titulo="Solo tengo la idea"
              detalle="Todavía lo estás pensando y querés dar el primer paso."
              onPress={() => elegirCamino('idea')}
            />
          </>
        )}

        {paso === 'tieneNombre' && (
          <>
            <Titulo partes={['¿Ya tenés un ', 'nombre', ' pensado?']} resaltar={1} subtitulo="No pasa nada si todavía no: lo podés cambiar después." />
            <Opcion
              icono="checkmark-circle-outline"
              titulo="Sí, ya tengo nombre"
              detalle="Lo escribís vos."
              onPress={() => {
                setError(null);
                setPaso('nombreEscrito');
              }}
            />
            <Opcion
              icono="sparkles-outline"
              titulo="Todavía no, ayudame a pensarlo"
              detalle="Te sugerimos nombres con IA a partir de tu idea."
              onPress={() => {
                setError(null);
                setPaso('ideaCorta');
              }}
            />
          </>
        )}

        {paso === 'nombreEscrito' && (
          <>
            <Titulo partes={['¿Cómo se ', 'llama', ' tu proyecto?']} resaltar={1} subtitulo="Después lo podés cambiar cuando quieras." />
            <Campo etiqueta="Nombre del proyecto" valor={nombre} onChange={setNombre} placeholder="Ej: Tienda Luna" capitalizar />
            <MensajeError mensaje={error} />
            <Boton texto="Continuar" onPress={continuarConNombreEscrito} />
          </>
        )}

        {paso === 'ideaCorta' && (
          <>
            <Titulo
              partes={['Contanos tu ', 'idea', '']}
              resaltar={1}
              subtitulo="Con una o dos frases alcanza. La IA la usa para proponerte nombres."
            />
            <Campo
              etiqueta="Tu idea"
              valor={ideaCorta}
              onChange={setIdeaCorta}
              placeholder="Ej: vender ropa de mujer hecha a mano por Instagram"
              multilinea
              capitalizar
            />
            <MensajeError mensaje={error} />
            <Boton texto="Sugerime nombres" icono="sparkles" cargando={cargando} onPress={() => pedirSugerencias([])} />
          </>
        )}

        {paso === 'sugerencias' && (
          <>
            <Titulo partes={['Elegí un ', 'nombre', '']} resaltar={1} subtitulo="Tocá el que más te guste. Después lo podés cambiar." />
            {sugerencias.map((n) => (
              <Pressable key={n} style={({ pressed }) => [styles.sugerencia, pressed && { opacity: 0.7 }]} onPress={() => elegirSugerido(n)}>
                <Text style={styles.sugerenciaTexto}>{n}</Text>
                <Ionicons name="chevron-forward" size={18} color={color.textoTerciario} />
              </Pressable>
            ))}
            <MensajeError mensaje={error} />
            <Pressable
              style={({ pressed }) => [styles.botonBorde, (pressed || cargando) && { opacity: 0.7 }]}
              disabled={cargando}
              onPress={() => pedirSugerencias(yaSugeridos)}
            >
              {cargando ? <ActivityIndicator color={color.naranja} /> : <Text style={styles.botonBordeTexto}>Generar otros nombres</Text>}
            </Pressable>
            <Pressable
              style={styles.enlace}
              onPress={() => {
                setError(null);
                setPaso('nombreEscrito');
              }}
            >
              <Text style={styles.enlaceTexto}>Prefiero escribir uno yo</Text>
            </Pressable>
          </>
        )}

        {paso === 'datos' && (
          <>
            <Titulo
              partes={esIdea ? ['Contanos sobre tu ', 'idea', ''] : ['Contanos sobre tu ', 'proyecto', '']}
              resaltar={1}
              subtitulo={esIdea ? `Nombre: ${nombre.trim()} (lo podés cambiar después)` : 'Cuanto más detalle, mejor va a ser tu estimación.'}
            />

            {!esIdea && <Campo etiqueta="Nombre del proyecto" valor={nombre} onChange={setNombre} placeholder="Ej: Tienda Luna" capitalizar />}
            <View style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="País" valor={pais} onChange={setPais} placeholder="Argentina" capitalizar />
              </View>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="Ciudad o zona" valor={ciudad} onChange={setCiudad} placeholder="Rosario" capitalizar />
              </View>
            </View>
            <Campo etiqueta="Categoría" valor={categoria} onChange={setCategoria} placeholder="Ej: indumentaria, gastronomía" capitalizar />
            <Campo
              etiqueta="Descripción del proyecto"
              valor={descripcion}
              onChange={setDescripcion}
              placeholder="¿Qué vendés o qué servicio brindás?"
              multilinea
              capitalizar
            />
            <Campo
              etiqueta="Público objetivo"
              valor={publico}
              onChange={setPublico}
              placeholder="¿A quién le vendés? Edad, intereses, zona..."
              multilinea
              capitalizar
            />

            {!esIdea && (
              <>
                <Campo
                  etiqueta="Cantidad total de ventas hasta hoy"
                  valor={ventas}
                  onChange={(v) => setVentas(v.replace(/[^\d]/g, ''))}
                  placeholder="0 si todavía no vendiste"
                  teclado="numeric"
                />
                <Text style={styles.opcional}>Opcional</Text>
                <Campo etiqueta="Sitio web" valor={sitioWeb} onChange={setSitioWeb} placeholder="https://..." teclado="url" />
                <Campo etiqueta="Usuario de Instagram" valor={instagram} onChange={setInstagram} placeholder="@tumarca" />
              </>
            )}

            <MensajeError mensaje={error} />
            <Boton texto="Ver mi estimación" icono="sparkles" cargando={cargando} onPress={guardarYProyectar} />
          </>
        )}

        {paso === 'proyeccion' && (
          <>
            <Titulo
              partes={['Tu potencial a ', '3 meses', '']}
              resaltar={1}
              subtitulo={`Una estimación para ${nombre.trim() || 'tu proyecto'} con lo que nos contaste.`}
            />

            {!proyeccion && !errorProyeccion && (
              <View style={styles.cargandoBloque}>
                <ActivityIndicator color={color.naranja} size="large" />
                <Text style={[tipografia.subtitulo, { textAlign: 'center' }]}>Estamos calculando tu estimación con IA… puede tardar unos segundos.</Text>
              </View>
            )}

            {errorProyeccion && (
              <View style={styles.cargandoBloque}>
                <Ionicons name="cloud-offline-outline" size={32} color={color.peligro} />
                <Text style={[tipografia.subtitulo, { textAlign: 'center' }]}>{errorProyeccion}</Text>
                <Pressable style={styles.botonBorde} onPress={() => proyectoId && cargarProyeccion(proyectoId)}>
                  <Text style={styles.botonBordeTexto}>Reintentar</Text>
                </Pressable>
                <Pressable style={styles.enlace} onPress={() => proyectoId && onFinalizar(proyectoId)}>
                  <Text style={styles.enlaceTexto}>Continuar sin estimación</Text>
                </Pressable>
              </View>
            )}

            {proyeccion && (
              <>
                <TarjetaRango icono="cart-outline" tono={color.naranja} titulo="Ventas posibles" rango={proyeccion.ventas} unidad="ventas" />
                <TarjetaRango icono="people-outline" tono="#c58ae0" titulo="Seguidores nuevos posibles" rango={proyeccion.seguidores} unidad="seguidores" />

                <View style={styles.supuestos}>
                  <Text style={styles.supuestosTitulo}>En qué se basa</Text>
                  {proyeccion.supuestos.map((s, i) => (
                    <View key={i} style={styles.supuesto}>
                      <Text style={styles.viñeta}>•</Text>
                      <Text style={[tipografia.subtitulo, { flex: 1 }]}>{s}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.aviso}>{proyeccion.advertencia}</Text>
                <Boton texto="Continuar" onPress={() => proyectoId && onFinalizar(proyectoId)} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Titulo({ partes, resaltar, subtitulo }: { partes: string[]; resaltar: number; subtitulo: string }) {
  return (
    <View style={{ marginTop: espacio.xl, marginBottom: espacio.md }}>
      <Text style={tipografia.h1}>
        {partes.map((p, i) => (
          <Text key={i} style={i === resaltar ? { color: color.naranja } : undefined}>
            {p}
          </Text>
        ))}
      </Text>
      <Text style={[tipografia.subtitulo, { marginTop: 4, color: color.violetaMalva }]}>{subtitulo}</Text>
    </View>
  );
}

function Opcion({ icono, titulo, detalle, onPress }: { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.opcion, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.opcionIcono}>
        <Ionicons name={icono} size={26} color={color.naranja} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tipografia.h2}>{titulo}</Text>
        <Text style={tipografia.subtitulo}>{detalle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color.textoTerciario} />
    </Pressable>
  );
}

function Boton({ texto, onPress, cargando, icono }: { texto: string; onPress: () => void; cargando?: boolean; icono?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable onPress={onPress} disabled={cargando} style={({ pressed }) => [styles.boton, (pressed || cargando) && { opacity: 0.75 }]}>
      {cargando ? (
        <ActivityIndicator color={color.blanco} />
      ) : (
        <>
          {icono && <Ionicons name={icono} size={16} color={color.blanco} />}
          <Text style={tipografia.boton}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

function TarjetaRango({ icono, tono, titulo, rango, unidad }: { icono: keyof typeof Ionicons.glyphMap; tono: string; titulo: string; rango: Rango; unidad: string }) {
  const fmt = (n: number) => n.toLocaleString('es-AR');
  return (
    <View style={[styles.tarjetaRango, sombra.tarjeta]}>
      <View style={[styles.rangoIcono, { backgroundColor: `${tono}26` }]}>
        <Ionicons name={icono} size={24} color={tono} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tipografia.subtitulo}>{titulo}</Text>
        <Text style={styles.rangoValor}>
          {fmt(rango.minimo)} – {fmt(rango.maximo)}
        </Text>
        <Text style={tipografia.chico}>{unidad} en 3 meses</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
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
  botonVolverVacio: { width: 40, height: 40 },
  progreso: { flex: 1, flexDirection: 'row', gap: 6 },
  progresoPunto: { flex: 1, height: 5, borderRadius: radio.pill, backgroundColor: color.fondoSuave },
  progresoPuntoActivo: { backgroundColor: color.naranja },
  progresoTexto: { fontSize: 12, color: color.textoTerciario, fontWeight: '600', minWidth: 28, textAlign: 'right' },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.xl,
    padding: espacio.lg,
    marginTop: espacio.md,
  },
  opcionIcono: {
    width: 52,
    height: 52,
    borderRadius: radio.lg,
    backgroundColor: 'rgba(217,120,69,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fila: { flexDirection: 'row', gap: espacio.sm },
  opcional: {
    marginTop: espacio.xl,
    fontSize: 12,
    fontWeight: '700',
    color: color.textoTerciario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sugerencia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.lg,
    marginTop: espacio.sm,
  },
  sugerenciaTexto: { fontSize: 17, fontWeight: '700', color: color.textoPrimario, flex: 1 },
  boton: {
    marginTop: espacio.xl,
    height: 52,
    borderRadius: radio.lg,
    backgroundColor: color.naranja,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
  },
  botonBorde: {
    marginTop: espacio.lg,
    height: 48,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: color.naranja,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.xl,
  },
  botonBordeTexto: { fontSize: 14, fontWeight: '700', color: color.naranja },
  enlace: { marginTop: espacio.md, alignItems: 'center', padding: espacio.sm },
  enlaceTexto: { fontSize: 14, fontWeight: '600', color: color.violetaMalva },
  cargandoBloque: { alignItems: 'center', gap: espacio.md, marginTop: espacio.xxl },
  tarjetaRango: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.xl,
    padding: espacio.lg,
    marginTop: espacio.md,
  },
  rangoIcono: { width: 52, height: 52, borderRadius: radio.lg, alignItems: 'center', justifyContent: 'center' },
  rangoValor: { fontSize: 28, fontWeight: '800', color: color.textoPrimario, marginVertical: 2 },
  supuestos: {
    marginTop: espacio.lg,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    gap: espacio.sm,
  },
  supuestosTitulo: { fontSize: 12, fontWeight: '700', color: color.textoTerciario, textTransform: 'uppercase' },
  supuesto: { flexDirection: 'row', gap: espacio.sm },
  viñeta: { color: color.naranja, fontWeight: '800' },
  aviso: { marginTop: espacio.lg, fontSize: 12, color: color.textoTerciario, textAlign: 'center', lineHeight: 17 },
});
