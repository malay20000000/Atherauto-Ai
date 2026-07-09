import React from 'react';

export default function Gauge({ 
  value, 
  color = "#10b981", 
  showLabels = false, 
  min = "", 
  max = "" 
}: { 
  value: number; 
  color?: string; 
  showLabels?: boolean; 
  min?: string; 
  max?: string; 
}) {
  const radius = 80;
  const center = 100;
  const totalTicks = 40;
  
  // Calculate how many ticks should be active
  const activeCount = Math.round((value / 100) * totalTicks);
  
  // Generate tick marks
  const ticks = Array.from({ length: totalTicks }).map((_, i) => {
    // Angle spans from Math.PI (left) to 2 * Math.PI (right)
    const angle = Math.PI + (i / (totalTicks - 1)) * Math.PI;
    const isTickActive = i < activeCount;
    
    // Outer and inner points for the tick line
    const x1 = Number((center + radius * Math.cos(angle)).toFixed(2));
    const y1 = Number((center + radius * Math.sin(angle)).toFixed(2));
    
    // The tick is 10 units long
    const x2 = Number((center + (radius - 10) * Math.cos(angle)).toFixed(2));
    const y2 = Number((center + (radius - 10) * Math.sin(angle)).toFixed(2));
    
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isTickActive ? color : "#d4d4d8"}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className="flex flex-col items-center max-w-[260px] w-full mx-auto">
      <svg viewBox="0 0 200 120" className="w-full">
        {ticks}
        <text 
          x={center} 
          y={105} 
          textAnchor="middle" 
          fontSize={22} 
          fontWeight={600}
          fill="#1e293b"
        >
          {value}%
        </text>
      </svg>
      {showLabels && (
        <div className="w-full flex justify-between text-[11px] text-neutral-500 font-medium px-4 -mt-2">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}
