require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Client, Databases, Query, Users, ID } = require("node-appwrite");

// Suppress Appwrite SDK version warning
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("Appwrite server version")
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

const app = express();
const PORT = process.env.PORT || 3001;

// Appwrite Configuration
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const users = new Users(client);
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Simple in-memory throttling for resend verification (best-effort)
const RESEND_VERIFICATION_COOLDOWN_MS =
  Number(process.env.RESEND_VERIFICATION_COOLDOWN_MS) || 2 * 60 * 1000;
const resendVerificationLastSent = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Transporter configuration (Ionos SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ionos.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Connection Error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

// Routes
const getEmailTemplate = (title, content, actionUrl, actionText) => {
  const logoUrl =
    "https://appwrite.racoondevs.com/v1/storage/buckets/6938c75e000d44d3e3fa/files/6938c76e0006ba103df9/view?project=6928fb370000d34abbee&mode=admin"; // Adjust if necessary
  const primaryColor = "#10b981"; // Emerald 500
  const backgroundColor = "#09090b"; // Zinc 950
  const containerColor = "#18181b"; // Zinc 900
  const textColor = "#e4e4e7"; // Zinc 200

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: Arial, sans-serif; color: ${textColor};">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="100%" style="max-width: 600px; background-color: ${containerColor}; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 0 20px 0;">
                  <img src="${logoUrl}" alt="Financia Logo" style="width: 64px; height: auto;">
                  <h1 style="margin-top: 20px; font-size: 24px; font-weight: bold; color: #ffffff;">Financia</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 0 40px 40px 40px; text-align: center;">
                  <h2 style="font-size: 20px; margin-bottom: 20px; color: #ffffff;">${title}</h2>
                  <div style="font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 30px;">
                    ${content}
                  </div>
                  
                  ${
                    actionUrl
                      ? `
                  <div style="margin-bottom: 30px;">
                    <a href="${actionUrl}" style="background-color: ${primaryColor}; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                      ${actionText}
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #71717a;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${actionUrl}" style="color: ${primaryColor}; text-decoration: none; word-break: break-all;">${actionUrl}</a>
                  </p>
                  `
                      : ""
                  }
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #000000; padding: 20px; text-align: center; font-size: 12px; color: #52525b;">
                  <p style="margin: 0;">&copy; ${new Date().getFullYear()} Financia. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const translations = {
  es: {
    verifyEmail: {
      subject: "Verifica tu correo - Financia",
      title: "Verifica tu correo",
      welcome: "¡Bienvenido a Financia",
      content:
        "Estamos emocionados de tenerte a bordo. Por favor verifica tu dirección de correo para obtener acceso completo a todas las funciones.",
      button: "Verificar Correo",
      orCopy: "O copia y pega este enlace en tu navegador:",
    },
    resendVerify: {
      subject: "Verifica tu correo - Financia",
      title: "Verifica tu correo",
      greeting: "Hola",
      content:
        "Recibimos una solicitud para reenviar tu correo de verificación. Si no hiciste esta solicitud, puedes ignorar este correo.",
      button: "Verificar Cuenta",
    },
    resetPassword: {
      subject: "Restablece tu contraseña - Financia",
      title: "Restablece tu contraseña",
      greeting: "Hola",
      content:
        "Recibimos una solicitud para restablecer tu contraseña. Si no hiciste esta solicitud, puedes ignorar este correo.",
      button: "Restablecer Contraseña",
      expiry: "Este enlace expirará en 1 hora.",
    },
  },
  en: {
    verifyEmail: {
      subject: "Verify your email - Financia",
      title: "Verify your email",
      welcome: "Welcome to Financia",
      content:
        "We're excited to have you on board. Please verify your email address to get full access to all features.",
      button: "Verify Email",
      orCopy: "Or copy and paste this link into your browser:",
    },
    resendVerify: {
      subject: "Verify your email - Financia",
      title: "Verify your email",
      greeting: "Hi",
      content:
        "We received a request to resend your verification email. If you didn't make this request, you can safely ignore this email.",
      button: "Verify Account",
    },
    resetPassword: {
      subject: "Reset your password - Financia",
      title: "Reset your password",
      greeting: "Hi",
      content:
        "We received a request to reset your password. If you didn't make this request, you can safely ignore this email.",
      button: "Reset Password",
      expiry: "This link will expire in 1 hour.",
    },
  },
};

app.post("/ensure-user-info-on-login", async (req, res) => {
  const { authUserId, lang = "en", timezone } = req.body;

  if (!authUserId) {
    return res.status(400).json({ error: "Missing authUserId" });
  }

  try {
    const response = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USERS_INFO_COLLECTION_ID,
      [Query.equal("authUserId", authUserId)]
    );

    if (response.documents.length > 0) {
      return res.status(200).json({ success: true, exists: true });
    }

    // Minimal safe defaults; verified_email must start false
    const language = lang === "es" ? "es-MX" : "en-US";
    const tz = timezone || "America/Mexico_City";

    const created = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USERS_INFO_COLLECTION_ID,
      ID.unique(),
      {
        authUserId,
        country: "MX",
        defaultCurrency: "MXN",
        language,
        timezone: tz,
        verified_email: false,
        verified_phone: false,
        onboardingDone: false,
        role: "user",
      }
    );

    return res
      .status(201)
      .json({ success: true, created: true, id: created.$id });
  } catch (error) {
    console.error("Error ensuring user profile:", error);
    return res.status(500).json({ error: "Failed to ensure user profile" });
  }
});

app.post("/send-verification", async (req, res) => {
  const { email, name, verificationLink, lang = "en" } = req.body;
  const t = translations[lang] || translations.en;

  if (!email || !verificationLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const content = `
    <p>${t.verifyEmail.welcome}${name ? ", " + name : ""}!</p>
    <p>${t.verifyEmail.content}</p>
  `;

  const html = getEmailTemplate(
    t.verifyEmail.title,
    content,
    verificationLink,
    t.verifyEmail.button
  );

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Financia" <no-reply@financia.app>',
    to: email,
    subject: t.verifyEmail.subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent: %s", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.post("/resend-verification", async (req, res) => {
  const {
    email,
    name,
    verificationLink,
    lang = "en",
    userId,
    userInfoId,
  } = req.body;
  const t = translations[lang] || translations.en;

  if (!email || !verificationLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const content = `
    <p>${t.resendVerify.greeting}${name ? " " + name : ""},</p>
    <p>${t.resendVerify.content}</p>
    <p>${t.resendVerify.button}</p>
  `;

  const html = getEmailTemplate(
    t.resendVerify.title,
    content,
    verificationLink,
    t.resendVerify.button
  );

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Financia" <no-reply@financia.app>',
    to: email,
    subject: t.resendVerify.subject,
    html: html,
  };

  try {
    const throttleKey = userInfoId || userId || email;
    const now = Date.now();
    const lastSent = resendVerificationLastSent.get(throttleKey);
    if (lastSent && now - lastSent < RESEND_VERIFICATION_COOLDOWN_MS) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfterMs: RESEND_VERIFICATION_COOLDOWN_MS - (now - lastSent),
      });
    }

    // If identifiers are provided, do not resend if already verified
    if (userInfoId) {
      try {
        const doc = await databases.getDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_USERS_INFO_COLLECTION_ID,
          userInfoId
        );
        if (doc?.verified_email === true) {
          return res.status(400).json({ error: "Email already verified" });
        }
      } catch {
        // ignore; fallback checks below if possible
      }
    } else if (userId) {
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_INFO_COLLECTION_ID,
        [Query.equal("authUserId", userId)]
      );

      if (response.documents.length > 0) {
        const userInfoDoc = response.documents[0];
        if (userInfoDoc?.verified_email === true) {
          return res.status(400).json({ error: "Email already verified" });
        }
      }
    }

    const info = await transporter.sendMail(mailOptions);
    resendVerificationLastSent.set(throttleKey, now);
    console.log("Resend verification email sent: %s", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.post("/send-password-reset", async (req, res) => {
  const { email, name, resetLink, lang = "en" } = req.body;
  const t = translations[lang] || translations.en;

  if (!email || !resetLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Find user by email to get ID
    const userList = await users.list([Query.equal("email", email)]);
    if (userList.users.length === 0) {
      // Don't reveal user existence
      return res.status(200).json({ success: true });
    }
    const user = userList.users[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.$id, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const finalResetLink = `${resetLink}?token=${token}`;

    const content = `
    <p>${t.resetPassword.greeting}${name ? " " + name : ""},</p>
    <p>${t.resetPassword.content}</p>
    <p>${t.resetPassword.expiry}</p>
  `;

    const html = getEmailTemplate(
      t.resetPassword.title,
      content,
      finalResetLink,
      t.resetPassword.button
    );

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Financia" <no-reply@financia.app>',
      to: email,
      subject: t.resetPassword.subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent: %s", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.post("/reset-password-confirm", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    await users.updatePassword(userId, newPassword);
    console.log(`Password updated for user ${userId}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to reset password" });
  }
});

app.post("/verify-account", async (req, res) => {
  const { userId, userInfoId } = req.body;

  if (!userId && !userInfoId) {
    return res.status(400).json({ error: "Missing userId or userInfoId" });
  }

  try {
    let docId = userInfoId;

    // If docId not provided, or invalid, resolve by authUserId
    if (!docId && userId) {
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_INFO_COLLECTION_ID,
        [Query.equal("authUserId", userId)]
      );
      if (response.documents.length === 0) {
        return res.status(404).json({ error: "User profile not found" });
      }
      docId = response.documents[0].$id;
    }

    // Update verified_email to true
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USERS_INFO_COLLECTION_ID,
      docId,
      {
        verified_email: true,
      }
    );

    console.log(`User verified successfully (docId=${docId})`);
    res.status(200).json({ success: true, docId });
  } catch (error) {
    console.error("Error verifying account:", error);
    res.status(500).json({ error: "Failed to verify account" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});
