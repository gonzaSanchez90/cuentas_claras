import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowLeft, MoreVertical, PieChart, Info, Loader2, LogOut, Copy, CheckCircle2, Settings, Edit2, Trash2, Filter, Search, X, TrendingUp, Wallet, ArrowUpRight, Banknote, Hourglass, Award, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

import { Expense, MonthConfig, BalanceResult, Participant, ParticipantBalance, Category } from './types';
import MonthCard from './components/MonthCard';
import AddExpenseModal from './components/AddExpenseModal';
import SettingsModal from './components/SettingsModal';
import AuthScreen from './components/AuthScreen';
import * as api from './services/apiService';

const calculateBalance = (expenses: Expense[], participants: Participant[]): BalanceResult => {
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const paidSums: Record<string, number> = {};
  participants.forEach(p => { paidSums[p.id!] = 0; });

  expenses.forEach(e => {
      if (paidSums[e.payerParticipantId] !== undefined) {
          paidSums[e.payerParticipantId] += e.amount;
      }
  });

  const balances = participants.map(p => {
      const totalPaid = paidSums[p.id!] || 0;
      const fairShare = totalSpent * (p.splitPercentage / 100);
      return {
          participantId: p.id!,
          name: p.name,
          totalPaid,
          fairShare,
          balance: totalPaid - fairShare,
          splitPercentage: p.splitPercentage
      };
  });

  const finalBalances = balances.map(p => ({
      ...p,
      owesTo: [] as { name: string, amount: number }[]
  }));

  const debtors = finalBalances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
  const creditors = finalBalances.filter(b => b.balance > 0.01).map(b => ({ ...b }));

  debtors.forEach(debtor => {
      let amountToSettle = Math.abs(debtor.balance);
      creditors.forEach(creditor => {
          if (amountToSettle <= 0 || creditor.balance <= 0) return;
          const transfer = Math.min(amountToSettle, creditor.balance);
          
          const debtorInResult = finalBalances.find(b => b.participantId === debtor.participantId);
          if (debtorInResult) {
              debtorInResult.owesTo.push({ name: creditor.name, amount: transfer });
          }
          
          creditor.balance -= transfer;
          amountToSettle -= transfer;
      });
  });

  return { totalSpent, balances: finalBalances.sort((a,b) => b.balance - a.balance) };
};

const formatDateLong = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatCurrency = (amount: number) => {
  const isInteger = Math.abs(amount - Math.round(amount)) < 0.001;
  return isInteger
    ? amount.toLocaleString('es-ES', { maximumFractionDigits: 0 }) 
    : amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState<any>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [months, setMonths] = useState<MonthConfig[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'month' | 'expense' } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openExpenseMenuId, setOpenExpenseMenuId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) setInviteToken(joinId);

    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const data = await api.getMe();
          setUser(data.user);
          setIsAuthenticated(true);
        } catch (error) {
          api.logout();
          setIsAuthenticated(false);
        }
      }
      setIsLoadingInitial(false);
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    setIsSyncing(true);
    try {
      const [monthsData, expensesData] = await Promise.all([
        api.fetchMonths(),
        api.fetchExpenses()
      ]);
      setMonths(monthsData);
      setExpenses(expensesData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    if (inviteToken) {
      api.fetchMonthInvite(inviteToken).then(data => {
        setInviteData(data);
      }).catch(() => {
        alert('Enlace invalido o caducado');
        setInviteToken(null);
        window.history.replaceState({}, '', '/');
        loadData();
      });
    } else {
      loadData();
    }
  }, [isAuthenticated, inviteToken]);

  const handleAuth = (token: string, userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUser(null);
    setMonths([]);
    setExpenses([]);
    setActiveMonthId(null);
  };

  const handleDeleteMonth = (id: string) => {
    setDeleteConfirm({ id, type: 'month' });
  };

  const confirmDeleteMonth = async (id: string) => {
    try {
      await api.deleteMonth(id);
      setMonths(months.filter(m => m.id !== id));
      if (activeMonthId === id) setActiveMonthId(null);
      setDeleteConfirm(null);
    } catch (error) {
      alert("No tienes permisos para borrar este cálculo.");
      setDeleteConfirm(null);
    }
  };

  const handleCreateMonth = async (name: string, participants: Participant[], reassignments: any, emoji?: string) => {
    try {
      setIsSyncing(true);
      const res = await api.createMonth(name, participants, emoji);
      await loadData();
      if (res && res.id) setActiveMonthId(res.id);
      setIsNewMonthModalOpen(false);
    } catch (error: any) {
      alert("Error al crear el cálculo: " + (error.message || "Desconocido"));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateMonth = async (name: string, participants: Participant[], reassignments: {from: string, to: string}[] = [], emoji?: string, isClosed?: boolean) => {
    if (!activeMonthId) return;
    try {
      setIsSyncing(true);
      if (reassignments.length > 0) {
          await Promise.all(reassignments.map(r => api.reassignExpenses(activeMonthId, r.from, r.to)));
      }
      await api.updateMonth(activeMonthId, { name, participants, emoji, isClosed });
      await loadData();
    } catch (error) {
      alert("Error al actualizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveExpense = async (expenseData: any) => {
    if (!activeMonthId) return;
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, expenseData);
      } else {
        await api.createExpense({
          monthId: activeMonthId,
          ...expenseData
        });
      }
      await loadData();
      setIsAddModalOpen(false);
      setEditingExpense(null);
    } catch (error: any) {
      alert("Error al guardar el gasto: " + (error.message || "Error desconocido"));
    }
  };

  const handleDeleteExpense = (id: string) => {
    setDeleteConfirm({ id, type: 'expense' });
  };

  const confirmDeleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      setExpenses(expenses.filter(e => e.id !== id));
      setOpenExpenseMenuId(null);
      setDeleteConfirm(null);
    } catch (error) {
      alert("No se pudo borrar");
      setDeleteConfirm(null);
    }
  };

  const handleJoinGroup = async (participantId: string) => {
    if (!inviteToken) return;
    try {
      await api.joinMonth(inviteToken, participantId);
      alert('Te has unido exitosamente!');
      setInviteToken(null);
      setInviteData(null);
      window.history.replaceState({}, '', '/');
      loadData();
    } catch (error: any) {
      alert(error.message || 'No se pudo unir');
    }
  };

  const copyInviteLink = () => {
    if (!activeMonthId) return;
    const url = `${window.location.origin}?join=${activeMonthId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeMonth = useMemo(() => months.find(m => m.id === activeMonthId), [months, activeMonthId]);
  const activeMonthExpenses = useMemo(() => expenses.filter(e => e.monthId === activeMonthId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [expenses, activeMonthId]);
  
  const filteredExpenses = useMemo(() => {
      return activeMonthExpenses.filter(e => {
          const matchCategory = !categoryFilter || e.category === categoryFilter;
          const matchSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase());
          return matchCategory && matchSearch;
      });
  }, [activeMonthExpenses, categoryFilter, searchQuery]);

  const expensesByDay = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(e => {
        if (!groups[e.date]) groups[e.date] = [];
        groups[e.date].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  const activeBalance = useMemo(() => activeMonth ? calculateBalance(activeMonthExpenses, activeMonth.participants) : null, [activeMonthExpenses, activeMonth]);

  const chartData = useMemo(() => activeMonthExpenses.reduce((acc, curr) => {
    const existing = acc.find((i: any) => i.name === curr.category);
    if (existing) existing.value += curr.amount;
    else acc.push({ name: curr.category, value: curr.amount });
    return acc;
  }, [] as any[]), [activeMonthExpenses]);

  if (isLoadingInitial) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0f172a]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;
  }

  if (!isAuthenticated) return <AuthScreen onAuth={handleAuth} />;

  if (inviteToken && inviteData) {
    return (
      <div className="min-h-screen pb-24 max-w-lg mx-auto bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] p-6 rounded-[24px] shadow-2xl border border-slate-700 w-full animate-in fade-in slide-in-from-bottom-4">
           <h2 className="text-xl font-bold text-center text-slate-100 mb-2">Has sido invitado a compartir</h2>
           <h3 className="text-3xl font-black text-center text-indigo-400 mb-6">{inviteData.name}</h3>
           <p className="text-sm text-slate-400 mb-4 text-center">¿Que perfil de participante eres?</p>
           <div className="space-y-3">
             {inviteData.availableSlots.map((slot: any) => (
                <button key={slot.id} onClick={() => handleJoinGroup(slot.id)} className="w-full bg-[#0f172a] hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white font-bold py-4 rounded-xl transition-all shrink-0 outline-none">
                  Soy {slot.name}
                </button>
             ))}
           </div>
           <button onClick={() => { setInviteToken(null); window.history.replaceState({}, '', '/'); loadData(); }} className="mt-6 w-full text-center text-slate-500 font-medium hover:text-slate-300 outline-none">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] w-full mx-auto relative overflow-x-hidden">
      {!activeMonthId ? (
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
             <button onClick={handleLogout} className="p-4 bg-slate-800/80 backdrop-blur-md border border-white/5 shadow-2xl text-slate-400 hover:text-rose-400 rounded-[20px] transition-all hover:scale-110 active:scale-95">
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
                         onClick={() => { setActiveMonthId(month.id); setCategoryFilter(null); setSearchQuery(''); }} 
                         onEdit={() => { setActiveMonthId(month.id); setIsSettingsModalOpen(true); }}
                         onDelete={() => handleDeleteMonth(month.id)}
                       />
                     </div>
                   );
                 })}
                 <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[32px] shadow-2xl shadow-indigo-600/20 group cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 h-full min-h-[250px]" onClick={() => setIsNewMonthModalOpen(true)}>
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
      ) : (
        <div className="w-full md:w-[90%] lg:w-[85%] max-w-[1400px] mx-auto border-x border-white/5 md:shadow-2xl md:shadow-black/40 pb-24 min-h-screen">
          <header className="bg-[#0f172a] px-6 pt-10 pb-8 shadow-xl relative z-30 rounded-b-[40px] border-b border-white/5">
            <div className="flex justify-between items-center mb-10">
              <button onClick={() => { setActiveMonthId(null); setSearchQuery(''); }} className="p-3 border border-slate-700 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 outline-none shadow-sm">
                <ArrowLeft size={18} />
              </button>
              <div className="text-center flex-1 mx-4 overflow-hidden">
                 <h2 className="text-lg md:text-2xl font-black text-white truncate leading-tight uppercase tracking-tight">{activeMonth?.name}</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{activeMonth?.participants.length} Participantes</p>
              </div>
              <button onClick={() => setIsSettingsModalOpen(true)} className="p-3 border border-slate-700 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 outline-none shadow-sm">
                <Settings size={18} />
              </button>
            </div>

            <div className="text-center mb-10">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Total Gastado Grupal</p>
                <p className="text-5xl md:text-7xl font-black tracking-tighter text-white">€{formatCurrency(activeBalance?.totalSpent || 0)}</p>
                <div className="flex flex-wrap justify-center gap-3 mt-6 px-4">
                    <button onClick={copyInviteLink} className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all outline-none shadow-lg tracking-widest uppercase">
                       {copied ? <CheckCircle2 size={16} className="text-emerald-400"/> : <Copy size={16} />} 
                       {copied ? 'Link Copiado' : 'Invitar Amigos'}
                    </button>
                    <button 
                      onClick={() => handleUpdateMonth(activeMonth?.name || '', activeMonth?.participants || [], [], activeMonth?.emoji || '📅', !activeMonth?.isClosed)} 
                      className={`inline-flex items-center gap-2 border px-5 py-2.5 rounded-xl text-xs font-black transition-all outline-none shadow-lg tracking-widest uppercase ${activeMonth?.isClosed ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                       <CheckCircle2 size={16} /> 
                       {activeMonth?.isClosed ? 'Cuentas Saldadas' : 'Saldar Cuentas'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                 {activeBalance?.balances.map((b, i) => (
                    <div key={b.participantId} className={`p-6 rounded-[28px] border bg-slate-900 border-slate-800 flex flex-col justify-between shadow-xl transition-all hover:scale-[1.02] cursor-default relative overflow-hidden group`}>
                       <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12 transition-transform group-hover:rotate-0 duration-700 pointer-events-none">
                          {Math.abs(b.balance) < 0.1 ? <Award size={100} /> : b.balance > 0 ? <Banknote size={100} /> : <Hourglass size={100} />}
                       </div>
                       <div className="flex justify-between items-start mb-4 relative z-10">
                         <p className="font-black text-base text-slate-200 truncate pr-2">{b.name} {activeMonth?.isClosed && ' 😊'}</p>
                         <span className="text-[10px] bg-slate-900 border border-slate-700 text-indigo-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">{b.splitPercentage}%</span>
                       </div>
                       <div className="relative z-10">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lleva Gastado</p>
                          <p className="text-3xl font-black text-white shrink-0">€{formatCurrency(b.totalPaid)}</p>
                       </div>
                       <div className="mt-5 pt-5 border-t border-white/5 relative z-10">
                          <p className="text-[11px] text-slate-400 font-bold tracking-tight">Le corresponde aportar: €{formatCurrency(b.fairShare)}</p>
                          {Math.abs(b.balance) < 0.1 ? (
                              <p className="text-xs font-black text-emerald-500 mt-2 uppercase tracking-[0.15em] flex items-center gap-1.5"><CheckCircle2 size={12} /> Cuentas Claras</p>
                          ) : (
                              <div className="mt-2 space-y-1">
                                 <p className={`text-sm font-black uppercase tracking-wide px-3 py-1.5 rounded-xl inline-block ${activeMonth?.isClosed ? 'bg-emerald-500/10 text-emerald-400' : (b.balance > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400')}`}>
                                     {activeMonth?.isClosed ? (b.balance > 0 ? 'Deuda Cobrada' : 'Deuda Pagada') : (b.balance > 0 ? `Le deben €${formatCurrency(Math.abs(b.balance))}` : `Debe €${formatCurrency(Math.abs(b.balance))}`)}
                                 </p>
                                 {b.balance < 0 && (b as any).owesTo?.length > 0 && (
                                     <div className="pl-1 pt-1 space-y-0.5">
                                        {(b as any).owesTo.map((debt: any, idx: number) => (
                                            <p key={idx} className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${activeMonth?.isClosed ? 'text-emerald-500 opacity-60' : 'text-slate-500'}`}>
                                                {activeMonth?.isClosed ? <CheckCircle2 size={10} /> : '💰'} {activeMonth?.isClosed ? 'Saldado con ' : 'debe a '} <span className={activeMonth?.isClosed ? '' : 'text-slate-300'}>{debt.name}</span> {(b as any).owesTo.length > 1 && <span className={activeMonth?.isClosed ? 'ml-1' : 'text-indigo-400/60 ml-1'}>€{formatCurrency(debt.amount)}</span>}
                                            </p>
                                        ))}
                                     </div>
                                 )}
                              </div>
                          )}
                       </div>
                    </div>
                 ))}
            </div>
          </header>

          <div className="p-6 md:p-10 relative z-10" onClick={() => setOpenExpenseMenuId(null)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    <button onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 md:py-5 rounded-2xl md:rounded-[24px] text-base md:text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 transition-all outline-none hover:-translate-y-1">
                        <Plus size={20} className="md:w-6 md:h-6" /> Añadir Gasto
                    </button>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"><Search size={18} className="md:w-5 md:h-5" /></div>
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nombre o categoría" className="w-full pl-12 pr-10 py-3.5 md:py-5 bg-slate-900/50 border border-slate-800 rounded-xl md:rounded-[24px] text-sm md:text-base text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all shadow-inner backdrop-blur-sm" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-full transition-all"><X size={20} /></button>}
                    </div>

                    <div className="overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 pl-1"><Filter size={14} className="text-slate-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Categoría</h3></div>
                        <div className="flex flex-wrap gap-2.5">
                            <button onClick={() => setCategoryFilter(null)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap border transition-all uppercase tracking-wider ${!categoryFilter ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:border-indigo-500/30 hover:text-slate-200'}`}>Ver Todos</button>
                            {Object.values(Category).filter(cat => activeMonthExpenses.some(e => e.category === cat)).map(cat => (
                                <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap border transition-all uppercase tracking-wider flex items-center gap-2 ${categoryFilter === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:border-indigo-500/30 hover:text-slate-200'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-10">
                        {expensesByDay.length === 0 ? (
                            <div className="bg-slate-900/30 p-20 rounded-[40px] text-center border-2 border-slate-800 border-dashed"><p className="text-slate-500 font-bold text-lg text-center">No se encontraron movimientos</p></div>
                        ) : (
                            expensesByDay.map(([date, dayExpenses]) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex items-center gap-4"><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] bg-indigo-500/5 px-5 py-2 rounded-2xl border border-indigo-500/10 shadow-sm whitespace-nowrap">{formatDateLong(date)}</h4><div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div></div>
                                    <div className="space-y-3">
                                        {dayExpenses.map(expense => (
                                            <div key={expense.id} className={`bg-[#1e293b]/40 p-3.5 md:p-5 rounded-2xl md:rounded-[28px] border border-slate-800/80 flex justify-between items-center shadow-lg hover:bg-slate-800 hover:border-indigo-500/20 transition-all cursor-pointer group relative active:scale-[0.99] ${openExpenseMenuId === expense.id ? 'z-40 border-indigo-500/30 bg-slate-800' : 'z-auto'}`}>
                                                <div className="flex gap-3 md:gap-5 items-center overflow-hidden flex-1">
                                                    <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-[20px] bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center font-black text-[10px] md:text-sm uppercase shadow-inner group-hover:bg-slate-800 transition-colors">{(expense.payerName || ' ').substring(0,2)}</div>
                                                    <div className="truncate pr-4"><p className="font-bold text-slate-100 text-sm md:text-lg mb-0.5 truncate">{expense.title}</p><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{expense.category}</p></div>
                                                </div>
                                                <div className="flex items-center gap-3 md:gap-5">
                                                    <div className="text-right shrink-0"><p className="font-black text-slate-100 text-base md:text-2xl tracking-tighter">€{formatCurrency(expense.amount)}</p><p className="text-[10px] text-indigo-400 font-black uppercase mt-0.5 tracking-[0.1em]">{expense.payerName}</p></div>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenExpenseMenuId(openExpenseMenuId === expense.id ? null : expense.id); }} className="p-3 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all"><MoreVertical size={22} /></button>
                                                </div>
                                                {openExpenseMenuId === expense.id && (
                                                    <div className="absolute right-12 top-14 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 py-2 min-w-[150px] animate-in fade-in zoom-in-95 duration-100">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); setIsAddModalOpen(true); setOpenExpenseMenuId(null); }} className="w-full px-5 py-3 text-left text-sm font-bold text-slate-200 hover:bg-white/5 flex items-center gap-3 transition-colors"><Edit2 size={16} className="text-indigo-400" /> Editar Gasto</button>
                                                        <div className="h-px bg-white/5 mx-2 my-1"></div>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense.id); }} className="w-full px-5 py-3 text-left text-sm font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors"><Trash2 size={16} /> Eliminar</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                <div className="hidden lg:block sticky top-32 space-y-8">
                    {chartData.length > 0 && (
                    <div className="bg-[#1e293b]/60 p-8 rounded-[40px] border border-white/5 shadow-2xl backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8 px-2"><h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Distribución por Categoría</h3><PieChart size={18} className="text-indigo-500" /></div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'black'}} interval={0} />
                                <YAxis hide domain={[0, 'auto']} />
                                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{backgroundColor: '#1e293b', borderRadius: '24px', border: '1px solid #334155', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'}} />
                                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                                {chartData.map((entry, index) => <Cell key={index} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />)}
                                <LabelList dataKey="value" position="top" content={(props: any) => (<text x={props.x + props.width / 2} y={props.y - 15} fill="#fff" fontSize={12} fontWeight="900" textAnchor="middle">€{props.value.toFixed(0)}</text>)} />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Modals */}
      {activeMonth && (
         <AddExpenseModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingExpense(null); }} onSave={handleSaveExpense} participants={activeMonth.participants} expenseToEdit={editingExpense} currentUser={user} />
      )}
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} config={activeMonth || null} onSave={handleUpdateMonth} currentUser={user || undefined} expenses={activeMonthExpenses} />
      <SettingsModal isOpen={isNewMonthModalOpen} onClose={() => setIsNewMonthModalOpen(false)} config={null} onSave={handleCreateMonth} isNew={true} currentUser={user || undefined} />

      {deleteConfirm && (
           <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setDeleteConfirm(null)}></div>
              <div className={`border border-white/10 w-full max-w-sm rounded-[32px] shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden text-center p-8 ${deleteConfirm.type === 'month' ? 'bg-[#1e293b]' : 'bg-slate-900 border-slate-800'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border ${deleteConfirm.type === 'month' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {deleteConfirm.type === 'month' ? <Trash2 size={32} /> : <AlertCircle size={32} />}
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{deleteConfirm.type === 'month' ? '¿Borrar grupo?' : '¿Borrar gasto?'}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">{deleteConfirm.type === 'month' ? 'Se borrarán todos los movimientos y personas de este mes permanentemente.' : 'Este movimiento se eliminará del registro actual.'}</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={() => deleteConfirm.type === 'month' ? confirmDeleteMonth(deleteConfirm.id) : confirmDeleteExpense(deleteConfirm.id)} className={`w-full text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all outline-none ${deleteConfirm.type === 'month' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'}`}>{deleteConfirm.type === 'month' ? 'Eliminar Ahora' : 'Confirmar Borrado'}</button>
                      <button onClick={() => setDeleteConfirm(null)} className="w-full bg-white/5 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-white transition-all outline-none">Cancelar</button>
                  </div>
              </div>
           </div>
       )}

      <style>{`
         .hide-scrollbar::-webkit-scrollbar { display: none; }
         .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100,100,255,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;