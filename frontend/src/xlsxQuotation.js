import * as XLSX from 'xlsx';

// Standard quotation upload template:
//   Row 1: Customer Name  | <value>
//   Row 2: Customer Email | <value>
//   Row 3: Customer Phone | <value>
//   Row 4: Notes          | <value>
//   Row 5: (blank)
//   Row 6: Description | Qty | Unit Price   (header row)
//   Row 7+: one line item per row
const HEADER_ROW_LABELS = ['description', 'qty', 'unit price'];

export function downloadQuotationTemplate() {
  const rows = [
    ['Customer Name', 'Acme Retail Pte Ltd'],
    ['Customer Email', 'procurement@acme.com'],
    ['Customer Phone', '+971 4 111 2222'],
    ['Notes', ''],
    [],
    ['Description', 'Qty', 'Unit Price'],
    ['Custom entrance door', 2, 1250],
    ['Cabinet hardware set', 10, 45],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
  XLSX.writeFile(wb, 'quotation-upload-template.xlsx');
}

// Parses a File (from an <input type="file">) matching the template above.
// Returns { customerName, customerEmail, customerPhone, notes, items }.
export function parseQuotationExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const getMeta = (label) => {
          const row = rows.find((r) => String(r[0] || '').trim().toLowerCase() === label.toLowerCase());
          return row ? String(row[1] || '').trim() : '';
        };
        const customerName = getMeta('Customer Name');
        const customerEmail = getMeta('Customer Email');
        const customerPhone = getMeta('Customer Phone');
        const notes = getMeta('Notes');

        if (!customerName) {
          reject(new Error('Could not find "Customer Name" in the file - please use the template.'));
          return;
        }

        const headerIdx = rows.findIndex((r) =>
          String(r[0] || '').trim().toLowerCase() === HEADER_ROW_LABELS[0] &&
          String(r[1] || '').trim().toLowerCase() === HEADER_ROW_LABELS[1]
        );
        if (headerIdx === -1) {
          reject(new Error('Could not find the item table header row ("Description", "Qty", "Unit Price") - please use the template.'));
          return;
        }

        const items = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const [description, qty, unitPrice] = rows[i];
          if (!description && !qty && !unitPrice) continue;
          if (!description) continue;
          items.push({
            description: String(description).trim(),
            qty: Number(qty) || 0,
            unitPrice: Number(unitPrice) || 0,
          });
        }
        if (items.length === 0) {
          reject(new Error('No line items found below the header row.'));
          return;
        }

        resolve({ customerName, customerEmail, customerPhone, notes, items });
      } catch (err) {
        reject(new Error('Could not parse this file - make sure it is a valid .xlsx file.'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
