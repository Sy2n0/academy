import React from 'react';

type HexagonProps = {
  color?: string;
  size?: number;
  style?: React.CSSProperties;
  fillOpacity?: number;
};

export function Hexagon({
  color = '#23272e',
  size = 100,
  style,
  fillOpacity = 0.98,
}: HexagonProps) {
  // 정육각형 꼭짓점 계산 (중심 (24,24), 반지름 24) - 인접 헥사곤이 면끼리 맞닿도록
  const r = 24;
  const cx = 24;
  const cy = 24;
  const points = Array.from({ length: 6 })
    .map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={style}
    >
      <polygon
        points={points}
        fill={color || 'hsl(var(--sidebar-background) / 0.85)'}
        stroke="hsl(var(--sidebar-border))"
        strokeWidth="1.5"
        opacity={fillOpacity}
      />
    </svg>
  );
}

export default Hexagon;
