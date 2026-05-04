"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { CalendarEvent, ContentDraft, YouTubeProject, PodcastEpisode } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

import type { SocialPost } from "@/lib/api";

type Tab = "calendar" | "youtube" | "podcast" | "drafts" | "social" | "medium";

export default function ContentPage() {
  const { toggleSidebar } = useSidebar();
  const [tab, setTab] = useState<Tab>("calendar");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [ytProjects, setYtProjects] = useState<YouTubeProject[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);

  // Forms
  const [showEventForm, setShowEventForm] = useState(false);
  const [showYTForm, setShowYTForm] = useState(false);
  const [showPodcastForm, setShowPodcastForm] = useState(false);

  // Calendar form
  const [evTitle, setEvTitle] = useState("");
  const [evType, setEvType] = useState("novel");
  const [evDate, setEvDate] = useState("");

  // YouTube form
  const [ytTitle, setYtTitle] = useState("");
  const [ytType, setYtType] = useState("cartoon");
  const [ytTopic, setYtTopic] = useState("");
  const [ytAge, setYtAge] = useState("5-10");
  const [ytDuration, setYtDuration] = useState("10");
  const [ytChannel, setYtChannel] = useState("");

  // Podcast form
  const [podTitle, setPodTitle] = useState("");
  const [podShow, setPodShow] = useState("");
  const [podTopic, setPodTopic] = useState("");
  const [podDuration, setPodDuration] = useState("30");
  const [podVoice, setPodVoice] = useState("professional");

  // Expanded script view
  const [expandedYT, setExpandedYT] = useState<YouTubeProject | null>(null);
  const [expandedPod, setExpandedPod] = useState<PodcastEpisode | null>(null);

  // Social media
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [showSocialForm, setShowSocialForm] = useState(false);

  // Medium
  const [mediumStatus, setMediumStatus] = useState<{ enabled: boolean }>({ enabled: false });
  const [mediumTitle, setMediumTitle] = useState("");
  const [mediumContent, setMediumContent] = useState("");
  const [mediumPublishing, setMediumPublishing] = useState(false);
  const [mediumResult, setMediumResult] = useState<string | null>(null);

  // TTS
  const [ttsStatus, setTtsStatus] = useState<{ enabled: boolean; model: string; voice: string } | null>(null);
  const [ttsLoading, setTtsLoading] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getCalendarEvents(token).then(setEvents);
    api.getContentDrafts(token).then(setDrafts);
    api.getYouTubeProjects(token).then(setYtProjects);
    api.getPodcastEpisodes(token).then(setPodcasts);
    api.getSocialPosts(token).then(setSocialPosts).catch(() => {});
    api.getMediumStatus(token).then(setMediumStatus).catch(() => {});
    api.getTtsStatus(token).then(setTtsStatus).catch(() => {});
  }, []);

  const inputCls = "px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900";
  const btnPrimary = "px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors";
  const btnSecondary = "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors";

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const event = await api.createCalendarEvent(token, {
      title: evTitle,
      event_type: evType,
      scheduled_date: new Date(evDate).toISOString(),
    });
    setEvents([...events, event].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()));
    setEvTitle(""); setEvDate("");
    setShowEventForm(false);
  }

  async function handleCreateYT(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const project = await api.createYouTubeProject(token, {
      title: ytTitle,
      project_type: ytType,
      topic: ytTopic || undefined,
      target_age: ytAge || undefined,
      duration_minutes: Number(ytDuration),
      channel_name: ytChannel || undefined,
    });
    setYtProjects([project, ...ytProjects]);
    setYtTitle(""); setYtTopic(""); setYtChannel("");
    setShowYTForm(false);
  }

  async function handleGenerateYTScript(projectId: number) {
    const token = getToken();
    if (!token) return;
    const updated = await api.generateYouTubeScript(token, projectId);
    setYtProjects(ytProjects.map((p) => (p.id === projectId ? updated : p)));
    setExpandedYT(updated);
  }

  async function handleCreatePodcast(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const episode = await api.createPodcastEpisode(token, {
      title: podTitle,
      show_name: podShow || undefined,
      topic: podTopic || undefined,
      duration_minutes: Number(podDuration),
      voice_style: podVoice,
    });
    setPodcasts([episode, ...podcasts]);
    setPodTitle(""); setPodShow(""); setPodTopic("");
    setShowPodcastForm(false);
  }

  async function handleGeneratePodScript(episodeId: number) {
    const token = getToken();
    if (!token) return;
    const updated = await api.generatePodcastScript(token, episodeId);
    setPodcasts(podcasts.map((p) => (p.id === episodeId ? updated : p)));
    setExpandedPod(updated);
  }

  async function handleGenerateAudio(episodeId: number) {
    const token = getToken();
    if (!token) return;
    setTtsLoading(episodeId);
    try {
      const response = await api.generatePodcastAudio(token, episodeId);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `podcast-${episodeId}.mp3`;
        a.click();
        URL.revokeObjectURL(url);
        setPodcasts(podcasts.map((p) => (p.id === episodeId ? { ...p, status: "audio_ready" } : p)));
      } else {
        const err = await response.json();
        alert(err.detail || "Audio generation failed");
      }
    } catch {
      alert("Audio generation failed");
    }
    setTtsLoading(null);
  }

  async function handleCreateSocialPost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const form = e.currentTarget;
    const data = {
      platform: (form.elements.namedItem("platform") as HTMLSelectElement).value,
      content: (form.elements.namedItem("post_content") as HTMLTextAreaElement).value,
      scheduled_date: (form.elements.namedItem("scheduled_date") as HTMLInputElement).value
        ? new Date((form.elements.namedItem("scheduled_date") as HTMLInputElement).value).toISOString()
        : undefined,
    };
    const post = await api.createSocialPost(token, data);
    setSocialPosts([post, ...socialPosts]);
    setShowSocialForm(false);
    form.reset();
  }

  async function handlePublishMedium(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setMediumPublishing(true);
    setMediumResult(null);
    try {
      await api.publishToMedium(token, {
        title: mediumTitle,
        content: mediumContent,
        format: "markdown",
        status: "draft",
      });
      setMediumResult("Published as draft on Medium!");
      setMediumTitle("");
      setMediumContent("");
    } catch {
      setMediumResult("Failed to publish. Check your Medium token.");
    }
    setMediumPublishing(false);
  }

  const typeColors: Record<string, string> = {
    novel: "bg-purple-100 text-purple-700",
    workbook: "bg-blue-100 text-blue-700",
    episode: "bg-orange-100 text-orange-700",
    medium: "bg-green-100 text-green-700",
    youtube: "bg-red-100 text-red-700",
    freelance: "bg-teal-100 text-teal-700",
    podcast: "bg-pink-100 text-pink-700",
  };

  const ytStatusColors: Record<string, string> = {
    idea: "bg-gray-100 text-gray-700",
    scripting: "bg-yellow-100 text-yellow-700",
    production: "bg-blue-100 text-blue-700",
    published: "bg-green-100 text-green-700",
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "calendar", label: "Calendar" },
    { key: "youtube", label: "YouTube" },
    { key: "podcast", label: "Podcast" },
    { key: "drafts", label: "Drafts" },
    { key: "social", label: "Social Media" },
    { key: "medium", label: "Medium" },
  ];

  return (
    <>
      <Header title="Content & Media" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Events</p>
            <p className="text-2xl font-bold text-primary">{events.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">YouTube Projects</p>
            <p className="text-2xl font-bold text-red-600">{ytProjects.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Podcast Episodes</p>
            <p className="text-2xl font-bold text-pink-600">{podcasts.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Drafts</p>
            <p className="text-2xl font-bold text-warning">{drafts.length}</p>
          </div>
        </div>

        {/* Calendar Tab */}
        {tab === "calendar" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Content Calendar</h3>
              <button onClick={() => setShowEventForm(!showEventForm)} className={btnPrimary}>
                {showEventForm ? "Cancel" : "+ Add Event"}
              </button>
            </div>
            {showEventForm && (
              <form onSubmit={handleCreateEvent} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Event title" className={inputCls} required />
                  <select value={evType} onChange={(e) => setEvType(e.target.value)} className={inputCls}>
                    {["novel", "workbook", "episode", "medium", "youtube", "podcast", "freelance"].map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                  <input type="datetime-local" value={evDate} onChange={(e) => setEvDate(e.target.value)} className={inputCls} required />
                </div>
                <button type="submit" className={btnPrimary}>Add Event</button>
              </form>
            )}
            {events.length === 0 ? (
              <p className="text-muted text-sm">No calendar events yet.</p>
            ) : (
              <div className="space-y-3">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[e.event_type] || "bg-gray-100 text-gray-700"}`}>
                        {e.event_type}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{e.title}</p>
                        <p className="text-xs text-muted">{new Date(e.scheduled_date).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted">{e.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* YouTube Tab */}
        {tab === "youtube" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">YouTube Projects</h3>
                  <p className="text-sm text-muted mt-1">Cartoons, reels, and educational videos for your daughter&apos;s channel</p>
                </div>
                <button onClick={() => setShowYTForm(!showYTForm)} className={btnPrimary}>
                  {showYTForm ? "Cancel" : "+ New Project"}
                </button>
              </div>
              {showYTForm && (
                <form onSubmit={handleCreateYT} className="mb-6 p-4 bg-red-50 rounded-lg space-y-4 border border-red-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} placeholder="Video title" className={inputCls} required />
                    <select value={ytType} onChange={(e) => setYtType(e.target.value)} className={inputCls}>
                      <option value="cartoon">Cartoon</option>
                      <option value="reel">Short Reel</option>
                      <option value="educational_video">Educational Video</option>
                    </select>
                    <input type="text" value={ytTopic} onChange={(e) => setYtTopic(e.target.value)} placeholder="Topic (e.g., shapes, colors)" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={ytAge} onChange={(e) => setYtAge(e.target.value)} className={inputCls}>
                      <option value="3-5">Ages 3-5</option>
                      <option value="5-8">Ages 5-8</option>
                      <option value="5-10">Ages 5-10</option>
                      <option value="8-12">Ages 8-12</option>
                    </select>
                    <input type="number" value={ytDuration} onChange={(e) => setYtDuration(e.target.value)} placeholder="Duration (minutes)" className={inputCls} />
                    <input type="text" value={ytChannel} onChange={(e) => setYtChannel(e.target.value)} placeholder="Channel name" className={inputCls} />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                    Create Project
                  </button>
                </form>
              )}

              {ytProjects.length === 0 ? (
                <p className="text-muted text-sm">No YouTube projects yet. Create your first cartoon or reel!</p>
              ) : (
                <div className="space-y-3">
                  {ytProjects.map((p) => (
                    <div key={p.id} className="py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{p.title}</p>
                          <p className="text-xs text-muted">
                            {p.project_type.replace("_", " ")} &middot; {p.topic || "No topic"} &middot; {p.duration_minutes} min
                            {p.target_age && ` &middot; Ages ${p.target_age}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ytStatusColors[p.status] || "bg-gray-100 text-gray-700"}`}>
                            {p.status}
                          </span>
                          {!p.script && (
                            <button onClick={() => handleGenerateYTScript(p.id)} className="text-xs text-red-600 hover:underline">
                              Generate Script
                            </button>
                          )}
                          {p.script && (
                            <button onClick={() => setExpandedYT(expandedYT?.id === p.id ? null : p)} className="text-xs text-primary hover:underline">
                              {expandedYT?.id === p.id ? "Hide" : "View Script"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expandedYT && (
              <div className="bg-card-bg rounded-xl border border-card-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{expandedYT.title} — Script</h3>
                  <button onClick={() => setExpandedYT(null)} className={btnSecondary}>Close</button>
                </div>
                {expandedYT.script && (
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{expandedYT.script}</pre>
                )}
                {expandedYT.storyboard && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Storyboard</h4>
                    <pre className="bg-yellow-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{expandedYT.storyboard}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Podcast Tab */}
        {tab === "podcast" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Podcast Episodes</h3>
                  <p className="text-sm text-muted mt-1">Script and plan episodes — Jhionnea handles the AI voice</p>
                </div>
                <button onClick={() => setShowPodcastForm(!showPodcastForm)} className={btnPrimary}>
                  {showPodcastForm ? "Cancel" : "+ New Episode"}
                </button>
              </div>
              {showPodcastForm && (
                <form onSubmit={handleCreatePodcast} className="mb-6 p-4 bg-pink-50 rounded-lg space-y-4 border border-pink-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={podTitle} onChange={(e) => setPodTitle(e.target.value)} placeholder="Episode title" className={inputCls} required />
                    <input type="text" value={podShow} onChange={(e) => setPodShow(e.target.value)} placeholder="Show name" className={inputCls} />
                    <input type="text" value={podTopic} onChange={(e) => setPodTopic(e.target.value)} placeholder="Topic" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="number" value={podDuration} onChange={(e) => setPodDuration(e.target.value)} placeholder="Duration (minutes)" className={inputCls} />
                    <select value={podVoice} onChange={(e) => setPodVoice(e.target.value)} className={inputCls}>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="energetic">Energetic</option>
                    </select>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors">
                    Create Episode
                  </button>
                </form>
              )}

              {podcasts.length === 0 ? (
                <p className="text-muted text-sm">No podcast episodes yet.</p>
              ) : (
                <div className="space-y-3">
                  {podcasts.map((ep) => (
                    <div key={ep.id} className="py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{ep.title}</p>
                          <p className="text-xs text-muted">
                            {ep.show_name || "Untitled Show"} &middot; {ep.topic || "No topic"} &middot; {ep.duration_minutes} min
                            &middot; Voice: {ep.voice_style}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ep.status === "scripted" ? "bg-blue-100 text-blue-700"
                            : ep.status === "recorded" ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                          }`}>
                            {ep.status}
                          </span>
                          {!ep.script && (
                            <button onClick={() => handleGeneratePodScript(ep.id)} className="text-xs text-pink-600 hover:underline">
                              Generate Script
                            </button>
                          )}
                          {ep.script && (
                            <button onClick={() => setExpandedPod(expandedPod?.id === ep.id ? null : ep)} className="text-xs text-primary hover:underline">
                              {expandedPod?.id === ep.id ? "Hide" : "View Script"}
                            </button>
                          )}
                          {ep.script && ttsStatus?.enabled && (
                            <button
                              onClick={() => handleGenerateAudio(ep.id)}
                              disabled={ttsLoading === ep.id}
                              className="text-xs text-green-600 hover:underline disabled:opacity-50"
                            >
                              {ttsLoading === ep.id ? "Generating..." : "Generate Audio"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expandedPod && (
              <div className="bg-card-bg rounded-xl border border-card-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{expandedPod.title} — Script</h3>
                  <button onClick={() => setExpandedPod(null)} className={btnSecondary}>Close</button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{expandedPod.script}</pre>
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {tab === "drafts" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Content Drafts</h3>
            {drafts.length === 0 ? (
              <p className="text-muted text-sm">No drafts yet.</p>
            ) : (
              <div className="space-y-3">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{d.title}</p>
                      <p className="text-xs text-muted">{d.platform} &middot; {d.status}</p>
                    </div>
                    <span className="text-xs text-muted">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social Media Tab */}
        {tab === "social" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Social Media Scheduler</h3>
                  <p className="text-sm text-muted mt-1">Schedule and manage posts across platforms</p>
                </div>
                <button onClick={() => setShowSocialForm(!showSocialForm)} className={btnPrimary}>
                  {showSocialForm ? "Cancel" : "+ New Post"}
                </button>
              </div>

              {showSocialForm && (
                <form onSubmit={handleCreateSocialPost} className="mb-6 p-4 bg-blue-50 rounded-lg space-y-4 border border-blue-200">
                  <select name="platform" className={inputCls} required>
                    <option value="">Select Platform</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube Community</option>
                  </select>
                  <textarea name="post_content" placeholder="Write your post content..." rows={4} className={`${inputCls} w-full`} required />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="scheduled_date" type="datetime-local" className={inputCls} />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Schedule Post
                  </button>
                </form>
              )}

              {socialPosts.length === 0 ? (
                <p className="text-muted text-sm">No scheduled posts yet. Create your first post!</p>
              ) : (
                <div className="space-y-3">
                  {socialPosts.map((post) => (
                    <div key={post.id} className="py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">{post.platform}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              post.status === "posted" ? "bg-green-100 text-green-700" :
                              post.status === "scheduled" ? "bg-yellow-100 text-yellow-700" :
                              post.status === "failed" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>{post.status}</span>
                          </div>
                          <p className="text-sm text-foreground mt-1 line-clamp-2">{post.content}</p>
                          {post.scheduled_date && (
                            <p className="text-xs text-muted mt-1">Scheduled: {new Date(post.scheduled_date).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medium Tab */}
        {tab === "medium" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Publish to Medium</h3>
              <p className="text-sm text-muted mb-4">
                {mediumStatus.enabled
                  ? "Medium is connected. Write and publish articles directly."
                  : "Medium token not configured. Set JHIONNEA_MEDIUM_TOKEN to enable publishing."}
              </p>

              {mediumResult && (
                <div className={`p-3 rounded-lg mb-4 text-sm ${
                  mediumResult.includes("Published") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {mediumResult}
                </div>
              )}

              <form onSubmit={handlePublishMedium} className="space-y-4">
                <input
                  type="text"
                  value={mediumTitle}
                  onChange={(e) => setMediumTitle(e.target.value)}
                  placeholder="Article title"
                  className={`${inputCls} w-full`}
                  required
                />
                <textarea
                  value={mediumContent}
                  onChange={(e) => setMediumContent(e.target.value)}
                  placeholder="Write your article in Markdown..."
                  rows={12}
                  className={`${inputCls} w-full font-mono`}
                  required
                />
                <button
                  type="submit"
                  disabled={mediumPublishing || !mediumStatus.enabled}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {mediumPublishing ? "Publishing..." : "Publish as Draft on Medium"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
