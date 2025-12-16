const axios = require("axios");
const sdk = require("node-appwrite");

module.exports = async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite Client
    const appwriteClient = new sdk.Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    // For self-hosted instances with self-signed certs
    if (process.env.APPWRITE_SELF_SIGNED === "true") {
      appwriteClient.setSelfSigned(true);
    }

    const users = new sdk.Users(appwriteClient);

    const userId = req.headers["x-appwrite-user-id"];

    if (!userId) {
      return res.json({ error: "Unauthorized: Missing User ID" }, 401);
    }

    // Fetch user details to get email
    const user = await users.get(userId);

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

    let body = {};
    try {
      if (req.bodyJson) body = req.bodyJson;
      else if (req.body) body = JSON.parse(req.body);
    } catch (e) {}

    const payload = {
      id: secretId,
      password: secretPassword,
      scopes: "read_institutions,write_links,read_links",
      widget: {
        branding: {
          company_icon: "https://belvo.com/icon.svg",
          company_logo: "https://financia.racoondevs.com/logo.svg",
          company_name: "Financia | RacoonDevs",
          company_terms_url: "https://belvo.com/terms-service/",
        },
      },
    };

    // Handle re-authentication (if link_id is provided)
    if (body.link_id) {
      payload.link = body.link_id; // API expects 'link'
    }

    log(`Requesting Belvo Token from ${baseUrl}/api/token/`);

    const response = await axios.post(`${baseUrl}/api/token/`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.json(response.data);
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
