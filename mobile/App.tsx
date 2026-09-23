import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PantallaCuenta from './src/PantallaCuenta';
import PantallaLogin from './src/PantallaLogin';
import PantallaRegistro from './src/PantallaRegistro';
import PantallaPaywall from './src/PantallaPaywall';
import PantallaOnboarding from './src/PantallaOnboarding';
import { activarPlanPro, cerrarSesionEnServidor, Sesion } from './src/api';
import PantallaInicio from './src/PantallaInicio';
import PantallaDashboard from './src/PantallaDashboard';
import PantallaProyectos from './src/PantallaProyectos';
import PantallaPreguntarIA from './src/PantallaPreguntarIA';
import { color, espacio, radio, tipografia } from './src/theme';

type Pestania = 'inicio' | 'dashboard' | 'proyectos' | 'ia';

const TABS: { id: Pestania; etiqueta: string; icono: keyof typeof Ionicons.glyphMap; acento: string }[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'home-outline', acento: color.violetaVivo },
  { id: 'dashboard', etiqueta: 'Dashboard', icono: 'stats-chart-outline', acento: color.violetaVivo },
  { id: 'proyectos', etiqueta: 'Proyectos', icono: 'folder-outline', acento: color.naranja },
  { id: 'ia', etiqueta: 'IA', icono: 'sparkles-outline', acento: color.violetaVivo },
];

// Raíz: mientras no haya sesión se muestran login/registro. La sesión vive
// solo en memoria (MVP): cada vez que se abre la app hay que iniciar sesión
// una vez, y después no se vuelve a pedir hasta cerrar sesión.
export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [vistaAuth, setVistaAuth] = useState<'login' | 'registro'>('login');
  // Solo quien se acaba de registrar pasa por el onboarding (una vez).
  const [recienRegistrado, setRecienRegistrado] = useState(false);

  if (!sesion) {
    return (
      <View style={styles.container}>
        {vistaAuth === 'login' ? (
          <PantallaLogin
            onSesionIniciada={(s) => {
              setRecienRegistrado(false);
              setSesion(s);
            }} onIrARegistro={() => setVistaAuth('registro')}
          />
        ) : (
          <PantallaRegistro
            onSesionIniciada={(s) => {
              setRecienRegistrado(true);
              setSesion(s);
            }}
            onIrALogin={() => setVistaAuth('login')}
          />
        )}
        <StatusBar style="light" />
      </View>
    );
  }

  const cerrarSesion = () => {
    cerrarSesionEnServidor(sesion.accessToken);
    setVistaAuth('login');
    setRecienRegistrado(false);
    setSesion(null);
  };

  const suscribirse = async () => {
    setSesion(await activarPlanPro(sesion.accessToken));
  };

  return (
    <AppPrincipal
      sesion={sesion}
      mostrarOnboarding={recienRegistrado}
      onCerrarSesion={cerrarSesion}
      onSuscribirse={suscribirse}
    />
  );
}

function AppPrincipal({
  sesion,
  mostrarOnboarding,
  onCerrarSesion,
  onSuscribirse,
}: {
  sesion: Sesion;
  mostrarOnboarding: boolean;
  onCerrarSesion: () => void;
  onSuscribirse: () => Promise<void>;
}) {
  const [pestania, setPestania] = useState<Pestania>('inicio');
  // Registro -> onboarding -> paywall -> app.
  const [enOnboarding, setEnOnboarding] = useState(mostrarOnboarding);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  // Proyecto cuyo dashboard se está viendo (cada proyecto tiene el suyo).
  const [proyectoActivoId, setProyectoActivoId] = useState<string | null>(null);
  // El paywall se muestra apenas se entra a la app (registro o login) si el
  // plan es gratuito, o cuando el usuario toca "Cambiar plan" en Mi cuenta.
  const [paywallAbierto, setPaywallAbierto] = useState(sesion.plan.id === 'free');
  const primerNombre = sesion.usuario.nombre.split(' ')[0] || 'Emprendedor';

  useEffect(() => {
    if (!cuentaAbierta && !paywallAbierto) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (paywallAbierto) setPaywallAbierto(false);
      else setCuentaAbierta(false);
      return true;
    });
    return () => sub.remove();
  }, [cuentaAbierta, paywallAbierto]);

  if (enOnboarding) {
    return (
      <View style={styles.container}>
        <PantallaOnboarding
          sesion={sesion}
          onFinalizar={(id) => {
            setProyectoActivoId(id);
            setEnOnboarding(false);
          }}
        />
        <StatusBar style="light" />
      </View>
    );
  }

  if (paywallAbierto) {
    return (
      <View style={styles.container}>
        <PantallaPaywall sesion={sesion} onCerrar={() => setPaywallAbierto(false)} onSuscribirse={onSuscribirse} />
        <StatusBar style="light" />
      </View>
    );
  }

  // "Mi cuenta" es pantalla completa (sin barra de pestañas), se abre desde
  // el botón de usuario del header.
  if (cuentaAbierta) {
    return (
      <View style={styles.container}>
        <PantallaCuenta
          sesion={sesion}
          onVolver={() => setCuentaAbierta(false)}
          onCerrarSesion={onCerrarSesion}
          onCambiarPlan={() => setPaywallAbierto(true)}
        />
        <StatusBar style="light" />
      </View>
    );
  }

  const abrirCuenta = () => setCuentaAbierta(true);

  return (
    <View style={styles.container}>
      <View style={styles.contenido}>
        {pestania === 'inicio' && (
          <PantallaInicio
            nombreUsuario={primerNombre}
            onAbrirDashboard={() => setPestania('dashboard')}
            onAbrirCuenta={abrirCuenta}
          />
        )}
        {pestania === 'dashboard' && (
          <PantallaDashboard
            sesion={sesion}
            proyectoId={proyectoActivoId}
            onCambiarProyecto={setProyectoActivoId}
            onAbrirCuenta={abrirCuenta}
            onVerPlanes={() => setPaywallAbierto(true)}
            onIrAProyectos={() => setPestania('proyectos')}
          />
        )}
        {pestania === 'proyectos' && (
          <PantallaProyectos
            sesion={sesion}
            onVerPlanes={() => setPaywallAbierto(true)}
            onVerDashboard={(id) => {
              setProyectoActivoId(id);
              setPestania('dashboard');
            }}
          />
        )}
        {pestania === 'ia' && <PantallaPreguntarIA />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const activa = tab.id === pestania;
          return (
            <Pressable key={tab.id} style={styles.tab} onPress={() => setPestania(tab.id)}>
              <View style={[styles.tabIconoChip, activa && { backgroundColor: `${tab.acento}33` }]}>
                <Ionicons name={tab.icono} size={22} color={activa ? tab.acento : color.textoTerciario} />
              </View>
              <Text style={[tipografia.chico, activa && { color: tab.acento, fontWeight: '700' }]}>
                {tab.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.sm,
    paddingBottom: espacio.lg,
    gap: espacio.sm,
    backgroundColor: color.fondo,
    borderTopWidth: 1,
    borderTopColor: color.borde,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: espacio.sm,
    borderRadius: radio.lg,
  },
  tabIconoChip: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
