import React, { useRef, useEffect, useState } from "react";
import { PracticalItem } from "../../types";

interface Props {
  practical: PracticalItem;
  controlValues: Record<string, number>;
  onControlChange: (id: string, val: number) => void;
  onRecordReading?: () => void;
}

export const MechanicsForcesSim: React.FC<Props> = ({
  practical,
  controlValues,
  onControlChange,
  onRecordReading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<"fulcrum" | "known" | "angle" | "load" | null>(null);

  // Physics state for Principle of Moments (prac-6)
  const rodAngleRef = useRef<number>(0); // radians
  const rodAngVelRef = useRef<number>(0); // rad/s
  const mass1SwayRef = useRef<number>(0); // known mass sway angle
  const mass2SwayRef = useRef<number>(0); // unknown mass sway angle

  // Physics state for Parallelogram of Forces (prac-5)
  const knotXRef = useRef<number>(380);
  const knotYRef = useRef<number>(170);
  const knotVxRef = useRef<number>(0);
  const knotVyRef = useRef<number>(0);
  const pulleyRotRef = useRef<number>(0);

  // Physics state for Searle's apparatus (prac-38)
  const bubblePosRef = useRef<number>(0);
  const wireOscRef = useRef<number>(0);

  useEffect(() => {
    let lastStamp = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastStamp) / 1000);
      lastStamp = now;
      timeRef.current += dt;
      const t = timeRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark laboratory canvas background
      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#080e1a");
      grad.addColorStop(0.5, "#0b1222");
      grad.addColorStop(1, "#04070f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle scientific grid pattern
      ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // =========================================================================
      // PRACTICAL 5: PARALLELOGRAM OF FORCES
      // =========================================================================
      if (practical.id === "prac-5") {
        const P = controlValues["weightP"] ?? 120; // grams
        const Q = controlValues["weightQ"] ?? 140; // grams
        const thetaDeg = controlValues["angleTheta"] ?? 78; // degrees
        const thetaRad = (thetaDeg * Math.PI) / 180;

        // Resultant W in grams
        const W = Math.sqrt(P * P + Q * Q + 2 * P * Q * Math.cos(thetaRad));

        const targetOriginX = width / 2;
        const targetOriginY = 175;

        // Smooth physics damping for knot position
        const kKnot = 22;
        const dKnot = 4.5;
        const axKnot = (targetOriginX - knotXRef.current) * kKnot - knotVxRef.current * dKnot;
        const ayKnot = (targetOriginY - knotYRef.current) * kKnot - knotVyRef.current * dKnot;
        knotVxRef.current += axKnot * dt;
        knotVyRef.current += ayKnot * dt;
        knotXRef.current += knotVxRef.current * dt;
        knotYRef.current += knotVyRef.current * dt;

        pulleyRotRef.current += 0.4 * dt;

        const originX = knotXRef.current;
        const originY = knotYRef.current;

        // Pulleys positions
        const pulleyLeftX = 140;
        const pulleyRightX = width - 140;
        const pulleyY = 85;

        // Drawing Pulleys with rotating spokes
        [pulleyLeftX, pulleyRightX].forEach((px, idx) => {
          ctx.save();
          ctx.translate(px, pulleyY);
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Rotating spokes
          const rot = idx === 0 ? pulleyRotRef.current : -pulleyRotRef.current;
          ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
          ctx.lineWidth = 1.5;
          for (let sp = 0; sp < 4; sp++) {
            const angle = rot + (sp * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
            ctx.stroke();
          }

          // Central bearing
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Board backing with grid
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(170, 60, width - 340, 260);
        ctx.strokeRect(170, 60, width - 340, 260);

        // Vector calculations
        const scale = 0.75;
        const pVecX = originX - Math.sin(thetaRad / 2) * P * scale;
        const pVecY = originY - Math.cos(thetaRad / 2) * P * scale;
        const qVecX = originX + Math.sin(thetaRad / 2) * Q * scale;
        const qVecY = originY - Math.cos(thetaRad / 2) * Q * scale;
        const rVecX = originX;
        const rVecY = originY - W * scale;

        // Dashed parallelogram completion lines
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pVecX, pVecY);
        ctx.lineTo(rVecX, rVecY);
        ctx.lineTo(qVecX, qVecY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Force Vector P (Cyan)
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(pVecX, pVecY);
        ctx.stroke();

        // Force Vector Q (Purple)
        ctx.strokeStyle = "#c084fc";
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(qVecX, qVecY);
        ctx.stroke();

        // Resultant Vector R (Emerald)
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(rVecX, rVecY);
        ctx.stroke();

        // Subtle live sway for weights
        const swayP = Math.sin(t * 2.1) * 3;
        const swayQ = Math.cos(t * 1.9) * 3;
        const swayW = Math.sin(t * 1.5) * 1.5;

        // Left String & Weight P
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(pulleyLeftX, pulleyY);
        ctx.lineTo(pulleyLeftX - 22, 270);
        ctx.lineTo(pulleyLeftX - 22 + swayP, 290);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(pulleyLeftX - 32 + swayP, 290, 20, 32);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText(`${P}g`, pulleyLeftX - 31 + swayP, 310);

        // Right String & Weight Q
        ctx.strokeStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(pulleyRightX, pulleyY);
        ctx.lineTo(pulleyRightX + 22, 270);
        ctx.lineTo(pulleyRightX + 22 + swayQ, 290);
        ctx.stroke();

        ctx.fillStyle = "#c084fc";
        ctx.fillRect(pulleyRightX + 12 + swayQ, 290, 20, 32);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(`${Q}g`, pulleyRightX + 13 + swayQ, 310);

        // Vertical String & Balancing Weight W
        ctx.strokeStyle = "#34d399";
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + swayW, 300);
        ctx.stroke();

        ctx.fillStyle = "#10b981";
        ctx.fillRect(originX - 16 + swayW, 300, 32, 38);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillText("W", originX - 5 + swayW, 324);

        // Central brass knot
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(originX, originY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Readout HUD
        ctx.fillStyle = "#f8fafc";
        ctx.font = "13px 'JetBrains Mono', monospace";
        ctx.fillText(`Force P = ${(P * 0.00981).toFixed(2)} N (${P} g)`, 24, 30);
        ctx.fillText(`Force Q = ${(Q * 0.00981).toFixed(2)} N (${Q} g)`, 24, 50);
        ctx.fillText(`Angle θ = ${thetaDeg}°`, 24, 70);

        ctx.fillStyle = "#34d399";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.fillText(`Vector Resultant R = Balancing W = ${W.toFixed(1)} g (${(W * 0.00981).toFixed(2)} N)`, 24, 94);
      }

      // =========================================================================
      // PRACTICAL 6: PRINCIPLE OF MOMENTS & CENTER OF GRAVITY (ROD MOVEMENT ON KNIFE EDGE)
      // =========================================================================
      else if (practical.id === "prac-6") {
        const fulcrum = controlValues["fulcrumPos"] ?? 40; // cm mark (20 to 80)
        const knownMass = controlValues["knownMass"] ?? 80; // grams (20 to 200)
        const knownPos = controlValues["knownArm"] ?? 15; // cm mark (2 to 38)
        const unknownMass = controlValues["unknownMass"] ?? 110; // grams (30 to 250)
        const unknownPos = 85; // cm mark on right side
        const ruleMass = 115; // grams uniform meter rule
        const ruleCG = 50; // cm mark

        // -------------------------------------------------------------
        // ROTATIONAL TORQUE & EQUILIBRIUM PHYSICS AROUND FULCRUM
        // -------------------------------------------------------------
        // Arm distances from knife-edge fulcrum (in cm)
        // Sign convention: positive arm = right of fulcrum (clockwise torque)
        //                  negative arm = left of fulcrum (anticlockwise torque)
        const armKnown = knownPos - fulcrum; // e.g. 15 - 40 = -25 cm (left)
        const armUnknown = unknownPos - fulcrum; // e.g. 85 - 40 = +45 cm (right)
        const armCG = ruleCG - fulcrum; // e.g. 50 - 40 = +10 cm (right)

        // Torques in g·cm
        let tauAnticlockwise = 0;
        let tauClockwise = 0;

        // Known mass contribution
        if (armKnown < 0) {
          tauAnticlockwise += knownMass * Math.abs(armKnown);
        } else {
          tauClockwise += knownMass * armKnown;
        }

        // Unknown mass contribution
        if (armUnknown < 0) {
          tauAnticlockwise += unknownMass * Math.abs(armUnknown);
        } else {
          tauClockwise += unknownMass * armUnknown;
        }

        // Rule Center of Gravity (C.G. at 50 cm) contribution
        if (armCG < 0) {
          tauAnticlockwise += ruleMass * Math.abs(armCG);
        } else {
          tauClockwise += ruleMass * armCG;
        }

        // Net unbalanced torque: positive = Clockwise (tips right down), negative = Anticlockwise (tips left down)
        const netTorque = tauClockwise - tauAnticlockwise; // g·cm
        const isBalanced = Math.abs(netTorque) < 25; // within ±25 g·cm considered balanced

        // Theoretical exact unknown mass that produces perfect horizontal balance:
        // tauAnticlockwise = tauClockwise
        // knownMass * (fulcrum - knownPos) = unknownMass * (unknownPos - fulcrum) + ruleMass * (ruleCG - fulcrum)
        const requiredUnknownMass = Math.max(
          5,
          (knownMass * (fulcrum - knownPos) - ruleMass * (ruleCG - fulcrum)) / (unknownPos - fulcrum)
        );

        // -------------------------------------------------------------
        // DYNAMIC PHYSICS INTEGRATION FOR ROD ANGLE θ
        // -------------------------------------------------------------
        // Moment of Inertia of meter rule about knife-edge fulcrum:
        // I = I_cm + M*(d_cg)^2 + m1*r1^2 + m2*r2^2
        const dCG_m = (Math.abs(ruleCG - fulcrum)) / 100;
        const I_rule = (1 / 12) * (ruleMass / 1000) * 1.0 * 1.0 + (ruleMass / 1000) * (dCG_m * dCG_m);
        const I_total = Math.max(0.015, I_rule + (knownMass / 1000) * Math.pow(Math.abs(armKnown) / 100, 2) + (unknownMass / 1000) * Math.pow(Math.abs(armUnknown) / 100, 2));

        // Unbalanced torque in N·m (tau = (netTorque in g·cm) * 1e-5 * g)
        const torqueNm = (netTorque * 1e-5) * 9.81;

        // Angular acceleration alpha = tau / I - damping*omega - restoring spring effect when tilted
        // Maximum tilt limit before the meter rule hits the laboratory bench/stands: ±17.5 degrees (±0.305 rad)
        const maxTiltRad = 0.305;
        const damping = 3.2; // air and knife-edge friction
        const restoringStiffness = 0.8; // gravity pendulum restoring effect of lowered weights

        const currentAngle = rodAngleRef.current;
        const currentVel = rodAngVelRef.current;

        // Effective torque considering rod tilt cos(theta)
        const effTorque = torqueNm * Math.cos(currentAngle);
        const angAcc = (effTorque / I_total) - (currentAngle * restoringStiffness) - (currentVel * damping);

        rodAngVelRef.current += angAcc * dt;
        rodAngleRef.current += rodAngVelRef.current * dt;

        // Stop collision when hitting bench limit
        if (rodAngleRef.current > maxTiltRad) {
          rodAngleRef.current = maxTiltRad;
          if (rodAngVelRef.current > 0) {
            rodAngVelRef.current = -rodAngVelRef.current * 0.2; // soft bounce off bench stop
          }
        } else if (rodAngleRef.current < -maxTiltRad) {
          rodAngleRef.current = -maxTiltRad;
          if (rodAngVelRef.current < 0) {
            rodAngVelRef.current = -rodAngVelRef.current * 0.2;
          }
        }

        const theta = rodAngleRef.current;
        const thetaDeg = (theta * 180) / Math.PI;

        // Sway dynamics for hanging masses
        mass1SwayRef.current = Math.sin(t * 3.5) * (Math.abs(rodAngVelRef.current) * 0.15 + 0.01);
        mass2SwayRef.current = Math.cos(t * 3.2) * (Math.abs(rodAngVelRef.current) * 0.15 + 0.01);

        // -------------------------------------------------------------
        // VISUAL GEOMETRY & RENDERING
        // -------------------------------------------------------------
        const benchY = height - 60; // Laboratory bench surface
        const startX = 70;
        const ruleW = width - 140;
        const pxPerCm = ruleW / 100;
        const fulcrumX = startX + fulcrum * pxPerCm;
        const fulcrumY = height / 2 + 15; // Apex of the knife edge

        // Draw Laboratory Wooden Bench Surface
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(20, benchY, width - 40, 40);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, benchY, width - 40, 40);

        // Bench woodgrain highlight
        ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
        ctx.beginPath();
        ctx.moveTo(20, benchY + 1);
        ctx.lineTo(width - 20, benchY + 1);
        ctx.stroke();

        // Heavy Triangular Cast-Iron Fulcrum Stand with Knife Edge
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(fulcrumX, fulcrumY); // Sharp Knife-Edge Apex
        ctx.lineTo(fulcrumX - 28, benchY);
        ctx.lineTo(fulcrumX + 28, benchY);
        ctx.closePath();
        ctx.fill();

        // Stand border & metallic luster
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Hardened steel knife blade edge tip highlight
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(fulcrumX, fulcrumY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Stand base clamp
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(fulcrumX - 35, benchY - 6, 70, 8);

        // Stand fulcrum label
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(`Knife Edge (${fulcrum} cm)`, fulcrumX - 45, benchY + 22);

        // -------------------------------------------------------------
        // RENDER ROTATED METER RULE AROUND THE KNIFE EDGE
        // -------------------------------------------------------------
        ctx.save();
        // Pivot point is at the knife-edge apex (fulcrumX, fulcrumY)
        ctx.translate(fulcrumX, fulcrumY);
        ctx.rotate(theta);

        // Local coordinate system: fulcrum is at x = 0, y = 0
        const localStartX = -fulcrum * pxPerCm;
        const ruleThickness = 18;

        // Wooden Metre Rule body (sitting on knife-edge at bottom of rule)
        const ruleGrad = ctx.createLinearGradient(localStartX, -ruleThickness, localStartX, 0);
        ruleGrad.addColorStop(0, "#d97706");
        ruleGrad.addColorStop(0.5, "#b45309");
        ruleGrad.addColorStop(1, "#92400e");
        ctx.fillStyle = ruleGrad;
        ctx.fillRect(localStartX, -ruleThickness, ruleW, ruleThickness);

        // Metre Rule outline
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(localStartX, -ruleThickness, ruleW, ruleThickness);

        // Centimeter & Millimeter graduations
        ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillStyle = "#ffffff";
        ctx.font = "8.5px 'JetBrains Mono', monospace";

        for (let cm = 0; cm <= 100; cm++) {
          const x = localStartX + cm * pxPerCm;
          let tickH = 3;
          if (cm % 10 === 0) {
            tickH = 9;
            ctx.beginPath();
            ctx.moveTo(x, -ruleThickness);
            ctx.lineTo(x, -ruleThickness + tickH);
            ctx.stroke();
            if (cm % 10 === 0) {
              ctx.fillText(`${cm}`, x - 4, -ruleThickness + 14);
            }
          } else if (cm % 5 === 0) {
            tickH = 6;
            ctx.beginPath();
            ctx.moveTo(x, -ruleThickness);
            ctx.lineTo(x, -ruleThickness + tickH);
            ctx.stroke();
          }
        }

        // Center of Gravity (C.G.) Marker at 50 cm mark
        const localCgX = localStartX + 50 * pxPerCm;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(localCgX, -ruleThickness / 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Center of Gravity Label
        ctx.fillStyle = "#fca5a5";
        ctx.font = "bold 9.5px 'JetBrains Mono', monospace";
        ctx.fillText("C.G. (50cm)", localCgX - 22, -ruleThickness - 6);

        // Downward weight arrow for Metre Rule Mass at C.G.
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(localCgX, 0);
        ctx.lineTo(localCgX, 24);
        ctx.stroke();
        // arrow tip
        ctx.beginPath();
        ctx.moveTo(localCgX - 4, 20);
        ctx.lineTo(localCgX, 24);
        ctx.lineTo(localCgX + 4, 20);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText(`${ruleMass}g`, localCgX + 4, 22);

        // Small Spirit Level mounted on rule above fulcrum
        ctx.fillStyle = "#0f766e";
        ctx.fillRect(-22, -ruleThickness - 11, 44, 10);
        ctx.strokeStyle = "#14b8a6";
        ctx.lineWidth = 1;
        ctx.strokeRect(-22, -ruleThickness - 11, 44, 10);
        // Spirit level bubble
        const bubbleX = Math.max(-14, Math.min(14, -thetaDeg * 1.8));
        ctx.fillStyle = isBalanced ? "#4ade80" : "#22d3ee";
        ctx.beginPath();
        ctx.arc(bubbleX, -ruleThickness - 6, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Calculate world coordinates for mass suspension points before restoring
        const localKnownX = localStartX + knownPos * pxPerCm;
        const localUnkX = localStartX + unknownPos * pxPerCm;

        // Knife edge apex contact dot inside rule
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // -------------------------------------------------------------
        // SUSPENDED WEIGHT HANGERS (HANG VERTICALLY UNDER GRAVITY)
        // -------------------------------------------------------------
        // Calculate exact world coordinates of suspension loops on the tilted rule
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Known Mass suspension point in world coordinates
        const kDistFromFulcrum = (knownPos - fulcrum) * pxPerCm;
        const knownWorldX = fulcrumX + kDistFromFulcrum * cosT;
        const knownWorldY = fulcrumY + kDistFromFulcrum * sinT;

        // Unknown Mass suspension point in world coordinates
        const uDistFromFulcrum = (unknownPos - fulcrum) * pxPerCm;
        const unkWorldX = fulcrumX + uDistFromFulcrum * cosT;
        const unkWorldY = fulcrumY + uDistFromFulcrum * sinT;

        // Draw Known Mass Hanger (Left)
        const stringLen1 = 55;
        const swayAngle1 = mass1SwayRef.current;
        const hanger1X = knownWorldX + Math.sin(swayAngle1) * stringLen1;
        const hanger1Y = knownWorldY + Math.cos(swayAngle1) * stringLen1;

        // Suspension loop around rule
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(knownWorldX, knownWorldY, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Hanging thread
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(knownWorldX, knownWorldY);
        ctx.lineTo(hanger1X, hanger1Y);
        ctx.stroke();

        // Slotted weight hanger
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(hanger1X - 16, hanger1Y, 32, 38);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hanger1X - 16, hanger1Y, 32, 38);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillText(`${knownMass}g`, hanger1X - 13, hanger1Y + 24);

        // Position tag
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(`m at ${knownPos}cm`, hanger1X - 22, hanger1Y + 52);

        // Draw Unknown Mass Hanger (Right)
        const stringLen2 = 55;
        const swayAngle2 = mass2SwayRef.current;
        const hanger2X = unkWorldX + Math.sin(swayAngle2) * stringLen2;
        const hanger2Y = unkWorldY + Math.cos(swayAngle2) * stringLen2;

        // Suspension loop
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(unkWorldX, unkWorldY, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Hanging thread
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(unkWorldX, unkWorldY);
        ctx.lineTo(hanger2X, hanger2Y);
        ctx.stroke();

        // Unknown mass body
        ctx.fillStyle = "#059669";
        ctx.fillRect(hanger2X - 18, hanger2Y, 36, 42);
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hanger2X - 18, hanger2Y, 36, 42);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillText(`${unknownMass}g`, hanger2X - 14, hanger2Y + 25);

        // Position tag
        ctx.fillStyle = "#34d399";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(`M at ${unknownPos}cm`, hanger2X - 22, hanger2Y + 56);

        // -------------------------------------------------------------
        // ROTATIONAL STATUS & HUD METRICS
        // -------------------------------------------------------------
        // Tilt Status Badge
        let statusText = "BALANCED (Equilibrium Achieved)";
        let statusColor = "#34d399";
        let statusBg = "rgba(16, 185, 129, 0.2)";
        let statusBorder = "rgba(16, 185, 129, 0.4)";

        if (netTorque > 25) {
          statusText = `TIPPING RIGHT (Clockwise +${Math.round(netTorque)} g·cm)`;
          statusColor = "#f59e0b";
          statusBg = "rgba(245, 158, 11, 0.15)";
          statusBorder = "rgba(245, 158, 11, 0.4)";
        } else if (netTorque < -25) {
          statusText = `TIPPING LEFT (Anticlockwise ${Math.round(netTorque)} g·cm)`;
          statusColor = "#ef4444";
          statusBg = "rgba(239, 68, 68, 0.15)";
          statusBorder = "rgba(239, 68, 68, 0.4)";
        }

        // Status pill
        ctx.fillStyle = statusBg;
        ctx.strokeStyle = statusBorder;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(24, 20, 360, 30, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = statusColor;
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.fillText(statusText, 36, 40);

        // Tilt angle readout
        ctx.fillStyle = "#f8fafc";
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillText(`Rod Tilt: ${thetaDeg > 0 ? "+" : ""}${thetaDeg.toFixed(1)}° (${Math.abs(thetaDeg) < 0.5 ? "Horizontal" : thetaDeg > 0 ? "Right Down" : "Left Down"})`, 24, 72);

        // Torque equation breakdown
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillText(`Anticlockwise Moments (Στ_acw): ${Math.round(tauAnticlockwise)} g·cm`, 24, 92);
        ctx.fillText(`Clockwise Moments (Στ_cw):     ${Math.round(tauClockwise)} g·cm`, 24, 110);

        // Formula callout
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`Principle: m·(d_f - d_1) = M·(d_2 - d_f) + m_rule·(d_cg - d_f)`, 24, 130);

        // Exact required balancing mass highlight
        ctx.fillStyle = "#a7f3d0";
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.fillText(`Balance Condition: Unknown Mass M should be ${requiredUnknownMass.toFixed(1)} g`, 24, 150);
      }

      // =========================================================================
      // PRACTICAL 38: SEARLE'S APPARATUS FOR YOUNG'S MODULUS
      // =========================================================================
      else {
        const loadM = controlValues["loadMassM"] ?? 2.5; // kg
        const radiusMm = controlValues["wireRadiusR"] ?? 0.35; // mm
        const lengthM = controlValues["wireLengthL"] ?? 2.5; // m
        const Y = 2.0e11; // Steel Young's Modulus in Pa

        // elongation e = (M * g * L) / (pi * r^2 * Y)
        const rM = radiusMm * 1e-3;
        const area = Math.PI * rM * rM;
        const g = 9.81;
        const elongationM = (loadM * g * lengthM) / (area * Y);
        const elongationMm = elongationM * 1000;

        // Micro-vibration of wire under tension
        wireOscRef.current = Math.sin(t * 18) * 0.4;

        // Smooth spirit level bubble physics
        const targetBubble = elongationMm * 20;
        bubblePosRef.current += (targetBubble - bubblePosRef.current) * 0.1;

        const ceilingY = 55;
        const wireLeftX = width / 2 - 45; // Reference wire
        const wireRightX = width / 2 + 45; // Test wire

        // Rigid ceiling support
        ctx.fillStyle = "#334155";
        ctx.fillRect(width / 2 - 90, ceilingY - 20, 180, 20);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.strokeRect(width / 2 - 90, ceilingY - 20, 180, 20);

        // Left wire (reference wire)
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(wireLeftX, ceilingY);
        ctx.lineTo(wireLeftX, 220);
        ctx.stroke();

        // Right wire (test wire under load with micro-oscillation)
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wireRightX, ceilingY);
        ctx.lineTo(wireRightX + wireOscRef.current, 220 + elongationMm * 30);
        ctx.stroke();

        // Searle's Frame & Spirit Level
        const frameY = 220;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(wireLeftX - 15, frameY, 30, 50);
        ctx.fillRect(wireRightX - 15, frameY + elongationMm * 30, 30, 50);

        // Spirit Level Bar connecting frames
        ctx.fillStyle = "#0f766e";
        ctx.fillRect(wireLeftX + 15, frameY + 15, 60, 16);
        ctx.strokeStyle = "#14b8a6";
        ctx.strokeRect(wireLeftX + 15, frameY + 15, 60, 16);

        // Dynamic Bubble inside spirit level
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.ellipse(width / 2 + bubblePosRef.current, frameY + 23, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Micrometer screw on right frame
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(wireRightX + 18, frameY + elongationMm * 30 + 10, 14, 30);

        // Dead weight on left frame (to keep reference taut)
        ctx.fillStyle = "#64748b";
        ctx.fillRect(wireLeftX - 12, frameY + 65, 24, 35);
        ctx.fillStyle = "#ffffff";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("1kg", wireLeftX - 8, frameY + 85);

        // Slotted weights hanger on test wire with subtle elastic sway
        const loadSway = Math.sin(t * 2) * 1.5;
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(wireRightX - 16 + loadSway, frameY + elongationMm * 30 + 65, 32, 45);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.fillText(`${loadM}kg`, wireRightX - 14 + loadSway, frameY + elongationMm * 30 + 92);

        // HUD
        ctx.fillStyle = "#f8fafc";
        ctx.font = "13px 'JetBrains Mono', monospace";
        ctx.fillText(`Load Mass (M): ${loadM.toFixed(1)} kg (Force = ${(loadM * g).toFixed(1)} N)`, 24, 30);
        ctx.fillText(`Wire Diameter: ${(radiusMm * 2).toFixed(2)} mm (Area = ${(area * 1e6).toFixed(3)} mm²)`, 24, 52);
        ctx.fillText(`Initial Wire Length: ${lengthM.toFixed(2)} m`, 24, 74);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.fillText(`Extension e = ${elongationMm.toFixed(3)} mm`, 24, 100);
        ctx.fillStyle = "#34d399";
        ctx.fillText(`Young's Modulus Y = ${(Y / 1e11).toFixed(2)} × 10¹¹ N/m²`, 24, 124);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [practical.id, controlValues]);

  // Mouse interaction handler on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const normX = clickX / rect.width;

    if (practical.id === "prac-6") {
      // Check if user clicked near knife edge or near known mass
      const fulcrumNorm = (controlValues["fulcrumPos"] ?? 40) / 100;
      if (Math.abs(normX - fulcrumNorm) < 0.15) {
        setDragTarget("fulcrum");
      } else {
        setDragTarget("known");
      }
    } else if (practical.id === "prac-5") {
      setDragTarget("angle");
    } else {
      setDragTarget("load");
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (practical.id === "prac-5") {
      const val = 30 + Math.round(ratio * 120);
      onControlChange("angleTheta", val);
    } else if (practical.id === "prac-6") {
      if (dragTarget === "fulcrum") {
        // Move knife edge fulcrum
        const val = Math.max(20, Math.min(80, Math.round(ratio * 100)));
        onControlChange("fulcrumPos", val);
      } else {
        // Move known mass position or adjust
        const val = Math.max(5, Math.min(45, Math.round(ratio * 50)));
        onControlChange("knownArm", val);
      }
    } else {
      const val = 0.5 + Math.round(ratio * 9) * 0.5;
      onControlChange("loadMassM", val);
    }
  };

  // Impulse tap on the rod to make it oscillate live
  const handleTapRod = (direction: "left" | "right") => {
    const impulse = direction === "left" ? -0.22 : 0.22;
    rodAngVelRef.current += impulse;
  };

  // Helper to auto-calculate balancing unknown mass for practical 6
  const handleAutoBalance = () => {
    const fulcrum = controlValues["fulcrumPos"] ?? 40;
    const knownMass = controlValues["knownMass"] ?? 80;
    const knownPos = controlValues["knownArm"] ?? 15;
    const unknownPos = 85;
    const ruleMass = 115;
    const ruleCG = 50;

    const balancedMass = Math.max(
      10,
      Math.round(
        (knownMass * (fulcrum - knownPos) - ruleMass * (ruleCG - fulcrum)) / (unknownPos - fulcrum)
      )
    );
    onControlChange("unknownMass", balancedMass);
    // Give gentle settling animation
    rodAngVelRef.current = 0.05;
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/70 shadow-2xl backdrop-blur-md">
        <canvas
          ref={canvasRef}
          width={760}
          height={390}
          className="w-full h-auto cursor-ew-resize select-none touch-none block"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
        />

        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-slate-900/85 border border-slate-700/70 text-[11px] font-mono text-cyan-400 backdrop-blur-md pointer-events-none flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          {practical.id === "prac-6"
            ? "Drag to move Knife Edge or Masses"
            : practical.id === "prac-5"
            ? "Drag to adjust vector angle"
            : "Drag to adjust load"}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">
          {practical.id === "prac-6" ? (
            <>
              <button
                onClick={handleAutoBalance}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-all shadow-sm flex items-center gap-1.5"
                title="Calculate and apply exact mass to achieve horizontal equilibrium"
              >
                <span>⚖️</span> Auto-Balance Unknown Mass
              </button>

              <button
                onClick={() => handleTapRod("left")}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all"
                title="Give an anticlockwise impulse to observe oscillation"
              >
                Tap Left ↙
              </button>

              <button
                onClick={() => handleTapRod("right")}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all"
                title="Give a clockwise impulse to observe oscillation"
              >
                Tap Right ↘
              </button>

              <button
                onClick={() => {
                  onControlChange("fulcrumPos", 50); // Set fulcrum at C.G.
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all"
                title="Set knife edge directly at Center of Gravity (50 cm mark)"
              >
                Set Fulcrum at C.G. (50cm)
              </button>

              <button
                onClick={() => {
                  onControlChange("fulcrumPos", 40);
                  onControlChange("knownMass", 80);
                  onControlChange("knownArm", 15);
                  onControlChange("unknownMass", 110);
                  rodAngleRef.current = 0;
                  rodAngVelRef.current = 0;
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-400 hover:text-white transition-all"
              >
                Reset Default
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (practical.id === "prac-5") {
                  onControlChange("angleTheta", 78);
                  onControlChange("weightP", 120);
                  onControlChange("weightQ", 140);
                } else {
                  onControlChange("loadMassM", 2.5);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-300 transition-all hover:text-white"
            >
              Reset Equilibrium
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
