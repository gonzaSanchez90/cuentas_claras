import { Expense, Participant, BalanceResult } from '../types';

export const calculateBalance = (expenses: Expense[], participants: Participant[]): BalanceResult => {
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
