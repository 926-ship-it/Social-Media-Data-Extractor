
export interface ProcessedResult {
  rawText: string;
  parsedData: ParsedRow[];
}

export interface ParsedRow {
  username: string;
  link: string;
  followers: string;
  views: string;       // Changed to string to support "7.89万"
  numericViews: number; // Helper for charts/sorting
  contentType: string;
  niche: string;
  language: string;
  genderDist: string;
  ageDist: string;
}

export interface UploadFile {
  id: string;
  file: File;
  preview: string; // URL for images, null for docs (we'll render icons)
  fileType: 'image' | 'word' | 'excel';
}
