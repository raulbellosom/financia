import { useEffect, useRef } from "react";
import { useAccounts } from "./useAccounts";
import { useTransactions } from "./useTransactions";
import {
  calculateDailyYield,
  shouldGenerateYield,
  getMissedYieldDays,
} from "../utils/yieldUtils";
import { TRANSACTION_ORIGINS } from "../lib/constants";

export const useYieldProcessor = () => {
  const { accounts, updateAccount } = useAccounts();
  const { createTransaction } = useTransactions();
  const processingRef = useRef(new Set());

  useEffect(() => {
    const processYields = async () => {
      if (!accounts || accounts.length === 0) return;

      const investmentAccounts = accounts.filter(
        (acc) => acc.type === "investment"
      );

      for (const account of investmentAccounts) {
        if (processingRef.current.has(account.$id)) continue;

        if (shouldGenerateYield(account)) {
          const missedDays = getMissedYieldDays(account);
          if (missedDays <= 0) continue;

          const dailyYield = calculateDailyYield(account);
          if (dailyYield <= 0) continue;

          processingRef.current.add(account.$id);

          const totalYield = dailyYield * missedDays;

          console.log(
            `Processing yield for ${account.name}: ${missedDays} days, total: ${totalYield}`
          );

          try {
            // Create Transaction
            // Note: createTransaction handles account balance updates internally
            await createTransaction({
              type: "income",
              amount: totalYield,
              description: `Rendimiento (${missedDays} días)`,
              date: new Date().toISOString(),
              account: account.$id,
              origin: TRANSACTION_ORIGINS.YIELD,
              isPending: false,
              installments: 1,
              // category: null // Assuming category is optional for system generated transactions
            });

            // Update lastYieldDate
            await updateAccount({
              id: account.$id,
              data: {
                lastYieldDate: new Date().toISOString(),
              },
            });
          } catch (error) {
            console.error(
              `Error processing yield for account ${account.name}:`,
              error
            );
          } finally {
            processingRef.current.delete(account.$id);
          }
        }
      }
    };

    processYields();
  }, [accounts, createTransaction, updateAccount]);
};
