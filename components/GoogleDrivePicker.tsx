'use client';

import { useState, useEffect, useCallback } from 'react';

interface GoogleDrivePickerProps {
  onFilePicked: (file: { id: string; name: string; mimeType: string }) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export default function GoogleDrivePicker({ onFilePicked, disabled }: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '';

  // Load the Google API scripts
  useEffect(() => {
    const loadGoogleApis = async () => {
      // Load Google API script
      if (!window.gapi) {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => {
          window.gapi.load('picker', () => {
            setPickerApiLoaded(true);
          });
        };
        document.body.appendChild(gapiScript);
      } else {
        window.gapi.load('picker', () => {
          setPickerApiLoaded(true);
        });
      }

      // Load Google Identity Services
      if (!window.google?.accounts) {
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        document.body.appendChild(gisScript);
      }
    };

    loadGoogleApis();
  }, []);

  const handleAuthClick = useCallback(() => {
    if (!window.google?.accounts?.oauth2) {
      console.error('Google Identity Services not loaded');
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.access_token) {
          setOauthToken(response.access_token);
          createPicker(response.access_token);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  }, [clientId]);

  const createPicker = useCallback((token: string) => {
    if (!pickerApiLoaded || !token) return;

    setIsLoading(true);

    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setMimeTypes('application/pdf,image/jpeg,image/png,image/webp')
      .setMode(window.google.picker.DocsViewMode.LIST);

    const picker = new window.google.picker.PickerBuilder()
      .setAppId(appId)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .addView(view)
      .addView(new window.google.picker.DocsUploadView())
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          onFilePicked({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
          });
        }
        setIsLoading(false);
      })
      .setTitle('Select Invoice from Google Drive')
      .build();

    picker.setVisible(true);
  }, [pickerApiLoaded, apiKey, appId, onFilePicked]);

  const handleClick = () => {
    if (oauthToken) {
      createPicker(oauthToken);
    } else {
      handleAuthClick();
    }
  };

  // Check if Google Drive is configured
  if (!clientId || !apiKey) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading || !pickerApiLoaded}
      className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      )}
      <span className="font-medium text-gray-700">
        {isLoading ? 'Opening...' : 'Import from Google Drive'}
      </span>
    </button>
  );
}
