const express = require("express");
const cors = require("cors");
require("dotenv").config();

const twilio = require("twilio");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  console.warn("WARNING: Twilio environment variables are not configured.");
}

const client =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

function normalizeBangladeshNumber(phone) {
  if (typeof phone !== "string") return null;

  const value = phone.trim().replace(/\s+/g, "");

  // Accept: 01XXXXXXXXX or +8801XXXXXXXXX or 8801XXXXXXXXX
  if (/^01[3-9]\d{8}$/.test(value)) {
    return "+880" + value.slice(1);
  }

  if (/^\+8801[3-9]\d{8}$/.test(value)) {
    return value;
  }

  if (/^8801[3-9]\d{8}$/.test(value)) {
    return "+" + value;
  }

  return null;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Ludo BD OTP Backend",
    message: "Backend is running."
  });
});

app.post("/api/send-otp", async (req, res) => {
  try {
    const phone = normalizeBangladeshNumber(req.body.phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন। উদাহরণ: 01712345678"
      });
    }

    if (!client || !TWILIO_VERIFY_SERVICE_SID) {
      return res.status(500).json({
        success: false,
        message: "Twilio is not configured on the server."
      });
    }

    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms"
      });

    return res.json({
      success: true,
      status: verification.status,
      message: "OTP SMS পাঠানো হয়েছে।"
    });
  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "OTP পাঠানো যায়নি।"
    });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  try {
    const phone = normalizeBangladeshNumber(req.body.phone);
    const code = String(req.body.code || "").trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন।"
      });
    }

    if (!/^\d{4,10}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "সঠিক OTP দিন।"
      });
    }

    if (!client || !TWILIO_VERIFY_SERVICE_SID) {
      return res.status(500).json({
        success: false,
        message: "Twilio is not configured on the server."
      });
    }

    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code
      });

    const approved = check.status === "approved";

    return res.json({
      success: approved,
      status: check.status,
      message: approved ? "OTP সঠিক।" : "OTP সঠিক নয় বা মেয়াদ শেষ হয়েছে।"
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "OTP verify করা যায়নি।"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ludo BD OTP backend running on port ${PORT}`);
});
