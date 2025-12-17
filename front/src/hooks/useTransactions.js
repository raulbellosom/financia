import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export const useTransactions = (limit = 100) => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const getBalanceDelta = ({
    accountType,
    transactionType,
    amount,
    transferSide,
  }) => {
    if (!Number.isFinite(amount)) return 0;

    // Mirrors the balance logic used when creating transactions.

    // Determine effective direction (expense-like or income-like)
    let effectiveType = transactionType;
    if (transactionType === "transfer") {
      effectiveType = transferSide === "incoming" ? "income" : "expense";
    }

    if (accountType === "credit") {
      if (effectiveType === "expense") return amount;
      if (effectiveType === "income") return -amount;
      return 0;
    }

    if (effectiveType === "expense") return -amount;
    if (effectiveType === "income") return amount;
    return 0;
  };

  const normalizeAccountId = (account) => {
    if (!account) return null;
    if (typeof account === "object" && account.$id) return account.$id;
    return String(account);
  };

  const transactionsQuery = useQuery({
    queryKey: ["transactions", userInfo?.$id, limit],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        [
          Query.equal("profile", userInfo.$id),
          Query.equal("isDeleted", false),
          Query.orderDesc("date"),
          Query.limit(limit),
        ]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (newTransaction) => {
      // 0. Handle Transfer (Double Leg)
      if (newTransaction.type === "transfer" && newTransaction.toAccount) {
        const groupId = ID.unique();

        // 1. Create Outgoing (From)
        const outgoing = await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
          ID.unique(),
          {
            profile: userInfo.$id,
            isDraft: false,
            origin: "manual",
            installments: 1,
            ...newTransaction,
            account: newTransaction.account, // From Account
            transferGroupId: groupId,
            transferSide: "outgoing",
            toAccount: undefined, // Cleanup
            isPending: false,
            isDeleted: false,
          }
        );

        // 2. Create Incoming (To)
        const incoming = await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
          ID.unique(),
          {
            profile: userInfo.$id,
            isDraft: false,
            origin: "manual",
            installments: 1,
            ...newTransaction,
            account: newTransaction.toAccount, // To Account
            transferGroupId: groupId,
            transferSide: "incoming",
            toAccount: undefined, // Cleanup
            isPending: false,
            isDeleted: false,
          }
        );

        // Update Balances for BOTH
        // From Account (Outgoing -> Expense-like)
        await updateAccountBalance(
          newTransaction.account,
          parseFloat(newTransaction.amount),
          "expense"
        );
        // To Account (Incoming -> Income-like)
        await updateAccountBalance(
          newTransaction.toAccount,
          parseFloat(newTransaction.amount),
          "income"
        );

        return outgoing; // Return one of them
      }

      // 1. Normal Transaction Creation
      const transaction = await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          isDraft: false,
          origin: "manual",
          installments: 1,
          ...newTransaction,
          isPending: false,
          isTransferLeg: false,
          isDeleted: false,
        }
      );

      // 2. Update Account Balance (Normal Transaction)
      if (transaction.type !== "transfer") {
        await updateAccountBalance(
          newTransaction.account,
          parseFloat(newTransaction.amount),
          newTransaction.type
        );
      }

      // 3. (Legacy) Update Installment Plan logic removed as per refactor
      // where MSI are now just transactions with installments > 1

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["accounts"]);
      queryClient.invalidateQueries(["installmentPlans"]);
    },
  });

  const updateAccountBalance = async (accountId, amount, type) => {
    try {
      // Ensure accountId is a string
      const accId = typeof accountId === "object" ? accountId.$id : accountId;

      if (!accId) return;

      const account = await databases.getDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        accId
      );

      let newBalance = account.currentBalance;

      // Determine effective direction
      // Expense-like: expense, outgoing transfer
      // Income-like: income, incoming transfer

      if (account.type === "credit") {
        if (type === "expense" || type === "outgoing") newBalance += amount;
        else if (type === "income" || type === "incoming") newBalance -= amount;
      } else {
        if (type === "expense" || type === "outgoing") newBalance -= amount;
        else if (type === "income" || type === "incoming") newBalance += amount;
      }

      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
        accId,
        { currentBalance: newBalance }
      );
    } catch (error) {
      console.error("Error updating account balance:", error);
    }
  };

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      // Fetch current transaction to compute balance diffs.
      const existing = await databases.getDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        id
      );

      const oldAccountId = normalizeAccountId(existing.account);
      const newAccountId =
        normalizeAccountId(updates.account) ??
        normalizeAccountId(existing.account);

      const oldType = existing.type;
      const newType = updates.type ?? existing.type;

      const oldAmount = Number.parseFloat(existing.amount);
      const newAmount = Number.isFinite(updates.amount)
        ? updates.amount
        : updates.amount != null
        ? Number.parseFloat(updates.amount)
        : oldAmount;

      const shouldRebalance =
        (oldAccountId && newAccountId && oldAccountId !== newAccountId) ||
        (Number.isFinite(oldAmount) &&
          Number.isFinite(newAmount) &&
          oldAmount !== newAmount) ||
        oldType !== newType;

      // 1) Update transaction document
      const updatedTx = await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        id,
        updates
      );

      // 2) Adjust balances if needed
      if (shouldRebalance && oldAccountId && newAccountId) {
        const [oldAccount, newAccount] = await Promise.all([
          databases.getDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
            oldAccountId
          ),
          oldAccountId === newAccountId
            ? null
            : databases.getDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
                newAccountId
              ),
        ]);

        const oldDelta = getBalanceDelta({
          accountType: oldAccount?.type,
          transactionType: oldType,
          amount: oldAmount,
          transferSide: existing.transferSide,
        });

        const newDelta = getBalanceDelta({
          accountType: (newAccount || oldAccount)?.type,
          transactionType: newType,
          amount: newAmount,
          transferSide: updates.transferSide || existing.transferSide,
        });

        if (oldAccountId === newAccountId) {
          const diff = newDelta - oldDelta;
          if (Math.abs(diff) > 0.000001) {
            await databases.updateDocument(
              APPWRITE_CONFIG.DATABASE_ID,
              APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
              oldAccountId,
              {
                currentBalance: (oldAccount.currentBalance ?? 0) + diff,
              }
            );
          }
        } else {
          // Revert from old account, apply to new account
          await Promise.all([
            databases.updateDocument(
              APPWRITE_CONFIG.DATABASE_ID,
              APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
              oldAccountId,
              {
                currentBalance: (oldAccount.currentBalance ?? 0) - oldDelta,
              }
            ),
            databases.updateDocument(
              APPWRITE_CONFIG.DATABASE_ID,
              APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
              newAccountId,
              {
                currentBalance: (newAccount?.currentBalance ?? 0) + newDelta,
              }
            ),
          ]);
        }
      }

      return updatedTx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["transaction-reports"]);
      queryClient.invalidateQueries(["accounts"]);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id) => {
      const existing = await databases.getDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        id
      );

      // Soft delete first (so UI no longer shows it even if balance update fails)
      const deletedTx = await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.TRANSACTIONS_COLLECTION_ID,
        id,
        { isDeleted: true }
      );

      // Revert balance impact for non-draft, non-deleted transactions
      try {
        if (!existing?.isDraft && !existing?.isDeleted) {
          const accountId = normalizeAccountId(existing.account);
          if (accountId) {
            const account = await databases.getDocument(
              APPWRITE_CONFIG.DATABASE_ID,
              APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
              accountId
            );

            const amount = Number.parseFloat(existing.amount);
            const delta = getBalanceDelta({
              accountType: account?.type,
              transactionType: existing.type,
              amount,
              transferSide: existing.transferSide,
            });

            if (Math.abs(delta) > 0.000001) {
              await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.ACCOUNTS_COLLECTION_ID,
                accountId,
                {
                  currentBalance: (account.currentBalance ?? 0) - delta,
                }
              );
            }
          }
        }
      } catch (error) {
        console.error("Error reverting account balance on delete:", error);
      }

      return deletedTx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["transactions"]);
      queryClient.invalidateQueries(["accounts"]);
      queryClient.invalidateQueries(["transaction-reports"]);
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    isError: transactionsQuery.isError,
    createTransaction: createTransactionMutation.mutateAsync,
    isCreating: createTransactionMutation.isPending,
    updateTransaction: updateTransactionMutation.mutateAsync,
    isUpdating: updateTransactionMutation.isPending,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    isDeleting: deleteTransactionMutation.isPending,
  };
};
