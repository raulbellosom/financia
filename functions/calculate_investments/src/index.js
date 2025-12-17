const axios = require("axios");

/*
  Function: Calculate Daily Investment Yields
  Trigger: CRON Schedule (e.g., "0 1 * * *" - Everyday at 1AM)

  NOTE: This implementation uses Appwrite REST API (no SDK).
*/

function requireEnv(context, key) {
  const value = process.env[key];
  if (!value) {
    context.error(`Missing env var: ${key}`);
    return null;
  }
  return value;
}

function buildQueries() {
  const normalizeValues = (valueOrValues) =>
    Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];

  return {
    equal: (attribute, valueOrValues) =>
      `equal("${attribute}", ${JSON.stringify(
        normalizeValues(valueOrValues)
      )})`,
    notEqual: (attribute, valueOrValues) =>
      `notEqual("${attribute}", ${JSON.stringify(
        normalizeValues(valueOrValues)
      )})`,
    lessThanEqual: (attribute, valueOrValues) =>
      `lessThanEqual("${attribute}", ${JSON.stringify(
        normalizeValues(valueOrValues)
      )})`,
    greaterThan: (attribute, valueOrValues) =>
      `greaterThan("${attribute}", ${JSON.stringify(
        normalizeValues(valueOrValues)
      )})`,
  };
}

function createAppwriteClient({ endpoint, projectId, apiKey }) {
  const baseURL = String(endpoint || "").replace(/\/+$/, "");

  return axios.create({
    baseURL,
    timeout: 30_000,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
  });
}

function buildListDocumentsUrl(databaseId, collectionId, queries = []) {
  const params = new URLSearchParams();
  for (const q of queries) params.append("queries[]", q);
  const queryString = params.toString();
  const path = `/databases/${encodeURIComponent(
    databaseId
  )}/collections/${encodeURIComponent(collectionId)}/documents`;
  return queryString ? `${path}?${queryString}` : path;
}

async function listDocuments(http, { databaseId, collectionId, queries }) {
  const url = buildListDocumentsUrl(databaseId, collectionId, queries);
  const { data } = await http.get(url);
  return data;
}

async function createDocument(http, { databaseId, collectionId, data }) {
  const { data: result } = await http.post(
    `/databases/${encodeURIComponent(
      databaseId
    )}/collections/${encodeURIComponent(collectionId)}/documents`,
    {
      documentId: "unique()",
      data,
    }
  );
  return result;
}

async function updateDocument(
  http,
  { databaseId, collectionId, documentId, data }
) {
  const { data: result } = await http.patch(
    `/databases/${encodeURIComponent(
      databaseId
    )}/collections/${encodeURIComponent(
      collectionId
    )}/documents/${encodeURIComponent(documentId)}`,
    { data }
  );
  return result;
}

module.exports = async function (context) {
  const apiKey = requireEnv(context, "APPWRITE_API_KEY");
  if (!apiKey) return;

  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  if (!projectId) {
    context.error(
      "Missing project id: set APPWRITE_PROJECT_ID for local runs (Appwrite sets APPWRITE_FUNCTION_PROJECT_ID automatically)."
    );
    return;
  }

  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    "https://cloud.appwrite.io/v1";

  const DATABASE_ID = requireEnv(context, "DATABASE_ID");
  if (!DATABASE_ID) return;

  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID ||
    process.env.ACCOUNTS_COLLECTION ||
    "accounts";
  const TRANSACTIONS_COLLECTION_ID =
    process.env.TRANSACTIONS_COLLECTION_ID ||
    process.env.TRANSACTIONS_COLLECTION ||
    "transactions";

  const http = createAppwriteClient({ endpoint, projectId, apiKey });
  const Q = buildQueries();

  try {
    // 1. Fetch all investment accounts that yield interest
    const accounts = await listDocuments(http, {
      databaseId: DATABASE_ID,
      collectionId: ACCOUNTS_COLLECTION_ID,
      queries: [
        Q.equal("type", "investment"),
        Q.notEqual("yieldRate", 0),
        Q.equal("isArchived", false),
      ],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let processedCount = 0;

    for (const account of accounts.documents || []) {
      if (!account.yieldRate) continue;

      const lastYieldDate = account.lastYieldDate
        ? new Date(account.lastYieldDate)
        : null;

      let shouldRun = false;
      const frequency = account.yieldFrequency || "annual";

      if (frequency === "daily") {
        if (
          !lastYieldDate ||
          lastYieldDate.toDateString() !== today.toDateString()
        ) {
          shouldRun = true;
        }
      } else if (frequency === "monthly") {
        if (today.getDate() === (account.billingDay || 1)) {
          if (!lastYieldDate || lastYieldDate.getMonth() !== today.getMonth()) {
            shouldRun = true;
          }
        }
      }

      if (!shouldRun) continue;

      // 3. Calculate Yield
      let yieldAmount = 0;
      const balance = account.currentBalance || 0;
      const rate = account.yieldRate / 100;

      if (frequency === "daily") {
        yieldAmount = (balance * rate) / 365;
      } else if (frequency === "monthly") {
        yieldAmount = (balance * rate) / 12;
      }

      if (yieldAmount <= 0) continue;

      // 4. Create Transaction (Yield Income)
      await createDocument(http, {
        databaseId: DATABASE_ID,
        collectionId: TRANSACTIONS_COLLECTION_ID,
        data: {
          profile: account.profile?.$id ?? account.profile,
          account: account.$id,
          type: "income",
          amount: parseFloat(yieldAmount.toFixed(2)),
          date: new Date().toISOString(),
          description: `Rendimiento diario (${account.name})`,
          origin: "yield",
          category: null,
          isDeleted: false,
          isPending: false,
          isTransferLeg: false,
          isDraft: false,
          currency: account.currency,
          installments: 1,
        },
      });

      // 5. Update Account Balance & Last Yield Date
      await updateDocument(http, {
        databaseId: DATABASE_ID,
        collectionId: ACCOUNTS_COLLECTION_ID,
        documentId: account.$id,
        data: {
          currentBalance: balance + yieldAmount,
          lastYieldDate: new Date().toISOString(),
        },
      });

      processedCount++;
    }

    context.log(`Processed investments for ${processedCount} accounts.`);
    return context.res.send("Success");
  } catch (error) {
    context.error(
      "Error processing investments:",
      error?.response?.data || error
    );
    return context.res.send("Error", 500);
  }
};
