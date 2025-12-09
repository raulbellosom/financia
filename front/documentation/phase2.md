Phase 2: Categories & Recurring Rules Implementation Plan
Goal Description
Implement the Categories management system and Recurring Rules logic. This involves creating the necessary Appwrite hooks (useCategories, useRecurringRules), implementing the UI for creating/editing/deleting categories, and ensuring proper validation and data handling.

User Review Required
IMPORTANT

Collection IDs Needed: I need the CATEGORIES_COLLECTION_ID and RECURRING_RULES_COLLECTION_ID to be added to your .env and
src/lib/constants.js
files. Please create these collections in Appwrite if they don't exist, following the schema in
financia_final_v2.md
.

Proposed Changes
Configuration
[MODIFY] src/lib/constants.js
Add CATEGORIES_COLLECTION_ID.
Add RECURRING_RULES_COLLECTION_ID.
Hooks
[NEW] src/hooks/useCategories.js
Implement useCategories hook using React Query.
fetchCategories: List documents from CATEGORIES_COLLECTION_ID.
createCategory: Create document.
updateCategory: Update document.
deleteCategory: Delete document.
[NEW] src/hooks/useRecurringRules.js
Implement useRecurringRules hook.
fetchRules, createRule, updateRule, deleteRule.
Components & UI
[NEW] src/pages/Categories.jsx
A new page for managing categories.
List view of categories grouped by type (Income vs Expense).
"Add Category" button opening a modal.
Edit/Delete actions for each category.
Form validation (name, color, icon).
[MODIFY] src/App.jsx
Add route /categories (protected).
[MODIFY] src/components/Layout.jsx
Add "Categories" link to the sidebar/navigation (if not already present or if intended for Admin/Settings). Note: Usually "Categories" is a top-level item or under Settings.
Translations
[MODIFY] src/locales/en/translation.json & src/locales/es/translation.json
Add translation keys for Categories page (labels, headers, success/error messages).
Verification Plan
Manual Verification
Categories CRUD:
Create a new category "Groceries" (Expense, Red, Shopping Cart icon).
Verify it appears in the list.
Edit it to "Food" (Blue).
Delete it.
Persistence:
Reload page to ensure data persists (fetched from Appwrite).
Validation:
Try to create a category without a name.
Try to create a category with a duplicate name (if strictly enforced by UI, otherwise DB might error).
