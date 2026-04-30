/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Text, Float, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { SimplexStep, Constraint } from '../types';

interface SimulationViewProps {
  steps: SimplexStep[];
  currentStep: number;
  objCoeffs: [number, number, number];
  vertices: [number, number, number][];
  animationProgress: number; // 0 to 1 between steps
  constraints: Constraint[];
}

const AxisLabels = () => {
  const ticks = [2, 4, 6, 8, 10];
  return (
    <group>
      <Text position={[11, 0, 0]} fontSize={0.6} color="#ef4444">X</Text>
      <Text position={[0, 11, 0]} fontSize={0.6} color="#22c55e">Y</Text>
      <Text position={[0, 0, 11]} fontSize={0.6} color="#3b82f6">Z</Text>
      
      {ticks.map(t => (
        <group key={t}>
          <Text position={[t, -0.4, 0]} fontSize={0.3} color="#94a3b8">{t.toString()}</Text>
          <Text position={[-0.4, t, 0]} fontSize={0.3} color="#94a3b8">{t.toString()}</Text>
          <Text position={[0, -0.4, t]} fontSize={0.3} color="#94a3b8">{t.toString()}</Text>
          
          <Line points={[[t, 0.1, 0], [t, -0.1, 0]]} color="#cbd5e1" lineWidth={1} />
          <Line points={[[0.1, t, 0], [-0.1, t, 0]]} color="#cbd5e1" lineWidth={1} />
          <Line points={[[0, 0.1, t], [0, -0.1, t]]} color="#cbd5e1" lineWidth={1} />
        </group>
      ))}
    </group>
  );
};

const ObjectivePlane = ({ coeffs, value, color }: { coeffs: [number, number, number], value: number, color: string }) => {
  const [a, b, c] = coeffs;
  
  // Calculate plane normal and standard magnitude
  const mag = Math.sqrt(a * a + b * b + c * c) || 1e-9;
  const normal = new THREE.Vector3(a, b, c).normalize();
  
  // Calculate position: ax + by + cz = value means distance = value / mag
  const dist = value / mag;
  const position = normal.clone().multiplyScalar(dist);
  
  // Orientation: rotate from PlaneGeometry's default (0, 0, 1) to our normal
  const planeNormal = new THREE.Vector3(0, 0, 1);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, normal);

  return (
    <mesh position={[position.x, position.y, position.z]} quaternion={quaternion}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Trajectory = ({ steps, currentStep, progress }: { steps: SimplexStep[], currentStep: number, progress: number }) => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= currentStep; i++) {
        const p = steps[i].currentPoint;
        pts.push(new THREE.Vector3(p[0], p[1], p[2]));
    }
    
    // Smooth transition to next point
    if (currentStep < steps.length - 1 && progress > 0) {
        const p1 = steps[currentStep].currentPoint;
        const p2 = steps[currentStep + 1].currentPoint;
        const interpolated: THREE.Vector3 = new THREE.Vector3(
            p1[0] + (p2[0] - p1[0]) * progress,
            p1[1] + (p2[1] - p1[1]) * progress,
            p1[2] + (p2[2] - p1[2]) * progress
        );
        pts.push(interpolated);
    }
    return pts;
  }, [steps, currentStep, progress]);

  return (
    <>
      <Line points={points} color="#ef4444" lineWidth={3} />
      {points.map((p, i) => (
        <Sphere key={i} position={p} args={[0.15, 16, 16]}>
          <meshBasicMaterial color="#ef4444" />
        </Sphere>
      ))}
    </>
  );
};

const FeasibleRegion = ({ vertices, constraints }: { vertices: [number, number, number][], constraints: Constraint[] }) => {
  // Add base constraints (x=0, y=0, z=0)
  const allConstraints = useMemo(() => [
    ...constraints,
    { id: 'x_min', coeffs: [1, 0, 0], operator: '>=', constant: 0 },
    { id: 'y_min', coeffs: [0, 1, 0], operator: '>=', constant: 0 },
    { id: 'z_min', coeffs: [0, 0, 1], operator: '>=', constant: 0 },
  ] as Constraint[], [constraints]);

  const edges = useMemo(() => {
    const edgeList: [THREE.Vector3, THREE.Vector3][] = [];
    const epsilon = 1e-7;

    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const v1 = vertices[i];
        const v2 = vertices[j];

        // Check how many constraints both vertices satisfy as an equality
        let sharedEqualityConstraints = 0;
        for (const c of allConstraints) {
            const val1 = c.coeffs[0] * v1[0] + c.coeffs[1] * v1[1] + c.coeffs[2] * v1[2];
            const val2 = c.coeffs[0] * v2[0] + c.coeffs[1] * v2[1] + c.coeffs[2] * v2[2];
            
            if (Math.abs(val1 - c.constant) < epsilon && Math.abs(val2 - c.constant) < epsilon) {
                sharedEqualityConstraints++;
            }
        }

        // In 3D, two vertices share an edge if they are both on the intersection of at least 2 planes
        // AND the line segment between them satisfies ALL constraints
        if (sharedEqualityConstraints >= 2) {
             const midX = (v1[0] + v2[0]) / 2;
             const midY = (v1[1] + v2[1]) / 2;
             const midZ = (v1[2] + v2[2]) / 2;
             
             let midPointValid = true;
             for (const c of allConstraints) {
                 const midVal = c.coeffs[0] * midX + c.coeffs[1] * midY + c.coeffs[2] * midZ;
                 if (c.operator === '<=' && midVal > c.constant + epsilon) { midPointValid = false; break; }
                 if (c.operator === '>=' && midVal < c.constant - epsilon) { midPointValid = false; break; }
             }
             
             if (midPointValid) {
                edgeList.push([new THREE.Vector3(...v1), new THREE.Vector3(...v2)]);
             }
        }
      }
    }
    return edgeList;
  }, [vertices, allConstraints]);

  return (
    <>
      {vertices.map((v, i) => (
        <Sphere key={i} position={v} args={[0.08, 8, 8]}>
          <meshBasicMaterial color="#3b82f6" />
        </Sphere>
      ))}
      {edges.map((edge, i) => (
          <Line key={i} points={edge} color="#3b82f6" lineWidth={1} opacity={0.4} />
      ))}
    </>
  );
};

export const SimulationView: React.FC<SimulationViewProps> = ({ steps, currentStep, objCoeffs, vertices, animationProgress, constraints }) => {
  const currentVal = useMemo(() => {
    if (!steps[currentStep]) return 0;
    const v1 = steps[currentStep].objValue;
    if (currentStep < steps.length - 1) {
        const v2 = steps[currentStep + 1].objValue;
        return v1 + (v2 - v1) * animationProgress;
    }
    return v1;
  }, [steps, currentStep, animationProgress]);

  return (
    <div className="w-full h-full bg-slate-50 relative rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={50} />
        <OrbitControls makeDefault />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <gridHelper args={[20, 20]} rotation={[0, 0, 0]} />
        
        {/* Basic Axes */}
        <Line points={[[0,0,0], [10,0,0]]} color="red" lineWidth={1} />
        <Line points={[[0,0,0], [0,10,0]]} color="green" lineWidth={1} />
        <Line points={[[0,0,0], [0,0,10]]} color="blue" lineWidth={1} />
        <AxisLabels />

        <FeasibleRegion vertices={vertices} constraints={constraints} />
        
        {steps.length > 0 && (
          <Trajectory steps={steps} currentStep={currentStep} progress={animationProgress} />
        )}

        <ObjectivePlane coeffs={objCoeffs} value={currentVal} color="#8b5cf6" />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 text-xs shadow-sm pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>搜索路径 (单纯形法轨迹)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-purple-400 opacity-40 rounded-sm" />
            <span>目标函数平面: {objCoeffs[0]}x + {objCoeffs[1]}y + {objCoeffs[2]}z = {currentVal.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 opacity-60 rounded-full" />
            <span>可行解顶点</span>
        </div>
      </div>
    </div>
  );
};
