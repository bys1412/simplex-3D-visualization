/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronLeft, ChevronRight, Calculator, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Constraint, SimplexResult } from './types';
import { solveSimplex } from './logic/simplex';
import { calculateFeasibleVertices } from './logic/geometry';
import { SimulationView } from './components/SimulationView';
import { TableauDetail } from './components/TableauDetail';

export default function App() {
  const [objCoeffs, setObjCoeffs] = useState<[number, number, number]>([3, 2, 5]);
  const [constraints, setConstraints] = useState<Constraint[]>([
    { id: '1', coeffs: [1, 2, 1], operator: '<=', constant: 8 },
    { id: '2', coeffs: [3, 0, 2], operator: '<=', constant: 10 },
    { id: '3', coeffs: [1, 4, 0], operator: '<=', constant: 12 },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [speed, setSpeed] = useState(1); // steps per second
  const [showTableau, setShowTableau] = useState(true);

  const result = useMemo(() => solveSimplex(objCoeffs, constraints), [objCoeffs, constraints]);
  const vertices = useMemo(() => calculateFeasibleVertices(constraints), [constraints]);

  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined && isPlaying) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      const progressChange = deltaTime * speed;
      
      setAnimationProgress(prev => {
        let next = prev + progressChange;
        if (next >= 1) {
          if (currentStep < result.steps.length - 1) {
            setCurrentStep(s => s + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 1;
          }
        }
        return next;
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isPlaying, currentStep, result.steps.length, speed]);

  const handleAddConstraint = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setConstraints([...constraints, { id: newId, coeffs: [1, 1, 1], operator: '<=', constant: 5 }]);
  };

  const handleRemoveConstraint = (id: string) => {
    setConstraints(constraints.filter(c => c.id !== id));
  };

  const handleUpdateConstraint = (id: string, field: keyof Constraint | 'c0' | 'c1' | 'c2', value: any) => {
    setConstraints(constraints.map(c => {
      if (c.id === id) {
          if (field === 'c0') return { ...c, coeffs: [Number(value), c.coeffs[1], c.coeffs[2]] as [number, number, number] };
          if (field === 'c1') return { ...c, coeffs: [c.coeffs[0], Number(value), c.coeffs[2]] as [number, number, number] };
          if (field === 'c2') return { ...c, coeffs: [c.coeffs[0], c.coeffs[1], Number(value)] as [number, number, number] };
          return { ...c, [field]: field === 'constant' ? Number(value) : value };
      }
      return c;
    }));
  };

  const restart = () => {
    setCurrentStep(0);
    setAnimationProgress(0);
    setIsPlaying(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      {/* Settings Panel (Left) */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shadow-lg z-10 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-indigo-600 text-white flex items-center gap-2">
          <Calculator size={20} />
          <h1 className="font-bold text-lg tracking-tight">三维单纯形可视化</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Objective Function */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest">目标函数</h3>
              <div className="text-slate-400 cursor-help" title="三维线性规划目前支持 Max Z = cx + dy + ez">
                <Info size={14} />
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-indigo-500 mb-3 uppercase flex items-center gap-2">
                    <span>Maximize</span>
                    <span className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">Z</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs font-bold text-slate-400 mr-1">=</span>
                    {objCoeffs.map((c, i) => (
                        <React.Fragment key={i}>
                            <div className="flex flex-col w-12">
                                <input 
                                    type="number" 
                                    value={c}
                                    onChange={(e) => {
                                        const next = [...objCoeffs] as [number, number, number];
                                        next[i] = Number(e.target.value);
                                        setObjCoeffs(next);
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center font-bold"
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-500 mr-2">{['x', 'y', 'z'][i]}</span>
                            {i < 2 && <span className="text-slate-300 text-xs font-bold mr-1">+</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
          </section>

          {/* Constraints */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-widest">约束条件</h3>
              <button 
                onClick={handleAddConstraint}
                className="p-1 hover:bg-slate-100 rounded text-indigo-600 transition-colors"
                title="添加约束"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              {constraints.map((c, idx) => (
                <div key={c.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 group">
                  <button 
                    onClick={() => handleRemoveConstraint(c.id)}
                    className="absolute -top-2 -right-2 bg-white text-rose-500 p-1 rounded-full shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                  
                  <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tight">约束 #{idx + 1}</div>
                  <div className="flex flex-wrap items-center gap-1 mb-3">
                    {c.coeffs.map((val, i) => (
                      <React.Fragment key={i}>
                        <div className="flex flex-col w-12">
                          <input 
                            type="number" 
                            value={val}
                            onChange={(e) => handleUpdateConstraint(c.id, `c${i}` as any, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500 mr-1">{['x', 'y', 'z'][i]}</span>
                        {i < 2 && <span className="text-slate-300 text-xs font-bold">+</span>}
                      </React.Fragment>
                    ))}
                    
                    <div className="mx-1 text-slate-400 font-bold text-sm">≤</div>
                    
                    <div className="flex-1 min-w-[50px]">
                      <input 
                        type="number" 
                        value={c.constant}
                        onChange={(e) => handleUpdateConstraint(c.id, 'constant', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="pt-4 text-[10px] text-slate-400 italic text-center">
            * 假设变量 x, y, z ≥ 0
          </footer>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200 z-10">
            <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    result.status === 'optimal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    状态: {result.status === 'optimal' ? '已收敛' : '求解中...'}
                </span>
                <div className="h-4 w-px bg-slate-200" />
                <div className="text-sm font-medium">
                    最优解: <span className="font-mono text-indigo-600 font-bold">
                        {result.steps[result.steps.length - 1].objValue.toFixed(4)}
                    </span>
                </div>
            </div>
            
            <button 
                onClick={() => setShowTableau(!showTableau)}
                className={`p-2 rounded-lg transition-all ${showTableau ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}
                title="切换单纯形表"
            >
                <Info size={20} />
            </button>
        </header>

        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
          <SimulationView 
            steps={result.steps} 
            currentStep={currentStep} 
            objCoeffs={objCoeffs}
            vertices={vertices}
            animationProgress={animationProgress}
            constraints={constraints}
          />

          {/* Animation Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="flex items-center gap-2">
                <button 
                    onClick={restart}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <RotateCcw size={20} />
                </button>
                <button 
                    onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                    disabled={currentStep === 0}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                >
                    <SkipBack size={20} />
                </button>
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} fill="white" />}
                </button>
                <button 
                    onClick={() => setCurrentStep(prev => Math.min(result.steps.length - 1, prev + 1))}
                    disabled={currentStep === result.steps.length - 1}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                >
                    <SkipForward size={20} />
                </button>
            </div>

            <div className="flex-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">
                    <span>步骤 {currentStep + 1} / {result.steps.length}</span>
                    <span>动画进度: {Math.round(animationProgress * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-indigo-500"
                        animate={{ width: `${((currentStep + animationProgress) / (result.steps.length - 1 || 1)) * 100}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 w-32">
                <span className="text-xs font-bold text-slate-400">速度</span>
                <input 
                    type="range" 
                    min="0.1" 
                    max="3" 
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                />
            </div>
          </div>
        </div>
      </main>

      {/* Results Sidebar (Right) */}
      <AnimatePresence>
        {showTableau && (
          <motion.div 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-[400px] bg-slate-50 border-l border-slate-200 flex flex-col h-full shadow-2xl z-20"
          >
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded">
                        <Calculator size={16} />
                    </div>
                    <h2 className="font-bold text-slate-700">单纯形表迭代过程</h2>
                </div>
                <button 
                    onClick={() => setShowTableau(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {result.steps.map((step, idx) => (
                    <div key={idx} ref={idx === currentStep ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) : null}>
                        <TableauDetail 
                            step={step} 
                            iteration={idx} 
                            variables={result.variables}
                        />
                    </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
