"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FilesPage() {
  const { toggleSidebar } = useSidebar();
  const [files, setFiles] = useState<
    Array<{ name: string; type: string; size_mb: number; modified: string; path: string }>
  >([]);
  const [folder, setFolder] = useState("");
  const [storageInfo, setStorageInfo] = useState<{
    total_size_mb: number;
    file_count: number;
    folder_count: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [fileData, storage] = await Promise.all([
        api.listFiles(token, folder),
        api.getStorageInfo(token),
      ]);
      setFiles(fileData.files);
      setStorageInfo(storage);
    } catch {
      /* ignore */
    }
  }, [folder]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = getToken();
    if (!token || !e.target.files?.length) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("folder", folder);
    try {
      await fetch(`${API_BASE}/api/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      loadFiles();
    } catch {
      /* ignore */
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleCreateFolder = async () => {
    const name = prompt("Folder name:");
    if (!name) return;
    const token = getToken();
    if (!token) return;
    const formData = new FormData();
    formData.append("name", name);
    formData.append("parent", folder);
    await fetch(`${API_BASE}/api/files/folder`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    loadFiles();
  };

  const handleDelete = async (path: string) => {
    const token = getToken();
    if (!token) return;
    await api.deleteFile(token, path);
    loadFiles();
  };

  const navigateToFolder = (path: string) => {
    setFolder(path);
  };

  const goUp = () => {
    const parts = folder.split("/").filter(Boolean);
    parts.pop();
    setFolder(parts.join("/"));
  };

  const fileIcons: Record<string, string> = {
    folder: "📁",
    pdf: "📕",
    doc: "📘",
    docx: "📘",
    txt: "📄",
    html: "🌐",
    json: "📋",
    png: "🖼️",
    jpg: "🖼️",
    md: "📝",
  };

  const getIcon = (name: string, type: string) => {
    if (type === "folder") return "📁";
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return fileIcons[ext] || "📄";
  };

  return (
    <>
      <Header title="Files" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Storage info */}
        {storageInfo && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card-bg rounded-xl border border-card-border p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {storageInfo.file_count}
              </p>
              <p className="text-xs text-gray-500">Files</p>
            </div>
            <div className="bg-card-bg rounded-xl border border-card-border p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {storageInfo.folder_count}
              </p>
              <p className="text-xs text-gray-500">Folders</p>
            </div>
            <div className="bg-card-bg rounded-xl border border-card-border p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {storageInfo.total_size_mb} MB
              </p>
              <p className="text-xs text-gray-500">Used</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {folder && (
              <button
                onClick={goUp}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                title="Go up"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="text-sm text-gray-500">
              /{folder || "root"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateFolder}
              className="px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              New Folder
            </button>
            <label className={`px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 cursor-pointer ${uploading ? "opacity-50" : ""}`}>
              {uploading ? "Uploading..." : "Upload File"}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* File list */}
        <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
          {files.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {files.map((f) => (
                <div
                  key={f.path}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <button
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() =>
                      f.type === "folder"
                        ? navigateToFolder(f.path)
                        : undefined
                    }
                  >
                    <span className="text-xl">{getIcon(f.name, f.type)}</span>
                    <div>
                      <p className={`text-sm font-medium ${f.type === "folder" ? "text-indigo-600" : "text-gray-800"}`}>
                        {f.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {f.type === "folder"
                          ? "Folder"
                          : `${f.size_mb} MB`}{" "}
                        &middot; {new Date(f.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {f.type !== "folder" && (
                      <a
                        href={`${API_BASE}/api/files/download/${encodeURIComponent(f.path)}`}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                        title="Download"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(f.path)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-gray-400 text-sm">
                This folder is empty. Upload files or create a subfolder.
              </p>
            </div>
          )}
        </div>

        {/* Quick folders */}
        {!folder && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="font-semibold mb-4">Suggested Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["Novels", "Workbooks", "Covers", "Podcasts", "Videos", "Exports", "Manuscripts", "Templates"].map((name) => (
                <button
                  key={name}
                  onClick={async () => {
                    const token = getToken();
                    if (!token) return;
                    const formData = new FormData();
                    formData.append("name", name);
                    formData.append("parent", "");
                    await fetch(`${API_BASE}/api/files/folder`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    loadFiles();
                  }}
                  className="p-3 text-center border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  <span className="text-xl block mb-1">📁</span>
                  <span className="text-xs text-gray-600">{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
