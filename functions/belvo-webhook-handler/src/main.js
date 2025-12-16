const axios = require("axios");
const sdk = require("node-appwrite");

module.exports = async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite Client
    const appwriteClient = new sdk.Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    if (process.env.APPWRITE_SELF_SIGNED === "true") {
      appwriteClient.setSelfSigned(true);
    }

    const db = new sdk.Databases(appwriteClient);
    const DB_ID = process.env.DATABASE_ID;
    const TRANSACTIONS_COLLECTION = "transactions";
    const ACCOUNTS_COLLECTION = "accounts";
    const LINKS_COLLECTION = "belvo_links";
    const ID = sdk.ID;
    const Query = sdk.Query;

    // Belvo Configuration
    const secretId = process.env.BELVO_SECRET_ID;
    const secretPassword = process.env.BELVO_SECRET_PASSWORD;
    const env = process.env.BELVO_ENV || "sandbox";
    const baseUrl =
      env === "production"
        ? "https://api.belvo.com"
        : "https://sandbox.belvo.com";

    const authHeader =
      "Basic " +
      Buffer.from(`${secretId}:${secretPassword}`).toString("base64");

    const axiosConfig = {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    };

    // Parse incoming webhook body.
    // IMPORTANT: Avoid touching `req.bodyJson` directly.
    // In Appwrite 1.8.0-RC2 it is a getter that JSON.parse()'s internally and
    // throws on empty body ("Unexpected end of JSON input").
    let event = null;
    let rawBody = "";

    const safeParseJson = (value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    };

    if (typeof req.bodyRaw === "string" && req.bodyRaw.trim().length > 0) {
      rawBody = req.bodyRaw;
      event = safeParseJson(req.bodyRaw);
    } else if (typeof req.body === "string" && req.body.trim().length > 0) {
      rawBody = req.body;
      event = safeParseJson(req.body);
    } else if (typeof req.body === "object" && req.body !== null) {
      event = req.body;
    }

    if (!event) {
      // Some providers' "test webhook" is just a reachability ping (no body)
      log(
        "Webhook received with empty/invalid body (likely provider test/ping)."
      );
      return res.json({ status: "ok", note: "empty_body_ping" });
    }

    // If we got rawBody but it wasn't valid JSON, fail fast.
    if (rawBody && (!event || typeof event !== "object")) {
      log("Failed to parse webhook JSON body.");
      return res.json({ status: "error", reason: "invalid_json" }, 400);
    }

    // Minimal diagnostics (avoid logging full payload)
    const eventKeys =
      event && typeof event === "object" ? Object.keys(event) : [];
    log(
      `Webhook bodyRaw length=${
        rawBody ? rawBody.length : 0
      }, keys=${eventKeys.join(",")}`
    );

    // Normaliza campos Belvo (vienen en snake_case)
    const webhookType = event.webhook_type ?? event.type ?? null;
    const webhookCode = event.webhook_code ?? event.code ?? null;

    // Belvo manda link_id normalmente en raíz (como en el test del dashboard)
    const linkId =
      event.link_id ??
      event.linkId ??
      event.data?.link_id ??
      event.data?.linkId ??
      null;

    log(
      `Received webhook: type=${webhookType ?? "unknown"}, code=${
        webhookCode ?? "unknown"
      }, link=${linkId ?? "unknown"}`
    );

    // Only process transaction-related webhooks. Others are acknowledged.
    const isTransactionsWebhook =
      webhookType === "TRANSACTIONS" || webhookCode === "TRANSACTIONS_NEW";
    const isNewTransactionsEvent =
      webhookCode === "transactions_new" || webhookCode === "TRANSACTIONS_NEW";

    if (isTransactionsWebhook && isNewTransactionsEvent) {
      if (!linkId) {
        log("Ignoring transactions webhook: missing link_id");
        return res.json({ status: "ignored", reason: "missing_link_id" });
      }

      // Find the link in our DB to get the profile
      const links = await db.listDocuments(DB_ID, LINKS_COLLECTION, [
        Query.equal("belvoId", linkId),
      ]);

      if (links.total === 0) {
        log(`Link ${linkId} not found in DB`);
        return res.json({ status: "ignored" });
      }
      const linkDoc = links.documents[0];
      const profileId = linkDoc.profile.$id;

      // Fetch new transactions
      // We fetch the last 100 transactions or filter by date if possible
      log(`Fetching transactions for link ${linkId}`);
      const txResponse = await axios.get(
        `${baseUrl}/api/transactions/?link=${encodeURIComponent(
          linkId
        )}&limit=100`,
        axiosConfig
      );
      const transactions = Array.isArray(txResponse.data)
        ? txResponse.data
        : txResponse.data.results || [];

      for (const tx of transactions) {
        // Check if exists
        const existingTx = await db.listDocuments(
          DB_ID,
          TRANSACTIONS_COLLECTION,
          [Query.equal("belvoId", tx.id)]
        );

        if (existingTx.total > 0) continue;

        // Find account doc ID
        const accounts = await db.listDocuments(DB_ID, ACCOUNTS_COLLECTION, [
          Query.equal("belvoId", tx.account.id),
        ]);

        let accountId = null;
        if (accounts.total > 0) {
          accountId = accounts.documents[0].$id;
        } else {
          log(`Account ${tx.account.id} not found for tx ${tx.id}`);
          continue;
        }

        const isExpense = tx.amount < 0;
        const amount = Math.abs(tx.amount);
        const type = isExpense ? "expense" : "income";

        await db.createDocument(DB_ID, TRANSACTIONS_COLLECTION, ID.unique(), {
          profile: profileId,
          account: accountId,
          belvoId: tx.id,
          amount: amount,
          currency: tx.currency,
          date: tx.value_date || tx.accounting_date,
          description: tx.description,
          merchantName: tx.merchant ? tx.merchant.name : null,
          merchantLogo: tx.merchant ? tx.merchant.logo : null,
          belvoCategory: tx.category,
          status: "PROCESSED",
          origin: "belvo",
          type: type,
          isPending: tx.status === "PENDING",
          isDraft: false,
          isDeleted: false,
        });
      }
    }

    return res.json({ status: "ok" });
  } catch (e) {
    const errorMessage = e.message || String(e);
    const errorStack = e.stack || "No stack trace";

    let errorDetails = {};
    if (e.response) {
      errorDetails.status = e.response.status;
      errorDetails.data = e.response.data;
    }

    error("Error occurred: " + errorMessage);
    if (Object.keys(errorDetails).length > 0) {
      error(
        "Belvo API Error Details: " + JSON.stringify(errorDetails, null, 2)
      );
    }
    error("Stack: " + errorStack);

    return res.json(
      { error: errorMessage, details: errorDetails, stack: errorStack },
      500
    );
  }
};
