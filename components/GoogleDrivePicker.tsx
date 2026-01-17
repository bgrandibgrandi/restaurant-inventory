'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [gisLoaded, setGisLoaded] = useState(false);
  const oauthTokenRef = useRef<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '';

  // Load the Google API scripts
  useEffect(() => {
    // Load Google API script for Picker
    if (!window.gapi) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        window.gapi.load('picker', () => {
          console.log('[GoogleDrive] Picker API loaded');
          setPickerApiLoaded(true);
        });
      };
      document.body.appendChild(gapiScript);
    } else if (window.gapi.picker) {
      setPickerApiLoaded(true);
    } else {
      window.gapi.load('picker', () => {
        console.log('[GoogleDrive] Picker API loaded');
        setPickerApiLoaded(true);
      });
    }

    // Load Google Identity Services
    if (!window.google?.accounts?.oauth2) {
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        console.log('[GoogleDrive] GIS loaded');
        setGisLoaded(true);
      };
      document.body.appendChild(gisScript);
    } else {
      setGisLoaded(true);
    }
  }, []);

  const createPicker = (token: string) => {
    if (!window.google?.picker) {
      console.error('[GoogleDrive] Picker not available');
      setIsLoading(false);
      return;
    }

    console.log('[GoogleDrive] Creating picker...');

    try {
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
        .setOrigin(window.location.origin)
        .setCallback((data: any) => {
          console.log('[GoogleDrive] Picker callback:', data.action);
          if (data.action === window.google.picker.Action.PICKED) {
            const file = data.docs[0];
            onFilePicked({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
            });
          }
          if (data.action === window.google.picker.Action.PICKED ||
              data.action === window.google.picker.Action.CANCEL) {
            setIsLoading(false);
          }
        })
        .setTitle('Select Invoice from Google Drive')
        .build();

      console.log('[GoogleDrive] Showing picker...');
      picker.setVisible(true);
    } catch (error) {
      console.error('[GoogleDrive] Error creating picker:', error);
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!gisLoaded || !window.google?.accounts?.oauth2) {
      console.error('[GoogleDrive] GIS not loaded yet');
      alert('Google Drive is still loading. Please try again.');
      return;
    }

    if (!pickerApiLoaded) {
      console.error('[GoogleDrive] Picker API not loaded yet');
      alert('Google Drive is still loading. Please try again.');
      return;
    }

    setIsLoading(true);

    // If we have a token, use it directly
    if (oauthTokenRef.current) {
      createPicker(oauthTokenRef.current);
      return;
    }

    // Otherwise, request a new token
    console.log('[GoogleDrive] Requesting access token...');
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        console.log('[GoogleDrive] Token response:', response.error || 'success');
        if (response.error) {
          console.error('[GoogleDrive] Auth error:', response.error);
          setIsLoading(false);
          return;
        }
        if (response.access_token) {
          oauthTokenRef.current = response.access_token;
          createPicker(response.access_token);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  };

  // Check if Google Drive is configured
  if (!clientId || !apiKey) {
    return null;
  }

  const isReady = pickerApiLoaded && gisLoaded;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading || !isReady}
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
        {!isReady ? 'Loading Google Drive...' : isLoading ? 'Opening...' : 'Import from Google Drive'}
      </span>
    </button>
  );
}
