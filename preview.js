// Render the actual exported PDF, so preview and print share one layout engine.
import * as pdfjs from './vendor/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;

let revision = 0, timer, running = false;
const paper = document.querySelector('#paper');
const message = document.querySelector('#previewStatus');

window.renderPrintPreview = function () {
  revision++;
  clearTimeout(timer);
  paper.setAttribute('aria-busy', 'true');
  message.textContent = 'Updating print preview…';
  timer = setTimeout(refresh, 300);
};

async function refresh() {
  if (running) return;
  running = true;
  const current = revision;
  let documentTask;
  try {
    const pageNumber = Number(document.querySelector('#side').value) + 1;
    const result = await window.makePdf();
    if (current !== revision) return;
    documentTask = pdfjs.getDocument({
      data: result.bytes,
      useSystemFonts: false,
      standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href
    });
    const pdf = await documentTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', data.paperSize==='letter'?(pageNumber===2?'Print preview: inside announcements and program':'Print preview: outside ward/branch information and front cover'):pageNumber===2?'Print preview: sacrament meeting program, ward/branch information, and front cover':'Print preview: announcements and calendar');
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (current !== revision) return;
    paper.replaceChildren(canvas);
    paper.removeAttribute('data-stale');
    paper.setAttribute('aria-busy', 'false');
    message.textContent = 'Showing the actual PDF · Page ' + pageNumber + ' of 2' + (result.warnings.length ? ' · ' + result.warnings.join('; ') : '');
  } catch (error) {
    if (current !== revision) return;
    paper.setAttribute('aria-busy', 'false');
    paper.setAttribute('data-stale', 'true');
    message.textContent = (paper.childElementCount ? 'Showing the last successful preview. Your latest edits are not shown yet. ' : 'Preview not ready. ') + error.message;
  } finally {
    if (documentTask) await documentTask.destroy();
    running = false;
    if (current !== revision) timer = setTimeout(refresh, 0);
  }
}

window.renderPrintPreview();
