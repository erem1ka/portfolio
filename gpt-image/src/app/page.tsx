"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ===== Types =====
interface GeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}
interface HistoryItem {
  prompt: string;
  images: GeneratedImage[];
  size: string;
  mode: "text" | "image";
  time: string;
}
type Mode = "text" | "image";

// ===== Constants =====
const PRESET_SIZES = [
  { label: "1:1", w: 1024, h: 1024 },
  { label: "2:3", w: 1024, h: 1792 },
  { label: "3:2", w: 1792, h: 1024 },
  { label: "9:16", w: 1080, h: 1920 },
  { label: "16:9", w: 1920, h: 1080 },
];

// ===== Component =====
export default function Home() {
  // ---- state ----
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [w, setW] = useState(1024);
  const [h, setH] = useState(1024);
  const [n, setN] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 图生图
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refDataUrl, setRefDataUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // ---- load history ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gpt-image-history");
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("gpt-image-history", JSON.stringify(history.slice(0, 50)));
  }, [history]);

  // ---- file helpers ----
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }
    setRefImage(file);
    const reader = new FileReader();
    reader.onload = () => setRefDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ---- generate ----
  const handleGenerate = async () => {
    if (!prompt.trim()) { setError("Prompt 不能为空"); promptRef.current?.focus(); return; }
    if (mode === "image" && !refImage) { setError("请上传参考图片"); return; }
    if (w < 256 || h < 256) { setError("图片尺寸不能小于 256px"); return; }
    if (w > 4096 || h > 4096) { setError("图片尺寸不能超过 4096px"); return; }

    setError("");
    setLoading(true);
    setImages([]);

    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        size: `${w}x${h}`,
        n,
        quality: "high",
      };

      if (mode === "image" && refDataUrl) {
        // 提取纯 base64（去掉 data:...;base64, 前缀）
        const b64 = refDataUrl.split(",")[1];
        body.image = b64;
      }

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errData: Record<string, unknown>;
        try { errData = await res.json(); } catch { throw new Error(`HTTP ${res.status}`); }
        // 嵌套错误提取（兼容 Wanqing 多层包装）
        const msg =
          (errData.error as Record<string, string>)?.message ||
          errData.error?.toString() ||
          errData.message?.toString() ||
          (errData.data as Record<string, string>)?.error?.toString() ||
          `请求失败 (${res.status})`;
        throw new Error(String(msg));
      }

      const data = await res.json();
      const rawImages: GeneratedImage[] =
        data.data?.images || data.data || data.images || data.output?.images ||
        (data.data?.url ? [data.data] : []) || (data.url ? [{ url: data.url }] : []);

      const processed = rawImages.map((img: GeneratedImage) => ({
        ...img,
        url: img.b64_json && !img.url ? `data:image/png;base64,${img.b64_json}` : img.url,
      }));

      if (!processed.length || !processed.some((i) => i.url)) {
        throw new Error("未获取到图片: " + JSON.stringify(data).slice(0, 200));
      }

      setImages(processed);
      setHistory((prev) => [
        { prompt: prompt.trim(), images: processed, size: `${w}x${h}`, mode, time: formatTime() },
        ...prev,
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (img: GeneratedImage, idx: number) => {
    try {
      const url = img.url!;
      if (url.startsWith("data:")) {
        const a = document.createElement("a"); a.href = url;
        a.download = `gpt-image-${idx + 1}.png`; a.click();
      } else {
        const r = await fetch(url); const blob = await r.blob();
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = u;
        a.download = `gpt-image-${idx + 1}.png`; a.click();
        URL.revokeObjectURL(u);
      }
    } catch { setError("下载失败"); }
  };

  const clearRefImage = () => { setRefImage(null); setRefDataUrl(""); };

  // ---- render ----
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-[680px] flex flex-col gap-6">

        {/* ========== HEADER ========== */}
        <header className="flex flex-col items-center gap-1" style={{ animation: "slideUp 0.5s ease-out" }}>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight">
            <span className="gradient-text">AI 图片生成</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            GPT-Image-2 · 文字与图片都能驱动创作
          </p>
        </header>

        {/* ========== TAB SWITCH ========== */}
        <div
          className="flex p-1 gap-1"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            animation: "slideUp 0.5s ease-out 0.05s both",
          }}
        >
          {(["text", "image"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-2.5 rounded-[7px] text-sm font-medium transition-all"
              style={{
                background: mode === m ? "var(--bg-card)" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text2)",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {m === "text" ? "✧ 文生图" : "🖼 图生图"}
            </button>
          ))}
        </div>

        {/* ========== MAIN CARD ========== */}
        <div
          className="surface-card p-5 sm:p-6 flex flex-col gap-5"
          style={{ animation: "slideUp 0.5s ease-out 0.1s both" }}
        >
          {/* --- 图生图：上传区 --- */}
          {mode === "image" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-xl flex flex-col items-center justify-center gap-3 py-8 transition-all overflow-hidden"
              style={{
                border: `2px dashed ${isDragOver ? "var(--border-focus)" : refImage ? "var(--border-hover)" : "var(--border)"}`,
                background: isDragOver ? "rgba(139,92,246,0.05)" : refImage ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              {refDataUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={refDataUrl} alt="参考图" className="max-h-[200px] max-w-full rounded-lg object-contain" />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); clearRefImage(); }}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      移除图片
                    </button>
                    <span className="text-xs flex items-center" style={{ color: "var(--text2)" }}>
                      {(refImage!.size / 1024).toFixed(0)} KB · 点击更换
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl opacity-30">📁</div>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>
                    拖拽或<span style={{ color: "var(--accent-light)" }}>点击上传</span>参考图片
                  </p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>
                    支持 JPG / PNG / WebP · 最大 10MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* --- Prompt --- */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>
              Prompt
            </label>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); if (error) setError(""); }}
              placeholder={mode === "text" ? "描述你想生成的图片，越详细效果越好…" : "描述你想对参考图做哪些修改…"}
              rows={4}
              className="glass-input px-4 py-3 text-sm leading-relaxed resize-y"
            />
            <span className="text-[11px] self-end" style={{ color: "var(--text3)" }}>
              {prompt.length} / 4000
            </span>
          </div>

          {/* --- 尺寸设置 --- */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>
              图片尺寸
            </label>

            {/* preset buttons */}
            <div className="flex flex-wrap gap-2">
              {PRESET_SIZES.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setW(p.w); setH(p.h); }}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: w === p.w && h === p.h ? "var(--bg-button)" : "var(--bg-input)",
                    border: `1px solid ${w === p.w && h === p.h ? "var(--border-focus)" : "var(--border)"}`,
                    color: w === p.w && h === p.h ? "var(--accent-light)" : "var(--text2)",
                  }}
                >
                  {p.label}<span className="ml-1 opacity-50">{p.w}×{p.h}</span>
                </button>
              ))}
            </div>

            {/* custom inputs */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={w}
                onChange={(e) => setW(Number(e.target.value))}
                min={256} max={4096} step={64}
                className="glass-input w-24 px-3 py-2 text-sm text-center"
              />
              <span style={{ color: "var(--text3)" }}>×</span>
              <input
                type="number"
                value={h}
                onChange={(e) => setH(Number(e.target.value))}
                min={256} max={4096} step={64}
                className="glass-input w-24 px-3 py-2 text-sm text-center"
              />
              <span className="text-xs ml-1" style={{ color: "var(--text3)" }}>px</span>
            </div>
          </div>

          {/* --- 数量 --- */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text2)" }}>生成数量</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setN(num)}
                  className="w-9 h-9 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: n === num ? "var(--bg-button)" : "var(--bg-input)",
                    border: `1px solid ${n === num ? "var(--border-focus)" : "var(--border)"}`,
                    color: n === num ? "var(--accent-light)" : "var(--text2)",
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* --- Generate Button --- */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="relative w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all overflow-hidden"
            style={{
              background: loading || !prompt.trim()
                ? "var(--bg-input)"
                : "linear-gradient(135deg, #7c3aed, #a78bfa)",
              color: loading || !prompt.trim() ? "var(--text3)" : "#fff",
              cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              animation: loading ? "pulseGlow 2s infinite" : "none",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                正在绘制…
              </span>
            ) : mode === "image" ? "🖼 基于参考图生成" : "✧ 生成图片"}
          </button>
        </div>

        {/* ========== ERROR ========== */}
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-xs flex items-start gap-2"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "#f87171",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ========== RESULTS ========== */}
        {images.length > 0 && !loading && (
          <div className="flex flex-col gap-4" style={{ animation: "fadeInScale 0.35s ease-out" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                生成结果 · {images.length} 张
              </h3>
              <button
                onClick={() => images.forEach((img, i) => downloadImage(img, i))}
                className="text-xs px-3 py-1 rounded-lg transition-all"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                ⬇ 全部下载
              </button>
            </div>

            {images.map((img, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden relative group"
                style={{ border: "1px solid var(--border)", animation: `fadeIn 0.3s ease-out ${idx * 0.08}s both` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.revised_prompt || `#${idx + 1}`} className="w-full block" />
                {img.revised_prompt && (
                  <p className="text-[11px] px-4 py-2.5 leading-relaxed" style={{ color: "var(--text2)", background: "rgba(255,255,255,0.02)", borderTop: "1px solid var(--border)" }}>
                    💡 {img.revised_prompt}
                  </p>
                )}
                {/* hover overlay */}
                <div className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
                  <button
                    onClick={() => downloadImage(img, idx)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)" }}
                  >
                    ⬇ 保存图片
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========== HISTORY ========== */}
        {history.length > 0 && (
          <div className="flex flex-col gap-3" style={{ animation: "slideUp 0.4s ease-out" }}>
            <h3 className="text-xs font-medium" style={{ color: "var(--text2)" }}>
              历史记录 · {history.length}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(item.prompt);
                    setMode(item.mode);
                    setImages(item.images);
                    const [iw, ih] = item.size.split("x").map(Number);
                    if (iw && ih) { setW(iw); setH(ih); }
                  }}
                  className="surface-card p-2 rounded-xl text-left group cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.images[0]?.url}
                    alt=""
                    className="w-full aspect-square rounded-lg object-cover mb-1.5 group-hover:opacity-90 transition-opacity"
                  />
                  <p className="text-[11px] leading-tight truncate" style={{ color: "var(--text2)" }}>
                    {item.prompt}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px]" style={{ color: "var(--text3)" }}>
                      {item.mode === "text" ? "✧" : "🖼"} {item.size}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text3)" }}>{item.time}</span>
                  </div>
                </button>
              ))}
            </div>
            {history.length > 0 && (
              <button
                onClick={() => { setHistory([]); localStorage.removeItem("gpt-image-history"); }}
                className="self-center text-xs transition-colors"
                style={{ color: "var(--text3)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text3)"}
              >
                清除全部历史
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function formatTime() {
  return new Date().toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" });
}