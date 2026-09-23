import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { color, degrade, espacio, radio, sombra, tipografia } from './theme';
import EncabezadoApp from './EncabezadoApp';
import { Seccion, TarjetaFila } from './ComponentesUI';

type Props = {
  // Placeholder hasta que exista login real — Lu/quien arme auth puede
  // pasarle el nombre del usuario logueado acá.
  nombreUsuario?: string;
  // La pestaña "Dashboard" tiene el resumen con gráficos y métricas — la
  // tarjeta principal de acá funciona como acceso directo a esa pantalla.
  onAbrirDashboard?: () => void;
  onAbrirCuenta?: () => void;
};

export default function PantallaInicio({ nombreUsuario = 'Emprendedor', onAbrirDashboard, onAbrirCuenta }: Props) {
  const [busqueda, setBusqueda] = useState('');

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <EncabezadoApp onAbrirCuenta={onAbrirCuenta} />

      {/* Hero */}
      <Pressable onPress={onAbrirDashboard}>
        <LinearGradient colors={degrade.hero} style={[styles.hero, sombra.tarjeta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroTexto}>
            <Text style={tipografia.h1}>
              Hola, <Text style={{ color: color.naranja }}>{nombreUsuario}</Text>
            </Text>
            <Text style={[tipografia.subtitulo, { marginTop: espacio.xs, maxWidth: 220 }]}>
              Convertí tus ideas en oportunidades con análisis e inteligencia real.
            </Text>
            <View style={styles.heroLink}>
              <Text style={styles.heroLinkTexto}>Ver dashboard completo</Text>
              <Ionicons name="arrow-forward" size={13} color={color.naranja} />
            </View>
          </View>

          <View style={styles.heroIconoChip}>
            <Ionicons name="bar-chart" size={30} color={color.naranja} />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Herramientas rápidas */}
      <Seccion titulo="Herramientas rápidas" />
      <TarjetaFila
        icono="stats-chart-outline"
        acento={color.violetaVivo}
        titulo="Análisis de Mercado"
        subtitulo="Investigá, validá y descubrí oportunidades."
      />
      <TarjetaFila
        icono="logo-instagram"
        acento={color.violetaVivo}
        titulo="Análisis de Redes"
        subtitulo="Obtené ideas y métricas para crecer."
      />

      {/* Recursos (folios -> naranja) */}
      <Seccion titulo="Recursos" />
      <TarjetaFila
        icono="documents-outline"
        acento={color.naranja}
        titulo="Recursos"
        subtitulo="Archivos, imágenes y documentación."
        destacada
      />

      {/* Buscador */}
      <View style={styles.filaBuscador}>
        <View style={styles.buscador}>
          <Ionicons name="search-outline" size={18} color={color.textoTerciario} />
          <TextInput
            style={styles.buscadorInput}
            placeholder="Buscar..."
            placeholderTextColor={color.textoTerciario}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
        <Pressable style={styles.botonCuadrado}>
          <Ionicons name="options-outline" size={18} color={color.textoPrimario} />
        </Pressable>
        <Pressable style={styles.botonCuadrado}>
          <Ionicons name="trash-outline" size={18} color={color.textoPrimario} />
        </Pressable>
      </View>

      {/* Banner */}
      <LinearGradient colors={degrade.cta} style={[styles.banner, sombra.tarjeta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flex: 1 }}>
          <Text style={[tipografia.h2, { color: color.blanco }]}>Del análisis a resultados reales</Text>
          <Text style={[tipografia.subtitulo, { color: 'rgba(255,255,255,0.85)', marginTop: 4 }]}>
            Herramientas y datos para que tus ideas lleguen más lejos.
          </Text>
        </View>
        <Ionicons name="locate-outline" size={34} color="rgba(255,255,255,0.9)" />
      </LinearGradient>
      <View style={styles.puntos}>
        <View style={[styles.punto, styles.puntoActivo]} />
        <View style={styles.punto} />
        <View style={styles.punto} />
      </View>
    </ScrollView>
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
  hero: {
    marginTop: espacio.lg,
    borderRadius: radio.xl,
    padding: espacio.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroTexto: {
    flex: 1,
    paddingRight: espacio.md,
  },
  heroLink: {
    marginTop: espacio.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLinkTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: color.naranja,
  },
  heroIconoChip: {
    width: 64,
    height: 64,
    borderRadius: radio.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaBuscador: {
    marginTop: espacio.lg,
    flexDirection: 'row',
    gap: espacio.sm,
  },
  buscador: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.md,
  },
  buscadorInput: {
    flex: 1,
    paddingVertical: 12,
    color: color.textoPrimario,
    fontSize: 14,
  },
  botonCuadrado: {
    width: 44,
    height: 44,
    borderRadius: radio.lg,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginTop: espacio.lg,
    borderRadius: radio.xl,
    padding: espacio.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
  },
  puntos: {
    marginTop: espacio.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: radio.pill,
    backgroundColor: color.borde,
  },
  puntoActivo: {
    width: 16,
    backgroundColor: color.naranja,
  },
});
