'use strict';

const STORES = [
  ['38115','Zona Azul'],['38117','Satelite'],['38119','Lomas Verdes'],['38136','Punta Norte'],['38142','Zona Esmeralda'],['38149','Bellavista'],['38176','Periferico Satelite DT'],['38186','Arboledas'],['38197','Echegaray'],['38205','Lindavista'],['38207','Lindavista II'],['38230','ITEMS Edo de Mexico'],['38266','San Mateo'],['38270','Lomas Verdes II'],['38333','Izcalli Mega'],['38339','San Marcos'],['38363','Galerias Atizapan'],['38368','Luna Park'],['38371','Montevideo DT'],['38374','Valle Dorado'],['38394','Centro Comercial Lomas Verdes'],['38401','Coacalco'],['38411','Torres Lindavista'],['38427','Plaza Satelite'],['38431','Eduardo Molina'],['38442','Sor Juana'],['38456','Plaza las Flores'],['38458','El Rosario'],['38460','Santa Monica'],['38475','Satelite Centro Civico'],['38507','Espacio Vista del Valle'],['38515','Patio Ecatepec'],['38527','Camarones'],['38529','Bosques de Aragon'],['38535','City Center Esmeralda'],['38546','Patio Claveria'],['38561','Parque Toreo'],['38590','Parque Toreo II'],['38604','Cosmopol'],['38606','TlalnepantlaCarso'],['38651','Via Vallejo'],['38656','Viveros de la Loma'],['38661','Jinetes'],['38674','Mundo E'],['38677','Patio la Raza'],['38694','Villas de la Hacienda'],['38695','Cetram 4 Caminos'],['38719','Plaza Fortuna'],['38770','Gustavo Baz 29'],['38792','Pasaje Tlanepantla'],['38811','Plaza Tepeyac'],['38837','Centenario Azcapotzalco'],['38845','Mundo E II'],['38859','Plaza Satelite II N1'],['38862','San Miguel Izcalli'],['38894','Galerias Perinorte'],['38903','Encuentro Oceania'],['38924','Plaza Aeropuerto'],['38925','Star Medica Lomas Verdes'],['38930','Blvd. Aeropuerto dt'],['38937','Parque Tepeyac Piso 1'],['38965','Parque Tepeyac Piso 2'],['38992','Tapo Puerta Oriente'],['38995','Encuentro Oceania II'],['43043','Atizapan'],['43111','Montevideo Insurgentes'],['43130','Town Center Nicolas Romero'],['43132','Plaza Vista Norte'],['43152','Samara Satelite'],['43193','Cosmopol N1'],['43194','Atana Lindavista'],['43195','Parque Jadin kiosko']
];
const STATIONS = ['Escritorio','Rack Leches','Rack Jarabes','Rack Vaso/Tapas','Rack Polvos','Rack BOH','Refrigerador','Congelador','Estacion CBS','Estacion Espresso','Otra estacion'];
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
function prettyDate(iso = todayISO()){
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
}
function cleanFilePart(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,48) || 'Evidencia';
}
function selectedStore(){
  const [cc, ...nameParts] = ($('#storeSelect').value || '').split('|');
  return {cc:cc || '', name:nameParts.join('|') || ''};
}
function currentStation(){ return ($('#stationInput').value || 'Estacion').trim() || 'Estacion'; }
function setStatus(html){ $('#downloadBox').classList.remove('hidden'); $('#downloadBox').innerHTML = html; }

function init(){
  $('#storeSelect').innerHTML = STORES.map(([cc,name]) => `<option value="${cc}|${name}">${cc} - ${name}</option>`).join('');
  $('#stationOptions').innerHTML = STATIONS.map(s => `<option value="${s}"></option>`).join('');
  const dateText = prettyDate();
  $('#todayBadge').textContent = dateText;
  $('#captureDate').textContent = dateText;
  $('#addEvidenceBtn').addEventListener('click', () => addEvidence());
  $('#pdfBtn').addEventListener('click', generatePdf);
  $('#shareBtn').addEventListener('click', sharePdf);
  setupReferenceModal();
  addEvidence();
  setupPwa();
}

function setupReferenceModal(){
  const modal = $('#referenceModal');
  const open = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); };
  const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); };
  $('#openReference').addEventListener('click', open);
  $('#openReferenceTop').addEventListener('click', open);
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
}

function addEvidence(){
  const ev = {id:evidenceSeq++, station:currentStation(), before:null, after:null, observation:''};
  evidences.push(ev);
  renderEvidences();
}
function deleteEvidence(id){
  if (evidences.length <= 1) return;
  evidences = evidences.filter(ev => ev.id !== id);
  renderEvidences();
}
function renderEvidences(){
  $('#evidenceList').innerHTML = evidences.map((ev, i) => `
    <article class="evidence-card" data-id="${ev.id}">
      <div class="evidence-title">
        <strong>Estacion ${i+1}: ${escapeHtml(ev.station || currentStation())}</strong>
        <button class="delete-btn" type="button" data-delete="${ev.id}">Eliminar</button>
      </div>
      <div class="capture-grid">
        ${photoBox(ev, 'before', 'ANTES')}
        ${photoBox(ev, 'after', 'DESPUES')}
      </div>
      <div class="obs-wrap">
        <label>Observacion breve opcional
          <textarea data-observation="${ev.id}" rows="2" placeholder="Ej. Rack identificado y maximos visibles.">${escapeHtml(ev.observation || '')}</textarea>
        </label>
      </div>
    </article>`).join('');
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteEvidence(Number(btn.dataset.delete))));
  document.querySelectorAll('[data-observation]').forEach(area => area.addEventListener('input', e => {
    const ev = evidences.find(x => x.id === Number(e.target.dataset.observation));
    if (ev) ev.observation = e.target.value;
  }));
  document.querySelectorAll('input[type="file"][data-kind]').forEach(input => input.addEventListener('change', onFile));
  document.querySelectorAll('[data-clear]').forEach(btn => btn.addEventListener('click', () => {
    const ev = evidences.find(x => x.id === Number(btn.dataset.ev));
    if (ev) ev[btn.dataset.clear] = null;
    renderEvidences();
  }));
}
function photoBox(ev, kind, label){
  const has = !!ev[kind];
  return `<div class="photo-box">
    <h3>${label}</h3>
    <div class="preview">${has ? `<img src="${ev[kind].dataUrl}" alt="Foto ${label}">` : `<span>Sin foto ${label}<br><small>Usa camara o galeria</small></span>`}</div>
    <div class="photo-actions">
      <label class="file-btn">Camara<input type="file" accept="image/*" capture="environment" data-ev="${ev.id}" data-kind="${kind}"></label>
      <label class="file-btn">Galeria<input type="file" accept="image/*" data-ev="${ev.id}" data-kind="${kind}"></label>
      <button class="small-btn danger" type="button" data-ev="${ev.id}" data-clear="${kind}">Eliminar</button>
    </div>
  </div>`;
}
async function onFile(e){
  const file = e.target.files?.[0];
  if (!file) return;
  const ev = evidences.find(x => x.id === Number(e.target.dataset.ev));
  if (!ev) return;
  ev[e.target.dataset.kind] = await readImageFile(file);
  renderEvidences();
}
function readImageFile(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({dataUrl:reader.result, width:img.naturalWidth, height:img.naturalHeight});
      img.onerror = () => reject(new Error('Archivo de imagen no valido.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

async function generatePdf(){
  const store = selectedStore();
  const date = todayISO();
  evidences.forEach(ev => { if (!ev.station) ev.station = currentStation(); });
  const invalid = evidences.find(ev => !ev.before || !ev.after);
  if (!store.cc || !store.name) { setStatus('<span class="error">Selecciona una tienda.</span>'); return; }
  if (!currentStation()) { setStatus('<span class="error">Selecciona o escribe una estacion.</span>'); return; }
  if (invalid) { setStatus('<span class="error">Cada evidencia debe tener foto ANTES y foto DESPUES.</span>'); return; }
  setStatus('<span class="ok">Generando PDF...</span>');
  try {
    const pdfBlob = await buildPdf({store, date, evidences});
    if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
    const fileName = `Estandar_MaxMin_${cleanFilePart(store.cc)}_${cleanFilePart(store.name)}_${cleanFilePart(currentStation())}_${date}.pdf`;
    lastPdfFile = new File([pdfBlob], fileName, {type:'application/pdf'});
    lastPdfUrl = URL.createObjectURL(lastPdfFile);
    $('#shareBtn').disabled = !navigator.canShare || !navigator.canShare({files:[lastPdfFile]});
    setStatus(`<strong>PDF listo:</strong><span>${fileName}</span><a href="${lastPdfUrl}" download="${fileName}">Descargar PDF</a>`);
  } catch (err) {
    console.error(err);
    setStatus('<span class="error">No se pudo generar el PDF. Revisa las imagenes e intenta de nuevo.</span>');
  }
}
async function sharePdf(){
  if (!lastPdfFile || !navigator.canShare || !navigator.canShare({files:[lastPdfFile]})) return;
  await navigator.share({files:[lastPdfFile], title:'Estandar Max&Min', text:'Evidencia Max&Min'}).catch(() => null);
}

async function imageToJpeg(info){
  const img = await loadImage(info.dataUrl);
  const maxW = 1800;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
  ctx.drawImage(img,0,0,w,h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  return {bytes:dataUrlToBytes(dataUrl), width:w, height:h};
}
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function dataUrlToBytes(dataUrl){
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function pdfEscape(text){
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').replace(/[\\()]/g, '\\$&');
}
function pdfText(text, x, y, size, opts = {}){
  const font = opts.bold ? 'F2' : 'F1';
  const color = opts.color || '0.04 0.18 0.14';
  return `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${pdfEscape(text)}) Tj ET\n`;
}
function fitRect(img, x, y, w, h){
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  return {x:x + (w-dw)/2, y:y + (h-dh)/2, w:dw, h:dh};
}
function drawImage(name, img, x, y, w, h){
  const r = fitRect(img, x, y, w, h);
  return `q ${r.w.toFixed(2)} 0 0 ${r.h.toFixed(2)} ${r.x.toFixed(2)} ${r.y.toFixed(2)} cm /${name} Do Q\n`;
}
async function buildPdf({store, date, evidences}){
  const images = [];
  for (const ev of evidences) {
    images.push(await imageToJpeg(ev.before));
    images.push(await imageToJpeg(ev.after));
  }
  const objects = [];
  const addObj = data => { objects.push(data); return objects.length; };
  const catalogId = addObj('');
  const pagesId = addObj('');
  const font1Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n');
  const font2Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n');
  const pageIds = [];
  let imageCursor = 0;
  const W = 595.28, H = 841.89;
  for (let i=0;i<evidences.length;i++) {
    const before = images[imageCursor++];
    const after = images[imageCursor++];
    const beforeId = addObj({stream:before.bytes, dict:`<< /Type /XObject /Subtype /Image /Width ${before.width} /Height ${before.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${before.bytes.length} >>`});
    const afterId = addObj({stream:after.bytes, dict:`<< /Type /XObject /Subtype /Image /Width ${after.width} /Height ${after.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${after.bytes.length} >>`});
    const ev = evidences[i];
    const subtitle = `${store.cc} ${store.name} - ${ev.station || currentStation()}`;
    let content = '';
    content += '1 1 1 rg 0 0 595.28 841.89 re f\n';
    content += '0.00 0.38 0.25 rg 0 784 595.28 57.89 re f\n';
    content += pdfText('Estandar Max&Min', 40, 812, 20, {bold:true,color:'1 1 1'});
    content += pdfText(subtitle, 40, 789, 11, {color:'0.85 1 0.93'});
    content += pdfText(`Fecha: ${prettyDate(date)}`, 418, 789, 11, {color:'0.85 1 0.93'});
    content += pdfText('ANTES', 40, 742, 18, {bold:true,color:'0.76 0.10 0.10'});
    content += '0.96 0.98 0.97 rg 38 420 519 300 re f\n0.86 0.91 0.88 RG 38 420 519 300 re S\n';
    content += drawImage('ImBefore', before, 50, 432, 495, 274);
    content += pdfText('DESPUES', 40, 379, 18, {bold:true,color:'0 0.38 0.25'});
    content += '0.96 0.98 0.97 rg 38 56 519 300 re f\n0.86 0.91 0.88 RG 38 56 519 300 re S\n';
    content += drawImage('ImAfter', after, 50, 68, 495, 274);
    if (ev.observation) content += pdfText(`Obs: ${ev.observation}`, 40, 32, 9, {color:'0.35 0.45 0.40'});
    const contentBytes = new TextEncoder().encode(content);
    const contentId = addObj({stream:contentBytes, dict:`<< /Length ${contentBytes.length} >>`});
    const pageId = addObj(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> /XObject << /ImBefore ${beforeId} 0 R /ImAfter ${afterId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
    pageIds.push(pageId);
  }
  objects[catalogId-1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`;
  objects[pagesId-1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\n`;
  return new Blob([assemblePdf(objects)], {type:'application/pdf'});
}
function asBytes(data){
  if (data instanceof Uint8Array) return data;
  return new TextEncoder().encode(String(data));
}
function assemblePdf(objects){
  const chunks = [];
  const offsets = [0];
  let pos = 0;
  const push = part => { const b = asBytes(part); chunks.push(b); pos += b.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objects.forEach((obj, i) => {
    offsets.push(pos);
    push(`${i+1} 0 obj\n`);
    if (obj && typeof obj === 'object' && obj.stream) {
      push(obj.dict + '\nstream\n');
      push(obj.stream);
      push('\nendstream\n');
    } else push(obj);
    push('endobj\n');
  });
  const xref = pos;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let i=1;i<offsets.length;i++) push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const total = chunks.reduce((n,c)=>n+c.length,0);
  const out = new Uint8Array(total);
  let at = 0;
  chunks.forEach(c => { out.set(c, at); at += c.length; });
  return out;
}

function setupPwa(){
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredInstallPrompt = e;
    $('#installBtn').classList.remove('hidden');
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    $('#installBtn').classList.add('hidden');
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.warn);
}

document.addEventListener('DOMContentLoaded', init);
