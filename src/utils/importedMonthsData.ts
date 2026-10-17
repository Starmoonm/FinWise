import { Transaction } from '../types';
import { SEED_DATA } from './seedData';

export interface MonthReportData {
  monthKey: string; // e.g. "2026-04"
  monthName: string; // e.g. "April 2026"
  importBatchId: string; // e.g. "oldapp-2026-04"
  income: number;
  invested: number;
  expenses: number;
  outflow: number;
  expectedEntriesCount: number;
  entries: Array<{
    category: string;
    amount: number;
    type: 'expense' | 'invest' | 'income';
    note?: string;
  }>;
}

export const IMPORTED_MONTHS_REPORT: Record<string, MonthReportData> = {
  '2026-04': {
    monthKey: '2026-04',
    monthName: 'April 2026',
    importBatchId: 'oldapp-2026-04',
    income: 65000,
    invested: 13000,
    expenses: 79602,
    outflow: 92602,
    expectedEntriesCount: 19,
    entries: [
      { category: 'Salary', amount: 65000, type: 'income', note: 'Old app total income for April' },
      { category: 'Investment', amount: 13000, type: 'invest' },
      { category: 'EMI', amount: 42645, type: 'expense' },
      { category: 'MOM', amount: 10000, type: 'expense' },
      { category: 'Health & Medicine', amount: 5878, type: 'expense' },
      { category: 'Transportation', amount: 4119, type: 'expense' },
      { category: 'Kitchen Item', amount: 2947, type: 'expense' },
      { category: 'One time expense House', amount: 2340, type: 'expense' },
      { category: 'Milk', amount: 1600, type: 'expense' },
      { category: 'My Personal Expense', amount: 1539, type: 'expense' },
      { category: 'Other fixed expense', amount: 1527, type: 'expense' },
      { category: 'Zomato', amount: 1485, type: 'expense' },
      { category: 'Small Expense', amount: 1220, type: 'expense' },
      { category: 'Donation', amount: 1105, type: 'expense' },
      { category: 'Fuel & Repair', amount: 1081, type: 'expense' },
      { category: 'Other', amount: 816, type: 'expense' },
      { category: 'Hosekeeping', amount: 600, type: 'expense' },
      { category: 'Gifts', amount: 500, type: 'expense' },
      { category: 'Fruit', amount: 200, type: 'expense' },
    ],
  },
  '2026-05': {
    monthKey: '2026-05',
    monthName: 'May 2026',
    importBatchId: 'oldapp-2026-05',
    income: 65799,
    invested: 13000,
    expenses: 54156,
    outflow: 67156,
    expectedEntriesCount: 19,
    entries: [
      { category: 'Salary', amount: 65799, type: 'income', note: 'Old app total income for May' },
      { category: 'Investment', amount: 13000, type: 'invest' },
      { category: 'EMI', amount: 24113, type: 'expense' },
      { category: 'Kitchen Item', amount: 7729, type: 'expense' },
      { category: 'Ankita', amount: 5678, type: 'expense' },
      { category: 'MOM', amount: 5000, type: 'expense' },
      { category: 'My Personal Expense', amount: 3110, type: 'expense' },
      { category: 'Gifts', amount: 1632, type: 'expense' },
      { category: 'Milk', amount: 1450, type: 'expense' },
      { category: 'Hosekeeping', amount: 1200, type: 'expense' },
      { category: 'One time expense House', amount: 1088, type: 'expense' },
      { category: 'Small Expense', amount: 670, type: 'expense' },
      { category: 'Health & Medicine', amount: 592, type: 'expense' },
      { category: 'Fuel & Repair', amount: 499, type: 'expense' },
      { category: 'Other', amount: 428, type: 'expense' },
      { category: 'Zomato', amount: 400, type: 'expense' },
      { category: 'Vegtable', amount: 350, type: 'expense' },
      { category: 'My Med', amount: 137, type: 'expense' },
      { category: 'Donation', amount: 80, type: 'expense' },
    ],
  },
  '2026-06': {
    monthKey: '2026-06',
    monthName: 'June 2026',
    importBatchId: 'oldapp-2026-06',
    income: 70000,
    invested: 2000,
    expenses: 70632,
    outflow: 72632,
    expectedEntriesCount: 19,
    entries: [
      { category: 'Salary', amount: 70000, type: 'income', note: 'Old app total income for June' },
      { category: 'Investment', amount: 2000, type: 'invest' },
      { category: 'EMI', amount: 23312, type: 'expense' },
      { category: 'MOM', amount: 10400, type: 'expense' },
      { category: 'Ankita', amount: 9139, type: 'expense' },
      { category: 'Kitchen Item', amount: 8478, type: 'expense' },
      { category: 'Farming', amount: 3985, type: 'expense' },
      { category: 'Other fixed expense', amount: 3000, type: 'expense' },
      { category: 'Fuel & Repair', amount: 2008, type: 'expense' },
      { category: 'Guest', amount: 1903, type: 'expense' },
      { category: 'Milk', amount: 1600, type: 'expense' },
      { category: 'My Personal Expense', amount: 1310, type: 'expense' },
      { category: 'Hosekeeping', amount: 1200, type: 'expense' },
      { category: 'Small Expense', amount: 1100, type: 'expense' },
      { category: 'Health & Medicine', amount: 967, type: 'expense' },
      { category: 'Fruit', amount: 830, type: 'expense' },
      { category: 'Transportation', amount: 500, type: 'expense' },
      { category: 'Online Shopping', amount: 485, type: 'expense' },
      { category: 'Food & Dining', amount: 415, type: 'expense' },
    ],
  },
  '2026-07': {
    monthKey: '2026-07',
    monthName: 'July 2026',
    importBatchId: 'oldapp-2026-07',
    income: 70000,
    invested: 12500,
    expenses: 63118,
    outflow: 75618,
    expectedEntriesCount: 21,
    entries: [
      { category: 'Salary', amount: 70000, type: 'income', note: 'Old app total income for July' },
      { category: 'Investment', amount: 12500, type: 'invest' },
      { category: 'EMI', amount: 15623, type: 'expense' },
      { category: 'Tour and Travel', amount: 10000, type: 'expense' },
      { category: 'MOM', amount: 10000, type: 'expense' },
      { category: 'My Med', amount: 5467, type: 'expense' },
      { category: 'Transportation', amount: 3130, type: 'expense' },
      { category: 'Gifts', amount: 2850, type: 'expense' },
      { category: 'K 2', amount: 2699, type: 'expense' },
      { category: 'K1', amount: 2600, type: 'expense' },
      { category: 'Small Expense', amount: 2030, type: 'expense' },
      { category: 'Milk', amount: 1650, type: 'expense' },
      { category: 'My Personal Expense', amount: 1438, type: 'expense' },
      { category: 'Health & Medicine', amount: 1304, type: 'expense' },
      { category: 'Goal Savings', amount: 1300, type: 'expense' },
      { category: 'Hosekeeping', amount: 1200, type: 'expense' },
      { category: 'Fuel & Repair', amount: 500, type: 'expense' },
      { category: 'Other fixed expense', amount: 500, type: 'expense' },
      { category: 'Guest', amount: 360, type: 'expense' },
      { category: 'Donation', amount: 250, type: 'expense' },
      { category: 'Home Expenses', amount: 217, type: 'expense' },
    ],
  },
  '2026-08': {
    monthKey: '2026-08',
    monthName: 'August 2026',
    importBatchId: 'oldapp-2026-08',
    income: 55000,
    invested: 2400,
    expenses: 121395,
    outflow: 123795,
    expectedEntriesCount: 23,
    entries: [
      { category: 'Salary', amount: 55000, type: 'income', note: 'Old app total income for August' },
      { category: 'Investment', amount: 2400, type: 'invest' },
      { category: 'EMI', amount: 47705, type: 'expense' },
      { category: 'Ankita', amount: 20712, type: 'expense' },
      { category: 'MOM', amount: 10000, type: 'expense' },
      { category: 'Gifts', amount: 9624, type: 'expense' },
      { category: 'M MED', amount: 8657, type: 'expense' },
      { category: 'My Personal Expense', amount: 4148, type: 'expense' },
      { category: 'Transportation', amount: 3350, type: 'expense' },
      { category: 'K 2', amount: 3245, type: 'expense' },
      { category: 'Fuel & Repair', amount: 2619, type: 'expense' },
      { category: 'K1', amount: 2588, type: 'expense' },
      { category: 'Milk', amount: 1500, type: 'expense' },
      { category: 'Hosekeeping', amount: 1200, type: 'expense' },
      { category: 'Sis Med', amount: 1190, type: 'expense' },
      { category: 'Small Expense', amount: 980, type: 'expense' },
      { category: 'My Med', amount: 945, type: 'expense' },
      { category: 'Sis', amount: 792, type: 'expense' },
      { category: 'Guest', amount: 580, type: 'expense' },
      { category: 'Kitchen Item', amount: 545, type: 'expense' },
      { category: 'Zomato', amount: 460, type: 'expense' },
      { category: 'Vegtable', amount: 405, type: 'expense' },
      { category: 'One time expense House', amount: 150, type: 'expense' },
    ],
  },
  '2026-09': {
    monthKey: '2026-09',
    monthName: 'September 2026',
    importBatchId: 'oldapp-2026-09',
    income: 80000,
    invested: 24032,
    expenses: 99999,
    outflow: 124031,
    expectedEntriesCount: 27,
    entries: [
      { category: 'Salary', amount: 80000, type: 'income', note: 'Old app total income for September' },
      { category: 'Investment', amount: 24032, type: 'invest' },
      { category: 'EMI', amount: 33581, type: 'expense' },
      { category: 'Ankita', amount: 14613, type: 'expense' },
      { category: 'MOM', amount: 10000, type: 'expense' },
      { category: 'Donation', amount: 7271, type: 'expense' },
      { category: 'WIFI Bill', amount: 6890, type: 'expense' },
      { category: 'K1', amount: 3055, type: 'expense' },
      { category: 'K 2', amount: 3004, type: 'expense' },
      { category: 'Gifts', amount: 2878, type: 'expense' },
      { category: 'Guest', amount: 2618, type: 'expense' },
      { category: 'My Med', amount: 2404, type: 'expense' },
      { category: 'M MED', amount: 2366, type: 'expense' },
      { category: 'My Personal Expense', amount: 2061, type: 'expense' },
      { category: 'Kitchen Item', amount: 1894, type: 'expense' },
      { category: 'Milk', amount: 1705, type: 'expense' },
      { category: 'Hosekeeping', amount: 1200, type: 'expense' },
      { category: 'One time expense House', amount: 700, type: 'expense' },
      { category: 'Small Expense', amount: 690, type: 'expense' },
      { category: 'Zomato', amount: 650, type: 'expense' },
      { category: 'Vegtable', amount: 553, type: 'expense' },
      { category: 'Sis Med', amount: 500, type: 'expense' },
      { category: 'Social media app', amount: 354, type: 'expense' },
      { category: 'Sis', amount: 333, type: 'expense' },
      { category: 'Other', amount: 310, type: 'expense' },
      { category: 'Fuel & Repair', amount: 299, type: 'expense' },
      { category: 'Fruit', amount: 70, type: 'expense' },
    ],
  },
};

/**
 * Builds the canonical 128 transaction items from April to September 2026.
 */
export function buildImportedPastMonthsTransactions(): Transaction[] {
  const list: Transaction[] = [];

  for (const [mKey, report] of Object.entries(IMPORTED_MONTHS_REPORT)) {
    const date = `${mKey}-01`;
    const monthName = report.monthName.split(' ')[0];

    report.entries.forEach((item, index) => {
      const defaultMember =
        SEED_DATA.categoryDefaultMember[item.category] ||
        (item.category === 'MOM'
          ? 'MOM'
          : item.category === 'Ankita'
          ? 'Ankita'
          : item.category === 'Sis' || item.category === 'Sis Med'
          ? 'Sis'
          : 'Self');

      const isIncome = item.type === 'income';
      const note = item.note || `Old app monthly total — ${monthName} 2026`;

      list.push({
        id: `tx_${report.importBatchId}_${index + 1}_${item.category.replace(/[^a-zA-Z0-9]+/g, '_')}`,
        date,
        type: item.type,
        category: item.category,
        amount: item.amount,
        mode: 'Imported',
        imported: true,
        importBatchId: report.importBatchId,
        note,
        memberId: isIncome ? 'Self' : defaultMember,
        createdAt: `${date}T00:00:00.000Z`,
        updatedAt: `${date}T00:00:00.000Z`,
      });
    });
  }

  return list;
}
