import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, storage } from '../lib/appwrite';
import { Button } from '../components/Button';
import PageLayout from '../components/PageLayout';
import { Receipt, Upload, Loader2, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ID, Query } from 'appwrite';

export default function Receipts() {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch receipts
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts', userInfo?.$id],
    queryFn: async () => {
      if (!userInfo) return [];
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_RECEIPTS_COLLECTION_ID,
        [
          Query.equal('profile', userInfo.$id),
          Query.orderDesc('$createdAt')
        ]
      );
      return response.documents;
    },
    enabled: !!userInfo
  });

  // Upload mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async (file) => {
      // 1. Upload file to storage
      const fileResponse = await storage.createFile(
        import.meta.env.VITE_APPWRITE_RECEIPTS_BUCKET_ID,
        ID.unique(),
        file
      );

      // 2. Create document in database
      return await databases.createDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        import.meta.env.VITE_APPWRITE_RECEIPTS_COLLECTION_ID,
        ID.unique(),
        {
          profile: userInfo.$id,
          fileId: fileResponse.$id,
          status: 'uploaded',
          // ocrText, detectedAmount, etc. will be filled by backend function later
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      toast.success('Receipt uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt');
    }
  });

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        await uploadReceiptMutation.mutateAsync(file);
      } finally {
        setUploading(false);
        // Reset input
        e.target.value = '';
      }
    }
  };

  const getFilePreview = (fileId) => {
    try {
      return storage.getFilePreview(
        import.meta.env.VITE_APPWRITE_RECEIPTS_BUCKET_ID,
        fileId,
        300, // width
        300, // height
        'center', // gravity
        100 // quality
      ).href;
    } catch (e) {
      return null;
    }
  };

  return (
    <PageLayout
      title="Receipts"
      subtitle="Upload and manage your receipts"
      icon={Receipt}
      action={
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium px-4 py-2 rounded-xl cursor-pointer transition-colors">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span>Upload Receipt</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,application/pdf" 
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      }
    >

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading receipts...</div>
      ) : receipts?.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Receipt size={32} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No receipts yet</h3>
          <p className="text-zinc-400 max-w-md mx-auto mb-6">
            Upload your receipts to keep track of your expenses and eventually extract data automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {receipts.map((receipt) => (
            <div key={receipt.$id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all">
              <div className="aspect-square bg-zinc-950 relative overflow-hidden">
                {receipt.fileId ? (
                  <img 
                    src={getFilePreview(receipt.fileId)} 
                    alt="Receipt" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <FileText size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">View</Button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    receipt.status === 'processed' ? 'bg-emerald-500/10 text-emerald-500' :
                    receipt.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(receipt.$createdAt).toLocaleDateString()}
                  </span>
                </div>
                {receipt.ocrText && (
                  <p className="text-sm text-zinc-300 line-clamp-2 mt-2">
                    {receipt.ocrText}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
