import { useState, useEffect, useMemo } from 'react';
import { Expense, MonthConfig, Participant, Category } from '../types';
import * as api from '../services/apiService';
import { calculateBalance } from '../utils/calculations';

type SettingsMode = 'full' | 'details' | 'participants';
type AppNotice = { type: 'success' | 'error' | 'info'; message: string } | null;

export const useAppLogic = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState<any>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [months, setMonths] = useState<MonthConfig[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<SettingsMode>('full');
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
  const [pendingParticipantId, setPendingParticipantId] = useState<string | null>(null);
  const [pendingParticipantName, setPendingParticipantName] = useState<string | null>(null);
  const [notice, setNotice] = useState<AppNotice>(null);
  const [currencySymbol, setCurrencySymbolInternal] = useState<string>(() => localStorage.getItem('cc_currency') ?? '€');
  const setCurrencySymbol = (symbol: string) => { localStorage.setItem('cc_currency', symbol); setCurrencySymbolInternal(symbol); };

  const buildInviteUrl = (monthId: string) => `${window.location.origin}/index.html#invite=${monthId}`;
  const showNotice = (type: 'success' | 'error' | 'info', message: string) => setNotice({ type, message });

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
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashMatch = window.location.hash.match(/^#invite=([^&]+)$/);
    const pathMatch = window.location.pathname.match(/^\/invite\/([^/]+)$/);
    const joinId = hashMatch?.[1] || pathMatch?.[1] || params.get('join');
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
    if (inviteToken) {
      api.fetchMonthInvite(inviteToken).then(data => {
        setInviteData(data);
      }).catch(() => {
        showNotice('error', 'Enlace invalido o caducado.');
        setInviteToken(null);
        window.history.replaceState({}, '', '/index.html');
        if (isAuthenticated) loadData();
      });
    } else {
      if (isAuthenticated) loadData();
    }
  }, [inviteToken, isAuthenticated]);

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
  }, [] as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)), [activeMonthExpenses]);

  const handlers = {
    handleAuth: async (token: string, userData: any) => { 
      setUser(userData); 
      setIsAuthenticated(true); 
      if (pendingParticipantId && inviteToken) {
        try {
          await api.joinMonth(inviteToken, pendingParticipantId);
          showNotice('success', 'Cuenta creada y unida al grupo exitosamente.');
          setInviteToken(null); setInviteData(null); setPendingParticipantId(null); setPendingParticipantName(null);
          window.history.replaceState({}, '', '/index.html');
          loadData();
        } catch (error: any) {
          showNotice('error', error.message || 'No se pudo unir al grupo automáticamente.');
          setInviteToken(null); setInviteData(null); setPendingParticipantId(null); setPendingParticipantName(null);
          window.history.replaceState({}, '', '/index.html');
          loadData();
        }
      }
    },
    handleLogout: () => { api.logout(); setIsAuthenticated(false); setUser(null); setMonths([]); setExpenses([]); setActiveMonthId(null); },
    handleDeleteMonth: (id: string) => setDeleteConfirm({ id, type: 'month' }),
    handleConfirmDeleteMonth: async (id: string) => {
      try {
        await api.deleteMonth(id);
        setMonths(months.filter(m => m.id !== id));
        if (activeMonthId === id) setActiveMonthId(null);
        setDeleteConfirm(null);
        showNotice('success', 'Cálculo eliminado.');
      } catch (error) {
        showNotice('error', 'No tienes permisos para borrar este cálculo.');
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
        showNotice('success', 'Cálculo creado correctamente.');
        return true;
      } catch (error: any) {
        showNotice('error', 'Error al crear: ' + (error.message || 'Desconocido'));
        return false;
      } finally { setIsSyncing(false); }
    },
    handleUpdateMonth: async (name: string, participants: Participant[], reassignments: {from: string, to: string}[] = [], emoji?: string, isClosed?: boolean) => {
      if (!activeMonthId) return false;
      try {
        setIsSyncing(true);
        if (reassignments.length > 0) {
            await Promise.all(reassignments.map(r => api.reassignExpenses(activeMonthId, r.from, r.to)));
        }
        await api.updateMonth(activeMonthId, { name, participants, emoji, isClosed });
        await loadData();
        showNotice('success', isClosed !== undefined ? 'Cálculo actualizado.' : 'Cambios guardados.');
        return true;
      } catch (error: any) {
        showNotice('error', error.message || 'No se pudieron guardar los cambios.');
        return false;
      }
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
        showNotice('success', editingExpense ? 'Gasto actualizado.' : 'Gasto añadido.');
      } catch (error: any) { showNotice('error', 'Error al guardar: ' + (error.message || 'Error desconocido')); }
    },
    handleDeleteExpense: (id: string) => setDeleteConfirm({ id, type: 'expense' }),
    handleConfirmDeleteExpense: async (id: string) => {
      try {
        await api.deleteExpense(id);
        setExpenses(expenses.filter(e => e.id !== id));
        setOpenExpenseMenuId(null);
        setDeleteConfirm(null);
        showNotice('success', 'Gasto eliminado.');
      } catch (error) { showNotice('error', 'No se pudo borrar.'); setDeleteConfirm(null); }
    },
    handleJoinSlot: (slotId: string, slotName: string) => {
      if (!isAuthenticated) {
        setPendingParticipantId(slotId);
        setPendingParticipantName(slotName);
      } else {
        handlers.handleJoinGroup(slotId);
      }
    },
    handleJoinGroup: async (participantId: string) => {
      if (!inviteToken) return;
      try {
        await api.joinMonth(inviteToken, participantId);
        showNotice('success', 'Te has unido exitosamente.');
        setInviteToken(null); setInviteData(null); setPendingParticipantId(null); setPendingParticipantName(null);
        window.history.replaceState({}, '', '/index.html');
        loadData();
      } catch (error: any) { 
        showNotice('error', error.message || 'No se pudo unir.'); 
        setInviteToken(null); setInviteData(null); setPendingParticipantId(null); setPendingParticipantName(null);
        window.history.replaceState({}, '', '/index.html');
        if (isAuthenticated) loadData();
      }
    },
    handleSendEmailInvite: async (email: string) => {
      if (!activeMonthId) return;
      try {
        const link = buildInviteUrl(activeMonthId);
        const result = await api.sendEmailInvite(activeMonthId, email, link);
        showNotice('success', result?.message || 'Invitación enviada correctamente.');
      } catch (error: any) {
        showNotice('error', error.message || 'Error enviando email');
      }
    },
    copyInviteLink: () => {
      if (!activeMonthId) return;
      const url = buildInviteUrl(activeMonthId);
      
      // Fallback robust copy
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
          document.execCommand('copy');
          setCopied(true);
            showNotice('success', 'Link de invitación copiado.');
      } catch (err) {
          console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          showNotice('success', 'Link de invitación copiado.');
        }).catch(err => console.error('Clipboard API failed', err));
      }

      setTimeout(() => setCopied(false), 2000);
    }
  };

  return {
    state: {
      isAuthenticated, user, isLoadingInitial, months, expenses, activeMonthId,
      isAddModalOpen, isSettingsModalOpen, isNewMonthModalOpen, deleteConfirm,
      editingExpense, isSyncing, copied, openExpenseMenuId, categoryFilter,
      searchQuery, inviteToken, inviteData, pendingParticipantId, pendingParticipantName, activeMonth, activeMonthExpenses,
      settingsMode, notice, currencySymbol,
      expensesByDay, activeBalance, chartData
    },
    setters: {
      setIsAddModalOpen, setIsSettingsModalOpen, setIsNewMonthModalOpen,
      setDeleteConfirm, setEditingExpense, setOpenExpenseMenuId,
      setCategoryFilter, setSearchQuery, setActiveMonthId, setInviteToken, setInviteData,
      setSettingsMode, setNotice, setCurrencySymbol,
      setPendingParticipantId, setPendingParticipantName
    },
    handlers
  };
};
