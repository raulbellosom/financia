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
    const USERS_INFO_COLLECTION = "users_info";
    const LINKS_COLLECTION = "belvo_links";
    const ACCOUNTS_COLLECTION = "accounts";
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

    const userId = req.headers["x-appwrite-user-id"];
    if (!userId) return res.json({ error: "Unauthorized" }, 401);

    let body = {};
    try {
      if (req.bodyJson) body = req.bodyJson;
      else if (req.body) body = JSON.parse(req.body);
    } catch (e) {}

    const { link_id, institution } = body;

    if (!link_id || !institution) {
      return res.json({ error: "Missing link_id or institution" }, 400);
    }

    // Find User Profile
    const profiles = await db.listDocuments(DB_ID, USERS_INFO_COLLECTION, [
      Query.equal("authUserId", userId),
    ]);

    if (profiles.total === 0) {
      return res.json({ error: "User profile not found" }, 404);
    }
    const profileId = profiles.documents[0].$id;

    // 1. Get Link Details
    log(`Fetching link details for ${link_id}`);
    const linkResponse = await axios.get(
      `${baseUrl}/api/links/${link_id}/`,
      axiosConfig
    );
    const linkDetails = linkResponse.data;

    // 2. Save Link to Appwrite
    let linkDocId;
    const existingLinks = await db.listDocuments(DB_ID, LINKS_COLLECTION, [
      Query.equal("belvoId", link_id),
    ]);

    if (existingLinks.total === 0) {
      const newLink = await db.createDocument(
        DB_ID,
        LINKS_COLLECTION,
        ID.unique(),
        {
          profile: profileId,
          belvoId: link_id,
          institution: institution,
          status: linkDetails.status,
          accessMode: linkDetails.access_mode,
          lastSync: new Date().toISOString(),
          externalId: userId,
        }
      );
      linkDocId = newLink.$id;
    } else {
      linkDocId = existingLinks.documents[0].$id;
      // Update status if needed
      await db.updateDocument(DB_ID, LINKS_COLLECTION, linkDocId, {
        status: linkDetails.status,
        lastSync: new Date().toISOString(),
      });
    }

    // 3. Initial Sync: Accounts
    log(`Fetching accounts for link ${link_id}`);
    const accountsResponse = await axios.get(
      `${baseUrl}/api/accounts/?link=${link_id}`,
      axiosConfig
    );
    // Handle pagination or direct array
    const accounts = Array.isArray(accountsResponse.data)
      ? accountsResponse.data
      : accountsResponse.data.results || [];

    for (const acc of accounts) {
      // Map Belvo type to our type
      let type = "other";
      if (acc.category === "CHECKING_ACCOUNT") type = "debit";
      if (acc.category === "CREDIT_CARD") type = "credit";
      if (acc.category === "SAVINGS_ACCOUNT") type = "savings";

      // Check if account exists
      const existingAcc = await db.listDocuments(DB_ID, ACCOUNTS_COLLECTION, [
        Query.equal("belvoId", acc.id),
      ]);

      if (existingAcc.total === 0) {
        await db.createDocument(DB_ID, ACCOUNTS_COLLECTION, ID.unique(), {
          profile: profileId,
          name: acc.name,
          type: type,
          institution: institution,
          currency: acc.currency,
          currentBalance: acc.balance.current,
          belvoId: acc.id,
          link: linkDocId,
          balanceType: "current",
          lastSync: new Date().toISOString(),
          initialBalance: 0, // Default
          color: "#000000", // Default
          icon: "bank", // Default
        });
      } else {
        // Update balance
        await db.updateDocument(
          DB_ID,
          ACCOUNTS_COLLECTION,
          existingAcc.documents[0].$id,
          {
            currentBalance: acc.balance.current,
            lastSync: new Date().toISOString(),
          }
        );
      }
    }

    return res.json({ success: true, accounts: accounts.length });
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
