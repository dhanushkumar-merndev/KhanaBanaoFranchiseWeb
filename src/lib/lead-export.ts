export type LeadExportRow = Record<string, unknown>;

export type LeadExportSheet = {
  name: string;
  rows: LeadExportRow[];
};

export type LeadExportFile = {
  category: string;
  folder: string;
  fileName: string;
  sourceName: string;
  size: number | null;
  status: string | null;
  url: string | null;
};

export type LeadExportPackage = {
  leadNumber: string;
  leadName: string;
  generatedAt: string;
  sheets: LeadExportSheet[];
  files: LeadExportFile[];
};

