/* Device-local photo interactions for this prototype; no network uploads. */
let demoPhotos=[],photoLoading=true,photoStorageError=null;
let draftPhotoUrls=[];
const photoUrls=new Map();
const photoDB=new Promise((resolve,reject)=>{
  const request=indexedDB.open('agewell-photo-demo',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('当前浏览器未允许保存演示照片。'));
  request.onblocked=()=>reject(new Error('请关闭其他演示页面后重试。'));
});
const photosReady=photoDB.then(db=>new Promise((resolve,reject)=>{
  const tx=db.transaction('photos','readonly');
  const request=tx.objectStore('photos').getAll();
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('未能读取本地演示照片。'));
})).then(items=>{demoPhotos=items;photoLoading=false;if(typeof render==='function')render()}).catch(error=>{photoStorageError=error;photoLoading=false;if(typeof render==='function')render()});
function photoUrl(p){if(!photoUrls.has(p.id))photoUrls.set(p.id,URL.createObjectURL(p.file));return photoUrls.get(p.id)}
function clientPhotos(id,owner=true){return demoPhotos.filter(p=>p.client===id&&(owner||p.visible)).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt)}
function photoThumb(p,label=''){
  return `<button class="photo-thumb" data-action="view-photo" data-id="${p.id}" aria-label="查看${esc(p.kind)}，${esc(p.date)}"><img src="${photoUrl(p)}" alt="${esc(p.kind)} · ${esc(p.date)}" loading="lazy"><span class="photo-caption"><b>${esc(label||p.kind)}</b><small>${esc(p.date)}</small></span></button>`;
}
function emptyPhotoSlot(id,kind,owner){return owner?`<button class="photo-placeholder upload-slot" data-action="upload-photos" data-id="${id}" data-kind="${kind}">${icon('camera')}<span>上传${kind}</span><small>点击选择图片</small></button>`:`<div class="photo-placeholder">${icon('camera')}<span>${kind}</span><small>老师尚未展示照片</small></div>`}
function photoPanel(id,owner=true){
  const pictures=clientPhotos(id,owner);
  const baseline=pictures.find(p=>p.kind==='初始照');
  const later=pictures.filter(p=>p.kind!=='初始照').at(-1);
  const selected=new Set([baseline?.id,later?.id]);
  const extra=pictures.filter(p=>!selected.has(p.id));
  return `<section class="photo-section"><div class="photo-section-head"><h3>${owner?'照片档案':'我的照片记录'} <span class="small muted">${pictures.length} 张</span></h3>${owner?`<button class="btn mini" data-action="upload-photos" data-id="${id}">${icon('plus')}上传照片</button>`:''}</div>${photoLoading?'<p class="small muted">正在读取本地演示照片…</p>':''}<div class="photo-grid">${baseline?photoThumb(baseline,'初始记录'):emptyPhotoSlot(id,'初始照',owner)}${later?photoThumb(later,'最近记录'):emptyPhotoSlot(id,'阶段照',owner)}</div>${extra.length?`<div class="photo-gallery">${extra.map(p=>photoThumb(p)).join('')}</div>`:''}<p class="photo-tip">${owner?'记录同一角度、光线与表情，方便后续回顾。原型照片仅保存在当前浏览器。':'仅展示老师选择给本人查看的照片，点击图片可放大。'}</p></section>`;
}
function photoFields(required=false){return `<div class="field full photo-upload-field"><span>${required?'选择照片':'本次服务照片（选填）'}</span><label class="upload-zone">${icon('camera')}<strong>点击选择图片</strong><small>JPG / PNG / WebP · 每张不超过 10 MB · 最多 6 张</small><input aria-label="选择照片文件" class="photo-file-input" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple ${required?'required':''}></label><div class="selected-photos" aria-live="polite"></div><label class="photo-permission"><input type="checkbox" name="photoVisible">在顾客端展示这些照片</label><small class="muted">默认仅在店主端展示；此设置用于原型中的本人查看范围。</small></div>`}
function clearPhotoDraft(){draftPhotoUrls.forEach(url=>URL.revokeObjectURL(url));draftPhotoUrls=[]}
async function validatePhotoFiles(files){
  if(files.length>6)throw new Error('一次最多选择 6 张照片，请分次添加。');
  for(const file of files){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片；HEIC 请先转为 JPG。');
    if(file.size>10*1024*1024)throw new Error('每张照片不能超过 10 MB，请选择较小的图片。');
    if(!file.size)throw new Error('图片文件为空，请重新选择。');
    const url=URL.createObjectURL(file);
    try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth)throw new Error('图片无法读取。')}
    catch{throw new Error('有图片无法读取，请重新选择有效的图片文件。')}
    finally{URL.revokeObjectURL(url)}
  }
}
async function saveSelectedPhotos(form,details){
  const files=Array.from(form.querySelector('input[name="photos"]')?.files||[]);
  if(!files.length)return [];
  await validatePhotoFiles(files);await photosReady;
  if(photoStorageError)throw photoStorageError;
  const db=await photoDB;
  const rows=files.map((file,index)=>({id:uid('p'),...details,file,name:file.name,visible:!!form.querySelector('input[name="photoVisible"]')?.checked,createdAt:Date.now()+index}));
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('photos','readwrite');
    rows.forEach(row=>tx.objectStore('photos').put(row));
    tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('照片保存失败，可能是浏览器存储空间不足。'));tx.onabort=()=>reject(new Error('照片保存失败，请重试。'));
  });
  demoPhotos.push(...rows);return rows;
}
function uploadPhotos(id,kind='阶段照'){
  const c=client(id);if(!c)return;
  openModal('上传客户照片',`<form data-form="photos"><input type="hidden" name="client" value="${id}"><div class="detail-summary"><h3>${esc(c.name)} · 照片档案</h3><p>为本次照片标记日期与类型，后续可按时间回顾。</p></div><div class="form-grid" style="margin-top:20px"><label class="field">照片类型<select name="kind">${['初始照','服务照','阶段照'].map(t=>`<option ${t===kind?'selected':''}>${t}</option>`).join('')}</select></label><label class="field">拍摄日期<input name="date" type="date" value="2026-10-13" required></label>${photoFields(true)}<label class="field full">照片说明（选填）<input name="note" maxlength="200" placeholder="例如：正面，自然光，同一拍摄位置"></label></div><p class="form-hint">当前为本地原型，请使用测试图片。图片不会上传到服务器，也不会跨设备同步。</p>${actions('保存照片')}</form>`);
}
function viewPhoto(id){
  const p=demoPhotos.find(item=>item.id===id);if(!p)return;
  if(mode==='customer'&&(p.client!==CLIENT_ID||!p.visible))return;
  openModal(`${esc(p.kind)} · ${esc(p.date)}`,`<div class="photo-viewer"><img src="${photoUrl(p)}" alt="${esc(p.kind)} · ${esc(p.date)}"></div><p class="form-hint">${esc(p.note||'未填写拍摄说明')}<br>本地原型图片 · ${p.visible?'顾客本人可查看':'仅在店主端展示'}</p><div class="form-actions"><button class="btn" data-close>关闭图片</button></div>`);
}
document.addEventListener('change',async event=>{
  const input=event.target;if(!input.matches('input[name="photos"]'))return;
  const preview=input.closest('.photo-upload-field').querySelector('.selected-photos');
  clearPhotoDraft();preview.innerHTML='';
  try{const files=Array.from(input.files);await validatePhotoFiles(files);if(!input.isConnected)return;
    preview.innerHTML=files.map(file=>{const url=URL.createObjectURL(file);draftPhotoUrls.push(url);return `<div class="selected-photo"><img src="${url}" alt="待保存图片：${esc(file.name)}"><span>${esc(file.name)}</span></div>`}).join('');
  }catch(error){input.value='';toast(error.message)}
});
document.getElementById('modal').addEventListener('close',clearPhotoDraft);
