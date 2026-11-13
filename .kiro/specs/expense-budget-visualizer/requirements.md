# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track their personal expenses by category, view a running balance, and visualize spending distribution through a pie chart. The app runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted in the browser's Local Storage. No backend server or build tooling is required.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable UI element that displays all stored transactions.
- **Input_Form**: The HTML form through which the user submits new transactions.
- **Balance_Display**: The UI element at the top of the page that shows the total sum of all transaction amounts.
- **Pie_Chart**: The visual chart that displays the percentage breakdown of spending by category.
- **Local_Storage**: The browser's built-in Web Storage API used to persist transaction data client-side.
- **Category**: One of three predefined labels for a transaction — Food, Transport, or Fun.
- **Chart_Library**: An external JavaScript charting library (e.g., Chart.js) loaded via CDN, used to render the Pie_Chart.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to enter an expense with a name, amount, and category so that I can record my spending.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name accepting up to 100 characters, a number field for amount accepting up to 2 decimal places, and a dropdown selector for Category with the options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled and an amount between 0.01 and 999,999,999.99 inclusive, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Input_Form SHALL display a validation error message indicating which fields are missing and SHALL NOT add a transaction.
4. WHEN the user submits the Input_Form with an amount that is zero, negative, non-numeric, or greater than 999,999,999.99, THE Input_Form SHALL display a validation error message and SHALL NOT add a transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL clear all input fields and reset the Category selector to Food.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction as a list item showing the item name, the amount formatted as a currency value with two decimal places and a currency symbol, and the Category label as the full category name.
2. WHEN the Transaction_List contains more items than fit in the visible area, THE Transaction_List SHALL be scrollable vertically.
3. WHEN the page loads, THE App SHALL retrieve all transactions from Local_Storage and render them in the Transaction_List in reverse chronological order, with the most recently added transaction appearing first.
4. WHEN no transactions exist in Local_Storage, THE Transaction_List SHALL display a placeholder message indicating that no expenses have been added.
5. IF Local_Storage contains transaction data that cannot be parsed into a valid transaction record, THEN THE App SHALL skip that record and render the remaining valid transactions in the Transaction_List.

---

### Requirement 3: Delete Transaction

**User Story:** As a user, I want to delete an individual transaction so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete button for each transaction item.
2. WHEN the user activates the delete button for a transaction, THE App SHALL display a confirmation prompt before proceeding with deletion.
3. WHEN the user confirms deletion, THE App SHALL remove that transaction from Local_Storage and re-render the Transaction_List without the deleted item.
4. WHEN a transaction is deleted, THE Balance_Display SHALL recalculate and display the total as the sum of all remaining transaction amounts.
5. WHEN a transaction is deleted and at least one transaction remains, THE Pie_Chart SHALL update to display category proportions calculated from the remaining transactions only.
6. IF all transactions have been deleted, THEN THE Pie_Chart SHALL display an empty state indicating no transaction data is available.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see the total sum of all my expenses at the top of the page so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned above the transaction list on the page.
2. THE Balance_Display SHALL show the sum of all transaction amounts formatted as a currency value with a currency symbol prefix and exactly two decimal places (e.g., $0.00).
3. WHEN a new transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second without requiring a page reload.
4. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 1 second without requiring a page reload.
5. WHEN no transactions exist, THE Balance_Display SHALL show a total of $0.00.
6. IF the sum of all transaction amounts is negative, THEN THE Balance_Display SHALL show the value formatted with a currency symbol prefix, exactly two decimal places, and a leading minus sign (e.g., -$10.00).

---

### Requirement 5: Spending Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display one segment per Category that has at least one transaction, with each segment's arc sized proportionally to that Category's total transaction amount relative to the sum of all categories' total transaction amounts.
2. WHEN a new transaction is added, THE Pie_Chart SHALL update automatically to reflect the new category distribution without requiring a page reload.
3. WHEN a transaction is deleted, THE Pie_Chart SHALL update automatically to reflect the new category distribution without requiring a page reload.
4. WHEN no transactions exist, THE Pie_Chart SHALL display a text message indicating that no spending data is available, with zero chart segments rendered.
5. THE Pie_Chart SHALL render using the Chart_Library loaded via CDN.
6. THE Pie_Chart SHALL display each segment's Category name as a visible label or legend entry, and WHEN a user hovers over a segment, THE Pie_Chart SHALL display a tooltip showing the Category name and its total transaction amount.
7. IF the Chart_Library fails to load from the CDN, THEN THE Pie_Chart SHALL display an error message indicating the chart could not be loaded.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my expense data to be saved between browser sessions so that I do not lose my records when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the full transaction list to Local_Storage as a serialized JSON string.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local_Storage as a serialized JSON string.
3. WHEN the App initializes, THE App SHALL read the transaction list from Local_Storage and parse the JSON string into the in-memory transaction array.
4. FOR ALL valid transaction arrays, serializing to JSON then parsing the JSON string SHALL produce a transaction array with the same number of items and identical field values for each item as the original array.
5. IF Local_Storage is unavailable or the stored data cannot be parsed, THEN THE App SHALL initialize with an empty transaction list and SHALL display a warning message that does not block user interaction with the App (such as a toast or inline notice that dismisses or remains visible without requiring user acknowledgment to proceed).
6. IF a Local_Storage write operation fails (such as when storage quota is exceeded), THEN THE App SHALL display a warning message indicating the data could not be saved and SHALL retain the current in-memory transaction list unchanged.

---

### Requirement 7: File and Code Structure

**User Story:** As a developer, I want the project to follow a simple, clean file structure so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root, exactly one CSS file inside the `css/` directory, and exactly one JavaScript file inside the `js/` directory.
2. THE App SHALL use only Vanilla JavaScript with no frontend frameworks (React, Vue, Angular, etc.) and no build tools or package managers.
3. THE App SHALL load the Chart_Library via a CDN `<script>` tag and SHALL NOT bundle or install it as a local dependency.

---

### Requirement 8: Browser Compatibility and Performance

**User Story:** As a user, I want the app to work in any modern browser with fast, responsive interactions so that I can use it reliably without noticeable lag.

#### Acceptance Criteria

1. THE App SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari without polyfills or browser-specific workarounds.
2. WHEN the user interacts with the Input_Form, Transaction_List, Balance_Display, or Pie_Chart, THE App SHALL reflect updates within 100 milliseconds of the triggering action on a machine with at minimum a 2 GHz dual-core processor and 4 GB of RAM.
3. THE App SHALL complete initial page load and render all persisted transactions within 2 seconds, measured from navigation start to the point where all transactions are visible in the Transaction_List, on a connection with a minimum download speed of 10 Mbps.
