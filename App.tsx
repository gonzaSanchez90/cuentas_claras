import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowLeft, MoreVertical, PieChart, Info, Loader2, LogOut } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

import { Expense, MonthConfig, User, BalanceResult } from './types';
import MonthCard from './components/MonthCard';
import AddExpenseModal from './components/AddExpenseModal';
import SettingsModal from './components/SettingsModal';
import AuthScreen from './components/AuthScreen';
import { analyzeSpendingHabits } from './services/geminiService';
import * as api from './services/apiService';

// --- Helper Functions ---
const calculateBalance = (expenses: Expense[], ratio: number): BalanceResult => {
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const paidByMe = expenses.filter(e => e.payer === User.Me).reduce((acc, curr) => acc + curr.amount, 0);
    const paidByPartner = expenses.filter(e => e.payer === User.Partner).reduce((acc, curr) => acc + curr.amount, 0);

    const myFairShare = totalSpent * (ratio / 100);
    const partnerFairShare = totalSpent * ((100 - ratio) / 100);

    const balance = paidByMe - myFairShare;

    return { totalSpent, paidByMe, paidByPartner, myFairShare, partnerFairShare, balance };
};

const App: React.FC = () => {
    // --- Auth State ---
    const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
    const [user, setUser] = useState<any>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);

    // --- Data State ---
    const [months, setMonths] = useState<MonthConfig[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [activeMonthId, setActiveMonthId] = useState<string | null>(null);

    // --- Modals & UI State ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- Bootstrapping Auth ---
    useEffect(() => {
        const checkAuth = async () => {
            if (api.isAuthenticated()) {
                try {
                    const data = await api.getMe();
                    setUser(data.user);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Token inválido", error);
                    api.logout();
                    setIsAuthenticated(false);
                }
            }
            setIsLoadingInitial(false);
        };
        checkAuth();
    }, []);

    // --- Fetch Data when Authenticated ---
    useEffect(() => {
        if (!isAuthenticated) return;

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

        loadData();
    }, [isAuthenticated]);

    // --- Handlers ---
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

    const handleCreateMonth = async (name: string, ratio: number) => {
        try {
            const newMonth = await api.createMonth(name, ratio);
            setMonths([newMonth, ...months]);
            setActiveMonthId(newMonth.id);
        } catch (error) {
            console.error(error);
            alert("Error al crear el mes");
        }
    };

    const handleUpdateMonth = async (name: string, ratio: number) => {
        if (!activeMonthId) return;
        try {
            await api.updateMonth(activeMonthId, { name, splitRatio: ratio });
            setMonths(months.map(m => m.id === activeMonthId ? { ...m, name, splitRatio: ratio } : m));
        } catch (error) {
            console.error(error);
            alert("Error al actualizar");
        }
    };

    const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'monthId'>) => {
        if (!activeMonthId) return;
        try {
            const newExpense = await api.createExpense({
                monthId: activeMonthId,
                title: expenseData.title,
                amount: expenseData.amount,
                payer: expenseData.payer,
                date: expenseData.date,
                category: expenseData.category,
                note: expenseData.note
            });
            setExpenses([newExpense, ...expenses]);
        } catch (error) {
            console.error(error);
            alert("Error al guardar el gasto");
        }
    };

    const handleAnalyze = async () => {
        if (activeExpenses.length === 0) return;
        setAiInsight("Analizando gastos con IA...");
        try {
            const result = await analyzeSpendingHabits(activeExpenses);
            setAiInsight(result);
        } catch (error) {
            setAiInsight("No se pudo analizar los gastos. Revisa tu API key.");
        }
    };

    // --- Derived Data ---
    const activeMonth = useMemo(() =>
        months.find(m => m.id === activeMonthId),
        [months, activeMonthId]);

    const activeExpenses = useMemo(() =>
        expenses
            .filter(e => e.monthId === activeMonthId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [expenses, activeMonthId]);

    const activeBalance = useMemo(() => {
        if (!activeMonth) return null;
        return calculateBalance(activeExpenses, activeMonth.splitRatio);
    }, [activeExpenses, activeMonth]);

    // --- Loading State ---
    if (isLoadingInitial) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // --- Auth State ---
    if (!isAuthenticated) {
        return <AuthScreen onAuth={handleAuth} />;
    }

    // --- Render: Dashboard (Home) ---
    if (!activeMonthId) {
        return (
            <div className="min-h-screen pb-24 max-w-lg mx-auto bg-gray-50">
                <header className="bg-white p-6 shadow-sm sticky top-0 z-10 flex justify-between items-center border-b border-gray-100">
                    <div>
                        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight">
                            SplitSmart
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Hola, {user?.name} 👋</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                        title="Cerrar Sessión"
                    >
                        <LogOut size={20} />
                    </button>
                </header>

                <div className="p-4">
                    {isSyncing && months.length === 0 ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-blue-500" size={30} />
                        </div>
                    ) : months.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="bg-blue-50 p-6 rounded-full inline-block mb-4 shadow-sm border border-blue-100">
                                <PieChart size={40} className="text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 mb-1">Tu cuenta está en cero</h3>
                            <p className="text-sm">Crea un mes para empezar a compartir gastos.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {months.map(month => {
                                const mExpenses = expenses.filter(e => e.monthId === month.id);
                                const bal = calculateBalance(mExpenses, month.splitRatio);
                                return (
                                    <MonthCard
                                        key={month.id}
                                        month={month}
                                        balance={bal}
                                        onClick={() => setActiveMonthId(month.id)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsNewMonthModalOpen(true)}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95 flex items-center gap-2 font-bold z-20 hover:-translate-y-1"
                >
                    <Plus size={24} /> <span className="pr-1">Nuevo Mes</span>
                </button>

                <SettingsModal
                    isOpen={isNewMonthModalOpen}
                    onClose={() => setIsNewMonthModalOpen(false)}
                    config={null}
                    onSave={handleCreateMonth}
                    isNew={true}
                />
            </div>
        );
    }

    // --- Render: Active Month Details ---
    const chartData = activeExpenses.reduce((acc, curr) => {
        const existing = acc.find((i: any) => i.name === curr.category);
        if (existing) {
            existing.value += curr.amount;
        } else {
            acc.push({ name: curr.category, value: curr.amount });
        }
        return acc;
    }, [] as any[]);

    return (
        <div className="min-h-screen bg-gray-50 pb-24 max-w-lg mx-auto relative">
            {/* Header */}
            <header className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 sticky top-0 z-30 shadow-lg"
                    style={{ borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setActiveMonthId(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold truncate px-4">{activeMonth?.name}</h2>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-colors">
                        <MoreVertical size={20} />
                    </button>
                </div>

                <div className="bg-white rounded-2xl p-5 text-gray-800 shadow-xl border border-gray-100/50">
                    <div className="flex justify-between items-end border-b pb-4 mb-4 border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Gastado</p>
                            <p className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                ${activeBalance?.totalSpent.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                División: {activeMonth?.splitRatio}%
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex-1 border-r border-gray-100 pr-4">
                            <p className="text-xs text-gray-400 font-bold mb-1">Pagado por ti</p>
                            <p className="text-lg font-bold">${activeBalance?.paidByMe.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Debería ser: ${activeBalance?.myFairShare.toFixed(2)}</p>
                        </div>
                        <div className="flex-1 pl-4 text-right">
                            {Math.abs(activeBalance?.balance || 0) < 0.1 ? (
                                <div className="inline-block bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                                    <p className="font-bold text-sm">Cuentas Claras ✨</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-400 font-bold mb-1">
                                        {(activeBalance?.balance || 0) > 0 ? "Te deben" : "Debes a pareja"}
                                    </p>
                                    <p className={`text-2xl font-black ${(activeBalance?.balance || 0) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        ${Math.abs(activeBalance?.balance || 0).toFixed(2)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-4 space-y-6 -mt-2">
                
                {/* AI Button */}
                <button
                    onClick={handleAnalyze}
                    className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-4 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all active:scale-[0.98]"
                >
                    <PieChart size={20} /> Analizar Hábitos con Inteligencia Artificial
                </button>

                {/* AI Insight Box */}
                {aiInsight && (
                    <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-fuchsia-500"></div>
                        <div className="flex items-start gap-3">
                            <div className="bg-purple-100 p-2 rounded-xl shrink-0 text-purple-600 mt-1">
                                <Info size={20} />
                            </div>
                            <div className="whitespace-pre-line text-sm text-gray-700 font-medium leading-relaxed">{aiInsight}</div>
                        </div>
                    </div>
                )}

                {/* Chart */}
                {activeExpenses.length > 0 && (
                    <div className="h-56 w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Gasto por Categoría</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" hide />
                                <YAxis hide />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    cursor={{fill: 'rgba(243, 244, 246, 0.4)'}}
                                />
                                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Expense List */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Historial de Transacciones</h3>
                    <div className="space-y-3">
                        {activeExpenses.length === 0 && (
                            <div className="bg-white p-6 rounded-2xl text-center border border-gray-100 border-dashed">
                                <p className="text-gray-400 font-medium">No hay gastos aún en este mes.</p>
                            </div>
                        )}
                        {activeExpenses.map(expense => (
                            <div key={expense.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shadow-inner ${expense.payer === User.Me ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 border border-blue-200' : 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 border border-purple-200'}`}>
                                        {expense.payer === User.Me ? 'YO' : 'PAR'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm mb-0.5">{expense.title}</p>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">{expense.category}</span>
                                            <span className="text-gray-300">•</span>
                                            <span>{expense.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    ${expense.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Add Button */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-xl shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 z-20"
            >
                <Plus size={28} />
            </button>

            {/* Modals */}
            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddExpense}
                defaultPayer={User.Me}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                config={activeMonth || null}
                onSave={handleUpdateMonth}
            />
        </div>
    );
};

export default App;