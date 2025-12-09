Task: Financia v2 Implementation
Create detailed implementation plan in documentation
User Review of Plan
Phase 1: Users & Accounts
1.1 users_info: Validate Attributes (authUserId, username, etc.) & Indices
1.2 accounts: Add new attributes (institution, cardLast4, billingDay, dueDay, creditLimit, type)
1.2 accounts: Ensure Many-to-one relationship with users_info
1.2 accounts: Update UI (New Account form with banking fields)
1.3 Refactor: Structure components into components/ui
1.3 Refactor: Fix Accounts UI (Mobile/Edit Button overlap)
1.2 accounts: Implement Delete Functionality (with confirmation)
Phase 2: Categories & Rules
2.1 categories: Create collection (name, type, color, icon, isDefault) & Indices
2.1 categories: Implement UI for managing categories
2.2 recurring_rules: Create collection (frequency, interval, startDate, nextRun, autoConfirm)
2.2 recurring_rules: Verify logic (nextRun calculation)
Phase 3: Transactions & Reports
3.1 transactions: Add control attributes (isDraft, isTransferLeg, origin)
3.1 transactions: Verify relationships (account, category, receipt) & Indices
3.2 Reports: Implement Backend queries for "T-Account" (sums by period)
3.2 Reports: UI Implementation (Transactions view with period totals)
Phase 4: OCR & Tickets
4.1 receipts: Implement OCR Status Enum & Detection fields
4.1 receipts: Link receipts to transactions
