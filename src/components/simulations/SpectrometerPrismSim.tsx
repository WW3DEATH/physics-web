import React, { useRef, useEffect, useState } from "react";
import { PracticalItem } from "../../types";

interface Props {
  practical: PracticalItem;
  controlValues: Record<string, number>;
  onControlChange: (id: string, val: number) => void;
  onRecordReading?: () => void;
}

export const SpectrometerPrismSim: React.FC<Props> = ({
  practical,
  controlValues,
  onControlChange,
  onRecordReading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const smoothAngleRef = useRef<number>(48.6);
  const [isDragging, setIsDragging] = useState(false);

  const isSpectrometer = practical.id === "prac-20";
  const isCriticalAngle = practical.id === "prac-19";

  // Angle of incidence in degrees
  const incidentAngleDeg = controlValues["incidentAngle"] ?? 48.6;
  const prismAngleA = 60; // Equilateral prism apex angle
  const refractiveIndexMu = 1.52; // Crown glass

  // Physics calculation
  const iRad = (incidentAngleDeg * Math.PI) / 180;
  // Snell's Law at face 1: sin(i) = mu * sin(r1) => r1 = asin(sin(i) / mu)
  const sinR1 = Math.sin(iRad) / refractiveIndexMu;
  const r1Rad = Math.asin(Math.min(1, Math.max(-1, sinR1)));
  const r1Deg = (r1Rad * 180) / Math.PI;

  // At face 2: r1 + r2 = A => r2 = A - r1
  const r2Deg = prismAngleA - r1Deg;
  const r2Rad = (r2Deg * Math.PI) / 180;

  // Critical angle for glass-air interface: sin(C) = 1 / mu
  const critAngleRad = Math.asin(1 / refractiveIndexMu);
  const critAngleDeg = (critAngleRad * 180) / Math.PI; // ~41.14 deg

  // Total internal reflection condition
  const isTIR = r2Deg > critAngleDeg;

  // Emergence angle e at face 2: mu * sin(r2) = sin(e)
  let eDeg = 0;
  let deviationDeg = 0;

  if (!isTIR) {
    const sinE = refractiveIndexMu * Math.sin(r2Rad);
    const eRad = Math.asin(Math.min(1, Math.max(-1, sinE)));
    eDeg = (eRad * 180) / Math.PI;
    // Deviation d = i + e - A
    deviationDeg = incidentAngleDeg + eDeg - prismAngleA;
  }

  useEffect(() => {
    let lastStamp = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastStamp) / 1000);
      lastStamp = now;
      timeRef.current += dt;
      const t = timeRef.current;

      smoothAngleRef.current += (incidentAngleDeg - smoothAngleRef.current) * Math.min(1, dt * 14);
      const activeAngle = smoothAngleRef.current;

      const activeIRad = (activeAngle * Math.PI) / 180;
      const actSinR1 = Math.sin(activeIRad) / refractiveIndexMu;
      const actR1Rad = Math.asin(Math.min(1, Math.max(-1, actSinR1)));
      const actR2Deg = prismAngleA - (actR1Rad * 180) / Math.PI;
      const actR2Rad = (actR2Deg * Math.PI) / 180;
      const actIsTIR = actR2Deg > critAngleDeg;
      let actEDeg = 0;
      let actDeviationDeg = 0;
      let actERad = 0;
      if (!actIsTIR) {
        const actSinE = refractiveIndexMu * Math.sin(actR2Rad);
        actERad = Math.asin(Math.min(1, Math.max(-1, actSinE)));
        actEDeg = (actERad * 180) / Math.PI;
        actDeviationDeg = activeAngle + actEDeg - prismAngleA;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark optical bench background
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#080c16");
      bg.addColorStop(1, "#03050a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Prism Apex A at top center
      const apexX = width / 2 - 40;
      const apexY = 100;
      const prismSide = 180;
      const baseHalf = prismSide * Math.sin((30 * Math.PI) / 180);
      const prismH = prismSide * Math.cos((30 * Math.PI) / 180);

      const cornerB_X = apexX - baseHalf;
      const cornerB_Y = apexY + prismH;
      const cornerC_X = apexX + baseHalf;
      const cornerC_Y = apexY + prismH;

      // Draw Glass Equilateral Prism with subtle internal shimmer
      const prismShimmer = Math.sin(t * 1.5) * 0.05;
      const prismGrad = ctx.createLinearGradient(apexX, apexY, apexX, cornerB_Y);
      prismGrad.addColorStop(0, `rgba(56, 189, 248, ${0.25 + prismShimmer})`);
      prismGrad.addColorStop(1, "rgba(14, 165, 233, 0.1)");
      ctx.fillStyle = prismGrad;
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(cornerB_X, cornerB_Y);
      ctx.lineTo(cornerC_X, cornerC_Y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Normal to left face AB
      const faceAngle = (60 * Math.PI) / 180;
      const incPointX = apexX - baseHalf * 0.45;
      const incPointY = apexY + prismH * 0.45;

      // Normal line to AB
      const normalLen = 60;
      const normalAngle = faceAngle - Math.PI / 2;
      const normX1 = incPointX - Math.cos(normalAngle) * normalLen;
      const normY1 = incPointY - Math.sin(normalAngle) * normalLen;
      const normX2 = incPointX + Math.cos(normalAngle) * normalLen;
      const normY2 = incPointY + Math.sin(normalAngle) * normalLen;

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(normX1, normY1);
      ctx.lineTo(normX2, normY2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Incident Light Ray
      const incRayAngle = normalAngle + activeIRad;
      const raySourceX = incPointX - Math.cos(incRayAngle) * 140;
      const raySourceY = incPointY - Math.sin(incRayAngle) * 140;

      // Collimated bright yellow sodium D-line light ray with live photon pulse
      const rayOffset = -t * 50;
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = rayOffset;
      ctx.beginPath();
      ctx.moveTo(raySourceX, raySourceY);
      ctx.lineTo(incPointX, incPointY);
      ctx.stroke();

      // Refracted ray inside prism to face AC
      const emergePointX = apexX + baseHalf * 0.45;
      const emergePointY = apexY + prismH * 0.45;

      ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
      ctx.beginPath();
      ctx.moveTo(incPointX, incPointY);
      ctx.lineTo(emergePointX, emergePointY);
      ctx.stroke();

      if (!actIsTIR) {
        // Emergent Ray leaving face AC
        const normACAngle = -faceAngle + Math.PI / 2;
        const emergeRayAngle = normACAngle + actERad;
        const emergeEndX = emergePointX + Math.cos(emergeRayAngle) * 140;
        const emergeEndY = emergePointY + Math.sin(emergeRayAngle) * 140;

        ctx.strokeStyle = "#facc15";
        ctx.beginPath();
        ctx.moveTo(emergePointX, emergePointY);
        ctx.lineTo(emergeEndX, emergeEndY);
        ctx.stroke();

        // Original path extension (dashed)
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = 0;
        ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(incPointX, incPointY);
        ctx.lineTo(incPointX + Math.cos(incRayAngle) * 160, incPointY + Math.sin(incRayAngle) * 160);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Total Internal Reflection inside prism
        ctx.strokeStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(emergePointX, emergePointY);
        ctx.lineTo(apexX, cornerB_Y);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText("⚠ TOTAL INTERNAL REFLECTION (r2 > C)", apexX - 80, cornerB_Y + 25);
      }

      ctx.setLineDash([]);

      // Telescope Crosshair Circular View (Inset top right)
      const teleX = width - 130;
      const teleY = 85;
      const teleR = 55;

      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.arc(teleX, teleY, teleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Crosswires
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(teleX - teleR, teleY);
      ctx.lineTo(teleX + teleR, teleY);
      ctx.moveTo(teleX, teleY - teleR);
      ctx.lineTo(teleX, teleY + teleR);
      ctx.stroke();

      // Slit Image in Telescope with live glow
      if (!actIsTIR) {
        const slitOffset = (activeAngle - 48.5) * 1.8;
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 8;
        ctx.fillRect(teleX + slitOffset - 2, teleY - 35, 4, 70);
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("TELESCOPE SLIT", teleX - 42, teleY + teleR + 18);

      // Live Readout HUD
      ctx.fillStyle = "#f8fafc";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillText(`Angle of Incidence (i): ${activeAngle.toFixed(1)}°`, 24, 30);
      ctx.fillText(`Refraction Angles: r1 = ${(actR1Rad * 180 / Math.PI).toFixed(1)}°, r2 = ${actR2Deg.toFixed(1)}°`, 24, 52);
      ctx.fillText(`Prism Apex Angle A: ${prismAngleA}° | Critical Angle C: ${critAngleDeg.toFixed(1)}°`, 24, 74);
      if (!actIsTIR) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`Emergence Angle (e): ${actEDeg.toFixed(1)}°`, 24, 96);
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 15px 'JetBrains Mono', monospace";
        ctx.fillText(`Angle of Deviation (d = i + e - A) = ${actDeviationDeg.toFixed(1)}° (Min Dm ≈ 37.2°)`, 24, 122);
      } else {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 15px 'JetBrains Mono', monospace";
        ctx.fillText(`Total Internal Reflection occurred (r2 = ${actR2Deg.toFixed(1)}° > C = ${critAngleDeg.toFixed(1)}°)`, 24, 102);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [incidentAngleDeg, isCriticalAngle, isSpectrometer, prismAngleA, refractiveIndexMu, critAngleDeg]);

  // Mouse drag handler on canvas
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    const iVal = 25 + ratio * 55;
    onControlChange("incidentAngle", Number(iVal.toFixed(1)));
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
          Drag horizontally to rotate incident ray
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onControlChange("incidentAngle", 48.6)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/60 text-xs font-medium text-cyan-300 transition-all flex items-center gap-1.5"
          >
            🎯 Seek Minimum Deviation Position (i ≈ 48.6°)
          </button>
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
