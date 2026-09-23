import { ReactNode, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { color, degrade, espacio, radio, sombra, tipografia } from './theme';

// Piezas compartidas por las pantallas de Iniciar sesión y Registrarse.

// En web el input muestra un recuadro de foco del navegador que pisa el diseño.
const SIN_RECUADRO_WEB = { outlineStyle: 'none' } as any;

export function FondoAuth({ children }: { children: ReactNode }) {
  return (
    <View style={styles.fondo}>
      {/* Formas decorativas (círculos difusos) como en el mockup */}
      <View style={[styles.forma, styles.formaArriba]} />
      <View style={[styles.forma, styles.formaAbajo]} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function LogoGrande() {
  return (
    <View style={styles.logoBloque}>
      <View style={styles.logoFila}>
        <Text style={styles.logoEm}>Em</Text>
        <Text style={styles.logoPrendex}>Prendex</Text>
        <Ionicons name="trending-up" size={30} color={color.naranja} style={{ marginLeft: 2 }} />
      </View>
      <Text style={[tipografia.subtitulo, { color: color.violetaMalva }]}>Ideas hoy, proyectos mañana</Text>
    </View>
  );
}

type CampoProps = TextInputProps & {
  icono: keyof typeof Ionicons.glyphMap;
  esPassword?: boolean;
};

export function CampoTexto({ icono, esPassword, style, ...resto }: CampoProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.campo}>
      <View style={styles.campoIcono}>
        <Ionicons name={icono} size={20} color={color.violetaMalva} />
      </View>
      <TextInput
        {...resto}
        style={[styles.campoInput, Platform.OS === 'web' && SIN_RECUADRO_WEB, style]}
        placeholderTextColor={color.textoTerciario}
        secureTextEntry={esPassword && !visible}
        autoCapitalize={resto.autoCapitalize ?? 'none'}
      />
      {esPassword && (
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityLabel="Mostrar u ocultar contraseña">
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={color.violetaMalva} />
        </Pressable>
      )}
    </View>
  );
}

export function BotonPrincipal({
  texto,
  onPress,
  cargando,
}: {
  texto: string;
  onPress: () => void;
  cargando?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={cargando} style={({ pressed }) => (pressed || cargando) && { opacity: 0.75 }}>
      <LinearGradient colors={degrade.acceso} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.botonPrincipal, sombra.tarjeta]}>
        {cargando ? (
          <ActivityIndicator color={color.blanco} />
        ) : (
          <>
            <Text style={styles.botonPrincipalTexto}>{texto}</Text>
            <Ionicons name="arrow-forward" size={22} color={color.blanco} style={styles.botonPrincipalFlecha} />
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle-outline" size={18} color={color.peligro} />
      <Text style={styles.errorTexto}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: color.fondo,
    overflow: 'hidden',
  },
  forma: {
    position: 'absolute',
    borderRadius: radio.pill,
  },
  formaArriba: {
    width: 320,
    height: 320,
    top: -160,
    left: -110,
    backgroundColor: 'rgba(111,58,134,0.28)',
  },
  formaAbajo: {
    width: 360,
    height: 360,
    bottom: -190,
    right: -120,
    backgroundColor: 'rgba(217,120,69,0.18)',
  },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espacio.xl,
    paddingVertical: espacio.xxl,
  },
  logoBloque: {
    alignItems: 'center',
    marginBottom: espacio.xl,
  },
  logoFila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoEm: {
    fontSize: 42,
    fontWeight: '800',
    color: color.textoPrimario,
  },
  logoPrendex: {
    fontSize: 42,
    fontWeight: '800',
    color: color.naranja,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: 'rgba(118,86,111,0.45)',
    borderRadius: radio.lg,
    paddingHorizontal: espacio.md,
    height: 54,
  },
  campoIcono: {
    width: 32,
    height: 32,
    borderRadius: radio.sm,
    backgroundColor: 'rgba(111,58,134,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campoInput: {
    flex: 1,
    fontSize: 15,
    color: color.textoPrimario,
    height: '100%',
  },
  botonPrincipal: {
    height: 54,
    borderRadius: radio.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  botonPrincipalTexto: {
    fontSize: 17,
    fontWeight: '700',
    color: color.blanco,
  },
  botonPrincipalFlecha: {
    position: 'absolute',
    right: espacio.lg,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: 'rgba(200,90,90,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,90,90,0.5)',
    borderRadius: radio.md,
    padding: espacio.md,
  },
  errorTexto: {
    flex: 1,
    fontSize: 13,
    color: color.peligro,
  },
});
