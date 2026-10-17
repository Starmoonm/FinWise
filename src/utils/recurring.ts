import { RecurringTransaction, Transaction } from '../types';
import { addMonthsToDate } from './calculations';

/**
 * Calculates the next date based on frequency.
 */
export function getNextRecurringDate(dateStr: string, frequency: RecurringTransaction['frequency']): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'monthly':
      return addMonthsToDate(dateStr, 1);
    case 'yearly':
      return addMonthsToDate(dateStr, 12);
  }

  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(date.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Generates due transactions for an active recurring rule up to targetDate.
 */
export function generateDueTransactions(
  rule: RecurringTransaction,
  targetDate: string
): { transactions: Transaction[]; lastDate: string } {
  const start = rule.startDate || rule.nextDate || '2026-10-01';
  if (!rule.active) return { transactions: [], lastDate: rule.lastProcessedDate || start };

  const transactions: Transaction[] = [];
  let currentDate = rule.lastProcessedDate
    ? getNextRecurringDate(rule.lastProcessedDate, rule.frequency)
    : start;

  let lastProcessed = rule.lastProcessedDate || start;

  // Protect against runaway loops with a max iteration guard
  let safetyCount = 0;
  while (currentDate <= targetDate && (!rule.endDate || currentDate <= rule.endDate) && safetyCount < 365) {
    safetyCount++;
    const id = `rec_gen_${rule.id}_${currentDate.replace(/-/g, '')}`;

    transactions.push({
      id,
      date: currentDate,
      type: rule.type,
      category: rule.category,
      amount: rule.amount,
      mode: rule.mode || 'Bank',
      note: rule.note ? `${rule.note} (Recurring: ${rule.frequency})` : `Recurring: ${rule.title}`,
      imported: false,
      recurringRuleId: rule.id,
      createdAt: `${currentDate}T00:00:00.000Z`,
    });

    lastProcessed = currentDate;
    currentDate = getNextRecurringDate(currentDate, rule.frequency);
  }

  return { transactions, lastDate: lastProcessed };
}
