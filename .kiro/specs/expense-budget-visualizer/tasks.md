# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript. The implementation is broken into incremental steps: project scaffolding → data layer → form logic → list rendering → balance display → pie chart → error handling → property-based tests → final wiring and polish. Each step produces working, integrated code before moving on.

## Tasks

- [x] 1. Scaffold project files and HTML skeleton
  - Create `index.html` at the project root with the full DOM skeleton: `<input type="text" id="item-name">`, `<input type="number" id="item-amount">`, `<select id="item-category">` (Food / Transport / Fun), submit `<button>`, `<div id="form-errors">`, `<div id="balance-display">` containing `<span id="balance-amount">`, `<ul id="transaction-list">`, `<canvas id="spending-chart">`, `<div id="chart-empty-state">`, `<div id="chart-error">`, `<div id="toast-container" aria-live="polite">`
  - Add `<script>` tag for Chart.js v4 from CDN with an `onerror` handler attribute
  - Add `<link>` to `css/style.css` and `<script src="js/app.js" defer>` at the bottom of `<head>` / end of `<body>`
  - Create `css/style.css` as an empty file (populated in task 9)
  - Create `js/app.js` as an empty file (populated in subsequent tasks)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Implement data models and localStorage access layer
  - [x] 2.1 Define the in-memory state and storage constants in `js/app.js`
    - Declare `let transactions = []` as the single source of truth
    - Define `const STORAGE_KEY = 'ebv_transactions'`
    - Declare `let chartInstance = null` and `let chartLibraryFailed = false`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.2 Implement `loadFromStorage()`
    - Wrap `localStorage.getItem` in `try/catch`; return `[]` on any error
    - Parse the JSON string; if parsing fails, return `[]`
    - Filter the parsed array: keep only objects that have all five required fields (`id`, `name`, `amount`, `category`, `timestamp`) with correct types; skip invalid records
    - _Requirements: 2.5, 6.3, 6.5_

  - [x] 2.3 Implement `saveToStorage(transactions)`
    - Wrap `localStorage.setItem` in `try/catch`
    - On `DOMException` (quota exceeded or unavailable), call `showToast(...)` and return `false`
    - Return `true` on success
    - _Requirements: 6.1, 6.2, 6.6_

  - [ ]* 2.4 Write property test for JSON round-trip (Property 1)
    - Load fast-check via CDN in a `test.html` file
    - **Property 1: JSON round-trip preserves transaction data**
    - **Validates: Requirements 6.4**
    - Use `transactionArbitrary` to generate `Transaction[]`; stringify then parse; assert deep equality of all five fields for every item; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 1: JSON round-trip preserves transaction data`

  - [ ]* 2.5 Write property test for corrupt storage (Property 7)
    - **Property 7: Corrupt storage records are skipped, valid records are preserved**
    - **Validates: Requirements 2.5**
    - Generate mixed arrays of valid + invalid records; call `loadFromStorage` with mocked `localStorage`; assert only valid records are returned and no exception is thrown; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 7: Corrupt storage records are skipped, valid records are preserved`

- [x] 3. Implement form validation and add-transaction handler
  - [x] 3.1 Implement `validateForm(name, amount, category)`
    - Reject whitespace-only names (`name.trim() === ''`)
    - Reject amounts that are empty, `NaN`, ≤ 0, or > 999999999.99
    - Return a validated transaction object `{ id: crypto.randomUUID(), name: name.trim(), amount: parseFloat(amount), category, timestamp: Date.now() }` on success, or throw with a user-readable message on failure
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 3.2 Implement `resetForm()`
    - Clear `#item-name` and `#item-amount` values
    - Reset `#item-category` selected index to `"Food"`
    - Clear `#form-errors` innerHTML
    - _Requirements: 1.5_

  - [x] 3.3 Implement `handleFormSubmit(event)`
    - Call `event.preventDefault()`
    - Read values from `#item-name`, `#item-amount`, `#item-category`
    - Call `validateForm`; on error, display the message in `#form-errors` and return early
    - On success: push the new transaction into `transactions`, call `saveToStorage`, call `resetForm()`, call `renderAll()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.4 Write property test for valid-input submission (Property 4)
    - **Property 4: Valid-input form submission increases list length by one**
    - **Validates: Requirements 1.2**
    - Generate initial list + valid input tuple; simulate `handleFormSubmit`; assert `transactions.length` incremented by exactly 1; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 4: Valid-input form submission increases list length by one`

  - [ ]* 3.5 Write property test for invalid-input rejection (Property 5)
    - **Property 5: Whitespace-only or invalid-amount submissions are rejected**
    - **Validates: Requirements 1.3, 1.4**
    - Generate whitespace-only names and out-of-range amounts; simulate submission; assert `transactions.length` unchanged; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 5: Whitespace-only or invalid-amount submissions are rejected`

- [x] 4. Implement balance display rendering
  - [x] 4.1 Implement `renderBalance(transactions)`
    - Sum all `amount` fields using `Array.reduce`
    - Format the result with `Intl.NumberFormat` as `$0.00` (zero), `$1,234.56` (positive), `-$10.00` (negative — minus prefix before `$`)
    - Write the formatted string into `#balance-amount`
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [ ]* 4.2 Write property test for balance equals sum of amounts (Property 2)
    - **Property 2: Balance equals sum of amounts**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
    - Generate `Transaction[]`; call `renderBalance`; read the numeric value from the DOM; assert it equals the arithmetic sum of `amount` fields to two decimal places; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 2: Balance equals sum of amounts`

- [x] 5. Implement transaction list rendering and delete
  - [x] 5.1 Implement `renderTransactionList(transactions)`
    - Wipe `#transaction-list` innerHTML on every call
    - If `transactions.length === 0`, render `<li class="empty-state">No expenses added yet.</li>` and return
    - Iterate from `length - 1` down to `0`; for each transaction render an `<li>` with item name, formatted amount (same currency format as balance), category label, and a `<button>` wired to `handleDelete(t.id)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.2 Implement `handleDelete(id)`
    - Show `window.confirm`; if the user cancels, return immediately
    - Filter `transactions` to remove the item with the matching `id`
    - Call `saveToStorage` with the updated array
    - Call `renderAll()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.3 Write property test for delete reduces list by one (Property 6)
    - **Property 6: Delete reduces list by exactly one and updates balance**
    - **Validates: Requirements 3.3, 3.4**
    - Generate a non-empty `Transaction[]`; pick a random index; call `handleDelete` for that transaction's `id` (bypassing `window.confirm` via mock); assert `transactions.length` decreased by 1 and balance equals sum of remaining amounts; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 6: Delete reduces list by exactly one and updates balance`

- [x] 6. Implement category aggregation and pie chart
  - [x] 6.1 Implement `aggregateByCategory(transactions)`
    - Use `Array.reduce` to return `{ Food: number, Transport: number, Fun: number }`
    - Initialize all categories to `0`; accumulate each transaction's `amount` into its category bucket
    - _Requirements: 5.1_

  - [x] 6.2 Implement `renderChart(transactions)`
    - If `chartLibraryFailed === true`, show `#chart-error` and hide `<canvas>`, then return
    - If `transactions.length === 0`, destroy any existing `chartInstance`, hide `<canvas>`, show `#chart-empty-state`, then return
    - Call `aggregateByCategory`; build `labels` and `data` arrays for categories with total > 0
    - If `chartInstance` already exists, mutate `chartInstance.data.datasets[0].data` and `chartInstance.data.labels` then call `chartInstance.update()` — do NOT destroy and recreate
    - If `chartInstance` is `null`, create a new `Chart` on `#spending-chart` with type `'pie'`, `responsive: true`, legend at bottom, and tooltip showing `${ctx.label}: $${ctx.raw.toFixed(2)}`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.3 Write property test for category aggregation totals (Property 3)
    - **Property 3: Category aggregation totals equal overall balance**
    - **Validates: Requirements 5.1**
    - Generate `Transaction[]`; call `aggregateByCategory`; assert `Food + Transport + Fun` equals the sum of all transaction amounts to two decimal places; run ≥ 100 iterations
    - Tag: `// Feature: expense-budget-visualizer, Property 3: Category aggregation totals equal overall balance`

- [x] 7. Implement toast notification and CDN failure handling
  - [x] 7.1 Implement `showToast(message, type = 'warning')`
    - Create a `<div>` with the message text and appropriate CSS class
    - Append to `#toast-container`
    - Set a `setTimeout` to remove it after 4000 ms
    - _Requirements: 6.5, 6.6_

  - [x] 7.2 Wire CDN failure detection
    - Add `onerror="chartLibraryFailed = true; showToast('Chart library failed to load'); renderChart(transactions);"` to the Chart.js `<script>` tag in `index.html`
    - _Requirements: 5.7_

- [x] 8. Implement `renderAll` and application initialization
  - [x] 8.1 Implement `renderAll()`
    - Call `renderBalance(transactions)`, `renderTransactionList(transactions)`, `renderChart(transactions)` in sequence
    - _Requirements: 4.3, 4.4, 5.2, 5.3_

  - [x] 8.2 Implement initialization block (runs on script load)
    - Call `loadFromStorage()` and assign the result to `transactions`
    - If `localStorage` is completely unavailable (detected during `loadFromStorage`), show an inline persistent notice (not a toast) that does not block interaction
    - Attach `handleFormSubmit` to the form's `submit` event
    - Call `renderAll()` to paint the initial state
    - _Requirements: 2.3, 6.3, 6.5_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Open `index.html` in a browser and verify: form submission works, list renders in reverse-chronological order, balance updates, chart updates, delete with confirmation works, empty-state messages appear when no transactions exist
  - Run `test.html` (property-based tests) and confirm all 7 properties pass with ≥ 100 iterations each
  - Ask the user if any questions arise before proceeding

- [ ] 10. Apply CSS styling and layout
  - [ ] 10.1 Write layout and typography styles in `css/style.css`
    - Two-column layout (form + balance/chart on left; transaction list on right) or single-column stacked for narrower viewports
    - Style the form, input fields, dropdown, and submit button
    - Style `#balance-display` to be visually prominent above the list
    - Style `#transaction-list` to be vertically scrollable (overflow-y: auto; max-height)
    - Style each `<li>` to show name, amount, category, and delete button in a single row
    - Style `.empty-state` with muted text
    - _Requirements: 2.2, 4.1_

  - [ ] 10.2 Write toast and error styles in `css/style.css`
    - `#toast-container`: fixed top-right, z-index above content, stacks multiple toasts
    - Toast items: rounded corners, warning color, fade-in/fade-out animation (CSS `@keyframes`)
    - `#form-errors`: inline red error text below the form
    - `#chart-error` and `#chart-empty-state`: centered muted message within the chart area
    - _Requirements: 6.5, 6.6, 5.4, 5.7_

- [ ] 11. Final checkpoint — Full cross-browser and regression check
  - Verify the app in Chrome, Firefox, Edge, and Safari (latest stable)
  - Confirm interactions reflect updates within 100 ms and initial load completes within 2 seconds
  - Re-run `test.html` property-based tests to confirm all 7 properties still pass
  - Ask the user if any questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property-based tests live in `test.html` and use fast-check loaded from CDN — no Node or build step required
- Checkpoints (tasks 9 and 11) validate integration at natural break points
- The chart update strategy (mutate + `chartInstance.update()`) must be followed exactly to prevent the "canvas already in use" error when re-rendering
- `window.confirm` should be mocked/stubbed in property tests that exercise `handleDelete`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4", "2.5", "3.1", "3.2", "4.1", "6.1"] },
    { "id": 3, "tasks": ["3.3", "4.2", "5.1", "6.2", "7.1"] },
    { "id": 4, "tasks": ["3.4", "3.5", "4.2", "5.2", "6.3", "7.2"] },
    { "id": 5, "tasks": ["5.3", "8.1"] },
    { "id": 6, "tasks": ["8.2"] },
    { "id": 7, "tasks": ["10.1", "10.2"] }
  ]
}
```
