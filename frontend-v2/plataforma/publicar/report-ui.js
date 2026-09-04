// report-ui.js – maneja la generación y descarga de informes en publicar
// Se asume que tpl-report-generator.js ya está cargado y expone window.TPLReportGenerator

(() => {
  const simpleBtn = document.getElementById('simpleReportBtn');
  const premiumBtn = document.getElementById('premiumReportBtn');
  const dialog = document.getElementById('reportDialog');
  const closeBtn = document.getElementById('closeReport');
  const downloadBtn = document.getElementById('downloadReport');
  const reportContent = document.getElementById('reportContent');

  let lastReportType = 'simple'; // track which tipo se generó por última vez

  // Helper: obtener valores del formulario actual
  function getFormValues() {
    const ids = [
      'region', 'comuna', 'localidad', 'ubicacionTexto', 'googleMapsLink',
      'superficie', 'suelo', 'topografia', 'accesoDetalle', 'aguaDetalle',
      'negociacionPrecio', 'disponibilidadVisitas', 'nombre', 'telefono', 'email'
    ];
    const values = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) values[id] = el.value;
        } else {
          values[id] = el.value;
        }
      }
    });
    return values;
  }

  // Placeholder para datos de valoración. En producción se obtendrían del motor de tasación.
  function getValData() {
    // Intentamos reutilizar datos ya calculados en publicar.js si existen.
    if (window.currentValuation) return window.currentValuation;
    return {};
  }

  // Placeholder para datos de lead / referencia.
  function getLeadData() {
    // Si el usuario está autenticado o hay una referencia en la URL, usarla.
    return { leadRef: 'TPL-INFO-' + Math.floor(1000 + Math.random() * 9000) };
  }

  function openReport(type) {
    const formValues = getFormValues();
    const valData = getValData();
    const leadData = getLeadData();
    // Generamos el reporte usando la librería existente.
    if (window.TPLReportGenerator && typeof window.TPLReportGenerator.openReport === 'function') {
      window.TPLReportGenerator.openReport(valData, leadData, formValues);
      // El generador inserta páginas en #tplReportPrintContainer.
      const container = document.getElementById('tplReportPrintContainer');
      if (container) {
        // Copiamos el contenido al diálogo editable.
        reportContent.innerHTML = container.innerHTML;
        // Mostramos el diálogo modal.
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.style.display = 'block';
        }
        lastReportType = type;
      }
    } else {
      console.error('TPLReportGenerator no está disponible');
    }
  }

  // Event listeners
  if (simpleBtn) {
    simpleBtn.addEventListener('click', () => openReport('simple'));
  }
  if (premiumBtn) {
    premiumBtn.addEventListener('click', () => openReport('premium'));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.style.display = 'none';
      }
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const htmlBody = reportContent.innerHTML;
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe TPL</title></head><body>${htmlBody}</body></html>`;
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = lastReportType === 'premium' ? 'tpl_informe_premium.html' : 'tpl_informe.html';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
})();
