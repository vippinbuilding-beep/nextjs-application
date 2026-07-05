"use client";

import {
  Loader2,
  Maximize,
  MessageSquare,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { productProgressRepository } from "@/services/repository-factory";

interface VideoPlayerProps {
  /** Gated media route URL (never the raw storage URL). */
  src: string;
  productId?: string;
  poster?: string | null;
  /** Faint overlay text (e.g. the viewer handle) as a light anti-share deterrent. */
  watermark?: string;
  className?: string;
  /** Rendered inside a slide-in sidebar on mobile and in fullscreen. */
  commentsSlot?: React.ReactNode;
  /** Edge-to-edge layout on small screens (lesson pages). */
  immersive?: boolean;
  /** Full-bleed theatre layout (Twitch-style), no card chrome. */
  theatre?: boolean;
  /** Known aspect ratio from persisted media dimensions (avoids layout shift). */
  initialAspectRatio?: number;
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.5] as const;
const COMMENTS_DRAWER_MS = 300;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function isCompleted(positionSeconds: number, durationSeconds: number): boolean {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return false;
  return (
    positionSeconds >= durationSeconds - 5 ||
    positionSeconds / durationSeconds >= 0.95
  );
}

function isKeyboardInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button"
  );
}

/**
 * Hardened custom video player for platform lessons.
 *
 * Security posture (deterrence, not DRM): the source is our gated `media`
 * route, native download UI is disabled (`controlsList`, no context menu, no
 * PiP/remote playback), and there is never a link to the underlying file. This
 * raises the bar against casual downloading; it does not stop screen capture.
 */
export function VideoPlayer({
  src,
  productId,
  poster,
  watermark,
  className,
  commentsSlot,
  immersive = false,
  theatre = false,
  initialAspectRatio,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const aspectRatioLockedRef = useRef(false);
  const posterFailedRef = useRef(false);
  const pendingResumeSecondsRef = useRef<number | null>(null);
  const restoredProgressRef = useRef(false);
  const lastSavedProgressRef = useRef({ positionSeconds: 0, savedAt: 0 });

  const [playing, setPlaying] = useState(false);
  // True until the video has buffered enough to play, and again whenever
  // playback stalls to rebuffer, so we can surface a spinner.
  const [loading, setLoading] = useState(true);
  /** False until `canplay` — blocks starting playback while the file is still loading. */
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPanelVisible, setCommentsPanelVisible] = useState(false);
  const [commentsPanelClosing, setCommentsPanelClosing] = useState(false);
  const commentsPanelVisibleRef = useRef(false);
  const commentsCloseTimerRef = useRef<number | null>(null);
  const defaultAspectRatio = initialAspectRatio ?? 16 / 9;
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [showPoster, setShowPoster] = useState(Boolean(poster));
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const showPlayerComments = Boolean(commentsSlot) && (!isLargeScreen || fullscreen);
  const mobileCommentsFullscreen = showPlayerComments && !isLargeScreen && !fullscreen;
  const theatreDesktop = theatre && isLargeScreen && !fullscreen;
  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const progressTrackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progressPercent}%, rgb(255 255 255 / 0.3) ${progressPercent}%, rgb(255 255 255 / 0.3) 100%)`,
  };

  const syncAspectRatioFromVideo = useCallback((video: HTMLVideoElement) => {
    if (aspectRatioLockedRef.current) return;
    if (poster && !posterFailedRef.current) return;

    const { videoWidth, videoHeight } = video;
    if (videoWidth > 0 && videoHeight > 0) {
      setAspectRatio(videoWidth / videoHeight);
      aspectRatioLockedRef.current = true;
    }
  }, [poster]);

  const lockAspectRatio = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0 || aspectRatioLockedRef.current) return;
    setAspectRatio(width / height);
    aspectRatioLockedRef.current = true;
  }, []);

  useEffect(() => {
    aspectRatioLockedRef.current = false;
    posterFailedRef.current = false;
    setAspectRatio(defaultAspectRatio);
    setShowPoster(Boolean(poster));
    setReady(false);
    setLoading(true);
    setPlaying(false);
    if (!poster) return;

    const img = new Image();
    img.onload = () => {
      lockAspectRatio(img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      posterFailedRef.current = true;
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        lockAspectRatio(video.videoWidth, video.videoHeight);
      }
    };
    img.src = poster;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [defaultAspectRatio, lockAspectRatio, poster, src]);

  const canStartPlayback = useCallback((video: HTMLVideoElement) => {
    return video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (!canStartPlayback(video)) return;
      // `play()` returns a promise that rejects with AbortError when the request
      // is interrupted by a quick `pause()` (e.g. rapid clicks). Swallow it.
      video.play().catch(() => { });
    } else {
      video.pause();
    }
  }, [canStartPlayback]);

  const saveProgress = useCallback(
    (positionSeconds = currentTime, durationSeconds = duration) => {
      if (!productId || !Number.isFinite(positionSeconds)) return;

      const safeDuration =
        Number.isFinite(durationSeconds) && durationSeconds > 0
          ? durationSeconds
          : undefined;

      void productProgressRepository
        .save(productId, {
          positionSeconds,
          durationSeconds: safeDuration,
          completed:
            safeDuration != null
              ? isCompleted(positionSeconds, safeDuration)
              : false,
        })
        .catch(() => {
          // Progress should never interrupt playback if the session expired.
        });
    },
    [currentTime, duration, productId]
  );

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Number(event.target.value);
    video.currentTime = next;
    setCurrentTime(next);
    saveProgress(next, video.duration);
  }, [saveProgress]);

  const handleTimeUpdate = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const next = event.currentTarget.currentTime;
      setCurrentTime(next);

      if (!productId) return;

      const now = Date.now();
      const lastSaved = lastSavedProgressRef.current;
      if (
        now - lastSaved.savedAt < 10000 &&
        Math.abs(next - lastSaved.positionSeconds) < 15
      ) {
        return;
      }

      lastSavedProgressRef.current = {
        positionSeconds: next,
        savedAt: now,
      };
      saveProgress(next, event.currentTarget.duration);
    },
    [productId, saveProgress]
  );

  const handleVolume = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const next = Number(event.target.value);
      video.volume = next;
      video.muted = next === 0;
      setVolume(next);
      setMuted(next === 0);
    },
    []
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const cycleRate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const index = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
    video.playbackRate = next;
    setRate(next);
  }, [rate]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen();
    }
  }, []);

  const applySavedProgress = useCallback((positionSeconds: number) => {
    const video = videoRef.current;
    if (!video || restoredProgressRef.current || positionSeconds <= 1) return;

    const knownDuration =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (knownDuration === 0 || positionSeconds >= knownDuration - 5) return;

    const next = Math.min(positionSeconds, knownDuration - 1);
    video.currentTime = next;
    setCurrentTime(next);
    restoredProgressRef.current = true;
  }, []);

  useEffect(() => {
    restoredProgressRef.current = false;
    pendingResumeSecondsRef.current = null;
    lastSavedProgressRef.current = { positionSeconds: 0, savedAt: 0 };

    if (!productId) return;

    let cancelled = false;
    productProgressRepository
      .getByProduct(productId)
      .then((progress) => {
        if (cancelled || !progress) return;
        pendingResumeSecondsRef.current = progress.positionSeconds;
        applySavedProgress(progress.positionSeconds);
      })
      .catch(() => {
        // Missing auth or RLS errors should not block watching the video.
      });

    return () => {
      cancelled = true;
    };
  }, [applySavedProgress, productId]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const clearCommentsCloseTimer = useCallback(() => {
    if (commentsCloseTimerRef.current !== null) {
      window.clearTimeout(commentsCloseTimerRef.current);
      commentsCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isLargeScreen && !fullscreen) {
      setCommentsOpen(false);
    }
  }, [fullscreen, isLargeScreen]);

  useEffect(() => {
    if (!showPlayerComments) {
      clearCommentsCloseTimer();
      commentsPanelVisibleRef.current = false;
      setCommentsOpen(false);
      setCommentsPanelVisible(false);
      setCommentsPanelClosing(false);
      return;
    }

    if (commentsOpen) {
      clearCommentsCloseTimer();
      commentsPanelVisibleRef.current = true;
      setCommentsPanelVisible(true);
      setCommentsPanelClosing(false);
      return;
    }

    if (!commentsPanelVisibleRef.current) return;

    setCommentsPanelClosing(true);
    clearCommentsCloseTimer();
    commentsCloseTimerRef.current = window.setTimeout(() => {
      commentsPanelVisibleRef.current = false;
      setCommentsPanelVisible(false);
      commentsCloseTimerRef.current = null;
    }, COMMENTS_DRAWER_MS);

    return clearCommentsCloseTimer;
  }, [commentsOpen, showPlayerComments, clearCommentsCloseTimer]);

  useEffect(() => {
    if (!mobileCommentsFullscreen || !commentsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [commentsOpen, mobileCommentsFullscreen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        (event.key !== " " && event.code !== "Space") ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        isKeyboardInputTarget(event.target)
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      if (video.paused && !ready) return;

      event.preventDefault();
      togglePlay();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ready, togglePlay]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      style={fullscreen || theatreDesktop ? undefined : { aspectRatio }}
      className={cn(
        "group/player relative w-full overflow-hidden bg-black",
        theatre && "rounded-none border-0 shadow-none",
        theatreDesktop && "h-full",
        !theatre &&
        immersive &&
        "rounded-none border-0 shadow-none lg:rounded-xl lg:border-2 lg:border-border lg:shadow-cartoon-sm",
        !theatre && !immersive && "rounded-xl border-2 border-border shadow-cartoon-sm",
        fullscreen && "aspect-auto h-screen w-screen rounded-none border-0 shadow-none",
        className
      )}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (ready || playing) togglePlay();
        }}
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          saveProgress(e.currentTarget.currentTime, e.currentTarget.duration);
        }}
        onEnded={(e) =>
          saveProgress(e.currentTarget.currentTime, e.currentTarget.duration)
        }
        onWaiting={() => setLoading(true)}
        onStalled={() => setLoading(true)}
        onCanPlay={() => {
          setReady(true);
          setLoading(false);
        }}
        onPlaying={() => setLoading(false)}
        onLoadedData={() => setShowPoster(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          syncAspectRatioFromVideo(e.currentTarget);
          setDuration(e.currentTarget.duration);
          const pendingResumeSeconds = pendingResumeSecondsRef.current;
          if (pendingResumeSeconds != null) {
            applySavedProgress(pendingResumeSeconds);
          }
        }}
        onError={() => {
          setReady(false);
          setLoading(false);
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        className="absolute inset-0 size-full object-cover"
      >
        Seu navegador não suporta a reprodução de vídeo.
      </video>

      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-200",
            showPoster ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {watermark && (
        <span className="pointer-events-none absolute right-3 top-3 select-none rounded-md bg-black/40 px-2 py-0.5 text-xs font-bold text-white/60">
          {watermark}
        </span>
      )}

      {!playing && ready && !loading && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproduzir"
          className="absolute cursor-pointer inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
        >
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground shadow-cartoon">
            <Play className="size-7 translate-x-0.5" />
          </span>
        </button>
      )}

      {!ready && loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground shadow-cartoon">
            <Loader2 className="size-7 animate-spin" />
          </span>
        </div>
      )}

      {playing && loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground shadow-cartoon">
            <Loader2 className="size-7 animate-spin" />
          </span>
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity",
          "group-hover/player:opacity-100 focus-within:opacity-100",
          !playing && "opacity-100"
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          aria-label="Progresso do vídeo"
          style={progressTrackStyle}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-primary"
        />

        <div className="flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!playing && !ready}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            aria-disabled={!playing && !ready}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/20",
              !playing && !ready
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer"
            )}
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="flex cursor-pointer size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/20"
          >
            {muted || volume === 0 ? (
              <VolumeX className="size-5" />
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            aria-label="Volume"
            className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary sm:block"
          />

          <span className="text-xs font-bold tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {showPlayerComments && (
              <button
                type="button"
                onClick={() => setCommentsOpen((open) => !open)}
                aria-label={commentsOpen ? "Fechar comentários" : "Abrir comentários"}
                aria-expanded={commentsOpen}
                className={cn(
                  "flex cursor-pointer size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/20",
                  commentsOpen && "bg-white/20"
                )}
              >
                <MessageSquare className="size-5" />
              </button>
            )}

            <button
              type="button"
              onClick={cycleRate}
              aria-label="Velocidade de reprodução"
              className="flex cursor-pointer h-8 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums transition-colors hover:bg-white/20"
            >
              {rate}x
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="flex cursor-pointer size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/20"
            >
              {fullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {showPlayerComments && commentsPanelVisible && (
        <>
          {mobileCommentsFullscreen && typeof document !== "undefined"
            ? createPortal(
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="Comentários"
                className={cn(
                  "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground",
                  commentsPanelClosing
                    ? "animate-out fade-out-0 slide-out-to-bottom duration-300"
                    : "animate-in fade-in-0 slide-in-from-bottom duration-300"
                )}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-border px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <MessageSquare className="size-4" />
                    Comentários
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommentsOpen(false)}
                    aria-label="Fechar comentários"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  {commentsSlot}
                </div>
              </aside>,
              document.body
            )
            : null}

          {!mobileCommentsFullscreen && (
            <>
              <button
                type="button"
                aria-label="Fechar comentários"
                className={cn(
                  "absolute inset-0 z-30 bg-black/45",
                  commentsPanelClosing
                    ? "animate-out fade-out-0 duration-300"
                    : "animate-in fade-in-0 duration-300"
                )}
                onClick={() => setCommentsOpen(false)}
              />
              <aside
                className={cn(
                  "absolute z-40 flex flex-col overflow-hidden",
                  "rounded-2xl border-2 border-border bg-background text-foreground shadow-cartoon-lg",
                  commentsPanelClosing
                    ? "animate-out fade-out-0 slide-out-to-right duration-300"
                    : "animate-in fade-in-0 slide-in-from-right duration-300",
                  !isLargeScreen && fullscreen
                    ? "inset-0 rounded-none border-0 shadow-none"
                    : fullscreen
                      ? "top-6 right-5 bottom-10 w-[min(calc(100%-2.5rem),380px)]"
                      : immersive
                        ? "inset-2 rounded-xl"
                        : "top-4 right-3 bottom-6 w-[min(calc(100%-1.25rem),340px)]"
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b-2 border-border px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <MessageSquare className="size-4" />
                    Comentários
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommentsOpen(false)}
                    aria-label="Fechar comentários"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
                  {commentsSlot}
                </div>
              </aside>
            </>
          )}
        </>
      )}
    </div>
  );
}
