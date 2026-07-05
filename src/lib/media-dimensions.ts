const DEFAULT_ASPECT_RATIO = 16 / 9;

export function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler as dimensões da imagem."));
    };
    img.src = url;
  });
}

export function readVideoDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler as dimensões do vídeo."));
    };
    video.src = url;
  });
}

export function productAspectRatio(opts: {
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
}): number {
  const { thumbnailWidth, thumbnailHeight, mediaWidth, mediaHeight } = opts;

  if (thumbnailWidth && thumbnailHeight && thumbnailWidth > 0 && thumbnailHeight > 0) {
    return thumbnailWidth / thumbnailHeight;
  }

  if (mediaWidth && mediaHeight && mediaWidth > 0 && mediaHeight > 0) {
    return mediaWidth / mediaHeight;
  }

  return DEFAULT_ASPECT_RATIO;
}
