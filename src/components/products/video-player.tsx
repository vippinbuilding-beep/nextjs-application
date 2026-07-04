"use client";

import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.5] as const;

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
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingResumeSecondsRef = useRef<number | null>(null);
  const restoredProgressRef = useRef(false);
  const lastSavedProgressRef = useRef({ positionSeconds: 0, savedAt: 0 });

  const [playing, setPlaying] = useState(false);
  // True until the video has buffered enough to play, and again whenever
  // playback stalls to rebuffer, so we can surface a spinner.
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState(false);
  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const progressTrackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progressPercent}%, rgb(255 255 255 / 0.3) ${progressPercent}%, rgb(255 255 255 / 0.3) 100%)`,
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // `play()` returns a promise that rejects with AbortError when the request
      // is interrupted by a quick `pause()` (e.g. rapid clicks). Swallow it.
      video.play().catch(() => { });
    } else {
      video.pause();
    }
  }, []);

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

      event.preventDefault();
      togglePlay();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [togglePlay]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "group/player relative aspect-video w-full overflow-hidden rounded-xl border-2 border-border bg-black shadow-cartoon-sm",
        className
      )}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        onClick={togglePlay}
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
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          const pendingResumeSeconds = pendingResumeSecondsRef.current;
          if (pendingResumeSeconds != null) {
            applySavedProgress(pendingResumeSeconds);
          }
          // With preload="metadata" `canplay` may not fire until playback
          // starts; once metadata is in, the video is ready for the play tap.
          setLoading(false);
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        className="size-full object-contain"
      >
        Seu navegador não suporta a reprodução de vídeo.
      </video>

      {watermark && (
        <span className="pointer-events-none absolute right-3 top-3 select-none rounded-md bg-black/40 px-2 py-0.5 text-xs font-bold text-white/60">
          {watermark}
        </span>
      )}

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground shadow-cartoon">
            <Loader2 className="size-7 animate-spin" />
          </span>
        </div>
      )}

      {!playing && !loading && (
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
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="flex cursor-pointer size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/20"
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
    </div>
  );
}
