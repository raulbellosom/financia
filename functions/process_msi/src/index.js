const axios = require("axios");

/*
  Function: Process MSI Installments
  Trigger: CRON Schedule (Daily check, e.g. "0 2 * * *")

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

  const TRANSACTIONS_COLLECTION_ID =
    process.env.TRANSACTIONS_COLLECTION_ID ||
    process.env.TRANSACTIONS_COLLECTION ||
    "transactions";

  const http = createAppwriteClient({ endpoint, projectId, apiKey });
  const Q = buildQueries();

  try {
    const masters = await listDocuments(http, {
      databaseId: DATABASE_ID,
      collectionId: TRANSACTIONS_COLLECTION_ID,
      queries: [Q.greaterThan("installments", 1), Q.equal("isDeleted", false)],
    });

    const today = new Date();
    let processedCount = 0;

    for (const master of masters.documents || []) {
      if (master.installmentsPaid >= master.installments) continue;

      const purchaseDate = new Date(master.date);
      const nextDueMonth = master.installmentsPaid + 1;

      const nextPaymentDate = new Date(purchaseDate);
      nextPaymentDate.setMonth(purchaseDate.getMonth() + nextDueMonth);

      if (
        nextPaymentDate.getDate() === today.getDate() &&
        nextPaymentDate.getMonth() === today.getMonth() &&
        nextPaymentDate.getFullYear() === today.getFullYear()
      ) {
        const monthlyAmount = master.amount / master.installments;

        await createDocument(http, {
          databaseId: DATABASE_ID,
          collectionId: TRANSACTIONS_COLLECTION_ID,
          data: {
            profile: master.profile?.$id ?? master.profile,
            account: master.account?.$id ?? master.account,
            type: "expense",
            amount: parseFloat(monthlyAmount.toFixed(2)),
            date: new Date().toISOString(),
            description: `Pago ${nextDueMonth}/${master.installments}: ${master.description}`,
            category: master.category
              ? master.category.$id ?? master.category
              : null,
            isDeleted: false,
            installments: 1,
            origin: "recurring",
          },
        });

        await updateDocument(http, {
          databaseId: DATABASE_ID,
          collectionId: TRANSACTIONS_COLLECTION_ID,
          documentId: master.$id,
          data: {
            installmentsPaid: master.installmentsPaid + 1,
          },
        });

        processedCount++;
      }
    }

    context.log(`Processed ${processedCount} MSI installments.`);
    return context.res.send("Success");
  } catch (error) {
    context.error("Error processing MSI:", error?.response?.data || error);
    return context.res.send("Error", 500);
  }
};
