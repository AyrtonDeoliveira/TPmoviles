import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { color, espacio, radio, tipografia } from './theme';

export type PuntoGrafico = { valor: number; etiqueta: string };

type Props = {
  // Al menos 2 puntos, ordenados de más viejo a más nuevo.
  puntos: PuntoGrafico[];
  formatoValor: (valor: number) => string;
  colorLinea?: string;
  alto?: number;
};

// Curva suave uniendo los puntos con bezier cuadráticas entre puntos medios.
function armarPaths(puntos: { x: number; y: number }[], alto: number) {
  let linea = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    linea += ` Q ${a.x} ${a.y} ${mx} ${my} Q ${mx} ${my} ${b.x} ${b.y}`;
  }
  const ultimo = puntos[puntos.length - 1];
  const area = `${linea} L ${ultimo.x} ${alto} L ${puntos[0].x} ${alto} Z`;
  return { linea, area };
}

// Índices repartidos parejo para las etiquetas del eje (máx. 5).
function indicesEje(n: number) {
  const cuantos = Math.min(5, n);
  return Array.from(new Set(Array.from({ length: cuantos }, (_, i) => Math.round((i * (n - 1)) / (cuantos - 1)))));
}

export default function GraficoArea({ puntos, formatoValor, colorLinea = color.naranja, alto = 150 }: Props) {
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState(puntos.length - 1);

  const padY = 12;
  const valores = puntos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const padX = 8;
  const coords = puntos.map((p, i) => ({
    x: ancho <= 0 ? 0 : padX + (i / (puntos.length - 1)) * (ancho - padX * 2),
    y: alto - padY - ((p.valor - min) / rango) * (alto - padY * 2),
  }));

  const puntoActivo = coords[activo];
  const datoActivo = puntos[activo];
  const { linea, area } = ancho > 0 ? armarPaths(coords, alto) : { linea: '', area: '' };

  return (
    <View>
      {puntoActivo && datoActivo && ancho > 0 && (
        <View style={[styles.tooltip, { left: Math.max(0, Math.min(puntoActivo.x - 55, ancho - 110)) }]}>
          <Text style={styles.tooltipValor}>{formatoValor(datoActivo.valor)}</Text>
          <Text style={styles.tooltipFecha}>{datoActivo.etiqueta}</Text>
        </View>
      )}

      <View style={{ height: alto, marginTop: 34 }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            <Defs>
              <LinearGradient id="rellenoArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colorLinea} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colorLinea} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {[0.25, 0.5, 0.75].map((frac) => (
              <Line key={frac} x1={0} x2={ancho} y1={alto * frac} y2={alto * frac} stroke={color.borde} strokeWidth={1} />
            ))}

            <Path d={area} fill="url(#rellenoArea)" />
            <Path d={linea} stroke={colorLinea} strokeWidth={2.5} fill="none" />

            {coords.map((c, i) => (
              <Circle key={`p${i}`} cx={c.x} cy={c.y} r={i === activo ? 5 : 3} fill={i === activo ? color.fondo : colorLinea} stroke={colorLinea} strokeWidth={2} />
            ))}
            {/* Zonas táctiles más grandes que los puntos */}
            {coords.map((c, i) => (
              <Circle key={`t${i}`} cx={c.x} cy={c.y} r={16} fill="transparent" onPress={() => setActivo(i)} />
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.filaEjes}>
        {indicesEje(puntos.length).map((i) => (
          <Text key={i} style={tipografia.chico}>
            {puntos[i].etiqueta}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = {
  tooltip: {
    position: 'absolute' as const,
    top: 0,
    zIndex: 2,
    backgroundColor: color.fondoSuave,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: radio.sm,
    paddingHorizontal: espacio.sm,
    paddingVertical: 4,
    minWidth: 110,
    alignItems: 'center' as const,
  },
  tooltipValor: { fontSize: 12, fontWeight: '700' as const, color: color.textoPrimario },
  tooltipFecha: { fontSize: 10, color: color.textoTerciario, marginTop: 1 },
  filaEjes: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: espacio.xs,
  },
};
