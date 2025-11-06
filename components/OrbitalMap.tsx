import React, { useRef, useEffect } from 'react';

interface OrbitalMapProps {
    trajectoryType: string;
    isManeuvering: boolean;
}

class Orbiter {
    x: number;
    y: number;
    radius: number;
    angle: number;
    speed: number;
    orbitRadiusX: number;
    orbitRadiusY: number;

    constructor(orbitRadiusX: number, orbitRadiusY: number, speed: number) {
        this.radius = 5;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = speed;
        this.orbitRadiusX = orbitRadiusX;
        this.orbitRadiusY = orbitRadiusY;
        this.x = 0;
        this.y = 0;
        this.updatePosition(0, 0);
    }

    updatePosition(centerX: number, centerY: number) {
        this.x = centerX + this.orbitRadiusX * Math.cos(this.angle);
        this.y = centerY + this.orbitRadiusY * Math.sin(this.angle);
    }
    
    move(centerX: number, centerY: number) {
        this.angle += this.speed;
        this.updatePosition(centerX, centerY);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#67e8f9'; // cyan-300
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee'; // cyan-400
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export const OrbitalMap: React.FC<OrbitalMapProps> = ({ trajectoryType, isManeuvering }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const parent = canvas.parentElement;
        if (!parent) return;

        let width = parent.clientWidth;
        let height = parent.clientHeight;
        canvas.width = width;
        canvas.height = height;

        const centerX = width / 2;
        const centerY = height / 2;

        const sunRadius = 15;
        const nominalOrbitRadius = Math.min(width, height) * 0.25;

        let targetOrbit = { x: nominalOrbitRadius, y: nominalOrbitRadius };
        if (trajectoryType === 'Heliostationary') {
            targetOrbit = { x: nominalOrbitRadius * 1.5, y: nominalOrbitRadius * 1.5 };
        } else { // Polar Orbit
            targetOrbit = { x: nominalOrbitRadius * 0.5, y: nominalOrbitRadius * 1.2 };
        }
        
        let satellite = new Orbiter(nominalOrbitRadius, nominalOrbitRadius, 0.005);
        let maneuverProgress = isManeuvering ? 0 : 1;
        const maneuverDuration = 200; // frames

        const drawOrbit = (radiusX: number, radiusY: number, color: string, dashed: boolean = false) => {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            if (dashed) {
                ctx.setLineDash([5, 5]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            // Draw Sun
            const sunGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, sunRadius);
            sunGradient.addColorStop(0, '#fef08a'); // yellow-200
            sunGradient.addColorStop(1, '#f97316'); // orange-500
            ctx.beginPath();
            ctx.arc(centerX, centerY, sunRadius, 0, Math.PI * 2);
            ctx.fillStyle = sunGradient;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fb923c'; // orange-400
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Draw Orbits
            drawOrbit(nominalOrbitRadius, nominalOrbitRadius, 'rgba(8, 145, 178, 0.3)'); // cyan-600 with opacity
            drawOrbit(targetOrbit.x, targetOrbit.y, 'rgba(250, 204, 21, 0.5)', true); // yellow-400 with opacity

            // Update and draw Satellite
            if (isManeuvering && maneuverProgress < 1) {
                maneuverProgress += 1 / maneuverDuration;
                const easeInOut = 0.5 - 0.5 * Math.cos(maneuverProgress * Math.PI);
                satellite.orbitRadiusX = nominalOrbitRadius + (targetOrbit.x - nominalOrbitRadius) * easeInOut;
                satellite.orbitRadiusY = nominalOrbitRadius + (targetOrbit.y - nominalOrbitRadius) * easeInOut;
            } else if (isManeuvering) {
                satellite.orbitRadiusX = targetOrbit.x;
                satellite.orbitRadiusY = targetOrbit.y;
            }
            
            satellite.move(centerX, centerY);
            satellite.draw(ctx);

            animationFrameId.current = requestAnimationFrame(animate);
        };
        
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };

    }, [trajectoryType, isManeuvering]);


    return <canvas ref={canvasRef} className="w-full h-full" />;
};
