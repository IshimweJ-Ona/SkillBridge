// Report export helpers - CSV, Excel, and PDF, all client-side and
// dependency-free (no xlsx/jspdf: those pull in large, poorly-maintained
// transitive dependency trees for a feature this simple to build directly).

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  triggerDownload(filename, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function reportTable(title: string, headers: string[], rows: (string | number)[][]) {
  const headRow = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">SkillBridge · Generated ${new Date().toLocaleString()}</p>
    <table>
      <thead><tr>${headRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

// A real Excel-openable file: Excel and LibreOffice both parse an HTML
// <table> saved with a .xls extension / ms-excel MIME type, no binary
// spreadsheet format (or library) required.
export function downloadExcel(filename: string, title: string, headers: string[], rows: (string | number)[][]) {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; font-family: Calibri, sans-serif; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
      </style>
    </head>
    <body>${reportTable(title, headers, rows)}</body>
    </html>
  `;
  triggerDownload(filename, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }));
}

// PDF export via the browser's native print dialog ("Save as PDF") - a
// clean printable view opens in a new tab and print() is triggered
// automatically. No PDF-generation library needed.
export function downloadPdf(title: string, headers: string[], rows: (string | number)[][]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1a1a; padding: 24px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        th { background: #f4f4f4; }
      </style>
    </head>
    <body>
      ${reportTable(title, headers, rows)}
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
