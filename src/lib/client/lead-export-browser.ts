import type {
  LeadExportFile,
  LeadExportPackage,
  LeadExportRow,
  LeadExportSheet,
} from "@/lib/lead-export";

const BRAND_CRIMSON = "FFC1272D";
const BRAND_MAROON = "FF6D0D12";
const BRAND_GOLD = "FFE8C98A";
const BRAND_BEIGE = "FFF8F1E7";
const BORDER = "FFE4D8CB";
const WHITE = "FFFFFFFF";
const INK = "FF2E2420";

function safeSegment(value: string, fallback: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim()
    .slice(0, 100);
  return cleaned || fallback;
}

function humanise(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function excelValue(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);

  const text = String(value);
  // Prevent user-supplied values from becoming formulas when the file opens.
  if (/^[=+\-@]/.test(text)) return `'${text}`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }
  return text;
}

function allKeys(rows: LeadExportRow[]): string[] {
  const found = new Set<string>();
  for (const row of rows) Object.keys(row).forEach((key) => found.add(key));
  return [...found];
}

function styleTitle(sheet: import("exceljs").Worksheet, columns: number, title: string) {
  const width = Math.max(columns, 2);
  sheet.mergeCells(1, 1, 1, width);
  const cell = sheet.getCell(1, 1);
  cell.value = `KHANA BANAO · ${title}`;
  cell.font = { bold: true, color: { argb: WHITE }, size: 14 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_MAROON } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 28;
}

function styleHeader(row: import("exceljs").Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_CRIMSON } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      left: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  });
  row.height = 24;
}

function styleBody(sheet: import("exceljs").Worksheet, fromRow: number) {
  for (let index = fromRow; index <= sheet.rowCount; index += 1) {
    const row = sheet.getRow(index);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { color: { argb: INK }, size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "hair", color: { argb: BORDER } },
        left: { style: "hair", color: { argb: BORDER } },
        bottom: { style: "hair", color: { argb: BORDER } },
        right: { style: "hair", color: { argb: BORDER } },
      };
      if ((index - fromRow) % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_BEIGE } };
      }
    });
  }
}

function fitColumns(sheet: import("exceljs").Worksheet) {
  sheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value === null || cell.value === undefined ? "" : String(cell.value);
      const longestLine = value.split("\n").reduce((max, line) => Math.max(max, line.length), 0);
      width = Math.max(width, Math.min(longestLine + 2, 45));
    });
    column.width = width;
  });
}

function addVerticalSheet(
  workbook: import("exceljs").Workbook,
  section: LeadExportSheet,
) {
  const sheet = workbook.addWorksheet(section.name, {
    views: [{ state: "frozen", ySplit: 3 }],
    properties: { tabColor: { argb: BRAND_GOLD } },
  });
  styleTitle(sheet, 2, section.name);
  sheet.addRow([]);
  const header = sheet.addRow(["Field", "Value"]);
  styleHeader(header);

  const record = section.rows[0];
  if (!record) {
    sheet.addRow(["Status", "No record available"]);
  } else {
    for (const [key, value] of Object.entries(record)) {
      sheet.addRow([humanise(key), excelValue(value)]);
    }
  }
  styleBody(sheet, 4);
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 65;
  sheet.getColumn(1).font = { bold: true, color: { argb: INK } };
}

function addTableSheet(
  workbook: import("exceljs").Workbook,
  section: LeadExportSheet,
) {
  const keys = allKeys(section.rows);
  const columnCount = Math.max(keys.length, 2);
  const sheet = workbook.addWorksheet(section.name.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 3 }],
    properties: { tabColor: { argb: BRAND_GOLD } },
  });
  styleTitle(sheet, columnCount, section.name);
  sheet.addRow([]);

  if (keys.length === 0) {
    const header = sheet.addRow(["Status"]);
    styleHeader(header);
    sheet.addRow(["No records"]);
    styleBody(sheet, 4);
    fitColumns(sheet);
    return;
  }

  const header = sheet.addRow(keys.map(humanise));
  styleHeader(header);
  for (const record of section.rows) {
    sheet.addRow(keys.map((key) => excelValue(record[key])));
  }
  styleBody(sheet, 4);
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: keys.length },
  };
  fitColumns(sheet);
}

function fileRows(files: LeadExportFile[]): LeadExportRow[] {
  return files.map((file) => ({
    category: file.category,
    folder: file.folder,
    file_name: file.fileName,
    original_name: file.sourceName,
    file_size_bytes: file.size,
    status: file.status,
    available_for_export: Boolean(file.url),
  }));
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Builds both XLSX and ZIP entirely in the signed-in administrator's browser. */
export async function downloadLeadArchive(
  data: LeadExportPackage,
): Promise<{ missingFiles: number }> {
  const [{ default: ExcelJS }, { default: JSZip }] = await Promise.all([
    import("exceljs"),
    import("jszip"),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KHANA BANAO Franchise CRM";
  workbook.created = new Date(data.generatedAt);
  workbook.modified = new Date(data.generatedAt);
  workbook.subject = `Complete record for ${data.leadNumber}`;
  workbook.title = `${data.leadNumber} · ${data.leadName}`;

  for (const section of data.sheets) {
    if (["Lead", "Application", "Franchise"].includes(section.name)) {
      addVerticalSheet(workbook, section);
    } else {
      addTableSheet(workbook, section);
    }
  }
  addTableSheet(workbook, { name: "File Index", rows: fileRows(data.files) });

  const workbookBytes = await workbook.xlsx.writeBuffer();
  const zip = new JSZip();
  const rootName = safeSegment(`${data.leadNumber}-${data.leadName}`, data.leadNumber);
  const root = zip.folder(rootName);
  if (!root) throw new Error("Could not create the export folder.");
  root.file(`${safeSegment(data.leadNumber, "lead")}-complete-record.xlsx`, workbookBytes);

  let missingFiles = 0;
  const failures: string[] = [];
  const fetched = await Promise.all(
    data.files.map(async (file) => {
      if (!file.url) return { file, bytes: null, error: "No signed URL was available." };
      try {
        const response = await fetch(file.url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return { file, bytes: await response.arrayBuffer(), error: null };
      } catch (error) {
        return {
          file,
          bytes: null,
          error: error instanceof Error ? error.message : "Download failed.",
        };
      }
    }),
  );

  for (const result of fetched) {
    const folder = result.file.folder
      .split("/")
      .filter(Boolean)
      .map((part) => safeSegment(part, "Documents"))
      .join("/");
    const fileName = safeSegment(result.file.fileName, "document");
    if (result.bytes) {
      root.file(`${folder}/${fileName}`, result.bytes);
    } else {
      missingFiles += 1;
      failures.push(`${folder}/${fileName}: ${result.error}`);
    }
  }

  const summary = [
    "KHANA BANAO Franchise CRM · Complete Lead Export",
    `Lead: ${data.leadNumber} · ${data.leadName}`,
    `Generated: ${new Date(data.generatedAt).toLocaleString("en-IN")}`,
    `Database workbook: ${data.leadNumber}-complete-record.xlsx`,
    `Document files included: ${data.files.length - missingFiles} of ${data.files.length}`,
    "",
    "This ZIP was assembled locally in the administrator's browser.",
    ...(failures.length ? ["", "Files not included:", ...failures] : []),
  ].join("\r\n");
  root.file("README.txt", summary);

  const archive = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 4 },
  });
  saveBlob(archive, `${rootName}.zip`);
  return { missingFiles };
}

