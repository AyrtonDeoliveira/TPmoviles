document.documentElement.classList.add('js-ready');
const panels = [...document.querySelectorAll('[data-panel]')];
const links = [...document.querySelectorAll('[data-document]')];
const mobile = matchMedia('(max-width: 900px)');
function sizeIndex(){document.querySelectorAll('aside details').forEach(d=>d.open=!mobile.matches);}
sizeIndex();
mobile.addEventListener('change',sizeIndex);
function selectDocument(){
  const hash=decodeURIComponent(location.hash.slice(1));
  const id=hash.startsWith('privacidad')?'privacidad':'terminos';
  panels.forEach(p=>p.hidden=p.dataset.panel!==id);
  links.forEach(a=>{const chosen=a.dataset.document===id;a.classList.toggle('selected',chosen);if(chosen)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title=(id==='privacidad'?'Política de privacidad':'Términos y condiciones')+' · Emprendex';
  document.querySelectorAll('aside li a').forEach(a=>a.classList.toggle('active',a.hash===location.hash));
  if(hash){const el=document.getElementById(hash);if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:'instant',block:'start'}));}
}
window.addEventListener('hashchange',selectDocument);
selectDocument();
