import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, tipografia } from './theme';
import { ApiError, iniciarSesion, Sesion } from './api';
import { BotonPrincipal, CampoTexto, FondoAuth, LogoGrande, MensajeError } from './ComponentesAuth';

type Props = {
  onSesionIniciada: (sesion: Sesion) => void;
  onIrARegistro: () => void;
};

export default function PantallaLogin({ onSesionIniciada, onIrARegistro }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    if (cargando) return;
    if (!email.trim() || !password) {
      setError('Ingresá tu correo y tu contraseña.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      onSesionIniciada(await iniciarSesion(email.trim(), password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.');
      setCargando(false);
    }
  };

  return (
    <FondoAuth>
      <LogoGrande />

      <Text style={[tipografia.h1, styles.titulo]}>
        Bienvenido de <Text style={{ color: color.naranja }}>nuevo</Text>
      </Text>
      <Text style={[tipografia.subtitulo, styles.subtitulo]}>Iniciá sesión para continuar con tus proyectos.</Text>

      <View style={styles.formulario}>
        <CampoTexto
          icono="mail-outline"
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
        />
        <CampoTexto
          icono="lock-closed-outline"
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          esPassword
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={entrar}
        />

        <Pressable style={styles.olvide}>
          <Text style={styles.olvideTexto}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        <MensajeError mensaje={error} />

        <BotonPrincipal texto="Iniciar sesión" onPress={entrar} cargando={cargando} />
      </View>

      <View style={styles.separador}>
        <View style={styles.linea} />
        <Text style={tipografia.subtitulo}>o</Text>
        <View style={styles.linea} />
      </View>

      {/* Sin función por ahora (MVP) */}
      <View style={styles.filaSocial}>
        <Pressable style={styles.botonSocial}>
          <Ionicons name="logo-google" size={20} color={color.textoPrimario} />
          <Text style={styles.botonSocialTexto}>Continuar con Google</Text>
        </Pressable>
        <Pressable style={styles.botonSocial}>
          <Ionicons name="logo-apple" size={22} color={color.textoPrimario} />
          <Text style={styles.botonSocialTexto}>Continuar con Apple</Text>
        </Pressable>
      </View>

      <View style={styles.pie}>
        <Text style={tipografia.subtitulo}>¿No tenés una cuenta? </Text>
        <Pressable onPress={onIrARegistro} hitSlop={8}>
          <Text style={styles.link}>Registrate</Text>
        </Pressable>
      </View>
    </FondoAuth>
  );
}

const styles = StyleSheet.create({
  titulo: {
    textAlign: 'center',
    fontSize: 26,
    marginTop: espacio.md,
  },
  subtitulo: {
    textAlign: 'center',
    marginTop: espacio.xs,
    color: color.violetaMalva,
  },
  formulario: {
    marginTop: espacio.xl,
    gap: espacio.md,
  },
  olvide: {
    alignSelf: 'flex-end',
  },
  olvideTexto: {
    fontSize: 13,
    color: color.violetaMalva,
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginVertical: espacio.xl,
  },
  linea: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(118,86,111,0.5)',
  },
  filaSocial: {
    flexDirection: 'row',
    gap: espacio.md,
  },
  botonSocial: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    height: 50,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: 'rgba(118,86,111,0.45)',
    borderRadius: radio.lg,
    paddingHorizontal: espacio.sm,
  },
  botonSocialTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: color.textoPrimario,
    flexShrink: 1,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: espacio.xl,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    color: color.naranja,
  },
});
