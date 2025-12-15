export interface ProcessedResult {
  rawText: string;
  parsedData: ParsedRow[];
}

export interface ParsedRow {
  username: string;
  link: string;
  followers: string;
  views: number;
  contentType: string;
  tags: string;
  region: string;
  malePct: string;   // New: Male Audience Percentage
  femalePct: string; // New: Female Audience Percentage
  ageDist: string;   // New: Age Distribution
}

export interface UploadFile {
  id: string;
  file: File;
  preview: string; // URL for images, null for docs (we'll render icons)
  fileType: 'image' | 'word' | 'excel';
}