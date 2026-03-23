import { useState, useEffect, useMemo } from 'react';
import { Expense, MonthConfig, Participant, Category } from '../types';
import * as api from '../services/apiService';
import { calculateBalance } from '../utils/calculations';

export const useAppLogic = () => {
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
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])) as [string, Expense[]][];
  }, [filteredExpenses]);

  const activeBalance = useMemo(() => activeMonth ? calculateBalance(activeMonthExpenses, activeMonth.participants) : null, [activeMonthExpenses, activeMonth]);

  const chartData = useMemo(() => activeMonthExpenses.reduce((acc, curr) => {
    const existing = acc.find((i: any) => i.name === curr.category);
    if (existing) existing.value += curr.amount;
    else acc.push({ name: curr.category, value: curr.amount });
    return acc;
  }, [] as any[]), [activeMonthExpenses]);

  const handlers = {
    handleAuth: (token: string, userData: any) => { setUser(userData); setIsAuthenticated(true); },
    handleLogout: () => { api.logout(); setIsAuthenticated(false); setUser(null); setMonths([]); setExpenses([]); setActiveMonthId(null); },
    handleDeleteMonth: (id: string) => setDeleteConfirm({ id, type: 'month' }),
    handleConfirmDeleteMonth: async (id: string) => {
      try {
        await api.deleteMonth(id);
        setMonths(months.filter(m => m.id !== id));
        if (activeMonthId === id) setActiveMonthId(null);
        setDeleteConfirm(null);
      } catch (error) {
        alert("No tienes permisos para borrar este cálculo.");
        setDeleteConfirm(null);
      }
    },
    handleCreateMonth: async (name: string, participants: Participant[], reassignments: any, emoji?: string) => {
      try {
        setIsSyncing(true);
        const res = await api.createMonth(name, participants, emoji);
        await loadData();
        if (res && res.id) setActiveMonthId(res.id);
        setIsNewMonthModalOpen(false);
      } catch (error: any) { alert("Error al crear: " + (error.message || "Desconocido")); }
      finally { setIsSyncing(false); }
    },
    handleUpdateMonth: async (name: string, participants: Participant[], reassignments: {from: string, to: string}[] = [], emoji?: string, isClosed?: boolean) => {
      if (!activeMonthId) return;
      try {
        setIsSyncing(true);
        if (reassignments.length > 0) {
            await Promise.all(reassignments.map(r => api.reassignExpenses(activeMonthId, r.from, r.to)));
        }
        await api.updateMonth(activeMonthId, { name, participants, emoji, isClosed });
        await loadData();
      } catch (error) { alert("Error al actualizar"); }
      finally { setIsSyncing(false); }
    },
    handleSaveExpense: async (expenseData: any) => {
      if (!activeMonthId) return;
      try {
        if (editingExpense) await api.updateExpense(editingExpense.id, expenseData);
        else await api.createExpense({ monthId: activeMonthId, ...expenseData });
        await loadData();
        setIsAddModalOpen(false);
        setEditingExpense(null);
      } catch (error: any) { alert("Error al guardar: " + (error.message || "Error desconocido")); }
    },
    handleDeleteExpense: (id: string) => setDeleteConfirm({ id, type: 'expense' }),
    handleConfirmDeleteExpense: async (id: string) => {
      try {
        await api.deleteExpense(id);
        setExpenses(expenses.filter(e => e.id !== id));
        setOpenExpenseMenuId(null);
        setDeleteConfirm(null);
      } catch (error) { alert("No se pudo borrar"); setDeleteConfirm(null); }
    },
    handleJoinGroup: async (participantId: string) => {
      if (!inviteToken) return;
      try {
        await api.joinMonth(inviteToken, participantId);
        alert('Te has unido exitosamente!');
        setInviteToken(null); setInviteData(null);
        window.history.replaceState({}, '', '/');
        loadData();
      } catch (error: any) { alert(error.message || 'No se pudo unir'); }
    },
    copyInviteLink: () => {
      if (!activeMonthId) return;
      const url = `${window.location.origin}?join=${activeMonthId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return {
    state: {
      isAuthenticated, user, isLoadingInitial, months, expenses, activeMonthId,
      isAddModalOpen, isSettingsModalOpen, isNewMonthModalOpen, deleteConfirm,
      editingExpense, isSyncing, copied, openExpenseMenuId, categoryFilter,
      searchQuery, inviteToken, inviteData, activeMonth, activeMonthExpenses,
      expensesByDay, activeBalance, chartData
    },
    setters: {
      setIsAddModalOpen, setIsSettingsModalOpen, setIsNewMonthModalOpen,
      setDeleteConfirm, setEditingExpense, setOpenExpenseMenuId,
      setCategoryFilter, setSearchQuery, setActiveMonthId, setInviteToken, setInviteData
    },
    handlers
  };
};
