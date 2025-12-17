import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases } from "../lib/appwrite";
import { Query, ID } from "appwrite";
import { APPWRITE_CONFIG } from "../lib/constants";
import { useAuth } from "../context/AuthContext";

export const useAlarms = () => {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();

  const alarmsQuery = useQuery({
    queryKey: ["alarms", userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ALARMS_COLLECTION_ID,
        [Query.equal("profile", userInfo.$id), Query.orderAsc("dueDate")]
      );
      return response.documents;
    },
    enabled: !!userInfo,
  });

  const createAlarmMutation = useMutation({
    mutationFn: async (newAlarm) => {
      return await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ALARMS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          enabled: true,
          ...newAlarm,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["alarms"]);
    },
  });

  const updateAlarmMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ALARMS_COLLECTION_ID,
        id,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["alarms"]);
    },
  });

  const deleteAlarmMutation = useMutation({
    mutationFn: async (id) => {
      return await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ALARMS_COLLECTION_ID,
        id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["alarms"]);
    },
  });

  return {
    alarms: alarmsQuery.data || [],
    isLoading: alarmsQuery.isLoading,
    createAlarm: createAlarmMutation.mutateAsync,
    updateAlarm: updateAlarmMutation.mutateAsync,
    deleteAlarm: deleteAlarmMutation.mutateAsync,
  };
};
