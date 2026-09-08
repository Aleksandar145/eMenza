import type { StatisticsTransaction } from "@/lib/statistika-types";
import { formatStatisticsRsd } from "@/lib/statistika-types";

type PdfLabels = {
  title: string;
  date: string;
  description: string;
  status: string;
  amount: string;
  success: string;
};

export function openStatisticsPdfExport(
  transactions: StatisticsTransaction[],
  labels: PdfLabels,
) {
  const rows = transactions
    .map((transaction) => {
      const date = new Intl.DateTimeFormat("sr-Latn-RS").format(new Date(transaction.createdAt));
      const amount = formatStatisticsRsd(transaction.amountRsd, { signed: true });
      return `<tr>
        <td>${date}</td>
        <td>${escapeHtml(transaction.description)}</td>
        <td>${labels.success}</td>
        <td style="text-align:right;">${escapeHtml(amount)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="sr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(labels.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #E5E7EB; padding: 10px 8px; text-align: left; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6B7280; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(labels.title)}</h1>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(labels.date)}</th>
          <th>${escapeHtml(labels.description)}</th>
          <th>${escapeHtml(labels.status)}</th>
          <th style="text-align:right;">${escapeHtml(labels.amount)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
