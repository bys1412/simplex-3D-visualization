/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimplexStep } from '../types';

interface TableauDetailProps {
  step: SimplexStep;
  iteration: number;
  variables: string[];
}

export const TableauDetail: React.FC<TableauDetailProps> = ({ step, iteration, variables }) => {
  const { tableau, basis, pivotRow, pivotCol } = step;

  return (
    <div className="mb-8 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
        <h4 className="font-semibold text-slate-700">迭代 {iteration}</h4>
        <span className="text-xs text-slate-500">
          目标函数值: <span className="font-mono font-bold text-indigo-600">{step.objValue.toFixed(4)}</span>
        </span>
      </div>
      
      <div className="overflow-x-auto p-4 custom-scrollbar">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-3 py-2 border border-slate-200 font-medium text-slate-600">基变量</th>
              {variables.map((v, i) => (
                <th 
                  key={v} 
                  className={`px-3 py-2 border border-slate-200 font-medium text-slate-600 text-center ${pivotCol === i ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}`}
                >
                  {v}
                </th>
              ))}
              <th className="px-3 py-2 border border-slate-200 font-medium text-slate-600 text-center">常数 (b)</th>
            </tr>
          </thead>
          <tbody>
            {tableau.slice(0, -1).map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 border border-slate-200 font-medium text-slate-500 bg-slate-50">
                  {variables[basis[rowIndex]] || `s${rowIndex+1}`}
                </td>
                {row.map((cell, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`px-3 py-2 border border-slate-200 text-center font-mono ${
                      pivotRow === rowIndex && pivotCol === colIndex 
                        ? 'bg-yellow-200 font-bold' 
                        : (pivotRow === rowIndex || pivotCol === colIndex ? 'bg-yellow-50' : '')
                    }`}
                  >
                    {cell.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Objective Row */}
            <tr className="bg-indigo-50/50">
              <td className="px-3 py-2 border border-slate-200 font-bold text-indigo-700">Z</td>
              {tableau[tableau.length - 1].map((cell, colIndex) => (
                <td 
                  key={colIndex} 
                  className={`px-3 py-2 border border-slate-200 text-center font-mono font-semibold ${
                    colIndex === variables.length ? 'text-indigo-600' : 'text-slate-700'
                  } ${pivotCol === colIndex ? 'bg-yellow-100' : ''}`}
                >
                  {cell.toFixed(2)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      
      {pivotRow !== undefined && pivotCol !== undefined && (
          <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100 text-xs text-yellow-800">
            <strong>主元提示:</strong> 入基变量为 <span className="font-bold">{variables[pivotCol]}</span>，
            出基变量为 <span className="font-bold">{variables[basis[pivotRow]]}</span>。
          </div>
      )}
    </div>
  );
};
