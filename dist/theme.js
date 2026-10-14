const THEME_KEY='agewell.appearance.v1';
let currentTheme='day';
try{if(localStorage.getItem(THEME_KEY)==='night')currentTheme='night'}catch{}
function themeSymbol(theme){return theme==='day'?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.7 8.7 0 0 1 9.5 4 8.7 8.7 0 1 0 20 14.5z"/></svg>'}
function applyTheme(theme){
  currentTheme=theme;
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]').content=theme==='day'?'#f6f2eb':'#302b25';
  document.querySelectorAll('[data-theme-choice]').forEach(button=>{const active=button.dataset.themeChoice===theme;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
  const side=document.querySelector('.mobile-side');
  if(side){side.querySelector('p').innerHTML=theme==='day'?'奶油白与香槟金，清爽明亮。<br>深棕正文保持清晰易读。<br>留白、细线与柔和弧形，<br>传达从容的专业感。':'暖棕与柔金，沉静但不昏暗。<br>暖白正文提高阅读对比。<br>留白、细线与柔和弧形，<br>传达从容的专业感。';side.querySelectorAll('.swatch').forEach((swatch,i)=>{swatch.style.background=(theme==='day'?['#f6f2eb','#efe0c9','#b38d55','#3c3024']:['#302b25','#544734','#e0c493','#faf6ef'])[i]});side.querySelector('p:last-child').textContent=theme==='day'?'奶油白 / 浅香槟 / 暖金 / 深棕':'暖棕 / 浅棕金 / 香槟金 / 暖白'}
}
function renderThemeControls(){
  const actions=document.querySelector('.top-actions');
  if(actions&&!actions.querySelector('.theme-switch')){const controls=document.createElement('div');controls.className='theme-switch';controls.setAttribute('aria-label','日间与夜间配色');controls.innerHTML=['day','night'].map(theme=>`<button type="button" data-theme-choice="${theme}" aria-label="${theme==='day'?'日间模式':'夜间模式'}">${themeSymbol(theme)}<span>${theme==='day'?'日间':'夜间'}</span></button>`).join('');actions.insertBefore(controls,actions.querySelector('.demo-label'))}
  applyTheme(currentTheme);
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(!button)return;const theme=button.dataset.themeChoice;if(!['day','night'].includes(theme))return;applyTheme(theme);try{localStorage.setItem(THEME_KEY,theme)}catch{}});
applyTheme(currentTheme);
