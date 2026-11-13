// Expense & Budget Visualizer — js/app.js

// ---------------------------------------------------------------------------
// In-memory state (single source of truth)
// ---------------------------------------------------------------------------

/** @type {Transaction[]} */
let transactions = [];

// ---------------------------------------------------------------------------
// Storage constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ebv_transactions';

// ---------------------------------------------------------------------------
// Chart state
// ---------------------------------------------------------------------------

/** @type {import('chart.js').Chart|null} */
let chartInstance = null;

/** Set to true by the Chart.js <script onerror> handler in index.html */
let chartLibraryFailed = false;

// ---------------------------------------------------------------------------
// Storage access layer
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Validates a single record from localStorage.
 * Returns true only when all five required fields are present with correct types.
 *
 * @param {unknown} record
 * @returns {record is Transaction}
 */
function isValidTransaction(record) {
  if (typeof record !== 'object' || record === null) return false;
  const r = /** @type {Record<string, unknown>} */ (record);
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' && r.name.length > 0 &&
    typeof r.amount === 'number' && isFinite(r.amount) &&
    typeof r.category === 'string' && VALID_CATEGORIES.includes(r.category) &&
    typeof r.timestamp === 'number'
  );
}

/**
 * Loads transactions from localStorage.
 * Returns an empty array on any error (unavailable storage, corrupt JSON,
 * or missing/invalid fields). Valid records mixed with invalid ones are
 * returned with the invalid entries silently skipped.
 *
 * @returns {Transaction[]}
 */
function loadFromStorage() {
  let raw;

  // Step 1 — read from localStorage (may be unavailable in private browsing)
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }

  // Nothing stored yet
  if (raw === null) return [];

  // Step 2 — parse JSON
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  // Step 3 — ensure we have an array, then filter to only valid records
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidTransaction);
}

// ---------------------------------------------------------------------------
// Toast notifications (Requirements 6.5, 6.6)
// ---------------------------------------------------------------------------

/**
 * Displays a transient toast notification in `#toast-container`.
 * The toast auto-removes after 4000 ms.
 *
 * @param {string} message - The text to display in the toast.
 * @param {'warning'|'error'|'info'} [type='warning'] - Controls the CSS modifier class.
 */
function showToast(message, type = 'warning') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'toast toast-' + type;

  document.getElementById('toast-container').appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ---------------------------------------------------------------------------
// Storage write
// ---------------------------------------------------------------------------

/**
 * Persists the current transaction array to localStorage.
 * Returns true on success. If the write fails (quota exceeded or storage
 * unavailable), shows a toast notification and returns false without
 * altering the in-memory array.
 *
 * @param {Transaction[]} transactions
 * @returns {boolean}
 */
function saveToStorage(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (err) {
    if (err instanceof DOMException) {
      showToast('Could not save data: storage quota exceeded or storage unavailable.');
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

/**
 * Validates form inputs and returns a new Transaction object on success.
 * Throws a user-readable Error string on the first validation failure found.
 *
 * Validation rules (applied in order):
 *   1. Name must not be empty / whitespace-only.
 *   2. Amount must be present (not '', null, or undefined).
 *   3. Amount must parse to a finite number.
 *   4. Amount must be greater than 0.
 *   5. Amount must not exceed 999,999,999.99.
 *
 * @param {string} name
 * @param {string|number|null|undefined} amount
 * @param {string} category
 * @returns {{ id: string, name: string, amount: number, category: string, timestamp: number }}
 * @throws {string} User-readable validation message
 */
function validateForm(name, amount, category) {
  // --- Name validation ---
  if (name.trim() === '') {
    throw 'Item name is required.';
  }

  // --- Amount presence check ---
  if (amount === '' || amount === null || amount === undefined) {
    throw 'Amount is required.';
  }

  // --- Amount numeric check ---
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) {
    throw 'Amount must be a valid number.';
  }

  // --- Amount range checks ---
  if (parsed <= 0) {
    throw 'Amount must be greater than 0.';
  }
  if (parsed > 999999999.99) {
    throw 'Amount must not exceed 999,999,999.99.';
  }

  // --- Success: return new transaction object ---
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    amount: parseFloat(amount),
    category,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Form reset
// ---------------------------------------------------------------------------

/**
 * Clears all input fields, resets the category dropdown to its default
 * selection (Food), and removes any validation error messages.
 * Called after a transaction is successfully added (Requirement 1.5).
 */
function resetForm() {
  document.getElementById('item-name').value = '';
  document.getElementById('item-amount').value = '';
  document.getElementById('item-category').selectedIndex = 0;
  document.getElementById('form-errors').innerHTML = '';
}

// ---------------------------------------------------------------------------
// Balance display rendering
// ---------------------------------------------------------------------------

/**
 * Sums all transaction amounts and writes the formatted currency total into
 * the `#balance-amount` element.
 *
 * Formatting rules (Requirements 4.2, 4.5, 4.6):
 *   - Zero or positive  →  $0.00 / $1,234.56
 *   - Negative          →  -$10.00  (minus sign BEFORE the dollar symbol)
 *     `Intl.NumberFormat` with `currencySign: 'accounting'` uses parentheses,
 *     so we format `Math.abs(total)` and manually prepend '-' instead.
 *
 * @param {Transaction[]} transactions
 */
function renderBalance(transactions) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const formatted =
    total < 0
      ? '-' + formatter.format(Math.abs(total))
      : formatter.format(total);

  document.getElementById('balance-amount').textContent = formatted;
}

// ---------------------------------------------------------------------------
// Category aggregation (Requirement 5.1)
// ---------------------------------------------------------------------------

/**
 * Sums transaction amounts grouped by category.
 * Always returns an object with all three category keys initialised to 0,
 * so callers can safely read any bucket without an existence check.
 *
 * @param {Transaction[]} transactions
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function aggregateByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, { Food: 0, Transport: 0, Fun: 0 });
}

// ---------------------------------------------------------------------------
// Form submit handler (Requirements 1.2, 1.3, 1.4, 1.5)
// ---------------------------------------------------------------------------

/**
 * Handles the Input_Form's submit event.
 *
 * Flow:
 *   1. Prevent the default browser form submission.
 *   2. Read the current values from the three form controls.
 *   3. Validate via `validateForm`; on failure, surface the error message in
 *      `#form-errors` and return early so no transaction is recorded.
 *   4. On success: append the new transaction to the in-memory array, persist
 *      it to localStorage, reset the form controls, and trigger a full re-render.
 *
 * @param {Event} event - The form submit event.
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // --- Read form values ---
  const name = document.getElementById('item-name').value;
  const amount = document.getElementById('item-amount').value;
  const category = document.getElementById('item-category').value;

  // --- Validate; surface any error and bail out ---
  let newTransaction;
  try {
    newTransaction = validateForm(name, amount, category);
  } catch (error) {
    document.getElementById('form-errors').textContent = error;
    return;
  }

  // --- Success path ---
  transactions.push(newTransaction);
  saveToStorage(transactions);
  resetForm();
  renderAll(); // defined in task 8.1
}

// ---------------------------------------------------------------------------
// Transaction list rendering (Requirements 2.1, 2.2, 2.3, 2.4)
// ---------------------------------------------------------------------------

/**
 * Renders the full transaction list into `#transaction-list`.
 *
 * - Wipes the list on every call.
 * - Shows an empty-state message when there are no transactions (Req 2.4).
 * - Iterates in reverse-chronological order (newest first) so the most
 *   recently added item appears at the top (Req 2.3).
 * - Each `<li>` contains the item name, the currency-formatted amount
 *   (same negative-sign convention as `renderBalance`), the category label,
 *   and a delete `<button>` wired to `handleDelete` (Req 2.1, 3.1).
 * - Uses `document.createElement` throughout to avoid XSS via innerHTML.
 *
 * @param {Transaction[]} transactions
 */
function renderTransactionList(transactions) {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';

  // Empty state (Requirement 2.4)
  if (transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No expenses added yet.';
    list.appendChild(emptyItem);
    return;
  }

  // Currency formatter — identical to the one used in renderBalance
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Reverse-chronological iteration (Requirement 2.3)
  for (let i = transactions.length - 1; i >= 0; i--) {
    const t = transactions[i];

    // Formatted amount with leading minus sign for negatives (Req 4.6 / 2.1)
    const formattedAmount =
      t.amount < 0
        ? '-' + formatter.format(Math.abs(t.amount))
        : formatter.format(t.amount);

    // --- Build the <li> ---
    const li = document.createElement('li');
    li.className = 'transaction-item';

    // Item name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = t.name;

    // Amount
    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = formattedAmount;

    // Category label
    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-category';
    categorySpan.textContent = t.category;

    // Delete button (Requirement 3.1)
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${t.name}`);
    deleteButton.addEventListener('click', () => handleDelete(t.id));

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteButton);

    list.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Pie chart rendering (Requirements 5.1–5.7)
// ---------------------------------------------------------------------------

/**
 * Creates or updates the Chart.js pie chart from the current transaction array.
 *
 * Three mutually exclusive paths:
 *
 *   A) Chart library failed to load (CDN error):
 *      Show #chart-error; hide the canvas and empty-state.
 *
 *   B) No transactions:
 *      Destroy any existing chart instance; hide canvas; show empty-state.
 *
 *   C) Transactions exist and chart lib is available:
 *      Build labels/data for categories with total > 0.
 *      If a chart instance already exists, mutate its data and call .update()
 *      (avoids destroying / recreating the canvas context).
 *      Otherwise create a fresh Chart instance.
 *
 * @param {Transaction[]} transactions
 */
function renderChart(transactions) {
  const canvas        = document.getElementById('spending-chart');
  const emptyState    = document.getElementById('chart-empty-state');
  const errorEl       = document.getElementById('chart-error');

  // --- Path A: Chart.js CDN failed to load (Requirement 5.7) ---
  if (chartLibraryFailed) {
    errorEl.style.display    = 'block';
    canvas.style.display     = 'none';
    emptyState.style.display = 'none';
    return;
  }

  // --- Path B: No transactions (Requirements 5.5, 5.6) ---
  if (transactions.length === 0) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    canvas.style.display     = 'none';
    emptyState.style.display = 'block';
    errorEl.style.display    = 'none';
    return;
  }

  // --- Path C: Transactions exist — render / update chart ---

  // Hide empty-state and error; show canvas (Requirements 5.1–5.4)
  emptyState.style.display = 'none';
  errorEl.style.display    = 'none';
  canvas.style.display     = 'block';

  // Aggregate amounts per category (Requirement 5.1)
  const totals = aggregateByCategory(transactions);

  // Build labels/data arrays — only include categories with total > 0 (Req 5.3)
  const labels = [];
  const data   = [];
  for (const category of ['Food', 'Transport', 'Fun']) {
    if (totals[category] > 0) {
      labels.push(category);
      data.push(totals[category]);
    }
  }

  if (chartInstance) {
    // Mutate existing chart in place to avoid canvas-reuse errors (Req 5.4)
    chartInstance.data.labels             = labels;
    chartInstance.data.datasets[0].data   = data;
    chartInstance.update();
  } else {
    // Create a new Chart instance (Requirements 5.2, 5.3)
    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: $${ctx.raw.toFixed(2)}`,
            },
          },
        },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Delete transaction handler (Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
// ---------------------------------------------------------------------------

/**
 * Handles deletion of a single transaction by its unique ID.
 *
 * Flow:
 *   1. Prompt the user for confirmation via `window.confirm`.
 *      If the user cancels, return immediately — nothing is changed (Req 3.2).
 *   2. Filter the in-memory `transactions` array to remove the matching item (Req 3.3).
 *   3. Persist the updated array to localStorage (Req 3.3, 6.2).
 *   4. Re-render the full UI so the transaction list, balance, and chart
 *      all reflect the removal (Req 3.3, 3.4, 3.5, 3.6).
 *
 * @param {string} id - The UUID of the transaction to delete.
 */
function handleDelete(id) {
  // Req 3.2 — confirm before deleting
  const confirmed = window.confirm('Are you sure you want to delete this transaction?');
  if (!confirmed) return;

  // Req 3.3 — remove the matching transaction from the in-memory array
  transactions = transactions.filter(t => t.id !== id);

  // Req 6.2 — persist the updated list to localStorage
  saveToStorage(transactions);

  // Req 3.3, 3.4, 3.5, 3.6 — re-render everything
  renderAll();
}

// ---------------------------------------------------------------------------
// Full UI re-render orchestrator (Requirements 4.3, 4.4, 5.2, 5.3)
// ---------------------------------------------------------------------------

/**
 * Calls all three render functions in sequence using the module-level
 * `transactions` array as the single source of truth.
 *
 * Invoked after every state mutation (add, delete, and on initial load)
 * so the balance, transaction list, and pie chart always stay in sync.
 */
function renderAll() {
  renderBalance(transactions);
  renderTransactionList(transactions);
  renderChart(transactions);
}

// ---------------------------------------------------------------------------
// Initialization (Requirements 2.3, 6.3, 6.5) — runs on script load
// ---------------------------------------------------------------------------

// Detect if localStorage is completely unavailable and show a persistent
// inline notice (not a toast) so the user knows data won't be saved.
try {
  localStorage.getItem('__test__');
} catch (e) {
  const notice = document.createElement('div');
  notice.id = 'storage-notice';
  notice.textContent = 'Local storage is unavailable. Your data will not be saved between sessions.';
  document.body.insertBefore(notice, document.body.firstChild);
}
//
function togglemode() {
  var element = document.body;
  element.classList.toggle("dark-mode");
}

// Load any previously-saved transactions from localStorage (Requirement 6.3)
transactions = loadFromStorage();

// Wire up the form submit handler (Requirement 2.3)
document.querySelector('form').addEventListener('submit', handleFormSubmit);

// Paint the initial UI state with whatever was loaded from storage
renderAll();
