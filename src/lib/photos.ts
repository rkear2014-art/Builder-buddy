export const PHOTO_STAGES = ["BEFORE", "DURING", "AFTER"] as const;
export type PhotoStage = (typeof PHOTO_STAGES)[number];

export const PHOTO_STAGE_LABELS: Record<PhotoStage, string> = {
  BEFORE: "Before",
  DURING: "During",
  AFTER: "After",
};

export const MAX_JOB_PHOTOS = 12;

export function isPhotoStage(value: string): value is PhotoStage {
  return PHOTO_STAGES.includes(value as PhotoStage);
}
