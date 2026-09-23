import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, tipografia } from './theme';

// Encabezado de sección reutilizado por Inicio y Dashboard ("Herramientas
// rápidas", "Recursos", "Proyectos recientes", etc.).
export function Seccion({ titulo }: { titulo: string }) {
  return (
    <View style={styles.seccionHeader}>
      <Text style={tipografia.h2}>{titulo}</Text>
      <Pressable style={styles.verTodas}>
        <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>Ver todas</Text>
        <Ionicons name="chevron-forward" size={14} color={color.violetaMalva} />
      </Pressable>
    </View>
  );
}

// Tarjeta de fila genérica: ícono + título + subtítulo + flecha. Sirve para
// herramientas, recursos y proyectos — solo cambian los datos.
export function TarjetaFila({
  icono,
  acento,
  titulo,
  subtitulo,
  destacada,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  acento: string;
  titulo: string;
  subtitulo: string;
  destacada?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tarjeta,
        destacada && { borderColor: acento, backgroundColor: `${acento}1A` },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.tarjetaIconoChip, { backgroundColor: `${acento}33` }]}>
        <Ionicons name={icono} size={20} color={acento} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tipografia.h2}>{titulo}</Text>
        <Text style={tipografia.subtitulo}>{subtitulo}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color.textoTerciario} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seccionHeader: {
    marginTop: espacio.xl,
    marginBottom: espacio.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verTodas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
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
  tarjetaIconoChip: {
    width: 44,
    height: 44,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
