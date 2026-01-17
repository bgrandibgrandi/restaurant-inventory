'use client';

import { useState } from 'react';

interface GoogleDrivePickerProps {
  onFilePicked: (file: { id: string; name: string; mimeType: string }) => void;
  disabled?: boolean;
}

export default function GoogleDrivePicker({ onFilePicked, disabled }: GoogleDrivePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract file ID from various Google Drive URL formats
  const extractFileId = (url: string): string | null => {
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];

    // Format: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return openMatch[1];

    // Format: https://docs.google.com/document/d/FILE_ID/edit
    const docMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) return docMatch[1];

    return null;
  };

  const handleSubmit = async () => {
    setError('');

    const fileId = extractFileId(driveLink.trim());
    if (!fileId) {
      setError('Invalid Google Drive link. Please paste a valid share link.');
      return;
    }

    setIsLoading(true);

    // Detect file type from URL or default to PDF
    let mimeType = 'application/pdf';
    const lowerUrl = driveLink.toLowerCase();
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (lowerUrl.includes('.png')) {
      mimeType = 'image/png';
    } else if (lowerUrl.includes('.webp')) {
      mimeType = 'image/webp';
    }

    // Extract filename from URL if possible, otherwise use generic name
    const fileName = `google-drive-import-${fileId.substring(0, 8)}`;

    onFilePicked({
      id: fileId,
      name: fileName,
      mimeType,
    });

    setShowModal(false);
    setDriveLink('');
    setIsLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
        <span className="font-medium text-gray-700">Import from Google Drive</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import from Google Drive</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setDriveLink('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Drive Share Link
              </label>
              <input
                type="text"
                value={driveLink}
                onChange={(e) => {
                  setDriveLink(e.target.value);
                  setError('');
                }}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">
                <strong>How to get the link:</strong>
              </p>
              <ol className="text-sm text-gray-500 mt-2 space-y-1 list-decimal list-inside">
                <li>Open the file in Google Drive</li>
                <li>Click "Share" button</li>
                <li>Set access to "Anyone with the link"</li>
                <li>Copy the link and paste it here</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setDriveLink('');
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!driveLink.trim() || isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
