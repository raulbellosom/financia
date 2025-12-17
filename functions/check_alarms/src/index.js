const axios = require("axios");

/*
  Function: Check Alarms & Send Notifications
  Trigger: CRON Schedule (Every minute or every 5 mins? "0/5 * * * *")

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
    lessThanEqual: (attribute, valueOrValues) =>
      `lessThanEqual("${attribute}", ${JSON.stringify(
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

async function createPush(http, { title, body, users, topics }) {
  const payload = {
    messageId: "unique()",
    title,
    body,
    topics: Array.isArray(topics) ? topics : [],
    users: Array.isArray(users) ? users : [],
  };

  const { data } = await http.post("/messaging/messages/push", payload);
  return data;
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

  const ALARMS_COLLECTION_ID =
    process.env.ALARMS_COLLECTION_ID ||
    process.env.ALARMS_COLLECTION ||
    "alarms";

  const http = createAppwriteClient({ endpoint, projectId, apiKey });
  const Q = buildQueries();

  try {
    const now = new Date();

    const alarms = await listDocuments(http, {
      databaseId: DATABASE_ID,
      collectionId: ALARMS_COLLECTION_ID,
      queries: [
        Q.equal("status", "pending"),
        Q.lessThanEqual("dueDate", now.toISOString()),
        Q.equal("isDeleted", false),
      ],
    });

    let processedCount = 0;

    for (const alarm of alarms.documents || []) {
      const userId =
        alarm.profile?.authUserId ||
        alarm.profile?.userId ||
        alarm.authUserId ||
        alarm.userId;

      if (userId) {
        try {
          await createPush(http, {
            title: alarm.title,
            body: alarm.description || "Tienes un recordatorio pendiente",
            topics: [],
            users: [userId],
          });
        } catch (msgError) {
          context.log(
            `Failed to send push for alarm ${alarm.$id}: ${
              msgError?.response?.data?.message || msgError.message || msgError
            }`
          );
        }
      } else {
        context.log(
          `Skipping push for alarm ${alarm.$id}: missing user id (authUserId)`
        );
      }

      await updateDocument(http, {
        databaseId: DATABASE_ID,
        collectionId: ALARMS_COLLECTION_ID,
        documentId: alarm.$id,
        data: { status: "fired" },
      });

      processedCount++;
    }

    context.log(`Processed ${processedCount} alarms.`);
    return context.res.send("Success");
  } catch (error) {
    context.error("Error processing alarms:", error?.response?.data || error);
    return context.res.send("Error", 500);
  }
};
