"use client";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface ExtractedWord {
  term: string;
  definition: string;
  guessed: boolean;
}

const MAX_EDGE = 1600; // enough to read small print; keeps uploads well under the 5MB limit

/** Downscale a photo in the browser and return base64 JPEG (no data: prefix). */
async function toJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** Send a photo to the extract-words function. Throws an Error with a Korean message. */
export async function extractWords(file: File): Promise<ExtractedWord[]> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있어요.");
  let image: string;
  try {
    image = await toJpegBase64(file);
  } catch {
    throw new Error("사진을 열지 못했어요. JPG나 PNG로 다시 시도해 주세요.");
  }
  const { data, error } = await supabase().functions.invoke<{ words: ExtractedWord[] }>("extract-words", {
    body: { image, mediaType: "image/jpeg" },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? "사진을 인식하지 못했어요.");
    }
    throw new Error("서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.");
  }
  return data?.words ?? [];
}

/** Tab-separated text for the import preview; guessed meanings are marked (ignored when grading). */
export function wordsToImportText(words: ExtractedWord[]): string {
  return words.map((w) => `${w.term}\t${w.definition}${w.guessed ? " (AI 추정)" : ""}`).join("\n");
}
