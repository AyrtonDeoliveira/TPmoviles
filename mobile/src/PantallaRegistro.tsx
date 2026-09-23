import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, espacio, radio, tipografia } from './theme';
import { ApiError, registrarUsuario, Sesion } from './api';
import { BotonPrincipal, CampoTexto, FondoAuth, LogoGrande, MensajeError } from './ComponentesAuth';

type Props = {
  onSesionIniciada: (sesion: Sesion) => void;
  onIrALogin: () => void;
};

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PantallaRegistro({ onSesionIniciada, onIrALogin }: Props) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Las mismas reglas que valida el backend, para avisar antes de pegarle.
  const validar = (): string | null => {
    if (!nombre.trim()) return 'Ingresá tu nombre.';
    if (!RE_EMAIL.test(email.trim())) return 'El correo no tiene un formato válido.';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirmacion) return 'Las contraseñas no coinciden.';
    return null;
  };

  const registrarse = async () => {
    if (cargando) return;
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      onSesionIniciada(await registrarUsuario(nombre.trim(), email.trim(), password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.');
      setCargando(false);
    }
  };

  return (
    <FondoAuth>
      <Pressable style={styles.botonVolver} onPress={onIrALogin} accessibilityLabel="Volver a iniciar sesión">
        <Ionicons name="arrow-back" size={22} color={color.textoPrimario} />
      </Pressable>

      <LogoGrande />

      <Text style={[tipografia.h1, styles.titulo]}>
        Creá tu <Text style={{ color: color.naranja }}>cuenta</Text>
      </Text>
      <Text style={[tipografia.subtitulo, styles.subtitulo]}>Empezá a convertir tus ideas en proyectos.</Text>

      <View style={styles.formulario}>
        <CampoTexto
          icono="person-outline"
          placeholder="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
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
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          esPassword
          autoComplete="new-password"
          returnKeyType="next"
        />
        <CampoTexto
          icono="shield-checkmark-outline"
          placeholder="Repetí la contraseña"
          value={confirmacion}
          onChangeText={setConfirmacion}
          esPassword
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={registrarse}
        />

        <MensajeError mensaje={error} />

        <BotonPrincipal texto="Crear cuenta" onPress={registrarse} cargando={cargando} />
      </View>

      <View style={styles.pie}>
        <Text style={tipografia.subtitulo}>¿Ya tenés una cuenta? </Text>
        <Pressable onPress={onIrALogin} hitSlop={8}>
          <Text style={styles.link}>Iniciá sesión</Text>
        </Pressable>
      </View>
    </FondoAuth>
  );
}

const styles = StyleSheet.create({
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: color.borde,
    backgroundColor: color.fondoSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.lg,
  },
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
