import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { databases, storage, account } from "../lib/appwrite";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import LocationSelector from "../components/LocationSelector";
import ImageCropper from "../components/ImageCropper";
import PageLayout from "../components/PageLayout";
import {
  User,
  Save,
  Camera,
  Loader2,
  LogOut,
  AlertTriangle,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ID } from "appwrite";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { user, userInfo } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    country: "MX",
    state: "",
    defaultCurrency: "MXN",
    language: "es-MX",
    timezone: "",
    avatarFileId: "",
  });

  const [timezones, setTimezones] = useState([]);
  const [avatarImage, setAvatarImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const { logout } = useAuth();

  useEffect(() => {
    fetch("/timezones.json")
      .then((res) => res.json())
      .then((data) => setTimezones(data))
      .catch((err) => console.error("Failed to load timezones", err));
  }, []);

  useEffect(() => {
    if (userInfo) {
      setFormData((prev) => ({
        ...prev,
        firstName: userInfo.firstName || "",
        lastName: userInfo.lastName || "",
        country: userInfo.country || "MX",
        state: userInfo.state || "",
        defaultCurrency: userInfo.defaultCurrency || "MXN",
        language: userInfo.language || "es-MX",
        timezone: userInfo.timezone || "",
        avatarFileId: userInfo.avatarFileId || "",
      }));

      if (userInfo.avatarFileId) {
        const url = `https://appwrite.racoondevs.com/v1/storage/buckets/${
          import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID
        }/files/${userInfo.avatarFileId}/view?project=${
          import.meta.env.VITE_APPWRITE_PROJECT_ID
        }`;
        setAvatarUrl(url);
      }
    }
  }, [userInfo]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setAvatarImage(reader.result);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob) => {
    setIsCropping(false);
    setUploadingAvatar(true);
    try {
      // Upload to Appwrite Storage
      const file = new File([croppedBlob], "avatar.jpg", {
        type: "image/jpeg",
      });
      const response = await storage.createFile(
        import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID,
        ID.unique(),
        file
      );

      // Get preview URL immediately
      const url = `https://appwrite.racoondevs.com/v1/storage/buckets/${
        import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID
      }/files/${response.$id}/view?project=${
        import.meta.env.VITE_APPWRITE_PROJECT_ID
      }`;
      setAvatarUrl(url);

      // Delete old avatar if exists
      if (userInfo.avatarFileId) {
        try {
          await storage.deleteFile(
            import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID,
            userInfo.avatarFileId
          );
        } catch (error) {
          console.error("Error deleting old avatar:", error);
          // Continue even if delete fails
        }
      }

      // Update user profile in database
      updateProfileMutation.mutate({
        ...formData,
        avatarFileId: response.$id,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(t("profile.uploadError"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Update users_info document
      const updatedDoc = await databases.updateDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_USERS_INFO_COLLECTION_ID,
        userInfo.$id,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          defaultCurrency: data.defaultCurrency,
          language: data.language,
          timezone: data.timezone,
          avatarFileId: data.avatarFileId,
        }
      );

      // 2. Sync Name to Appwrite Auth
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      if (fullName && fullName !== user.name) {
        try {
          await account.updateName(fullName);
        } catch (error) {
          console.error("Failed to sync name to Auth:", error);
        }
      }

      return updatedDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userInfo"]);
      toast.success(t("profile.updateSuccess"));
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast.error(t("profile.updateError"));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleSendVerification = async () => {
    try {
      await account.createVerification(
        `${window.location.origin}/verify-email`
      );
      setVerificationSent(true);
      toast.success(t("profile.verificationSent"));
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email");
    }
  };

  if (!userInfo) return <div>{t("common.loading")}</div>;

  return (
    <PageLayout
      title={t("profile.title")}
      icon={User}
      action={
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={20} className="mr-2" />
            {t("nav.signOut")}
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto mb-20 md:mb-0">
        {/* Email Verification Warning */}
        {!user.emailVerification && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle
              className="text-yellow-500 shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1">
              <h3 className="text-yellow-500 font-medium mb-1">
                {t("profile.emailNotVerified")}
              </h3>
              <p className="text-sm text-yellow-500/80 mb-3">
                {t("profile.verifyEmailDesc")}
              </p>
              {!verificationSent ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSendVerification}
                  className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-transparent"
                >
                  <Mail size={16} className="mr-2" />
                  {t("profile.sendVerification")}
                </Button>
              ) : (
                <p className="text-sm text-emerald-500 font-medium">
                  {t("profile.verificationSent")}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 border-4 border-zinc-800 shadow-xl">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <User size={48} />
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2
                      className="animate-spin text-emerald-500"
                      size={32}
                    />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-emerald-500 rounded-full text-black cursor-pointer hover:bg-emerald-400 transition-colors shadow-lg">
                <Camera size={20} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <p className="mt-4 text-zinc-400 text-sm">
              {t("profile.uploadPhoto")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={t("profile.firstName")}
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
              />
              <Input
                label={t("profile.lastName")}
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
              />
            </div>

            <LocationSelector
              initialCountry={formData.country}
              initialState={formData.state}
              onSelect={(loc) =>
                setFormData({
                  ...formData,
                  country: loc.country,
                  state: loc.state,
                })
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t("profile.currency")}
                </label>
                <select
                  value={formData.defaultCurrency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultCurrency: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="MXN">MXN - Mexican Peso</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t("profile.language")}
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="es-MX">Español (México)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                {t("profile.timezone")}
              </label>
              <select
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="">{t("profile.selectTimezone")}</option>
                {timezones.map((tz, index) => (
                  <option key={index} value={tz.value}>
                    {tz.text}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || uploadingAvatar}
              >
                <Save size={18} className="mr-2" />
                {updateProfileMutation.isPending
                  ? t("profile.saving")
                  : t("profile.saveChanges")}
              </Button>
            </div>
          </form>
        </div>

        {isCropping && (
          <ImageCropper
            imageSrc={avatarImage}
            onCropComplete={handleCropComplete}
            onCancel={() => setIsCropping(false)}
          />
        )}
      </div>
    </PageLayout>
  );
}
