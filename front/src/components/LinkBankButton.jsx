import { useState, useEffect } from "react";
import { functions } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { Button } from "./ui/Button";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function LinkBankButton({ onSuccess, className }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (document.getElementById("belvo-widget-script")) return;

    const script = document.createElement("script");
    script.id = "belvo-widget-script";
    script.src = "https://cdn.belvo.io/belvo-widget-1-stable.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // 1. Get Access Token
      const execution = await functions.createExecution(
        APPWRITE_CONFIG.BELVO_AUTH_FUNCTION_ID,
        JSON.stringify({})
      );

      if (execution.status !== "completed") {
        throw new Error("Failed to generate token");
      }

      const { access } = JSON.parse(execution.responseBody);

      // 2. Open Widget
      // @ts-ignore
      if (!window.belvoSDK) {
        throw new Error("Belvo SDK not loaded");
      }

      // Ensure the container exists
      let belvoContainer = document.getElementById("belvo");
      if (!belvoContainer) {
        belvoContainer = document.createElement("div");
        belvoContainer.id = "belvo";
        document.body.appendChild(belvoContainer);
      }

      window.belvoSDK
        .createWidget(access, {
          callback: (link, institution) => {
            handleSuccess(link, institution);
          },
          onExit: () => {
            setLoading(false);
          },
          onEvent: (data) => {
            console.log("Belvo Event:", data);
          },
        })
        .build();
    } catch (error) {
      console.error("Error initializing Belvo:", error);
      toast.error("Error connecting to bank");
      setLoading(false);
    }
  };

  const handleSuccess = async (linkId, institution) => {
    try {
      toast.loading("Syncing account data...");
      // 3. Exchange/Save Link
      const execution = await functions.createExecution(
        APPWRITE_CONFIG.BELVO_EXCHANGE_FUNCTION_ID,
        JSON.stringify({ link_id: linkId, institution: institution })
      );

      if (execution.status === "completed") {
        toast.dismiss();
        toast.success("Bank connected successfully!");
        if (onSuccess) onSuccess();
      } else {
        throw new Error("Sync failed");
      }
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Error saving connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleConnect} isLoading={loading} className={className}>
      {loading ? t("common.connecting") : t("common.connectBank")}
    </Button>
  );
}
