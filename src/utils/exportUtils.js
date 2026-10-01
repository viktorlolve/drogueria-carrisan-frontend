import * as XLSX from 'xlsx';

const AZUL_RGB = [0, 82, 220];

// columnas: [{ header: 'Cliente', key: 'nombre' }, ...]
export function exportToExcel(rows, columnas, filename) {
  const data = rows.map(row => {
    const obj = {};
    columnas.forEach(col => { obj[col.header] = row[col.key]; });
    return obj;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPdf(rows, columnas, filename, titulo) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(titulo, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-VE')}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columnas.map(c => c.header)],
    body: rows.map(row => columnas.map(c => row[c.key])),
    styles: { fontSize: 9 },
    headStyles: { fillColor: AZUL_RGB }
  });

  doc.save(`${filename}.pdf`);
}

// Guía de despacho imprimible para el motorizado. El diseño vive en
// generarGuiaDespachoPDF.js (comparte base visual con factura/comprobante).
export async function exportarGuiaDespacho(orden) {
  const { default: generarGuiaDespachoPDF } = await import('./generarGuiaDespachoPDF');
  return generarGuiaDespachoPDF(orden);
}
