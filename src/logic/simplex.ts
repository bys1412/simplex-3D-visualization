/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Constraint, SimplexResult, SimplexStep } from '../types';

/**
 * Standard Simplex Algorithm Implementation for 3D Linear Programming
 * Maximize Z = c1x + c2y + c3z
 * Subject to: Ax <= b, x, y, z >= 0
 */
export function solveSimplex(
  objCoeffs: [number, number, number],
  constraints: Constraint[],
  maxIterations = 20
): SimplexResult {
  // 1. Initial Standard Form Table Construction
  // Assume for now all constraints are <= and constants are positive for ease of visualization
  // Variables: x, y, z (indices 0, 1, 2) + slack variables for each constraint
  
  const numConstraints = constraints.length;
  const numVars = 3;
  const totalVars = numVars + numConstraints;
  
  // Tableau structure:
  // [ Rows 0 to numConstraints-1 ] : Constraint rows
  // [ Last Row ] : Objective function row
  // Columns: x, y, z, s1, s2, ..., sn, Constant
  
  let tableau: number[][] = Array.from({ length: numConstraints + 1 }, () => 
    new Array(totalVars + 1).fill(0)
  );

  // Fill constraints
  const basis: number[] = [];
  for (let i = 0; i < numConstraints; i++) {
    const c = constraints[i];
    tableau[i][0] = c.coeffs[0];
    tableau[i][1] = c.coeffs[1];
    tableau[i][2] = c.coeffs[2];
    
    // Slack variable column
    tableau[i][numVars + i] = 1;
    
    // Constant column
    tableau[i][totalVars] = c.constant;
    
    // Initial basis: slack variables
    basis.push(numVars + i);
  }

  // Fill objective row (Maximize Z -> Row = -c1x - c2y - c3z + Z = 0)
  tableau[numConstraints][0] = -objCoeffs[0];
  tableau[numConstraints][1] = -objCoeffs[1];
  tableau[numConstraints][2] = -objCoeffs[2];
  tableau[numConstraints][totalVars] = 0; // Initial Z = 0

  const steps: SimplexStep[] = [];
  
  const getCurrentPoint = (tab: number[][], b: number[]): [number, number, number] => {
    const point: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < b.length; i++) {
      const varIdx = b[i];
      if (varIdx < 3) {
        point[varIdx] = tab[i][totalVars];
      }
    }
    return point;
  };

  // Recording initial state
  steps.push({
    tableau: tableau.map(row => [...row]),
    basis: [...basis],
    objValue: tableau[numConstraints][totalVars],
    currentPoint: getCurrentPoint(tableau, basis),
  });

  let iteration = 0;
  while (iteration < maxIterations) {
    // a. Find Pivot Column (Entering Variable)
    // Most negative value in objective row
    let pivotCol = -1;
    let minVal = -0.00000001; // Small epsilon for numeric stability
    for (let j = 0; j < totalVars; j++) {
      if (tableau[numConstraints][j] < minVal) {
        minVal = tableau[numConstraints][j];
        pivotCol = j;
      }
    }

    // Optimal if no negative values
    if (pivotCol === -1) {
      return { steps, status: 'optimal', variables: ['x', 'y', 'z', ...constraints.map((_, i) => `s${i+1}`)] };
    }

    // b. Find Pivot Row (Leaving Variable)
    // Minimum Ratio Test: b_i / a_{i, pivotCol} for all a_{i, pivotCol} > 0
    let pivotRow = -1;
    let minRatio = Infinity;
    for (let i = 0; i < numConstraints; i++) {
      if (tableau[i][pivotCol] > 0) {
        const ratio = tableau[i][totalVars] / tableau[i][pivotCol];
        if (ratio < minRatio) {
          minRatio = ratio;
          pivotRow = i;
        }
      }
    }

    // Unbounded if no positive pivot entries
    if (pivotRow === -1) {
      return { steps, status: 'unbounded', variables: ['x', 'y', 'z', ...constraints.map((_, i) => `s${i+1}`)] };
    }

    // c. Pivot operation
    const pivotVal = tableau[pivotRow][pivotCol];
    
    // Record pivot row/col for visualization before changing tableau
    steps[steps.length - 1].pivotRow = pivotRow;
    steps[steps.length - 1].pivotCol = pivotCol;

    // Normalize pivot row
    for (let j = 0; j <= totalVars; j++) {
      tableau[pivotRow][j] /= pivotVal;
    }

    // Eliminate other rows
    for (let i = 0; i <= numConstraints; i++) {
      if (i !== pivotRow) {
        const factor = tableau[i][pivotCol];
        for (let j = 0; j <= totalVars; j++) {
          tableau[i][j] -= factor * tableau[pivotRow][j];
        }
      }
    }

    // Update basis
    basis[pivotRow] = pivotCol;

    // Record step
    steps.push({
      tableau: tableau.map(row => [...row]),
      basis: [...basis],
      objValue: tableau[numConstraints][totalVars],
      currentPoint: getCurrentPoint(tableau, basis),
    });

    iteration++;
  }

  return { steps, status: 'max_iterations', variables: ['x', 'y', 'z', ...constraints.map((_, i) => `s${i+1}`)] };
}
