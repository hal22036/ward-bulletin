// Render the actual exported PDF, so preview and print share one layout engine.
import * as pdfjs from './vendor/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;

let revision = 0, timer, running = false;
const paper = document.querySelector('#paper');
const message = document.querySelector('#previewStatus');
const previewViewport=document.querySelector('#previewViewport');
const zoomSelect=document.querySelector('#previewZoom'),zoomIn=document.querySelector('#zoomIn'),zoomOut=document.querySelector('#zoomOut'),zoomFit=document.querySelector('#zoomFit');
const zoomLevels=[1,1.25,1.5,2,2.5,3];let previewZoom=1,panStart=null;
function applyPreviewZoom(reset=false){
 const digital=document.querySelector('#side').value==='digital',factor=digital?1:previewZoom;
 if(paper.style)paper.style.width=(factor*100)+'%';
 if(previewViewport?.classList){previewViewport.classList.toggle('is-zoomed',!digital&&factor>1);previewViewport.classList.toggle('is-digital',digital);}
 if(zoomSelect){zoomSelect.value=String(previewZoom);zoomSelect.disabled=digital;}if(zoomIn)zoomIn.disabled=digital||previewZoom>=3;if(zoomOut)zoomOut.disabled=digital||previewZoom<=1;if(zoomFit)zoomFit.disabled=digital;
 if(reset&&previewViewport){previewViewport.scrollLeft=0;previewViewport.scrollTop=0;}
}
function changePreviewZoom(value){
 if(!zoomLevels.includes(Number(value)))return;
 const viewport=previewViewport,old=previewZoom,x=viewport?(viewport.scrollLeft+viewport.clientWidth/2)/old:0,y=viewport?(viewport.scrollTop+viewport.clientHeight/2)/old:0;previewZoom=Number(value);applyPreviewZoom(previewZoom===1);
 if(viewport&&previewZoom!==1){const center=()=>{viewport.scrollLeft=Math.max(0,x*previewZoom-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,y*previewZoom-viewport.clientHeight/2);};if(typeof requestAnimationFrame==='function')requestAnimationFrame(center);else center();}
}
if(zoomSelect)zoomSelect.onchange=()=>changePreviewZoom(zoomSelect.value);
if(zoomIn)zoomIn.onclick=()=>changePreviewZoom(zoomLevels[Math.min(zoomLevels.length-1,zoomLevels.indexOf(previewZoom)+1)]);
if(zoomOut)zoomOut.onclick=()=>changePreviewZoom(zoomLevels[Math.max(0,zoomLevels.indexOf(previewZoom)-1)]);
if(zoomFit)zoomFit.onclick=()=>changePreviewZoom(1);
if(previewViewport){
 previewViewport.onpointerdown=event=>{if(previewZoom<=1||event.button!==0||event.target.tagName!=='CANVAS')return;panStart={id:event.pointerId,x:event.clientX,y:event.clientY,left:previewViewport.scrollLeft,top:previewViewport.scrollTop};previewViewport.setPointerCapture(event.pointerId);previewViewport.classList.add('is-dragging');event.preventDefault();};
 previewViewport.onpointermove=event=>{if(!panStart||panStart.id!==event.pointerId)return;previewViewport.scrollLeft=panStart.left+panStart.x-event.clientX;previewViewport.scrollTop=panStart.top+panStart.y-event.clientY;};
 const endPan=()=>{panStart=null;previewViewport.classList.remove('is-dragging');};previewViewport.onpointerup=endPan;previewViewport.onpointercancel=endPan;
}


window.renderPrintPreview = function () {
  applyPreviewZoom();
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
    if(document.querySelector('#side').value==='digital'){
      const html=await buildDigitalProgram();if(current!==revision)return;
      const frame=document.createElement('iframe');frame.className='digital-frame';frame.title='Digital program preview';frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');frame.srcdoc=html;
      paper.replaceChildren(frame);paper.removeAttribute('data-stale');paper.setAttribute('aria-busy','false');message.textContent=data.publicationStatus==='published'?'Digital program · published week':'Digital program · draft preview';return;
    }
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
    const viewport = page.getViewport({ scale: 3 });
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

async function buildDigitalProgram(){
  const snapshot=JSON.stringify(data),info={unit:data.ward||'Ward / branch',date:dateText(),published:data.publicationStatus==='published',hymns:digitalHymns(),format:digitalProgramFormat()};
  const result=await window.makePdf({paperSize:info.format,printColor:'color'});
  const task=pdfjs.getDocument({data:result.bytes,useSystemFonts:false,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href});
  try{
    const pdf=await task.promise,scale=2.5,sources=[];
    for(let number=1;number<=2;number++){const page=await pdf.getPage(number),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;sources.push(canvas);}
    const panels=info.format==='letter'?[[0,426,336],[1,426,336],[1,30,336],[0,30,336]]:[[1,672,336],[1,0,336],[0,0,336],[0,336,672],[1,336,336]],images=[];
    for(const [pageIndex,x,width] of panels){const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(612*scale);canvas.getContext('2d').drawImage(sources[pageIndex],Math.round(x*scale),0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);images.push(canvas.toDataURL('image/png'));}
    if(snapshot!==JSON.stringify(data))throw Error('The bulletin changed while the digital program was being prepared. Try again.');
    return digitalDocument(images,info);
  }finally{await task.destroy();}
}
window.createDigitalExport=async function(){if(data.publicationStatus!=='published')throw Error('Publish this week’s bulletin before downloading the digital program.');return buildDigitalProgram();};

window.renderPrintPreview();
