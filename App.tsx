import React from 'react';
import { Loader2 } from 'lucide-react';

import DashboardView from './components/DashboardView';
import MonthDetailView from './components/MonthDetailView';
import AddExpenseModal from './components/AddExpenseModal';
import SettingsModal from './components/SettingsModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import { useAppLogic } from './hooks/useAppLogic';

const App: React.FC = () => {
  const { state, setters, handlers } = useAppLogic();

  if (state.isLoadingInitial) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0f172a]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;
  }

  if (state.inviteToken && state.inviteData && !state.pendingParticipantId) {
    return (
      <div className="min-h-screen pb-24 max-w-lg mx-auto bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] p-6 rounded-[24px] shadow-2xl border border-slate-700 w-full animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-center text-slate-100 mb-2">Has sido invitado a compartir</h2>
          <h3 className="text-3xl font-black text-center text-indigo-400 mb-6">{state.inviteData.name}</h3>
          <p className="text-sm text-slate-400 mb-4 text-center">¿Que perfil de participante eres?</p>
          <div className="space-y-3">
            {state.inviteData.availableSlots.map((slot: any) => (
              <button key={slot.id} onClick={() => handlers.handleJoinSlot(slot.id, slot.name)} className="w-full bg-[#0f172a] hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white font-bold py-4 rounded-xl transition-all shrink-0 outline-none">
                Soy {slot.name}
              </button>
            ))}
          </div>
          <button onClick={() => { setters.setInviteToken(null); window.history.replaceState({}, '', '/'); }} className="mt-6 w-full text-center text-slate-500 font-medium hover:text-slate-300 outline-none">Rechazar invitación</button>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) return <AuthScreen onAuth={handlers.handleAuth} initialName={state.pendingParticipantName || undefined} />;

  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] w-full mx-auto relative overflow-x-hidden">
      {!state.activeMonthId ? (
        <DashboardView
          user={state.user}
          months={state.months}
          expenses={state.expenses}
          isSyncing={state.isSyncing}
          onLogout={handlers.handleLogout}
          onSelectMonth={setters.setActiveMonthId}
          onEditMonth={(id) => { setters.setActiveMonthId(id); setters.setSettingsMode('details'); setters.setIsSettingsModalOpen(true); }}
          onManageParticipants={(id) => { setters.setActiveMonthId(id); setters.setSettingsMode('participants'); setters.setIsSettingsModalOpen(true); }}
          onDeleteMonth={handlers.handleDeleteMonth}
          onNewMonth={() => setters.setIsNewMonthModalOpen(true)}
          currencySymbol={state.currencySymbol}
          onSetCurrency={setters.setCurrencySymbol}
        />
      ) : (
        state.activeMonth && (
          <MonthDetailView
            activeMonth={state.activeMonth}
            activeBalance={state.activeBalance}
            activeMonthExpenses={state.activeMonthExpenses}
            expensesByDay={state.expensesByDay}
            chartData={state.chartData}
            categoryFilter={state.categoryFilter}
            searchQuery={state.searchQuery}
            copied={state.copied}
            openExpenseMenuId={state.openExpenseMenuId}
            currencySymbol={state.currencySymbol}
            onSetCurrency={setters.setCurrencySymbol}
            onBack={() => { setters.setActiveMonthId(null); setters.setSearchQuery(''); }}
            onEditDetails={() => { setters.setSettingsMode('details'); setters.setIsSettingsModalOpen(true); }}
            onManageParticipants={() => { setters.setSettingsMode('participants'); setters.setIsSettingsModalOpen(true); }}
            onSettle={() => handlers.handleUpdateMonth(state.activeMonth?.name || '', state.activeMonth?.participants || [], [], state.activeMonth?.emoji || '📅', !state.activeMonth?.isClosed)}
            onCopyLink={handlers.copyInviteLink}
            onAddExpense={() => { setters.setEditingExpense(null); setters.setIsAddModalOpen(true); }}
            onSearch={setters.setSearchQuery}
            onCategoryFilter={setters.setCategoryFilter}
            onEditExpense={(e) => { setters.setEditingExpense(e); setters.setIsAddModalOpen(true); }}
            onDeleteExpense={handlers.handleDeleteExpense}
            onSetOpenMenu={setters.setOpenExpenseMenuId}
            onSendEmailInvite={handlers.handleSendEmailInvite}
          />
        )
      )}

      {/* Shared Modals */}
      {state.activeMonth && (
        <AddExpenseModal
          isOpen={state.isAddModalOpen}
          onClose={() => { setters.setIsAddModalOpen(false); setters.setEditingExpense(null); }}
          onSave={handlers.handleSaveExpense}
          participants={state.activeMonth.participants}
          expenseToEdit={state.editingExpense}
          currentUser={state.user}
        />
      )}
      <SettingsModal
        isOpen={state.isSettingsModalOpen}
        onClose={() => setters.setIsSettingsModalOpen(false)}
        config={state.activeMonth || null}
        onSave={state.activeMonthId ? handlers.handleUpdateMonth : handlers.handleCreateMonth}
        mode={state.settingsMode}
        currentUser={state.user || undefined}
        expenses={state.activeMonthExpenses}
      />
      <SettingsModal
        isOpen={state.isNewMonthModalOpen}
        onClose={() => setters.setIsNewMonthModalOpen(false)}
        config={null}
        onSave={handlers.handleCreateMonth}
        isNew={true}
        currentUser={state.user || undefined}
      />

      {state.deleteConfirm && (
        <DeleteConfirmationModal
          type={state.deleteConfirm.type}
          onConfirm={() => {
            const dc = state.deleteConfirm;
            if (!dc) return;
            return dc.type === 'month'
              ? handlers.handleConfirmDeleteMonth(dc.id)
              : handlers.handleConfirmDeleteExpense(dc.id);
          }}
          onCancel={() => setters.setDeleteConfirm(null)}
        />
      )}

      {state.notice && (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${state.notice.type === 'success' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100' : state.notice.type === 'error' ? 'bg-rose-500/15 border-rose-400/30 text-rose-100' : 'bg-slate-800/90 border-white/10 text-slate-100'}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold leading-5">{state.notice.message}</p>
              <button onClick={() => setters.setNotice(null)} className="text-current/70 hover:text-current text-lg leading-none">×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;