import { useEffect } from "react";
import { useRecurringRules } from "./useRecurringRules";
import { useTransactions } from "./useTransactions";

export const useRuleProcessor = () => {
  const { rules, updateRule } = useRecurringRules();
  const { createTransaction } = useTransactions();

  useEffect(() => {
    const processRules = async () => {
      if (!rules || rules.length === 0) return;

      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today to include today's rules

      const dueRules = rules.filter((rule) => {
        if (!rule.isActive || !rule.nextRun) return false;
        // Check autoConfirm flag. If false, we shouldn't process automatically (logic for manual approval needed later)
        if (rule.autoConfirm === false) return false;

        // Parse date safely (assuming ISO string or YYYY-MM-DD)
        const nextRun = new Date(rule.nextRun);
        // Adjust for timezone offset if needed, but simple comparison usually works if both are local or UTC
        // Here we compare timestamps
        return nextRun.getTime() <= today.getTime();
      });

      if (dueRules.length === 0) return;

      console.log(`Processing ${dueRules.length} due recurring rules...`);

      for (const rule of dueRules) {
        try {
          // 1. Create Transaction
          // Note: createTransaction handles account balance updates internally now
          await createTransaction({
            type: rule.type,
            amount: rule.amount,
            description: `${rule.name} (Recurrente)`,
            date: new Date().toISOString(),
            category: rule.category?.$id || rule.category,
            account: rule.account?.$id || rule.account,
            origin: "recurring",
            installments: 1,
          });

          // 2. Calculate Next Run
          let nextDate = new Date(rule.nextRun);
          const interval = rule.interval || 1;

          switch (rule.frequency) {
            case "daily":
              nextDate.setDate(nextDate.getDate() + interval);
              break;
            case "weekly":
              nextDate.setDate(nextDate.getDate() + 7 * interval);
              break;
            case "monthly":
              nextDate.setMonth(nextDate.getMonth() + interval);
              break;
            case "yearly":
              nextDate.setFullYear(nextDate.getFullYear() + interval);
              break;
            default:
              break;
          }

          // 3. Update Rule
          await updateRule({
            id: rule.$id,
            data: { nextRun: nextDate.toISOString() },
          });

          console.log(`Processed rule: ${rule.name}, next run: ${nextDate}`);
        } catch (error) {
          console.error(`Failed to process rule ${rule.name}:`, error);
        }
      }
    };

    processRules();
  }, [rules, createTransaction, updateRule]);
};
