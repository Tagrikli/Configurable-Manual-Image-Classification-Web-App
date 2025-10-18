export interface ImageData {
  filename: string;
  path: string;
}

export type LabelState = Record<string, boolean>;

export interface ProgressData {
  total_images: number;
  processed_images: number;
  percentage: number;
}

export interface ReviewerStats {
  reviewer: string;
  count: number;
  rank: number;
}

export interface NavigateRequest {
  filename: string;
  labels: LabelState;
}

export interface NavigateResponse {
  next_image: ImageData | null;
  remaining: number;
}

export interface LoadImageResponse {
  image: ImageData;
  labels: LabelState;
  remaining: number;
}

export type { LabelDefinition, LabelDescription, LabelConfigResponse } from '../api/client';
