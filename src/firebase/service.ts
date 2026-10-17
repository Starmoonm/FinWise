import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  waitForPendingWrites,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  Transaction,
  Loan,
  Investment,
  Goal,
  Insurance,
  CreditCard,
  Asset,
  UserSettings,
  AppHistory,
  Account,
  RecurringItem,
  Workspace,
  WorkspaceRole,
  WorkspaceMember,
  BackupSnapshot,
} from '../types';
import { SEED_DATA, buildSeedRecurringItems, buildSeedAccounts } from '../utils/seedData';
import { buildImportedPastMonthsTransactions } from '../utils/importedMonthsData';

// Device name identifier for sync tracking (FIX 2: Phone + laptop sync)
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Client';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android Phone';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac Laptop';
  if (/Windows/i.test(ua)) return 'Windows Laptop';
  if (/Linux/i.test(ua)) return 'Linux Laptop';
  return 'Web Device';
}

// Firestore paths under users/{uid}/...
export const getUserPath = (uid: string) => `users/${uid}`;
export const getTxPath = (uid: string) => `users/${uid}/transactions`;
export const getLoansPath = (uid: string) => `users/${uid}/loans`;
export const getInvestmentsPath = (uid: string) => `users/${uid}/investments`;
export const getGoalsPath = (uid: string) => `users/${uid}/goals`;
export const getInsurancePath = (uid: string) => `users/${uid}/insurance`;
export const getCardsPath = (uid: string) => `users/${uid}/cards`;
export const getAssetsPath = (uid: string) => `users/${uid}/assets`;
export const getAccountsPath = (uid: string) => `users/${uid}/accounts`;
export const getRecurringPath = (uid: string) => `users/${uid}/recurring`;
export const getSettingsDocPath = (uid: string) => `users/${uid}/meta/settings`;
export const getHistoryDocPath = (uid: string) => `users/${uid}/meta/history`;

// Workspaces paths under workspaces/{workspaceId}/... (UPDATE 1 & 2)
export const getWorkspaceDocPath = (wsId: string) => `workspaces/${wsId}`;
export const getWorkspaceTxPath = (wsId: string) => `workspaces/${wsId}/transactions`;
export const getWorkspaceLoansPath = (wsId: string) => `workspaces/${wsId}/loans`;
export const getWorkspaceInvestmentsPath = (wsId: string) => `workspaces/${wsId}/investments`;
export const getWorkspaceGoalsPath = (wsId: string) => `workspaces/${wsId}/goals`;
export const getWorkspaceInsurancePath = (wsId: string) => `workspaces/${wsId}/insurance`;
export const getWorkspaceCardsPath = (wsId: string) => `workspaces/${wsId}/cards`;
export const getWorkspaceAssetsPath = (wsId: string) => `workspaces/${wsId}/assets`;
export const getWorkspaceAccountsPath = (wsId: string) => `workspaces/${wsId}/accounts`;
export const getWorkspaceCategoriesPath = (wsId: string) => `workspaces/${wsId}/categories`;
export const getWorkspaceSubcategoriesPath = (wsId: string) => `workspaces/${wsId}/subcategories`;
export const getWorkspaceBudgetsPath = (wsId: string) => `workspaces/${wsId}/budgets`;
export const getWorkspaceRecurringPath = (wsId: string) => `workspaces/${wsId}/recurring`;
export const getWorkspaceBackupsPath = (wsId: string) => `workspaces/${wsId}/backups`;
export const getWorkspaceAuditsPath = (wsId: string) => `workspaces/${wsId}/audits`;
export const getWorkspaceSettingsPath = (wsId: string) => `workspaces/${wsId}/meta/settings`;
export const getWorkspaceHistoryPath = (wsId: string) => `workspaces/${wsId}/meta/history`;

export function subscribeToUserCollection<T>(
  collectionPath: string,
  onData: (items: T[], metadata?: { hasPendingWrites: boolean; fromCache: boolean }) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, collectionPath);
    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      snapshot => {
        const items: T[] = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        onData(items, {
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        });
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.GET, collectionPath);
        } catch (wrappedErr) {
          onError?.(wrappedErr as Error);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionPath);
  }
}

export function subscribeToUserDoc<T>(
  docPath: string,
  onData: (data: T | null, metadata?: { hasPendingWrites: boolean; fromCache: boolean }) => void,
  onError?: (err: Error) => void
) {
  try {
    const docRef = doc(db, docPath);
    return onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      snapshot => {
        if (snapshot.exists()) {
          onData(snapshot.data() as T, {
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            fromCache: snapshot.metadata.fromCache,
          });
        } else {
          onData(null, {
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            fromCache: snapshot.metadata.fromCache,
          });
        }
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.GET, docPath);
        } catch (wrappedErr) {
          onError?.(wrappedErr as Error);
        }
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

// Transaction operations with device tracking & serverTimestamp
export async function saveTransaction(uid: string, tx: Omit<Transaction, 'id'> & { id?: string }): Promise<string> {
  const path = getTxPath(uid);
  const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    const dataToSave = {
      ...tx,
      id,
      createdAt: tx.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
      updatedBy: getDeviceName(),
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteTransactionDoc(uid: string, id: string): Promise<void> {
  const path = `${getTxPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Loan operations
export async function saveLoan(uid: string, loan: Omit<Loan, 'id'> & { id?: string }): Promise<string> {
  const path = getLoansPath(uid);
  const id = loan.id || `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...loan, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteLoanDoc(uid: string, id: string): Promise<void> {
  const path = `${getLoansPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Investment operations
export async function saveInvestment(uid: string, inv: Omit<Investment, 'id'> & { id?: string }): Promise<string> {
  const path = getInvestmentsPath(uid);
  const id = inv.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...inv, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteInvestmentDoc(uid: string, id: string): Promise<void> {
  const path = `${getInvestmentsPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Goal operations
export async function saveGoal(uid: string, goal: Omit<Goal, 'id'> & { id?: string }): Promise<string> {
  const path = getGoalsPath(uid);
  const id = goal.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...goal, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteGoalDoc(uid: string, id: string): Promise<void> {
  const path = `${getGoalsPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Card operations
export async function saveCard(uid: string, card: Omit<CreditCard, 'id'> & { id?: string }): Promise<string> {
  const path = getCardsPath(uid);
  const id = card.id || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...card, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteCardDoc(uid: string, cardId: string): Promise<void> {
  const path = `${getCardsPath(uid)}/${cardId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Insurance operations
export async function saveInsurance(uid: string, ins: Omit<Insurance, 'id'> & { id?: string }): Promise<string> {
  const path = getInsurancePath(uid);
  const id = ins.id || `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...ins, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteInsuranceDoc(uid: string, id: string): Promise<void> {
  const path = `${getInsurancePath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Assets operations
export async function saveAsset(uid: string, asset: Omit<Asset, 'id'> & { id?: string }): Promise<string> {
  const path = getAssetsPath(uid);
  const id = asset.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...asset, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteAssetDoc(uid: string, id: string): Promise<void> {
  const path = `${getAssetsPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Account operations
export async function saveAccount(uid: string, acc: Omit<Account, 'id'> & { id?: string }): Promise<string> {
  const path = getAccountsPath(uid);
  const id = acc.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...acc, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteAccountDoc(uid: string, id: string): Promise<void> {
  const path = `${getAccountsPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Recurring Rules operations
export async function saveRecurringRule(uid: string, rule: any): Promise<string> {
  const path = getRecurringPath(uid);
  const id = rule.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, { ...rule, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    return id;
  }
}

export async function deleteRecurringRuleDoc(uid: string, id: string): Promise<void> {
  const path = `${getRecurringPath(uid)}/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Settings and History
export async function saveSettings(uid: string, settings: UserSettings): Promise<void> {
  const path = getSettingsDocPath(uid);
  try {
    await setDoc(doc(db, path), { ...settings, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveHistory(uid: string, history: AppHistory): Promise<void> {
  const path = getHistoryDocPath(uid);
  try {
    await setDoc(doc(db, path), { ...history, updatedAt: serverTimestamp(), updatedBy: getDeviceName() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Triggers pending writes flush across multiple tabs/devices
 */
export async function flushFirestoreSync(): Promise<void> {
  try {
    await waitForPendingWrites(db);
  } catch (e) {
    console.warn('WaitForPendingWrites warning:', e);
  }
}

/**
 * Checks for unmigrated local data trapped in localStorage (Rescue feature per FIX 2 rule 2)
 */
export function getLocalUnmigratedCount(): number {
  if (typeof localStorage === 'undefined') return 0;
  let count = 0;
  const keys = [
    'mk_local_tx',
    'mk_local_loans',
    'mk_local_investments',
    'mk_local_goals',
    'mk_local_cards',
    'mk_local_insurance',
    'mk_local_assets',
    'mk_local_recurring',
    'mk_local_accounts',
  ];
  for (const k of keys) {
    const item = localStorage.getItem(k);
    if (item) {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) count += parsed.length;
      } catch {}
    }
  }
  return count;
}

/**
 * Rescues unmigrated local data by merging into Firestore without duplicates, then clears local copies.
 */
export async function rescueLocalDataToCloud(uid: string): Promise<number> {
  if (typeof localStorage === 'undefined') return 0;
  let rescuedCount = 0;
  const batch = writeBatch(db);

  // 1. Transactions
  const localTxStr = localStorage.getItem('mk_local_tx');
  if (localTxStr) {
    try {
      const list: Transaction[] = JSON.parse(localTxStr);
      for (const t of list) {
        batch.set(doc(db, getTxPath(uid), t.id), {
          ...t,
          updatedAt: serverTimestamp(),
          updatedBy: `${getDeviceName()} (Rescued)`,
        }, { merge: true });
        rescuedCount++;
      }
    } catch {}
  }

  // 2. Loans
  const localLoansStr = localStorage.getItem('mk_local_loans');
  if (localLoansStr) {
    try {
      const list: Loan[] = JSON.parse(localLoansStr);
      for (const l of list) {
        batch.set(doc(db, getLoansPath(uid), l.id), {
          ...l,
          updatedAt: serverTimestamp(),
          updatedBy: `${getDeviceName()} (Rescued)`,
        }, { merge: true });
        rescuedCount++;
      }
    } catch {}
  }

  // 3. Investments
  const localInvStr = localStorage.getItem('mk_local_investments');
  if (localInvStr) {
    try {
      const list: Investment[] = JSON.parse(localInvStr);
      for (const inv of list) {
        batch.set(doc(db, getInvestmentsPath(uid), inv.id), {
          ...inv,
          updatedAt: serverTimestamp(),
          updatedBy: `${getDeviceName()} (Rescued)`,
        }, { merge: true });
        rescuedCount++;
      }
    } catch {}
  }

  // 4. Goals
  const localGoalsStr = localStorage.getItem('mk_local_goals');
  if (localGoalsStr) {
    try {
      const list: Goal[] = JSON.parse(localGoalsStr);
      for (const g of list) {
        batch.set(doc(db, getGoalsPath(uid), g.id), {
          ...g,
          updatedAt: serverTimestamp(),
          updatedBy: `${getDeviceName()} (Rescued)`,
        }, { merge: true });
        rescuedCount++;
      }
    } catch {}
  }

  // 5. Cards
  const localCardsStr = localStorage.getItem('mk_local_cards');
  if (localCardsStr) {
    try {
      const list: CreditCard[] = JSON.parse(localCardsStr);
      for (const c of list) {
        batch.set(doc(db, getCardsPath(uid), c.id), {
          ...c,
          updatedAt: serverTimestamp(),
          updatedBy: `${getDeviceName()} (Rescued)`,
        }, { merge: true });
        rescuedCount++;
      }
    } catch {}
  }

  if (rescuedCount > 0) {
    await batch.commit();
  }

  // Clean local keys permanently
  const keys = [
    'mk_local_tx',
    'mk_local_loans',
    'mk_local_investments',
    'mk_local_goals',
    'mk_local_cards',
    'mk_local_insurance',
    'mk_local_assets',
    'mk_local_recurring',
    'mk_local_accounts',
    'mk_local_settings',
    'mk_local_history',
  ];
  for (const k of keys) {
    localStorage.removeItem(k);
  }

  return rescuedCount;
}

/**
 * Generates all expanded transactions from SEED_DATA
 */
export function buildSeedTransactions(): Transaction[] {
  const list: Transaction[] = [];
  const note = 'Old app: 1–14 Oct total';
  const importDate = SEED_DATA.importedOctTotals.date;

  // Income
  for (const [cat, amt] of Object.entries(SEED_DATA.importedOctTotals.income)) {
    list.push({
      id: `seed_imp_inc_${cat.replace(/\s+/g, '_')}`,
      date: importDate,
      type: 'income',
      category: cat,
      amount: amt,
      mode: 'Imported',
      note,
      imported: true,
      createdAt: `${importDate}T00:00:00.000Z`,
    });
  }

  // Expense
  for (const [cat, amt] of Object.entries(SEED_DATA.importedOctTotals.expense)) {
    const member = SEED_DATA.categoryDefaultMember[cat] || (cat === 'MOM' ? 'MOM' : cat === 'Ankita' ? 'Ankita' : cat === 'Sis' ? 'Sis' : undefined);
    list.push({
      id: `seed_imp_exp_${cat.replace(/\s+/g, '_')}`,
      date: importDate,
      type: 'expense',
      category: cat,
      amount: amt,
      mode: 'Imported',
      note,
      imported: true,
      memberId: member,
      createdAt: `${importDate}T00:00:00.000Z`,
    });
  }

  // Invest
  for (const [cat, amt] of Object.entries(SEED_DATA.importedOctTotals.invest)) {
    list.push({
      id: `seed_imp_inv_${cat.replace(/\s+/g, '_')}`,
      date: importDate,
      type: 'invest',
      category: cat,
      amount: amt,
      mode: 'Imported',
      note,
      imported: true,
      createdAt: `${importDate}T00:00:00.000Z`,
    });
  }

  // Individual itemized seed transactions
  for (let i = 0; i < SEED_DATA.transactions.length; i++) {
    const t = SEED_DATA.transactions[i];
    list.push({
      id: `seed_tx_${i + 1}`,
      date: t.date,
      type: t.type,
      category: t.category,
      amount: t.amount,
      mode: t.mode,
      imported: false,
      createdAt: `${t.date}T10:00:${String(i * 5).padStart(2, '0')}.000Z`,
    });
  }

  // Append 128 canonical imported transactions for April to September 2026
  list.push(...buildImportedPastMonthsTransactions());

  return list;
}

/**
 * Initializes Firestore with seed data if user's cloud collection is completely empty.
 */
export async function seedInitialUserData(uid: string): Promise<void> {
  const batch = writeBatch(db);

  // Settings
  const settingsDocRef = doc(db, getSettingsDocPath(uid));
  batch.set(settingsDocRef, {
    expenseCategories: SEED_DATA.expenseCategories,
    incomeCategories: SEED_DATA.incomeCategories,
    paymentModes: SEED_DATA.paymentModes,
    budgets: SEED_DATA.budgets,
    updatedAt: serverTimestamp(),
    updatedBy: getDeviceName(),
  });

  // History
  const historyDocRef = doc(db, getHistoryDocPath(uid));
  batch.set(historyDocRef, {
    ...SEED_DATA.history,
    updatedAt: serverTimestamp(),
    updatedBy: getDeviceName(),
  });

  // Cards
  for (let i = 0; i < SEED_DATA.cards.length; i++) {
    const c = SEED_DATA.cards[i];
    const id = `seed_card_${i + 1}`;
    batch.set(doc(db, getCardsPath(uid), id), { ...c, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Goals
  for (let i = 0; i < SEED_DATA.goals.length; i++) {
    const g = SEED_DATA.goals[i];
    const id = `seed_goal_${i + 1}`;
    batch.set(doc(db, getGoalsPath(uid), id), { ...g, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Insurance
  for (let i = 0; i < SEED_DATA.insurance.length; i++) {
    const ins = SEED_DATA.insurance[i];
    const id = `seed_ins_${i + 1}`;
    batch.set(doc(db, getInsurancePath(uid), id), { ...ins, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Loans
  for (let i = 0; i < SEED_DATA.loans.length; i++) {
    const l = SEED_DATA.loans[i];
    const id = `seed_loan_${i + 1}`;
    batch.set(doc(db, getLoansPath(uid), id), { ...l, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Investments
  for (let i = 0; i < SEED_DATA.investments.length; i++) {
    const inv = SEED_DATA.investments[i];
    const id = `seed_inv_${i + 1}`;
    batch.set(doc(db, getInvestmentsPath(uid), id), { ...inv, id, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Accounts
  const accounts = buildSeedAccounts();
  for (const acc of accounts) {
    batch.set(doc(db, getAccountsPath(uid), acc.id), { ...acc, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Recurring
  const recurring = buildSeedRecurringItems();
  for (const rec of recurring) {
    batch.set(doc(db, getRecurringPath(uid), rec.id), { ...rec, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  // Transactions
  const seedTransactions = buildSeedTransactions();
  for (const tx of seedTransactions) {
    batch.set(doc(db, getTxPath(uid), tx.id), { ...tx, updatedAt: serverTimestamp(), updatedBy: getDeviceName() });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/*`);
  }
}

export const importSeedDataToFirestore = seedInitialUserData;

// -------------------------------------------------------------
// WORKSPACES & SHARING OPERATIONS (UPDATE 1)
// -------------------------------------------------------------

export function subscribeToWorkspaces(
  userEmail: string,
  userId: string,
  onData: (workspaces: Workspace[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, 'workspaces');
    return onSnapshot(
      colRef,
      snapshot => {
        const list: Workspace[] = [];
        const normEmail = (userEmail || '').toLowerCase().trim();
        snapshot.forEach(docSnap => {
          const ws = { id: docSnap.id, ...docSnap.data() } as Workspace;
          // User is owner or member or guest fallback
          const isOwner = ws.ownerId === userId;
          const isMember = ws.memberEmails && ws.memberEmails.includes(normEmail);
          if (isOwner || isMember || !userId) {
            list.push(ws);
          }
        });
        onData(list);
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.GET, 'workspaces');
        } catch (wrapped) {
          onError?.(wrapped as Error);
        }
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'workspaces');
  }
}

export async function createWorkspace(
  name: string,
  userId: string,
  userEmail: string
): Promise<Workspace> {
  const normEmail = (userEmail || 'user@example.com').toLowerCase().trim();
  const wsId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const initialWorkspace: Workspace = {
    id: wsId,
    name: name.trim(),
    ownerId: userId || 'local_user',
    ownerEmail: normEmail,
    members: {
      [normEmail.replace(/[^a-zA-Z0-9]/g, '_')]: {
        email: normEmail,
        role: 'owner',
        name: 'Owner',
        addedAt: now,
        status: 'active',
      },
    },
    memberEmails: [normEmail],
    sharingEnabled: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'workspaces', wsId), initialWorkspace);
    // Seed initial dataset into the new workspace
    await seedInitialWorkspaceData(wsId, userId, normEmail);
    return initialWorkspace;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}`);
    return initialWorkspace;
  }
}

export async function renameWorkspace(wsId: string, newName: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'workspaces', wsId),
      { name: newName.trim(), updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}`);
  }
}

export async function archiveWorkspace(wsId: string, archived: boolean): Promise<void> {
  try {
    await setDoc(
      doc(db, 'workspaces', wsId),
      { archived, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}`);
  }
}

export async function toggleWorkspaceSharing(wsId: string, sharingEnabled: boolean): Promise<void> {
  try {
    await setDoc(
      doc(db, 'workspaces', wsId),
      { sharingEnabled, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}`);
  }
}

export async function inviteWorkspaceMember(
  wsId: string,
  email: string,
  role: WorkspaceRole
): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  const key = normEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const now = new Date().toISOString();

  try {
    const wsRef = doc(db, 'workspaces', wsId);
    const snap = await getDoc(wsRef);
    if (!snap.exists()) return;
    const data = snap.data() as Workspace;
    const members = { ...data.members };
    members[key] = {
      email: normEmail,
      role,
      name: email.split('@')[0],
      addedAt: now,
      status: 'active',
    };
    const memberEmails = Array.from(new Set([...(data.memberEmails || []), normEmail]));

    await setDoc(
      wsRef,
      { members, memberEmails, updatedAt: now },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}`);
  }
}

export async function removeWorkspaceMember(wsId: string, email: string): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  const key = normEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const now = new Date().toISOString();

  try {
    const wsRef = doc(db, 'workspaces', wsId);
    const snap = await getDoc(wsRef);
    if (!snap.exists()) return;
    const data = snap.data() as Workspace;
    const members = { ...data.members };
    delete members[key];
    const memberEmails = (data.memberEmails || []).filter(e => e !== normEmail);

    await setDoc(
      wsRef,
      { members, memberEmails, updatedAt: now },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}`);
  }
}

// -------------------------------------------------------------
// DAILY BACKUPS & RESTORE (UPDATE 1)
// -------------------------------------------------------------

export async function saveWorkspaceBackupSnapshot(
  wsId: string,
  snapshot: BackupSnapshot
): Promise<void> {
  try {
    const backupDocRef = doc(db, `workspaces/${wsId}/backups`, snapshot.id);
    await setDoc(backupDocRef, {
      ...snapshot,
      createdAt: serverTimestamp(),
      createdOnDevice: getDeviceName(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}/backups`);
  }
}

export async function fetchWorkspaceBackups(wsId: string): Promise<BackupSnapshot[]> {
  try {
    const colRef = collection(db, `workspaces/${wsId}/backups`);
    const snap = await getDocs(colRef);
    const list: BackupSnapshot[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as BackupSnapshot);
    });
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.warn('Backup fetch warning:', error);
    return [];
  }
}

// -------------------------------------------------------------
// SEED WORKSPACE DATA (FIRST RUN OR CREATION)
// -------------------------------------------------------------

export async function seedInitialWorkspaceData(
  wsId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const batch = writeBatch(db);
  const device = getDeviceName();

  // Settings
  const defaultSettings: UserSettings = {
    expenseCategories: [...SEED_DATA.expenseCategories],
    incomeCategories: [...SEED_DATA.incomeCategories],
    paymentModes: [...SEED_DATA.paymentModes],
    budgets: [...SEED_DATA.budgets],
    firstDayOfWeek: 1,
    financialYearStartMonth: 4,
  };
  batch.set(doc(db, getWorkspaceSettingsPath(wsId)), {
    ...defaultSettings,
    updatedAt: serverTimestamp(),
    updatedBy: device,
  });

  // History
  batch.set(doc(db, getWorkspaceHistoryPath(wsId)), {
    ...SEED_DATA.history,
    updatedAt: serverTimestamp(),
    updatedBy: device,
  });

  // Goals
  for (let i = 0; i < SEED_DATA.goals.length; i++) {
    const g = SEED_DATA.goals[i];
    const id = `goal_${i + 1}`;
    batch.set(doc(db, getWorkspaceGoalsPath(wsId), id), {
      ...g,
      id,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Cards
  for (let i = 0; i < SEED_DATA.cards.length; i++) {
    const c = SEED_DATA.cards[i];
    const id = `card_${i + 1}`;
    batch.set(doc(db, getWorkspaceCardsPath(wsId), id), {
      ...c,
      id,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Insurance
  for (let i = 0; i < SEED_DATA.insurance.length; i++) {
    const ins = SEED_DATA.insurance[i];
    const id = `ins_${i + 1}`;
    batch.set(doc(db, getWorkspaceInsurancePath(wsId), id), {
      ...ins,
      id,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Loans
  for (let i = 0; i < SEED_DATA.loans.length; i++) {
    const l = SEED_DATA.loans[i];
    const id = `loan_${i + 1}`;
    batch.set(doc(db, getWorkspaceLoansPath(wsId), id), {
      ...l,
      id,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Investments (with UPDATE 4 types)
  const mappedInvestments = [
    {
      name: 'INVEST',
      type: 'Mutual Fund – SIP',
      assetClass: 'Equity',
      currentValue: 10000,
      installment: 10000,
      frequency: 'monthly',
      nextDueDate: '2026-11-06',
      autoPay: true,
      schemeCode: '120503',
      fundName: 'HDFC Top 100 Fund - Growth',
      monthlyAmount: 10000,
      sipDate: 6,
      stepUpPercent: 10,
    },
    {
      name: 'PL',
      type: 'Fixed Deposit (FD)',
      assetClass: 'Debt',
      currentValue: 11000,
      installment: 11000,
      frequency: 'monthly',
      nextDueDate: '2026-11-09',
      autoPay: false,
      bank: 'SBI',
      interestRate: 7.1,
      compounding: 'Quarterly',
    },
    {
      name: 'LIC Policy Investment',
      type: 'LIC / insurance policy',
      assetClass: 'Debt',
      currentValue: 3032,
      installment: 3032,
      frequency: 'yearly',
      nextDueDate: '2026-12-28',
      autoPay: false,
      sumAssured: 500000,
      maturityValue: 750000,
    },
  ];

  for (let i = 0; i < mappedInvestments.length; i++) {
    const inv = mappedInvestments[i];
    const id = `inv_${i + 1}`;
    batch.set(doc(db, getWorkspaceInvestmentsPath(wsId), id), {
      ...inv,
      id,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Accounts
  const accounts = buildSeedAccounts();
  for (const acc of accounts) {
    batch.set(doc(db, getWorkspaceAccountsPath(wsId), acc.id), {
      ...acc,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Recurring
  const recurring = buildSeedRecurringItems();
  for (const rec of recurring) {
    batch.set(doc(db, getWorkspaceRecurringPath(wsId), rec.id), {
      ...rec,
      updatedAt: serverTimestamp(),
      updatedBy: device,
    });
  }

  // Transactions (including canonical past imported months)
  const seedTransactions = buildSeedTransactions();
  for (const tx of seedTransactions) {
    batch.set(doc(db, getWorkspaceTxPath(wsId), tx.id), {
      ...tx,
      createdBy: { name: userEmail.split('@')[0], email: userEmail },
      updatedBy: { name: userEmail.split('@')[0], email: userEmail },
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workspaces/${wsId}/*`);
  }
}

