'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoogleDrivePicker from '@/components/GoogleDrivePicker';
import PageLayout, { Card, Badge, Select, EmptyState } from '@/components/ui/PageLayout';

type Store = {
  id: string;
  name: string;
};

type Invoice = {
  id: string;
  fileName: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  status: string;
  totalAmount: number | null;
  currency: string;
  store: { name: string };
  user: { name: string | null; email: string };
  _count: { items: number };
  createdAt: string;
  potentialMismatch?: boolean;
  mismatchDismissed?: boolean;
};

type UploadProgress = {
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
};

export default function InvoicesPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesRes, invoicesRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/invoices'),
      ]);

      const [storesData, invoicesData] = await Promise.all([
        storesRes.json(),
        invoicesRes.json(),
      ]);

      setStores(storesData);
      setInvoices(invoicesData);

      if (storesData.length > 0) {
        setSelectedStore(storesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await uploadFiles(Array.from(e.dataTransfer.files));
      }
    },
    [selectedStore]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Use PDF, JPG, PNG, or WebP.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Max 10MB.';
    }
    return null;
  };

  const uploadFiles = async (files: File[]) => {
    if (!selectedStore) {
      alert('Please select a venue first');
      return;
    }

    const validFiles: File[] = [];
    const initialProgress: UploadProgress[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        initialProgress.push({ fileName: file.name, status: 'error', error });
      } else {
        validFiles.push(file);
        initialProgress.push({ fileName: file.name, status: 'uploading' });
      }
    }

    if (validFiles.length === 0) {
      setUploadProgress(initialProgress);
      return;
    }

    setUploading(true);
    setUploadProgress(initialProgress);

    const uploadPromises = validFiles.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('storeId', selectedStore);

        const response = await fetch('/api/invoices', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setUploadProgress(prev =>
            prev.map(p =>
              p.fileName === file.name ? { ...p, status: 'success' } : p
            )
          );
          return { success: true, file };
        } else {
          const error = await response.json();
          setUploadProgress(prev =>
            prev.map(p =>
              p.fileName === file.name
                ? { ...p, status: 'error', error: error.error || 'Upload failed' }
                : p
            )
          );
          return { success: false, file };
        }
      } catch (error) {
        setUploadProgress(prev =>
          prev.map(p =>
            p.fileName === file.name
              ? { ...p, status: 'error', error: 'Upload failed' }
              : p
          )
        );
        return { success: false, file };
      }
    });

    await Promise.all(uploadPromises);
    setUploading(false);

    await fetchData();

    setTimeout(() => {
      setUploadProgress([]);
    }, 3000);
  };

  const handleGoogleDriveFile = async (file: { id: string; name: string; mimeType: string }) => {
    if (!selectedStore) {
      alert('Please select a venue first');
      return;
    }

    const tokenClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: async (response: any) => {
        if (response.access_token) {
          setUploading(true);
          try {
            const apiResponse = await fetch('/api/invoices/google-drive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileId: file.id,
                fileName: file.name,
                mimeType: file.mimeType,
                accessToken: response.access_token,
                storeId: selectedStore,
              }),
            });

            if (apiResponse.ok) {
              const invoice = await apiResponse.json();
              router.push(`/invoices/${invoice.id}`);
            } else {
              const error = await apiResponse.json();
              alert(`Import failed: ${error.error}`);
            }
          } catch (error) {
            console.error('Google Drive import error:', error);
            alert('Import failed');
          } finally {
            setUploading(false);
          }
        }
      },
    });

    tokenClient?.requestAccessToken({ prompt: '' });
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      pending: 'warning',
      processing: 'info',
      reviewed: 'info',
      confirmed: 'success',
      error: 'danger',
    };
    return variants[status] || 'default';
  };

  if (loading) {
    return (
      <PageLayout title="Invoice Import" backHref="/dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Invoice Import" backHref="/dashboard">
      {/* Upload Section */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Invoice</h2>

        {/* Store Selection */}
        <Select
          label="Select Venue"
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="mb-4"
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </Select>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-gray-300/80 hover:border-gray-400 bg-gray-50/30'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              {uploading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              ) : (
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                {uploading ? 'Uploading...' : 'Drop invoices here'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to select files (PDF, JPG, PNG) - multiple files supported
              </p>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadProgress.map((progress, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  progress.status === 'uploading'
                    ? 'bg-blue-50 border border-blue-200/50'
                    : progress.status === 'success'
                    ? 'bg-green-50 border border-green-200/50'
                    : 'bg-red-50 border border-red-200/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {progress.status === 'uploading' && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent flex-shrink-0"></div>
                  )}
                  {progress.status === 'success' && (
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {progress.status === 'error' && (
                    <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="text-sm truncate">{progress.fileName}</span>
                </div>
                {progress.error && (
                  <span className="text-xs text-red-600 ml-2 flex-shrink-0">{progress.error}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/80"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Google Drive Picker */}
        <GoogleDrivePicker
          onFilePicked={handleGoogleDriveFile}
          disabled={uploading || !selectedStore}
        />

        <p className="text-xs text-gray-500 mt-4 text-center">
          AI will extract items, quantities, and prices from your invoice
        </p>
      </Card>

      {/* Recent Invoices */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Recent Invoices
        </h2>

        {invoices.length === 0 ? (
          <Card>
            <EmptyState
              icon={
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No invoices yet"
              description="Upload your first invoice above"
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className={`block bg-white/70 backdrop-blur-sm rounded-2xl border p-4 hover:shadow-lg hover:border-gray-300/50 transition-all duration-300 ${
                  invoice.potentialMismatch && !invoice.mismatchDismissed
                    ? 'border-orange-300 bg-orange-50/50'
                    : 'border-gray-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      invoice.potentialMismatch && !invoice.mismatchDismissed
                        ? 'bg-gradient-to-br from-orange-100 to-orange-200'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                    }`}>
                      {invoice.potentialMismatch && !invoice.mismatchDismissed ? (
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {invoice.supplierName || invoice.fileName || 'Invoice'}
                        </span>
                        {invoice.potentialMismatch && !invoice.mismatchDismissed && (
                          <Badge variant="warning">Check venue</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.store.name} • {invoice._count.items} items
                      </div>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </span>
                  {invoice.totalAmount && (
                    <span className="font-medium text-gray-900">
                      {invoice.currency} {invoice.totalAmount.toFixed(2)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
