import React, { useRef, useEffect, useState } from "react";
import { PracticalItem } from "../../types";

interface Props {
  practical: PracticalItem;
  controlValues: Record<string, number>;
  onControlChange: (id: string, val: number) => void;
  onRecordReading?: () => void;
}

export const HeatThermalSim: React.FC<Props> = ({
  practical,
  controlValues,
  onControlChange,
  onRecordReading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const smoothTempRef = useRef<number>(55);
  const [isHeating, setIsHeating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const isCharles = practical.id === "prac-23";
  const isCooling = practical.id === "prac-26";
  const isSearle = practical.id === "prac-30";
  const isDewPoint = practical.id === "prac-29";

  // Controls
  const tempC = controlValues["bathTemperature"] ?? (controlValues["waterTemp"] ?? (controlValues["coolTemp"] ?? 55));
  const iceMassG = controlValues["iceMass"] ?? 14.5;

  useEffect(() => {
    let lastStamp = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastStamp) / 1000);
      lastStamp = now;
      timeRef.current += dt;
      const t = timeRef.current;

      smoothTempRef.current += (tempC - smoothTempRef.current) * Math.min(1, dt * 10);
      const activeTempC = smoothTempRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark sleek thermal laboratory background
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#100e17");
      bg.addColorStop(1, "#07060a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;

      if (isCharles) {
        // --- 23. CHARLES'S LAW SIMULATION ---
        const T_Kelvin = activeTempC + 273.15;
        const colLengthMm = 65 * (T_Kelvin / 273.15); // mm

        const tubeX = centerX - 25;
        const tubeY = 60;
        const tubeW = 50;
        const tubeH = 220;

        // Water bath beaker
        ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
        ctx.fillRect(centerX - 100, 80, 200, 200);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - 100, 80, 200, 200);

        // Live rising thermal convection bubbles in water
        if (isHeating && activeTempC > 40) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          for (let b = 0; b < 12; b++) {
            const bx = centerX - 80 + ((b * 47 + t * 20) % 160);
            const by = 260 - ((t * 60 + b * 25) % 170);
            ctx.beginPath();
            ctx.arc(bx, by, 2 + (b % 3), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Capillary Quill Tube inside water bath
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(tubeX, tubeY, tubeW, tubeH);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.strokeRect(tubeX, tubeY, tubeW, tubeH);

        // Trapped Air Column (Dry air)
        const airHeightPx = colLengthMm * 2.2;
        const airTopY = tubeY + tubeH - airHeightPx;

        ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
        ctx.fillRect(tubeX + 3, airTopY, tubeW - 6, airHeightPx - 2);

        // Index Mercury Pellet sealing the air with metallic sheen
        const mercGrad = ctx.createLinearGradient(tubeX, airTopY - 22, tubeX + tubeW, airTopY);
        mercGrad.addColorStop(0, "#94a3b8");
        mercGrad.addColorStop(0.5, "#f1f5f9");
        mercGrad.addColorStop(1, "#64748b");
        ctx.fillStyle = mercGrad;
        ctx.fillRect(tubeX + 3, airTopY - 22, tubeW - 6, 22);
        ctx.strokeStyle = "#475569";
        ctx.strokeRect(tubeX + 3, airTopY - 22, tubeW - 6, 22);

        // Thermometer in water bath with fluid meniscus
        const thermX = centerX + 50;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(thermX, 50, 10, 210);
        const mercuryH = (activeTempC / 100) * 160;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(thermX + 2, 260 - mercuryH, 6, mercuryH);
        ctx.beginPath();
        ctx.arc(thermX + 5, 265, 10, 0, Math.PI * 2);
        ctx.fill();

        // Bunsen Burner flame beneath beaker
        if (isHeating) {
          const flameX = centerX;
          const flameY = 320;
          const flicker = Math.sin(t * 20) * 6 + Math.cos(t * 33) * 4;

          // Outer yellow/orange flame
          ctx.fillStyle = "rgba(249, 115, 22, 0.85)";
          ctx.beginPath();
          ctx.moveTo(flameX - 18, flameY);
          ctx.quadraticCurveTo(flameX, flameY - 45 - flicker, flameX + 18, flameY);
          ctx.closePath();
          ctx.fill();

          // Inner hot blue core
          ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
          ctx.beginPath();
          ctx.moveTo(flameX - 9, flameY);
          ctx.quadraticCurveTo(flameX, flameY - 28 - flicker * 0.5, flameX + 9, flameY);
          ctx.closePath();
          ctx.fill();

          // Rising warm steam above beaker
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          for (let s = 0; s < 5; s++) {
            const sx = centerX - 60 + s * 30 + Math.sin(t * 3 + s) * 10;
            const sy = 70 - ((t * 30 + s * 15) % 50);
            ctx.beginPath();
            ctx.arc(sx, sy, 8 + (s % 4) * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // HUD
        ctx.fillStyle = "#f8fafc";
        ctx.font = "14px 'JetBrains Mono', monospace";
        ctx.fillText(`Water Bath Temperature (θ): ${activeTempC.toFixed(1)} °C`, 24, 30);
        ctx.fillText(`Absolute Temperature (T): ${T_Kelvin.toFixed(2)} K`, 24, 52);
        ctx.fillText(`Trapped Air Column Length (L): ${colLengthMm.toFixed(1)} mm`, 24, 74);
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 15px 'JetBrains Mono', monospace";
        ctx.fillText(`L / T = ${(colLengthMm / T_Kelvin).toFixed(4)} mm/K (Constant) | Extrapolated Absolute Zero: -273.15 °C`, 24, 102);

      } else if (isDewPoint) {
        // --- 29. RECOLLECTION OF DEW POINT ---
        const calX = centerX - 60;
        const calY = 100;
        const calW = 120;
        const calH = 150;

        const dewPointTemp = 16.5; // °C
        const isDryingDew = activeTempC <= dewPointTemp;

        // Polished silvered brass cylinder
        const cylGrad = ctx.createLinearGradient(calX, calY, calX + calW, calY);
        cylGrad.addColorStop(0, isDryingDew ? "#64748b" : "#f1f5f9");
        cylGrad.addColorStop(0.5, isDryingDew ? "#94a3b8" : "#ffffff");
        cylGrad.addColorStop(1, isDryingDew ? "#64748b" : "#cbd5e1");
        ctx.fillStyle = cylGrad;
        ctx.fillRect(calX, calY, calW, calH);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3;
        ctx.strokeRect(calX, calY, calW, calH);

        // Condensed mist droplets if at or below dew point with live shimmer
        if (isDryingDew) {
          const dewShimmer = Math.sin(t * 3) * 0.15;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.75 + dewShimmer})`;
          for (let i = 0; i < 30; i++) {
            const dx = calX + 10 + ((i * 19) % (calW - 20));
            const dy = calY + 15 + ((i * 27) % (calH - 30));
            ctx.beginPath();
            ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
          ctx.fillText("💧 DEW FORMED ON SILVER SURFACE", calX - 55, calY - 20);
        } else {
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
          ctx.fillText("✨ Polished Mirror Surface Clear", calX - 45, calY - 20);
        }

        // Air aspiration tube
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(calX + calW / 2, 40);
        ctx.lineTo(calX + calW / 2, calY + calH - 30);
        ctx.stroke();

        // HUD
        ctx.fillStyle = "#f8fafc";
        ctx.font = "14px 'JetBrains Mono', monospace";
        ctx.fillText(`Calorimeter Temperature (θ): ${activeTempC.toFixed(1)} °C`, 24, 30);
        ctx.fillText(`Room Ambient Temperature: 28.0 °C`, 24, 52);
        ctx.fillText(`SVP of Water at Dew Point (16.5°C): 14.1 mmHg`, 24, 74);
        ctx.fillText(`SVP of Water at Ambient (28.0°C): 28.3 mmHg`, 24, 96);
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 15px 'JetBrains Mono', monospace";
        ctx.fillText(`Relative Humidity = (14.1 / 28.3) × 100% = 49.8%`, 24, 122);

      } else {
        // --- CALORIMETRY & SPECIFIC / LATENT HEAT ---
        const calX = centerX - 70;
        const calY = 110;
        const calW = 140;
        const calH = 150;

        // Copper Calorimeter with metallic copper gradient
        const copGrad = ctx.createLinearGradient(calX, calY, calX + calW, calY);
        copGrad.addColorStop(0, "#9a3412");
        copGrad.addColorStop(0.5, "#d97706");
        copGrad.addColorStop(1, "#78350f");
        ctx.fillStyle = copGrad;
        ctx.fillRect(calX, calY, calW, calH);
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 3;
        ctx.strokeRect(calX, calY, calW, calH);

        // Water content with live wave ripple
        const waterWave = Math.sin(t * 3) * 2;
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        ctx.fillRect(calX + 4, calY + 30 + waterWave, calW - 8, calH - 34 - waterWave);

        // Floating Ice cubes gently bobbing
        const iceBob = Math.sin(t * 2.5) * 2;
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.fillRect(calX + 35, calY + 35 + iceBob, 22, 20);
        ctx.fillRect(calX + 75, calY + 40 - iceBob, 20, 18);

        // Live Copper Wire Stirrer loop moving gently
        const stirrerOffset = Math.sin(t * 4) * 8;
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(calX + 25, 60 + stirrerOffset);
        ctx.lineTo(calX + 25, calY + calH - 20 + stirrerOffset);
        ctx.lineTo(calX + calW - 25, calY + calH - 20 + stirrerOffset);
        ctx.lineTo(calX + calW - 25, 60 + stirrerOffset);
        ctx.stroke();

        // Sensitive 0.1°C Thermometer
        const thermX = calX + calW / 2;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(thermX - 4, 45, 8, 170);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(thermX - 2, 200 - activeTempC * 1.4, 4, activeTempC * 1.4);

        // HUD
        ctx.fillStyle = "#f8fafc";
        ctx.font = "14px 'JetBrains Mono', monospace";
        ctx.fillText(`Water & Calorimeter Temp: ${activeTempC.toFixed(1)} °C`, 24, 30);
        ctx.fillText(`Mass of Dry Ice Added: ${iceMassG.toFixed(1)} g`, 24, 52);
        ctx.fillText(`Water Mass: 120.0 g | Copper Calorimeter: 65.0 g`, 24, 74);
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 15px 'JetBrains Mono', monospace";
        ctx.fillText(`Latent Heat of Fusion L_f = 3.34 × 10⁵ J/kg (80 cal/g)`, 24, 102);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isCharles, isDewPoint, tempC, iceMassG, isHeating]);

  // Mouse drag handler on canvas
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    const t = 5 + ratio * 90;
    onControlChange("bathTemperature", Number(t.toFixed(1)));
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/70 shadow-2xl backdrop-blur-md">
        <canvas
          ref={canvasRef}
          width={760}
          height={380}
          className="w-full h-auto cursor-ew-resize select-none touch-none block"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        />
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/70 text-[11px] font-mono text-cyan-400 backdrop-blur-md pointer-events-none flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Drag horizontally to adjust temperature
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCharles && (
            <button
              onClick={() => setIsHeating(!isHeating)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-200 transition-all flex items-center gap-1.5"
            >
              🔥 Flame: {isHeating ? "ON" : "OFF"}
            </button>
          )}
          {isDewPoint && (
            <button
              onClick={() => onControlChange("bathTemperature", 16.5)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/60 text-xs font-medium text-cyan-300 transition-all flex items-center gap-1.5"
            >
              🎯 Set to Exact Dew Point (16.5°C)
            </button>
          )}
        </div>

        {onRecordReading && (
          <button
            onClick={onRecordReading}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <span className="text-sm">+</span> Record Reading
          </button>
        )}
      </div>
    </div>
  );
};
