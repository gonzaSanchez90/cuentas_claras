
$content = @"
@layer components {
    .auth-container {
        @apply min-h-screen flex items-center justify-center p-4 relative overflow-hidden;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
    .auth-bg-circle-1 {
        @apply absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse;
    }
    .auth-bg-circle-2 {
        @apply absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse;
        animation-delay: 1s;
    }
    .auth-bg-circle-3 {
        @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse;
        animation-delay: 2s;
    }
    .auth-card-wrapper {
        @apply w-full max-w-md relative z-10;
    }
    .auth-logo-icon {
        @apply inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
    }
    .auth-title {
        @apply text-3xl font-black text-white mb-1;
    }
    .auth-subtitle {
        @apply text-gray-400 text-sm;
    }
    .auth-card {
        @apply rounded-2xl p-6 border;
        background: rgba(30, 41, 59, 0.8);
        border-color: rgba(148, 163, 184, 0.1);
        backdrop-filter: blur(20px);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    }
    .auth-tabs-group {
        @apply flex mb-6 p-1 rounded-xl;
        background-color: rgba(15, 23, 42, 0.5);
    }
    .auth-tab-base {
        @apply flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2;
    }
    .auth-tab-active-login {
        @apply text-white shadow-lg;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }
    .auth-tab-active-register {
        @apply text-white shadow-lg;
        background: linear-gradient(135deg, #8b5cf6, #a855f7);
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }
    .auth-tab-inactive {
        @apply text-gray-400 hover:text-gray-300;
    }
    .auth-label {
        @apply block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider;
    }
    .auth-input-icon {
        @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-500;
    }
    .auth-input {
        @apply w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200;
        background-color: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .auth-input:not(:disabled):not([readonly]):focus {
        border-color: rgba(99, 102, 241, 0.5);
    }
    .auth-input-disabled {
        @apply opacity-70 cursor-not-allowed bg-slate-800;
        background-color: rgba(15, 23, 42, 0.9) !important;
    }
    .auth-error-msg {
        @apply p-3 rounded-xl text-sm text-red-300 border border-red-500/20;
        background-color: rgba(239, 68, 68, 0.1);
    }
    .auth-submit-btn {
        @apply w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-60;
    }
    .auth-submit-login {
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.25);
    }
    .auth-submit-register {
        background: linear-gradient(135deg, #8b5cf6, #a855f7);
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.25);
    }
    .auth-footer-text {
        @apply text-center text-gray-500 text-xs mt-6;
    }
}

@layer components {
  /* Overlay y Contenedor Principal */
  .expense-modal-overlay {
    @apply fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4;
  }
  .expense-modal-backdrop {
    @apply absolute inset-0 bg-black/60 backdrop-blur-md;
  }
  .expense-modal-container {
    @apply bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-[28px] shadow-2xl animate-in slide-in-from-bottom-10 max-h-[90vh] flex flex-col relative overflow-hidden;
  }

  /* Header */
  .expense-modal-header {
    @apply flex justify-between items-center p-5 border-b border-slate-800;
  }
  .expense-modal-title {
    @apply text-lg font-bold text-white tracking-tight;
  }
  .expense-modal-closebtn {
    @apply text-slate-400 hover:bg-slate-800 rounded-full p-2 transition-colors;
  }

  /* Contenido y Formulario */
  .expense-modal-content {
    @apply flex-1 overflow-y-auto custom-scrollbar p-6;
  }
  .expense-form-group {
    @apply space-y-5;
  }
  .expense-input-label {
    @apply block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1;
  }
  
  /* Inputs estandarizados */
  .expense-input-base {
    @apply w-full bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all shadow-inner;
  }
  .expense-input-text {
    @apply expense-input-base px-4 py-2.5 text-xs font-medium;
  }
  .expense-input-amount {
    @apply expense-input-base px-4 py-2.5 pl-8 font-mono font-bold text-sm;
  }
  .expense-input-date {
    @apply expense-input-base px-3 py-2.5 text-xs text-slate-300 font-medium;
  }
  .expense-input-select {
    @apply expense-input-base px-4 py-2.5 text-xs font-bold appearance-none;
  }

  /* Botón Principal */
  .expense-btn-primary {
    @apply w-full bg-indigo-600 hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/30 text-white py-4 rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all outline-none;
  }
}

@layer components {
    .settings-overlay {
        @apply fixed inset-0 z-50 flex items-center justify-center p-4;
    }
    .settings-backdrop {
        @apply absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md;
    }
    .settings-container {
        @apply bg-[#1e293b] border border-white/10 w-full max-w-sm rounded-[32px] shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden;
    }
    .settings-header {
        @apply p-6 border-b border-white/5 bg-[#1e293b]/50;
    }
    .settings-header-icon {
        @apply p-2.5 bg-indigo-500/20 text-indigo-400 rounded-[14px] shadow-inner;
    }
    .settings-header-title {
        @apply text-lg font-black text-white uppercase tracking-tight;
    }
    .settings-close-btn {
        @apply p-2 text-slate-500 hover:bg-white/5 hover:text-white rounded-full transition-all;
    }
    .settings-content {
        @apply p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar;
    }
    .settings-label {
        @apply block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 pl-1;
    }
    .settings-emoji-btn {
        @apply w-full h-full bg-slate-900 border border-slate-700 rounded-2xl text-2xl flex items-center justify-center transition-all hover:border-indigo-500 shadow-inner group;
    }
    .settings-emoji-picker {
        @apply absolute top-20 left-0 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl z-[80] p-4 w-[240px] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl;
    }
    .settings-emoji-item {
        @apply w-12 h-12 flex items-center justify-center rounded-xl text-xl transition-all;
    }
    .settings-input-title {
        @apply w-full h-16 px-5 bg-slate-900 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:border-indigo-500 transition-all shadow-inner;
    }
    .settings-participant-input {
        @apply flex-1 h-12 px-4 bg-slate-900/50 border border-slate-800 rounded-xl outline-none text-sm font-bold text-white focus:border-indigo-500/50 transition-all shadow-inner;
    }
    .settings-percentage-input {
        @apply w-full h-full bg-slate-900 rounded-xl border border-slate-800 outline-none text-sm font-black text-indigo-400 text-center shadow-inner focus:border-indigo-500/30 transition-all px-2 pr-6;
    }
    .settings-delete-btn {
        @apply w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all;
    }
    .settings-add-btn {
        @apply w-full mt-5 py-4 border border-dashed border-slate-800 text-slate-500 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-600/5 hover:border-indigo-500/30 hover:text-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest outline-none;
    }
    .settings-footer {
        @apply p-6 border-t border-white/5 bg-[#1e293b]/50;
    }
    .settings-save-btn {
        @apply w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl;
    }
    .settings-alert-overlay {
        @apply absolute inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[60] flex items-center justify-center p-8 animate-in fade-in duration-200;
    }
}
"@

$lines = Get-Content index.css
$newLines = $lines[0..67]
$newLines += $content
$newLines | Out-File index.css -Encoding utf8

