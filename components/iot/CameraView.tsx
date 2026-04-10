'use client';

import { useState } from 'react';

interface CameraViewProps {
  defaultUrl?: string;
}

export default function CameraView({ defaultUrl = '' }: CameraViewProps) {
  const savedUrl = typeof window !== 'undefined' ? (localStorage.getItem('cameraUrl') ?? defaultUrl) : defaultUrl;
  const [cameraUrl, setCameraUrl] = useState(savedUrl);
  const [inputUrl, setInputUrl] = useState(savedUrl);

  const handleConnect = () => {
    setCameraUrl(inputUrl);
    if (inputUrl) {
      localStorage.setItem('cameraUrl', inputUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Nhập địa chỉ IP của ESP32-CAM (vd: http://192.168.1.100)"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
        />
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Kết nối
        </button>
      </div>
      <div className="aspect-video bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center">
        {cameraUrl ? (
          <img
            src={`${cameraUrl}/stream`}
            alt="ESP32-CAM Stream"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="text-center p-8">
                    <svg class="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-zinc-400">Không thể kết nối đến camera</p>
                    <p class="text-sm text-zinc-500">Kiểm tra địa chỉ IP và đảm bảo ESP32-CAM đang hoạt động</p>
                  </div>
                `;
              }
            }}
          />
        ) : (
          <div className="text-center p-8">
            <svg
              className="w-16 h-16 text-zinc-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-zinc-400">Nhập địa chỉ IP của ESP32-CAM để xem hình ảnh</p>
            <p className="text-sm text-zinc-500 mt-2">Ví dụ: http://192.168.1.100</p>
          </div>
        )}
      </div>
    </div>
  );
}
