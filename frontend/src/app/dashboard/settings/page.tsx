"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

interface ServiceInfo {
  name: string;
  connected: boolean;
  details: string;
}

export default function SettingsPage() {
  const { toggleSidebar } = useSidebar();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [profile, setProfile] = useState<{
    id: number;
    username: string;
    full_name: string;
    role: string;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [appInfo, setAppInfo] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api
      .getConnectedServices(token)
      .then((d) => setServices(d.services))
      .catch(() => {});
    api.getProfile(token).then(setProfile).catch(() => {});
    api.getAppInfo(token).then(setAppInfo).catch(() => {});
  }, []);

  return (
    <>
      <Header title="Settings" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Profile */}
        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Profile
          </h3>
          {profile ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Username:</span>{" "}
                <span className="font-medium text-gray-800">
                  {profile.username}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Full Name:</span>{" "}
                <span className="font-medium text-gray-800">
                  {profile.full_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Role:</span>{" "}
                <span className="font-medium text-gray-800 capitalize">
                  {profile.role}
                </span>
              </div>
              <div>
                <span className="text-gray-500">User ID:</span>{" "}
                <span className="font-medium text-gray-800">{profile.id}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm">Loading...</p>
          )}
        </div>

        {/* Connected Services */}
        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Connected Services
          </h3>
          <div className="space-y-3">
            {services.map((svc) => (
              <div
                key={svc.name}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  svc.connected
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      svc.connected ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div>
                    <span className="font-medium text-gray-800">
                      {svc.name}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {svc.details}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    svc.connected
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {svc.connected ? "Connected" : "Not Connected"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* App Info */}
        {appInfo && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Application Info
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">App:</span>{" "}
                <span className="font-medium text-gray-800">
                  {appInfo.app_name as string}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Version:</span>{" "}
                <span className="font-medium text-gray-800">
                  {appInfo.version as string}
                </span>
              </div>
              <div>
                <span className="text-gray-500">AI Provider:</span>{" "}
                <span className="font-medium text-gray-800">
                  {appInfo.ai_provider as string}
                </span>
              </div>
              <div>
                <span className="text-gray-500">TTS Provider:</span>{" "}
                <span className="font-medium text-gray-800">
                  {appInfo.tts_provider as string}
                </span>
              </div>
            </div>
            {appInfo.features && (
              <div className="mt-4">
                <span className="text-sm text-gray-500">Active Modules:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(
                    appInfo.features as Record<string, boolean>
                  ).map(([feature, active]) => (
                    <span
                      key={feature}
                      className={`px-2 py-1 rounded text-xs capitalize ${
                        active
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {feature.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Key Setup Instructions */}
        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            API Key Setup
          </h3>
          <div className="space-y-4 text-sm text-gray-700">
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                OpenAI API Key
              </summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    className="text-primary underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                </li>
                <li>
                  Click &quot;Create new secret key&quot; and name it
                  &quot;Jhionnea&quot;
                </li>
                <li>Copy the key (starts with sk-)</li>
                <li>
                  Set as environment variable: JHIONNEA_OPENAI_API_KEY
                </li>
              </ol>
            </details>
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                Gmail OAuth Credentials
              </summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    className="text-primary underline"
                  >
                    Google Cloud Console
                  </a>
                </li>
                <li>Create project → Enable Gmail API</li>
                <li>
                  Create OAuth client ID (Web application)
                </li>
                <li>
                  Set redirect URI and copy Client ID + Secret
                </li>
              </ol>
            </details>
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                ElevenLabs API Key
              </summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://elevenlabs.io/"
                    target="_blank"
                    className="text-primary underline"
                  >
                    elevenlabs.io
                  </a>
                </li>
                <li>Create account → Profile → API Key</li>
                <li>
                  Set as: JHIONNEA_ELEVENLABS_API_KEY
                </li>
              </ol>
            </details>
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                Medium Integration Token
              </summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://medium.com/me/settings/security"
                    target="_blank"
                    className="text-primary underline"
                  >
                    Medium Settings
                  </a>
                </li>
                <li>Scroll to Integration tokens</li>
                <li>
                  Set as: JHIONNEA_MEDIUM_TOKEN
                </li>
              </ol>
            </details>
          </div>
        </div>
      </main>
    </>
  );
}
