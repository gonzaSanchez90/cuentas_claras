import React from 'react';
import { LogOut, Loader2, TrendingUp, Wallet, ArrowUpRight, Plus } from 'lucide-react';
import { MonthConfig, Expense, Participant } from '../types';
import MonthCard from './MonthCard';
import { formatCurrency } from '../utils/format';
import { calculateBalance } from '../utils/calculations';

interface DashboardViewProps {
  user: any;
  months: MonthConfig[];
  expenses: Expense[];
  isSyncing: boolean;
  onLogout: () => void;
  onSelectMonth: (id: string) => void;
  onEditMonth: (id: string) => void;
  onDeleteMonth: (id: string) => void;
  onNewMonth: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  user, months, expenses, isSyncing, onLogout, onSelectMonth, onEditMonth, onDeleteMonth, onNewMonth 
}) => {
  return (
    <div className="w-full md:w-[90%] lg:w-[85%] max-w-[1400px] mx-auto relative pb-24 h-full">
       <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-600/10 to-transparent pointer-events-none"></div>
       <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
       <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

       <header className="bg-transparent p-10 relative z-10 flex justify-between items-center">
         <div>
           <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-2xl shadow-indigo-600/40">CC</div>
             Cuentas Claras
           </h1>
           <p className="text-slate-400 text-base font-semibold mt-2 pl-1">Gusto en verte de nuevo, <span className="text-indigo-400">{user?.name}</span></p>
         </div>
         <button onClick={onLogout} className="p-4 bg-slate-800/80 backdrop-blur-md border border-white/5 shadow-2xl text-slate-400 hover:text-rose-400 rounded-[20px] transition-all hover:scale-110 active:scale-95">
            <LogOut size={24} />
         </button>
       </header>

       <div className="px-10 py-6 relative z-10">
         <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 pl-1">Tus Gastos Compartidos</h2>

         {isSyncing && months.length === 0 ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20">
             {months.map(month => {
               const mExpenses = expenses.filter(e => e.monthId === month.id);
               const bal = calculateBalance(mExpenses, month.participants);
               const myPart = month.participants.find(p => p.userId === user?.id);
               const myBal = myPart ? bal.balances.find(b => b.participantId === myPart.id) : undefined;
               return (
                 <div key={month.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <MonthCard 
                     month={month} 
                     balance={bal} 
                     myBalance={myBal} 
                     onClick={() => onSelectMonth(month.id)} 
                     onEdit={(e) => { e.stopPropagation(); onEditMonth(month.id); }}
                     onDelete={(e) => { e.stopPropagation(); onDeleteMonth(month.id); }}
                   />
                 </div>
               );
             })}
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[32px] shadow-2xl shadow-indigo-600/20 group cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 h-full min-h-[250px]" onClick={onNewMonth}>
                <div>
                  <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/10 group-hover:rotate-90 transition-transform duration-500"><Plus size={28}/></div>
                  <h3 className="text-sm font-black text-indigo-100 uppercase tracking-widest mb-1">Nuevo Cálculo</h3>
                  <p className="text-2xl font-black text-white leading-tight">Comenzar un cálculo compartido</p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-indigo-100 font-bold text-xs uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Pulsa aquí <ArrowUpRight size={14} /></div>
             </div>
           </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            <div className="bg-[#1e293b]/50 border border-white/5 p-8 rounded-[32px] backdrop-blur-md flex items-center justify-between">
               <div>
                   <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Cálculos Activos</h3>
                   <p className="text-4xl font-black text-white leading-none">{months.length}</p>
               </div>
               <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center"><TrendingUp size={28}/></div>
            </div>
            <div className="bg-[#1e293b]/50 border border-white/5 p-8 rounded-[32px] backdrop-blur-md flex items-center justify-between">
               <div>
                   <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Total Anual Gastado</h3>
                   <p className="text-4xl font-black text-white leading-none">€{formatCurrency(expenses.reduce((a,b) => a+b.amount,0))}</p>
               </div>
               <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center"><Wallet size={28}/></div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default DashboardView;
