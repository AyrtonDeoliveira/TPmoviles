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
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, tipografia } from './theme';
import { ApiError, DatosProyecto, Etapa, Objetivo, Proyecto } from './api';
import { ETAPAS, OBJETIVOS } from './proyectosUI';

type Props = {
  // Si viene `proyecto` se edita, si no se crea.
  proyecto?: Proyecto;
  onCancelar: () => void;
  onGuardar: (datos: DatosProyecto) => Promise<void>;
};

const SIN_RECUADRO_WEB = { outlineStyle: 'none' } as any;

// Mismos mínimos que valida el backend (backend/src/lib/validar.js).
function validar(d: DatosProyecto): string | null {
  const largo = (v: string | undefined, min: number) => (v ?? '').trim().length >= min;
  if (!largo(d.nombre, 2)) return 'El nombre debe tener al menos 2 caracteres.';
  if (!largo(d.pais, 2)) return 'Ingresá el país.';
  if (!largo(d.ciudad, 2)) return 'Ingresá la ciudad o zona donde vendés.';
  if (!largo(d.categoria, 2)) return 'Ingresá la categoría (por ejemplo: indumentaria, gastronomía).';
  if (!largo(d.oferta, 10)) return 'Contá qué ofrecés en al menos 10 caracteres.';
  if (!largo(d.clienteObjetivo, 10)) return 'Describí a tu cliente objetivo en al menos 10 caracteres.';
  if (d.objetivo90d === 'otro' && !largo(d.objetivo90dNota, 2)) return 'Describí tu objetivo (elegiste "Otro").';
  return null;
}

export default function FormularioProyecto({ proyecto, onCancelar, onGuardar }: Props) {
  const [nombre, setNombre] = useState(proyecto?.nombre ?? '');
  const [pais, setPais] = useState(proyecto?.pais ?? '');
  const [ciudad, setCiudad] = useState(proyecto?.ciudad ?? '');
  const [categoria, setCategoria] = useState(proyecto?.categoria ?? '');
  const [etapa, setEtapa] = useState<Etapa>(proyecto?.etapa ?? 'idea');
  const [oferta, setOferta] = useState(proyecto?.oferta ?? '');
  const [cliente, setCliente] = useState(proyecto?.clienteObjetivo ?? '');
  const [objetivo, setObjetivo] = useState<Objetivo>(proyecto?.objetivo90d ?? 'ventas');
  const [nota, setNota] = useState(proyecto?.objetivo90dNota ?? '');
  const [sitioWeb, setSitioWeb] = useState(proyecto?.sitioWeb ?? '');
  const [instagram, setInstagram] = useState(proyecto?.instagramHandle ?? '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (cargando) return;
    const datos: DatosProyecto = {
      nombre: nombre.trim(),
      pais: pais.trim(),
      ciudad: ciudad.trim(),
      categoria: categoria.trim(),
      etapa,
      oferta: oferta.trim(),
      clienteObjetivo: cliente.trim(),
      objetivo90d: objetivo,
      ...(objetivo === 'otro' ? { objetivo90dNota: nota.trim() } : {}),
      sitioWeb: sitioWeb.trim(),
      instagramHandle: instagram.trim().replace(/^@/, ''),
    };
    const problema = validar(datos);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await onGuardar(datos);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detalles?.length ? err.detalles.join('\n') : err.message);
      else setError('Ocurrió un error inesperado.');
      setCargando(false);
    }
  };

  const editando = !!proyecto;

  return (
    <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={styles.botonVolver} onPress={onCancelar} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={22} color={color.textoPrimario} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={tipografia.h1}>
              {editando ? 'Editar ' : 'Nuevo '}
              <Text style={{ color: color.naranja }}>proyecto</Text>
            </Text>
            <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>
              Cuanto mejor lo describas, mejores serán los análisis.
            </Text>
          </View>
        </View>

        <Campo etiqueta="Nombre del proyecto" valor={nombre} onChange={setNombre} placeholder="Ej: Tienda de ropa Luna" capitalizar />
        <View style={styles.fila}>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="País" valor={pais} onChange={setPais} placeholder="Argentina" capitalizar />
          </View>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="Ciudad o zona" valor={ciudad} onChange={setCiudad} placeholder="Rosario" capitalizar />
          </View>
        </View>
        <Campo etiqueta="Categoría" valor={categoria} onChange={setCategoria} placeholder="Ej: indumentaria, gastronomía" capitalizar />

        <Text style={styles.etiqueta}>Etapa</Text>
        <View style={styles.chips}>
          {ETAPAS.map((e) => (
            <Chip key={e.id} texto={e.etiqueta} activo={etapa === e.id} onPress={() => setEtapa(e.id)} />
          ))}
        </View>

        <Campo
          etiqueta="¿Qué ofrecés?"
          valor={oferta}
          onChange={setOferta}
          placeholder="Contá qué vendés o qué servicio brindás"
          multilinea
          capitalizar
        />
        <Campo
          etiqueta="Cliente objetivo"
          valor={cliente}
          onChange={setCliente}
          placeholder="¿A quién le vendés? Edad, intereses, zona..."
          multilinea
          capitalizar
        />

        <Text style={styles.etiqueta}>Objetivo a 90 días</Text>
        <View style={styles.chips}>
          {OBJETIVOS.map((o) => (
            <Chip key={o.id} texto={o.etiqueta} activo={objetivo === o.id} onPress={() => setObjetivo(o.id)} />
          ))}
        </View>
        {objetivo === 'otro' && (
          <Campo etiqueta="Describí tu objetivo" valor={nota} onChange={setNota} placeholder="Ej: abrir un local" capitalizar />
        )}

        <Text style={styles.seccionOpcional}>Opcional</Text>
        <Campo etiqueta="Sitio web" valor={sitioWeb} onChange={setSitioWeb} placeholder="https://..." teclado="url" />
        <Campo etiqueta="Usuario de Instagram" valor={instagram} onChange={setInstagram} placeholder="@tumarca" />

        {error && (
          <View style={styles.error}>
            <Ionicons name="alert-circle-outline" size={18} color={color.peligro} />
            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={guardar}
          disabled={cargando}
          style={({ pressed }) => [styles.botonGuardar, (pressed || cargando) && { opacity: 0.75 }]}
        >
          {cargando ? (
            <ActivityIndicator color={color.blanco} />
          ) : (
            <Text style={tipografia.boton}>{editando ? 'Guardar cambios' : 'Crear proyecto'}</Text>
          )}
        </Pressable>
        <Pressable onPress={onCancelar} style={styles.botonCancelar}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  multilinea,
  capitalizar,
  teclado,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multilinea?: boolean;
  capitalizar?: boolean;
  teclado?: TextInputProps['keyboardType'];
}) {
  return (
    <View style={{ marginTop: espacio.md }}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        style={[styles.input, multilinea && styles.inputMultilinea, Platform.OS === 'web' && SIN_RECUADRO_WEB]}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.textoTerciario}
        multiline={multilinea}
        keyboardType={teclado}
        autoCapitalize={capitalizar ? 'sentences' : 'none'}
        accessibilityLabel={etiqueta}
      />
    </View>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, activo && styles.chipActivo]}>
      <Text style={[styles.chipTexto, activo && { color: color.blanco }]}>{texto}</Text>
    </Pressable>
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
    gap: espacio.md,
    marginBottom: espacio.sm,
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
  fila: {
    flexDirection: 'row',
    gap: espacio.sm,
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textoSecundario,
    marginBottom: 6,
    marginTop: espacio.md,
  },
  input: {
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: 'rgba(118,86,111,0.45)',
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: 12,
    fontSize: 15,
    color: color.textoPrimario,
  },
  inputMultilinea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.sm,
  },
  chip: {
    paddingHorizontal: espacio.md,
    paddingVertical: 8,
    borderRadius: radio.pill,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
  },
  chipActivo: {
    backgroundColor: color.violetaVivo,
    borderColor: color.violetaVivo,
  },
  chipTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textoSecundario,
  },
  seccionOpcional: {
    marginTop: espacio.xl,
    fontSize: 12,
    fontWeight: '700',
    color: color.textoTerciario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  botonGuardar: {
    marginTop: espacio.xl,
    height: 52,
    borderRadius: radio.lg,
    backgroundColor: color.violetaVivo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCancelar: {
    marginTop: espacio.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCancelarTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textoTerciario,
  },
});
