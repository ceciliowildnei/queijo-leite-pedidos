(() => {
  const STORE = 'wr_client_photos_v1';
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch(e) { return {}; } };
  const save = data => { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch(e) { console.warn(e); } };
  const pageOk = () => norm(document.querySelector('main h1') && document.querySelector('main h1').textContent).includes('clientes');
  const keyOf = row => {
    const tds = row.querySelectorAll('td');
    const name = norm(tds[0] && tds[0].innerText);
    const tel = String((tds[1] && tds[1].innerText) || '').replace(/\D/g, '');
    return tel ? name + '-' + tel : name;
  };
  const initials = name => String(name || '?').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || '?';
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
  function paint(btn, key, name){
    btn.textContent = '';
    const photo = load()[key];
    if(photo){
      const img = document.createElement('img');
      img.src = photo;
      img.alt = name;
      btn.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = initials(name);
      btn.appendChild(span);
    }
  }
  function apply(){
    if(!pageOk()) return;
    document.querySelectorAll('.table tbody tr').forEach(row => {
      if(row.dataset.clientPhotoReady === '1' || row.querySelector('.empty')) return;
      const tds = row.querySelectorAll('td');
      if(tds.length < 2) return;
      row.dataset.clientPhotoReady = '1';
      const key = keyOf(row);
      const name = (tds[0].innerText || '').trim();
      const original = tds[0].innerHTML;
      const wrap = document.createElement('div');
      wrap.className = 'client-photo-wrap';
      const avatar = document.createElement('button');
      avatar.type = 'button';
      avatar.className = 'client-photo-avatar';
      const label = document.createElement('div');
      label.className = 'client-photo-name';
      label.innerHTML = original;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      avatar.addEventListener('click', () => input.click());
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if(!file) return;
        const data = load();
        data[key] = await shrink(file);
        save(data);
        paint(avatar, key, name);
      });
      paint(avatar, key, name);
      wrap.appendChild(avatar);
      wrap.appendChild(label);
      wrap.appendChild(input);
      tds[0].textContent = '';
      tds[0].appendChild(wrap);
      const actions = tds[tds.length - 1];
      if(actions){
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
  setInterval(apply, 1200);
})();
