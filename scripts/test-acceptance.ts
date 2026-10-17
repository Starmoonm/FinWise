import { SEED_DATA } from '../src/utils/seedData.ts';
import { buildSeedTransactions } from '../src/firebase/service.ts';
import { evaluateAcceptanceChecks } from '../src/utils/calculations.ts';

const transactions = buildSeedTransactions();
const loans = SEED_DATA.loans.map((l, i) => ({ ...l, id: `seed_loan_${i + 1}` }));
const investments = SEED_DATA.investments.map((inv, i) => ({ ...inv, id: `seed_inv_${i + 1}` }));
const goals = SEED_DATA.goals.map((g, i) => ({ ...g, id: `seed_goal_${i + 1}` }));
const cards = SEED_DATA.cards.map((c, i) => ({ ...c, id: `seed_card_${i + 1}` }));
const insurance = SEED_DATA.insurance.map((ins, i) => ({ ...ins, id: `seed_ins_${i + 1}` }));
const budgets = SEED_DATA.budgets;
const history = SEED_DATA.history;

const results = evaluateAcceptanceChecks({
  transactions,
  loans,
  investments,
  goals,
  cards,
  insurance,
  budgets,
  history,
  monthKey: '2026-10',
  todayStr: '2026-10-14',
});

console.log('--------------------------------------------------------------------------------');
console.log('ACCEPTANCE CHECKS RESULTS:');
console.log('--------------------------------------------------------------------------------');
results.forEach(r => {
  console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.category}: ${r.check}`);
  console.log(`   Expected: ${r.expected}`);
  console.log(`   Actual:   ${r.actual}`);
});
console.log('--------------------------------------------------------------------------------');
const passedCount = results.filter(r => r.pass).length;
console.log(`TOTAL: ${passedCount} / ${results.length} PASSED`);
if (passedCount !== results.length) {
  process.exit(1);
}
