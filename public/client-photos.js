(() => {
  const STORE = 'wr_client_photos_v1';
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const digits = v => String(v || '').replace(/\D/g, '');
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch(e) { return {}; } };
  const save = data => { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch(e) { console.warn(e); alert('A foto ficou muito grande para salvar neste aparelho. Tente uma imagem menor.'); } };
  const pageOk = () => norm(document.querySelector('main h1') && document.querySelector('main h1').textContent).includes('clientes');
  const initials = name => String(name || 'Sem nome').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || '?';

  function rowInfo(row){
    const tds = row.querySelectorAll('td');
    const rawName = (tds[0]?.dataset.rawClientName || tds[0]?.innerText || '').replace(/Foto/g, '').trim();
    const name = rawName || 'Sem nome';
    const tel = digits(tds[1]?.innerText || '');
    const bairro = norm(tds[2]?.innerText || '');
    const local = norm(tds[3]?.innerText || '');
    const keys = [];
    if(tel) keys.push('tel:' + tel);
    if(rawName && tel) keys.push('nome-tel:' + norm(rawName) + '-' + tel);
    if(rawName) keys.push('nome:' + norm(rawName));
    if(rawName && bairro) keys.push('nome-bairro:' + norm(rawName) + '-' + bairro);
    if(!rawName && (tel || bairro || local)) keys.push('semnome:' + (tel || bairro || local));
    if(!keys.length) keys.push('linha:' + Array.from(tds).slice(0,4).map(td => norm(td.innerText)).join('|'));
    return {tds, name, rawName, tel, keys};
  }

  function legacyKeys(info){
    const keys = [];
    const n = norm(info.rawName || info.name);
    if(info.tel && n) keys.push(n + '-' + info.tel);
    if(n) keys.push(n);
    return keys;
  }

  function findPhoto(info){
    const data = load();
    const all = info.keys.concat(legacyKeys(info));
    for(const k of all){ if(data[k]) return data[k]; }
    return '';
  }

  function setPhoto(info, photo){
    const data = load();
    info.keys.concat(legacyKeys(info)).forEach(k => { if(k) data[k] = photo; });
    save(data);
  }

  function shrink(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();
      reader.onerror = reject;
      img.onerror = reject;
      reader.onload = () => { img.src = reader.result; };
      img.onload = () => {
        const max = 420;
        let w = img.width, h = img.height;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      reader.readAsDataURL(file);
    });
  }

  function paint(btn, info){
    btn.textContent = '';
    const photo = findPhoto(info);
    if(photo){
      const img = document.createElement('img');
      img.src = photo;
      img.alt = info.name;
      btn.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = initials(info.name);
      btn.appendChild(span);
    }
  }

  function apply(){
    if(!pageOk()) return;
    document.querySelectorAll('.table tbody tr').forEach((row, idx) => {
      if(row.querySelector('.empty')) return;
      const tds = row.querySelectorAll('td');
      if(tds.length < 2) return;

      if(row.dataset.clientPhotoReady === '1'){
        const info = row._wrClientPhotoInfo || rowInfo(row);
        const avatar = row.querySelector('.client-photo-avatar');
        if(avatar) paint(avatar, info);
        return;
      }

      const info = rowInfo(row);
      row._wrClientPhotoInfo = info;
      row.dataset.clientPhotoReady = '1';
      tds[0].dataset.rawClientName = info.rawName;

      const original = tds[0].innerHTML || info.name;
      const wrap = document.createElement('div');
      wrap.className = 'client-photo-wrap';

      const avatar = document.createElement('button');
      avatar.type = 'button';
      avatar.className = 'client-photo-avatar';
      avatar.title = 'Adicionar ou trocar foto';

      const label = document.createElement('div');
      label.className = 'client-photo-name';
      label.innerHTML = info.rawName ? original : '<strong>Sem nome</strong>';

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';

      avatar.addEventListener('click', () => input.click());
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if(!file) return;
        const photo = await shrink(file);
        setPhoto(info, photo);
        paint(avatar, info);
      });

      paint(avatar, info);
      wrap.appendChild(avatar);
      wrap.appendChild(label);
      wrap.appendChild(input);
      tds[0].textContent = '';
      tds[0].appendChild(wrap);

      const actions = tds[tds.length - 1];
      if(actions && !actions.querySelector('.client-photo-btn')){
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Foto';
        b.className = 'client-photo-btn';
        b.addEventListener('click', () => input.click());
        actions.prepend(b);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('click', () => setTimeout(apply, 150), true);
  document.addEventListener('input', () => setTimeout(apply, 150), true);
  setInterval(apply, 1000);
})();
