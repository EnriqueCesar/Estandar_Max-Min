'use strict';

const STORES = [
  ['38115','Zona Azul'],['38117','Satelite'],['38119','Lomas Verdes'],['38136','Punta Norte'],['38142','Zona Esmeralda'],['38149','Bellavista'],['38176','Periferico Satélite DT'],['38186','Arboledas'],['38197','Echegaray'],['38205','Lindavista'],['38207','Lindavista II'],['38230','ITEMS Edo de Mexico'],['38266','San Mateo'],['38270','Lomas Verdes II'],['38333','Izcalli Mega'],['38339','San Marcos'],['38363','Galerias Atizapan'],['38368','Luna Park'],['38371','Montevideo DT'],['38374','Valle Dorado'],['38394','Centro Comercial Lomas Verdes'],['38401','Coacalco'],['38411','Torres Lindavista'],['38427','Plaza Satelite'],['38431','Eduardo Molina'],['38442','Sor Juana'],['38456','Plaza las Flores'],['38458','El Rosario'],['38460','Santa Monica'],['38475','Satelite Centro Civico'],['38507','Espacio Vista del Valle'],['38515','Patio Ecatepec'],['38527','Camarones'],['38529','Bosques de Aragon'],['38535','City Center Esmeralda'],['38546','Patio Claveria'],['38561','Parque Toreo'],['38590','Parque Toreo II'],['38604','Cosmopol'],['38606','TlalnepantlaCarso'],['38651','Via Vallejo'],['38656','Viveros de la Loma'],['38661','Jinetes'],['38674','Mundo E'],['38677','Patio la Raza'],['38694','Villas de la Hacienda'],['38695','Cetram 4 Caminos'],['38719','Plaza Fortuna'],['38770','Gustavo Baz 29'],['38792','Pasaje Tlanepantla'],['38811','Plaza Tepeyac'],['38837','Centenario Azcapotzalco'],['38845','Mundo E II'],['38859','Plaza Satelite II N1'],['38862','San Miguel Izcalli'],['38894','Galerias Perinorte'],['38903','Encuentro Oceania'],['38924','Plaza Aeropuerto'],['38925','Star Medica Lomas Verdes'],['38930','Blvd. Aeropuerto dt'],['38937','Parque Tepeyac Piso 1'],['38965','Parque Tepeyac Piso 2'],['38992','Tapo Puerta Oriente'],['38995','Encuentro Oceania II'],['43043','Atizapan'],['43111','Montevideo Insurgentes'],['43130','Town Center Nicolás Romero'],['43132','Plaza Vista Norte'],['43152','Samara Satélite'],['43193','Cosmopol N1'],['43194','Atana Lindavista'],['43195','Parque Jadin kiosko']
];
const STATIONS = ['Escritorio','Rack Leches','Rack Jarabes','Rack Vaso/Tapas','Rack Polvos','Rack BOH','Refrigerador','Congelador','Estación CBS','Estación Espresso','Otra estación'];
const CHECKS = ['Orden','Limpieza','Máximos y mínimos visibles','Producto identificado','PEPS/FEFO','Reposición clara','Sin producto en piso','Rack seguro y accesible'];
const SHAREPOINT_URL = 'https://grupovips-my.sharepoint.com/:f:/g/personal/enrique_cesar_starbucks_com_mx/IgDhO93UZT84ToAXFitqsMbaATbftPIJRmo_T47HBNYKPsE?e=rsEqCc';
const $ = s => document.querySelector(s);
let evidences = [];
let evidenceSeq = 1;
let lastPdfFile = null;
let lastPdfUrl = null;
let deferredInstallPrompt = null;

function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function prettyDate(iso){
  const [y,m,d] = String(iso||todayISO()).split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
}
function cleanFilePart(s){
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,48) || 'Evidencia';
}
function selectedStore(){
  const [cc, ...nameParts] = ($('#storeSelect').value || '').split('|');
  return {cc: cc || '', name: nameParts.join('|') || ''};
}
function stationName(ev){
  return (ev?.station || $('#stationInput').value || 'Estacion').trim();
}

function init(){
  $('#storeSelect').innerHTML = STORES.map(([cc,name]) => `<option value="${cc}|${name}">${cc} - ${name}</option>`).join('');
  $('#stationOptions').innerHTML = STATIONS.map(s => `<option value="${s}"></option>`).join('');
  $('#dateInput').value = todayISO();
  $('#todayBadge').textContent = prettyDate($('#dateInput').value);
  $('#dateInput').addEventListener('change', () => $('#todayBadge').textContent = prettyDate($('#dateInput').value));
  $('#checklist').innerHTML = CHECKS.map((c,i) => `<label class="check-item"><input type="checkbox" data-check="${i}" checked> ${c}</label>`).join('');
  $('#addEvidenceBtn').addEventListener('click', () => addEvidence());
  $('#pdfBtn').addEventListener('click', generatePdfFlow);
  $('#shareBtn').addEventListener('click', sharePdf);
  addEvidence();
  registerPwa();
}

function addEvidence(){
  const station = $('#stationInput').value || STATIONS[0];
  evidences.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()), index:evidenceSeq++, station, before:null, after:null, note:'' });
  renderEvidences();
}
function removeEvidence(id){
  if (evidences.length <= 1) return alert('Mantén al menos una evidencia.');
  evidences = evidences.filter(e => e.id !== id);
  renderEvidences();
}
function updateEvidence(id, patch){
  const ev = evidences.find(e => e.id === id);
  if (!ev) return;
  Object.assign(ev, patch);
}
function renderEvidences(){
  $('#evidenceList').innerHTML = evidences.map((ev, idx) => `
    <article class="evidence-card" data-id="${ev.id}">
      <div class="evidence-title">
        <strong>Evidencia ${idx+1}</strong>
        <button class="delete-btn" type="button" data-delete="${ev.id}">Eliminar</button>
      </div>
      <div class="obs-wrap" style="padding-top:18px">
        <label>Nombre de estación para esta evidencia
          <input data-field="station" value="${escapeHtml(ev.station || '')}" placeholder="Ej. Rack Jarabes">
        </label>
      </div>
      <div class="capture-grid">
        ${photoBox(ev,'before','ANTES')}
        ${photoBox(ev,'after','DESPUÉS')}
      </div>
      <div class="obs-wrap">
        <label>Observaciones opcionales
          <textarea data-field="note" rows="3" placeholder="Ej. Se identificó producto, se actualizó máximo/mínimo y se dejó reposición clara.">${escapeHtml(ev.note || '')}</textarea>
        </label>
      </div>
    </article>`).join('');

  document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => removeEvidence(b.dataset.delete));
  document.querySelectorAll('.evidence-card input[data-field], .evidence-card textarea[data-field]').forEach(el => {
    el.addEventListener('input', () => updateEvidence(el.closest('.evidence-card').dataset.id, {[el.dataset.field]: el.value}));
  });
  document.querySelectorAll('input[type=file][data-photo]').forEach(input => input.addEventListener('change', onPhotoSelected));
  document.querySelectorAll('[data-remove-photo]').forEach(btn => btn.onclick = () => {
    const ev = evidences.find(e => e.id === btn.closest('.evidence-card').dataset.id);
    if (ev) { ev[btn.dataset.removePhoto] = null; renderEvidences(); }
  });
}
function photoBox(ev, side, label){
  const img = ev[side]?.dataUrl;
  const accept = 'image/*';
  return `<div class="photo-box">
    <h3>${label}</h3>
    <div class="preview">${img ? `<img src="${img}" alt="Foto ${label}">` : `<span>Sin foto ${label}<br><small>Usa cámara o galería</small></span>`}</div>
    <div class="photo-actions">
      <label class="file-btn">📷 Cámara<input data-photo="${side}" type="file" accept="${accept}" capture="environment"></label>
      <label class="file-btn">🖼️ Galería<input data-photo="${side}" type="file" accept="${accept}"></label>
      <button class="small-btn danger" type="button" data-remove-photo="${side}">Eliminar</button>
    </div>
  </div>`;
}
async function onPhotoSelected(e){
  const file = e.target.files?.[0];
  if (!file) return;
  const card = e.target.closest('.evidence-card');
  const ev = evidences.find(x => x.id === card.dataset.id);
  if (!ev) return;
  try {
    ev[e.target.dataset.photo] = await fileToJpegData(file, 1800, .86);
    renderEvidences();
  } catch(err) {
    alert('No se pudo cargar la imagen. Intenta con otro archivo.');
  }
}
function fileToJpegData(file, maxSide=1800, quality=.86){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let {width:w, height:h} = img;
        const scale = Math.min(1, maxSide / Math.max(w,h));
        const cw = Math.max(1, Math.round(w*scale));
        const ch = Math.max(1, Math.round(h*scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,cw,ch);
        ctx.drawImage(img,0,0,cw,ch);
        resolve({dataUrl: canvas.toDataURL('image/jpeg', quality), width:cw, height:ch, name:file.name});
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function validation(){
  const station = $('#stationInput').value.trim();
  if (!station) return 'Escribe o selecciona estación / área.';
  const incomplete = evidences.findIndex(e => !e.before || !e.after);
  if (incomplete >= 0) return `Agrega foto ANTES y DESPUÉS en la evidencia ${incomplete+1}.`;
  return '';
}
async function generatePdfFlow(){
  const err = validation();
  if (err) return alert(err);
  $('#pdfBtn').disabled = true; $('#pdfBtn').textContent = 'Generando...';
  try {
    const {cc,name} = selectedStore();
    const station = cleanFilePart($('#stationInput').value || evidences[0]?.station);
    const date = $('#dateInput').value || todayISO();
    const filename = `Estandar_MaxMin_${cc}_${cleanFilePart(name)}_${station}_${date}.pdf`;
    const blob = buildPdfBlob({filename});
    if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
    lastPdfUrl = URL.createObjectURL(blob);
    lastPdfFile = new File([blob], filename, {type:'application/pdf'});
    $('#downloadBox').classList.remove('hidden');
    $('#downloadBox').innerHTML = `<div><strong class="ok">PDF generado correctamente</strong><br><span>${filename}</span></div><a href="${lastPdfUrl}" download="${filename}">Descargar PDF</a><a href="${SHAREPOINT_URL}" target="_blank" rel="noopener">Subir a SharePoint</a>`;
    $('#shareBtn').disabled = !(navigator.canShare && navigator.canShare({files:[lastPdfFile]}));
  } catch(e) {
    console.error(e);
    alert('No se pudo generar el PDF. Revisa las imágenes y vuelve a intentar.');
  } finally {
    $('#pdfBtn').disabled = false; $('#pdfBtn').textContent = 'Generar PDF';
  }
}
async function sharePdf(){
  if (!lastPdfFile) return;
  try { await navigator.share({title:'Estandar Max&Min', text:'Evidencia Max&Min BOH', files:[lastPdfFile]}); }
  catch(e) { console.warn('Compartir cancelado o no disponible', e); }
}

function checkedItems(){
  return [...document.querySelectorAll('#checklist input:checked')].map(i => CHECKS[Number(i.dataset.check)]);
}
function ascii(s){
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x20-\x7E]/g,'').trim();
}
function pdfText(s,x,y,size=12,opts={}){
  const weight = opts.bold ? '/F2' : '/F1';
  const color = opts.color || '0 0 0';
  return `BT ${color} rg ${weight} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(ascii(s))}) Tj ET\n`;
}
function escapePdf(s){return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function wrapLines(text, max=78){
  const words = ascii(text).split(/\s+/).filter(Boolean), lines=[]; let line='';
  words.forEach(w => { if ((line+' '+w).trim().length > max) { if(line) lines.push(line); line=w; } else line=(line+' '+w).trim(); });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
function imageDrawOps(name, img, x, y, w, h){
  const ratio = img.width / img.height;
  let dw = w, dh = w / ratio;
  if (dh > h) { dh = h; dw = h * ratio; }
  const dx = x + (w-dw)/2;
  const dy = y + (h-dh)/2;
  return `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /${name} Do Q\n`;
}
function jpegBinary(dataUrl){
  return atob(dataUrl.split(',')[1]);
}
function buildPdfBlob(){
  const pageW=595.28, pageH=841.89, margin=42;
  const {cc,name} = selectedStore();
  const station = $('#stationInput').value || 'Estacion';
  const date = $('#dateInput').value || todayISO();
  const checks = checkedItems();
  const pdfImages = [];
  const pages = [];
  let imgCounter = 1;
  const addImg = img => {
    const name = `Im${imgCounter++}`;
    pdfImages.push({name, data:jpegBinary(img.dataUrl), width:img.width, height:img.height});
    return name;
  };

  let cover = '';
  cover += '0.94 0.98 0.96 rg 0 0 595.28 841.89 re f\n';
  cover += '0.00 0.38 0.25 rg 0 735 595.28 106.89 re f\n';
  cover += pdfText('ESTANDAR MAX&MIN', margin, 785, 28, {bold:true,color:'1 1 1'});
  cover += pdfText('Back of House | Orden | Limpieza | Maximos y Minimos', margin, 758, 13, {color:'0.85 1 0.93'});
  cover += pdfText(`Tienda: ${cc} - ${name}`, margin, 690, 16, {bold:true,color:'0 0.25 0.16'});
  cover += pdfText(`Estacion general: ${station}`, margin, 664, 14);
  cover += pdfText(`Fecha: ${prettyDate(date)}`, margin, 640, 14);
  cover += pdfText(`Evidencias documentadas: ${evidences.length}`, margin, 616, 14);
  cover += pdfText('Resumen ejecutivo', margin, 560, 18, {bold:true,color:'0 0.38 0.25'});
  wrapLines('Este documento integra evidencia antes y despues para validar orden, limpieza, claridad operativa, identificacion de producto y control visible de maximos y minimos en Back of House.', 86).forEach((l,i)=> cover += pdfText(l, margin, 532 - i*18, 12));
  cover += pdfText('Checklist operativo validado', margin, 456, 16, {bold:true,color:'0 0.38 0.25'});
  checks.forEach((c,i)=> cover += pdfText(`- ${c}`, margin + (i%2)*250, 426 - Math.floor(i/2)*20, 12));
  cover += pdfText('Subir PDF a: Seguimiento_Max&Min_CN', margin, 108, 12, {bold:true,color:'0 0.38 0.25'});
  pages.push({content:cover, xobjects:[]});

  evidences.forEach((ev, idx) => {
    const beforeName = addImg(ev.before);
    const afterName = addImg(ev.after);
    let c = '';
    c += '1 1 1 rg 0 0 595.28 841.89 re f\n';
    c += '0.00 0.38 0.25 rg 0 786 595.28 55.89 re f\n';
    c += pdfText(`Max&Min - ${name}`, margin, 812, 16, {bold:true,color:'1 1 1'});
    c += pdfText(`${cc} | ${stationName(ev)} | ${prettyDate(date)}`, margin, 793, 10, {color:'0.85 1 0.93'});
    c += pdfText(`Evidencia ${idx+1}: ${stationName(ev)}`, margin, 754, 18, {bold:true,color:'0 0.38 0.25'});
    c += '0.94 0.98 0.96 rg 42 410 246 300 re f\n0.94 0.98 0.96 rg 307 410 246 300 re f\n';
    c += pdfText('ANTES', 134, 720, 16, {bold:true,color:'0.75 0.12 0.12'});
    c += pdfText('DESPUES', 389, 720, 16, {bold:true,color:'0 0.38 0.25'});
    c += imageDrawOps(beforeName, ev.before, 52, 426, 226, 272);
    c += imageDrawOps(afterName, ev.after, 317, 426, 226, 272);
    c += pdfText('Observaciones', margin, 368, 14, {bold:true,color:'0 0.38 0.25'});
    const note = ev.note || 'Evidencia de orden, limpieza, identificacion y control de maximos y minimos documentada en tienda.';
    wrapLines(note, 90).slice(0,5).forEach((l,i)=> c += pdfText(l, margin, 344 - i*17, 11));
    c += pdfText('Checklist', margin, 244, 14, {bold:true,color:'0 0.38 0.25'});
    checks.forEach((ch,i)=> c += pdfText(`[x] ${ch}`, margin + (i%2)*250, 218 - Math.floor(i/2)*18, 10));
    c += pdfText('Generado desde PWA Estandar Max&Min', margin, 56, 9, {color:'0.35 0.45 0.41'});
    pages.push({content:c, xobjects:[beforeName, afterName]});
  });

  const objects = [];
  function addObject(str){ objects.push(str); return objects.length; }
  const catalogId = addObject('');
  const pagesId = addObject('');
  const font1Id = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const font2Id = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const imgIds = {};
  pdfImages.forEach(img => {
    imgIds[img.name] = addObject(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n${img.data}\nendstream`);
  });
  const pageIds=[];
  pages.forEach(pg => {
    const contentId = addObject(`<< /Length ${pg.content.length} >>\nstream\n${pg.content}endstream`);
    const xobj = pg.xobjects?.length ? `/XObject << ${pg.xobjects.map(n=>`/${n} ${imgIds[n]} 0 R`).join(' ')} >>` : '';
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> ${xobj} >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });
  objects[catalogId-1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId-1] = `<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((obj,i)=>{
    offsets.push(pdf.length);
    pdf += `${i+1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for (let i=1;i<offsets.length;i++) pdf += String(offsets[i]).padStart(10,'0') + ' 00000 n \n';
  pdf += `trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(pdf.length);
  for(let i=0;i<pdf.length;i++) bytes[i] = pdf.charCodeAt(i) & 255;
  return new Blob([bytes], {type:'application/pdf'});
}

function registerPwa(){
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    $('#installBtn').classList.remove('hidden');
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(()=>null);
    deferredInstallPrompt = null;
    $('#installBtn').classList.add('hidden');
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
}

document.addEventListener('DOMContentLoaded', init);
