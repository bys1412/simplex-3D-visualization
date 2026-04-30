/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Constraint {
  id: string;
  coeffs: [number, number, number]; // x, y, z
  operator: '<=' | '>=' | '=';
  constant: number;
}

export interface SimplexStep {
  tableau: number[][];
  basis: number[]; // Index of variables in basis
  objValue: number;
  currentPoint: [number, number, number];
  pivotRow?: number;
  pivotCol?: number;
}

export interface SimplexResult {
  steps: SimplexStep[];
  status: 'optimal' | 'unbounded' | 'infeasible' | 'max_iterations';
  variables: string[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}
