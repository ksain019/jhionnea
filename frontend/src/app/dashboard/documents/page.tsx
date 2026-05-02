"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { DocumentProject } from "@/lib/api";
import Header from "@/components/Header";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentProject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<DocumentProject | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("paper");
  const [formatStyle, setFormatStyle] = useState("apa");
  const [content, setContent] = useState("");

  const inputCls = "px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900";
  const btnPrimary = "px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors";
  const btnSecondary = "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors";

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getDocuments(token).then(setDocuments);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const doc = await api.createDocument(token, {
      title,
      doc_type: docType,
      format_style: formatStyle,
      content: content || undefined,
    });
    setDocuments([doc, ...documents]);
    setTitle(""); setContent("");
    setShowForm(false);
  }

  async function handleFormat(docId: number) {
    const token = getToken();
    if (!token) return;
    const updated = await api.formatDocument(token, docId);
    setDocuments(documents.map((d) => (d.id === docId ? updated : d)));
    setExpandedDoc(updated);
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    formatting: "bg-yellow-100 text-yellow-700",
    formatted: "bg-green-100 text-green-700",
    exported: "bg-blue-100 text-blue-700",
  };

  return (
    <>
      <Header title="Document Formatting" />
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Total Documents</p>
            <p className="text-2xl font-bold text-primary">{documents.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Papers</p>
            <p className="text-2xl font-bold text-blue-600">{documents.filter((d) => d.doc_type === "paper").length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Novels</p>
            <p className="text-2xl font-bold text-purple-600">{documents.filter((d) => d.doc_type === "novel").length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Formatted</p>
            <p className="text-2xl font-bold text-success">{documents.filter((d) => d.status === "formatted").length}</p>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Documents</h3>
              <p className="text-sm text-muted mt-1">Format papers, novels, essays, and reports (APA, MLA, Chicago)</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className={btnPrimary}>
              {showForm ? "Cancel" : "+ New Document"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className={inputCls} required />
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
                  <option value="paper">Paper</option>
                  <option value="novel">Novel</option>
                  <option value="essay">Essay</option>
                  <option value="report">Report</option>
                  <option value="thesis">Thesis</option>
                  <option value="manuscript">Manuscript</option>
                </select>
                <select value={formatStyle} onChange={(e) => setFormatStyle(e.target.value)} className={inputCls}>
                  <option value="apa">APA</option>
                  <option value="mla">MLA</option>
                  <option value="chicago">Chicago</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your content here..." className={`${inputCls} w-full`} rows={8} />
              <button type="submit" className={btnPrimary}>Create Document</button>
            </form>
          )}

          {documents.length === 0 ? (
            <p className="text-muted text-sm">No documents yet. Create one to start formatting!</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted">
                        {doc.doc_type} &middot; {doc.format_style.toUpperCase()} &middot; {doc.word_count} words &middot; ~{doc.page_count} pages
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || "bg-gray-100 text-gray-700"}`}>
                        {doc.status}
                      </span>
                      {doc.content && doc.status === "draft" && (
                        <button onClick={() => handleFormat(doc.id)} className="text-xs text-primary hover:underline">
                          Format
                        </button>
                      )}
                      {doc.formatted_content && (
                        <button onClick={() => setExpandedDoc(expandedDoc?.id === doc.id ? null : doc)} className="text-xs text-primary hover:underline">
                          {expandedDoc?.id === doc.id ? "Hide" : "View"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expanded Document View */}
        {expandedDoc && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{expandedDoc.title} — Formatted ({expandedDoc.format_style.toUpperCase()})</h3>
              <button onClick={() => setExpandedDoc(null)} className={btnSecondary}>Close</button>
            </div>
            {expandedDoc.formatted_content && (
              <pre className="bg-gray-50 p-6 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto font-mono">{expandedDoc.formatted_content}</pre>
            )}
          </div>
        )}
      </main>
    </>
  );
}
