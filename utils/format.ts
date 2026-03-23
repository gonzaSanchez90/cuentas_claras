export const formatDateLong = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.001 ? 0 : amount;
  const isInteger = Math.abs(rounded - Math.round(rounded)) < 0.001;
  return rounded.toLocaleString('es-ES', { 
    minimumFractionDigits: isInteger ? 0 : 2, 
    maximumFractionDigits: 2 
  });
};
