import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { APPWRITE_CONFIG } from "../lib/constants";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import PageLayout from "../components/PageLayout";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Shield,
  Ban,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function AdminUsers() {
  const { userInfo } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("auth"); // 'auth' or 'profile'

  // Form states
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "user",
    country: "MX",
    defaultCurrency: "MXN",
    language: "es-MX",
  });

  // Fetch users and merge data
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch Auth Users
      const authResponse = await fetch(`${APPWRITE_CONFIG.ENDPOINT}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
          "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY, // API Key usually stays in env
        },
      });

      if (!authResponse.ok) throw new Error("Failed to fetch auth users");
      const authData = await authResponse.json();

      // 2. Fetch User Profiles (users_info)
      const profilesResponse = await fetch(
        `${APPWRITE_CONFIG.ENDPOINT}/databases/${APPWRITE_CONFIG.DATABASE_ID}/collections/${APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID}/documents`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
            "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
          },
        }
      );

      if (!profilesResponse.ok)
        throw new Error("Failed to fetch user profiles");
      const profilesData = await profilesResponse.json();

      // 3. Merge Data
      const mergedUsers = authData.users.map((authUser) => {
        const profile = profilesData.documents.find(
          (doc) => doc.authUserId === authUser.$id
        );
        return {
          ...authUser,
          profile: profile || null,
          displayName: profile
            ? `${profile.firstName} ${profile.lastName}`.trim()
            : authUser.name,
          displayRole: profile?.role || "user",
          avatarUrl: profile?.avatarFileId
            ? `https://appwrite.racoondevs.com/v1/storage/buckets/${APPWRITE_CONFIG.AVATARS_BUCKET_ID}/files/${profile.avatarFileId}/view?project=${APPWRITE_CONFIG.PROJECT_ID}`
            : null,
        };
      });

      setUsers(mergedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(t("admin.errorFetch"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create User in Appwrite Auth
      const userResponse = await fetch(`${APPWRITE_CONFIG.ENDPOINT}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
          "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
        },
        body: JSON.stringify({
          userId: "unique()",
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          emailVerification: true,
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      const createdUser = await userResponse.json();

      // 2. Create User Info Document
      const userInfoResponse = await fetch(
        `${APPWRITE_CONFIG.ENDPOINT}/databases/${APPWRITE_CONFIG.DATABASE_ID}/collections/${APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
            "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
          },
          body: JSON.stringify({
            documentId: "unique()",
            data: {
              authUserId: createdUser.$id,
              firstName: newUser.name.split(" ")[0],
              lastName: newUser.name.split(" ").slice(1).join(" "),
              role: newUser.role,
              country: "MX",
              defaultCurrency: "MXN",
              language: "es-MX",
              onboardingDone: false,
            },
          }),
        }
      );

      if (!userInfoResponse.ok) {
        console.error("Failed to create user info");
        toast.error(t("admin.profileCreateError"));
      } else {
        toast.success(t("admin.createSuccess"));
      }

      setIsCreateModalOpen(false);
      setNewUser({ email: "", password: "", name: "", role: "user" });
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(t("admin.createError"));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.profile?.firstName || user.name.split(" ")[0] || "",
      lastName:
        user.profile?.lastName || user.name.split(" ").slice(1).join(" ") || "",
      role: user.profile?.role || "user",
      country: user.profile?.country || "MX",
      defaultCurrency: user.profile?.defaultCurrency || "MXN",
      language: user.profile?.language || "es-MX",
    });
    setActiveTab("auth");
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    try {
      // 1. Update User Info (Profile)
      if (selectedUser.profile) {
        await fetch(
          `${APPWRITE_CONFIG.ENDPOINT}/databases/${APPWRITE_CONFIG.DATABASE_ID}/collections/${APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID}/documents/${selectedUser.profile.$id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
              "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
            },
            body: JSON.stringify({
              data: {
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                role: editForm.role,
                country: editForm.country,
                defaultCurrency: editForm.defaultCurrency,
                language: editForm.language,
              },
            }),
          }
        );
      } else {
        // Create profile if it doesn't exist (edge case)
        await fetch(
          `${APPWRITE_CONFIG.ENDPOINT}/databases/${APPWRITE_CONFIG.DATABASE_ID}/collections/${APPWRITE_CONFIG.USERS_INFO_COLLECTION_ID}/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
              "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
            },
            body: JSON.stringify({
              documentId: "unique()",
              data: {
                authUserId: selectedUser.$id,
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                role: editForm.role,
                country: editForm.country,
                defaultCurrency: editForm.defaultCurrency,
                language: editForm.language,
                onboardingDone: false,
              },
            }),
          }
        );
      }

      // 2. Update Auth Name
      const fullName = `${editForm.firstName} ${editForm.lastName}`.trim();
      if (fullName !== selectedUser.name) {
        await fetch(
          `${APPWRITE_CONFIG.ENDPOINT}/users/${selectedUser.$id}/name`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
              "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
            },
            body: JSON.stringify({
              name: fullName,
            }),
          }
        );
      }

      toast.success(t("admin.updateSuccess"));
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("admin.updateError"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!selectedUser) return;
    try {
      await fetch(
        `${APPWRITE_CONFIG.ENDPOINT}/users/${selectedUser.$id}/verification`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": APPWRITE_CONFIG.PROJECT_ID,
            "X-Appwrite-Key": import.meta.env.VITE_APPWRITE_API_KEY,
          },
          body: JSON.stringify({
            emailVerification: true,
          }),
        }
      );
      toast.success(t("admin.verifiedSuccess"));
      fetchUsers();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error verifying email:", error);
      toast.error(t("admin.verifiedError"));
    }
  };

  if (userInfo?.role !== "admin") {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-zinc-500">
        <Shield size={48} className="mb-4 text-zinc-700" />
        <h2 className="text-xl font-semibold text-white mb-2">
          {t("admin.accessDenied")}
        </h2>
        <p>{t("admin.accessDeniedDesc")}</p>
      </div>
    );
  }

  return (
    <PageLayout
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      icon={Users}
      action={
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={20} className="mr-2" />
          {t("admin.addUser")}
        </Button>
      }
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              placeholder={t("admin.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950 text-zinc-300 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">{t("admin.columns.user")}</th>
                <th className="px-6 py-4">{t("admin.columns.role")}</th>
                <th className="px-6 py-4">{t("admin.columns.status")}</th>
                <th className="px-6 py-4">{t("admin.columns.joined")}</th>
                <th className="px-6 py-4 text-right">
                  {t("admin.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading && users.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    {t("common.loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    {t("admin.noUsers")}
                  </td>
                </tr>
              ) : (
                users
                  .filter(
                    (user) =>
                      user.displayName
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      user.email
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((user) => (
                    <tr
                      key={user.$id}
                      className="hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium overflow-hidden">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : user.displayName ? (
                              user.displayName.charAt(0).toUpperCase()
                            ) : (
                              "U"
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {user.displayName}
                            </div>
                            <div className="text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.displayRole === "admin"
                              ? "bg-purple-500/10 text-purple-500"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {user.displayRole.charAt(0).toUpperCase() +
                            user.displayRole.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            user.status ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          ></span>
                          {user.status ? t("admin.active") : t("admin.blocked")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(user.$createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {t("admin.modalAddTitle")}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label={t("auth.fullName")}
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
              />
              <Input
                label={t("auth.email")}
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
              <Input
                label={t("auth.password")}
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                required
              />
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t("admin.columns.role")}
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {t("admin.createUser")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {t("admin.modalEditTitle")}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("auth")}
                className={`pb-2 text-sm font-medium transition-colors ${
                  activeTab === "auth"
                    ? "text-emerald-500 border-b-2 border-emerald-500"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t("admin.tabs.auth")}
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`pb-2 text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "text-emerald-500 border-b-2 border-emerald-500"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t("admin.tabs.profile")}
              </button>
            </div>

            {activeTab === "auth" ? (
              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-medium">
                      {t("admin.userId")}
                    </label>
                    <div className="text-zinc-300 font-mono text-sm">
                      {selectedUser.$id}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-medium">
                      {t("auth.email")}
                    </label>
                    <div className="text-zinc-300">{selectedUser.email}</div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-medium">
                      {t("admin.registered")}
                    </label>
                    <div className="text-zinc-300">
                      {new Date(selectedUser.registration).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-medium">
                      {t("admin.emailVerification")}
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          selectedUser.emailVerification
                            ? "text-emerald-500"
                            : "text-yellow-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedUser.emailVerification
                              ? "bg-emerald-500"
                              : "bg-yellow-500"
                          }`}
                        ></span>
                        {selectedUser.emailVerification
                          ? t("admin.verified")
                          : t("admin.unverified")}
                      </span>
                      {!selectedUser.emailVerification && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleVerifyEmail}
                        >
                          {t("admin.markVerified")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium overflow-hidden border-2 border-zinc-700">
                    {selectedUser.avatarUrl ? (
                      <img
                        src={selectedUser.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={24} className="text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-zinc-400">
                      {t("admin.profilePicture")}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {t("admin.managedByUser")}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t("profile.firstName")}
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                  />
                  <Input
                    label={t("profile.lastName")}
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    {t("admin.columns.role")}
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      {t("profile.country")}
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm({ ...editForm, country: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      {t("profile.currency")}
                    </label>
                    <select
                      value={editForm.defaultCurrency}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          defaultCurrency: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {t("admin.save")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
