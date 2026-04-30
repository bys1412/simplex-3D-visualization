/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Constraint } from '../types';
import * as math from 'mathjs';

/**
 * Finds all vertices of the feasible region (polytope)
 * defined by the constraints and non-negativity (x,y,z >= 0).
 */
export function calculateFeasibleVertices(
  constraints: Constraint[],
  bounds: number = 100
): [number, number, number][] {
  // Add coordinate planes as constraints
  // x >= 0, y >= 0, z >= 0
  // And a large box as bounding constraint to prevent infinite volume issues
  const allConstraints = [
    ...constraints,
    { id: 'x_min', coeffs: [1, 0, 0], operator: '>=', constant: 0 },
    { id: 'y_min', coeffs: [0, 1, 0], operator: '>=', constant: 0 },
    { id: 'z_min', coeffs: [0, 0, 1], operator: '>=', constant: 0 },
    { id: 'x_max', coeffs: [1, 0, 0], operator: '<=', constant: bounds },
    { id: 'y_max', coeffs: [0, 1, 0], operator: '<=', constant: bounds },
    { id: 'z_max', coeffs: [0, 0, 1], operator: '<=', constant: bounds },
  ] as Constraint[];

  const vertices: [number, number, number][] = [];

  // An intersection of 3 planes in 3D is a point
  for (let i = 0; i < allConstraints.length; i++) {
    for (let j = i + 1; j < allConstraints.length; j++) {
      for (let k = j + 1; k < allConstraints.length; k++) {
        try {
          const c1 = allConstraints[i];
          const c2 = allConstraints[j];
          const c3 = allConstraints[k];

          // Solve the system of 3 linear equations
          const A = [c1.coeffs, c2.coeffs, c3.coeffs];
          const b = [c1.constant, c2.constant, c3.constant];

          // Check if system is solvable
          const det = math.det(A);
          if (Math.abs(det) < 1e-9) continue;

          const solution = math.lusolve(A, b) as any;
          const x = Number(solution[0][0]);
          const y = Number(solution[1][0]);
          const z = Number(solution[2][0]);

          const point: [number, number, number] = [x, y, z];

          // Check if this point satisfies ALL other constraints
          let isValid = true;
          const epsilon = 1e-7;
          for (const constraint of allConstraints) {
            const val = 
              constraint.coeffs[0] * x + 
              constraint.coeffs[1] * y + 
              constraint.coeffs[2] * z;
            
            if (constraint.operator === '<=') {
              if (val > constraint.constant + epsilon) { isValid = false; break; }
            } else if (constraint.operator === '>=') {
              if (val < constraint.constant - epsilon) { isValid = false; break; }
            } else if (constraint.operator === '=') {
              if (Math.abs(val - constraint.constant) > epsilon) { isValid = false; break; }
            }
          }

          if (isValid) {
            // Avoid duplicates
            const isDuplicate = vertices.some(v => 
              Math.abs(v[0] - x) < epsilon && 
              Math.abs(v[1] - y) < epsilon && 
              Math.abs(v[2] - z) < epsilon
            );
            if (!isDuplicate) {
              vertices.push(point);
            }
          }
        } catch (e) {
          // System might be singular or other error
        }
      }
    }
  }

  return vertices;
}
