(function(){
  function ready(fn){
    if (document.readyState !== 'loading'){ fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }
  ready(function(){

    // THEME
    const themeSelect = document.getElementById('themeSelect');
    const root = document.documentElement;
    function applyTheme(value){
      if(value === 'auto'){
        root.removeAttribute('data-theme');
        localStorage.setItem('pg_theme','auto');
      }else{
        root.setAttribute('data-theme', value);
        localStorage.setItem('pg_theme', value);
      }
    }
    themeSelect.addEventListener('change', ()=> applyTheme(themeSelect.value));
    (function initTheme(){
      const saved = localStorage.getItem('pg_theme') || 'auto';
      themeSelect.value = saved;
      applyTheme(saved);
    })();

    // CHIPS
    const groups = {};
    document.querySelectorAll('.chips').forEach(group=>{
      const groupName = group.dataset.group;
      const type = group.dataset.type;
      groups[groupName] = {el:group,type,values:[]};
      group.addEventListener('click', e=>{
        const chip = e.target.closest('.chip');
        if(!chip) return;
        const value = chip.dataset.value;
        if(type==='single'){
          group.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
          chip.classList.add('active');
        }else{
          if(value===""){
            group.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
            chip.classList.add('active');
          }else{
            const none = group.querySelector('.chip[data-value=""]');
            if(none) none.classList.remove('active');
            chip.classList.toggle('active');
            const anyActive = group.querySelector('.chip.active');
            if(!anyActive && none) none.classList.add('active');
          }
        }
      });
    });

    // Parámetros
    const arInput = document.getElementById('ar');
    const arPreset = document.getElementById('arPreset');
    arPreset.addEventListener('change',()=>{
      arInput.value = arPreset.value == "" ? "" : arPreset.value;
    });

    function getSingle(g){
      const active = groups[g].el.querySelector('.chip.active');
      const v = active ? active.dataset.value : "";
      return v || "";
    }
    function getMulti(g){
      const vs = [...groups[g].el.querySelectorAll('.chip.active')]
        .map(c=>c.dataset.value).filter(v=>v!=="");
      return vs;
    }

    function collectSelections(){
      return {
        resultado: getSingle('resultado'),
        realismo: getSingle('realismo'),
        texturas: getMulti('texturas'),
        materiales: getMulti('materiales'),
        iluminacion: getSingle('iluminacion'),
        esquema: getSingle('esquema'),
        focal: getSingle('focal'),
        plano: getSingle('plano'),
        angulo: getSingle('angulo'),
        composicion: getSingle('composicion'),
        entorno: getSingle('entorno'),
        dof: getSingle('dof'),
        tecnicas: getMulti('tecnicas'),
        post: getMulti('post'),
        estilo: getSingle('estilo'),
        representacion: getSingle('representacion'),
        ar: (arInput.value||"").trim(),
        version: (document.getElementById('versionModelo').value||"").trim(),
        calidad: (document.getElementById('calidad').value||"").trim()
      };
    }

    function lista(arr){
      if(arr.length===1) return arr[0];
      const last = arr[arr.length-1];
      return arr.slice(0,-1).join(", ") + " y " + last;
    }
    function articulo(){ return "un"; }

    function buildPrompt(sel){
      const base1 = `Toma este dibujo creado por mi hijo y transfórmalo en ${sel.resultado ? "un " + sel.resultado : "una imagen fotorrealista o un render 3D realista"}. No sé qué se supone que es: podría ser una criatura, un objeto o algo completamente salido de su imaginación.
Mantén la forma original, las proporciones, la longitud de las líneas y todas las imperfecciones exactamente como están en el dibujo, incluyendo ojos torcidos, líneas desiguales o marcas extrañas. No corrijas, suavices ni cambies ningún detalle de su diseño.`;

      const frases = [];
      if(sel.realismo){ frases.push(`Trátalo con un nivel ${sel.realismo}.`); }
      if(sel.texturas.length){ frases.push(`Aplícale texturas ${lista(sel.texturas)}.`); }
      if(sel.materiales.length){ frases.push(`Detalles de material: ${lista(sel.materiales)}.`); }
      if(sel.iluminacion){
        frases.push(`Iluminación ${sel.iluminacion}${sel.esquema ? " con esquema " + sel.esquema : ""}.`);
      } else if(sel.esquema){
        frases.push(`Esquema de iluminación ${sel.esquema}.`);
      }
      const camBits = [];
      if(sel.focal){ camBits.push(`lente ${sel.focal}`); }
      if(sel.angulo){ camBits.push(sel.angulo); }
      if(sel.plano){ camBits.push(sel.plano); }
      if(camBits.length){ frases.push(`Cámara / encuadre: ${camBits.join(", ")}.`); }
      if(sel.composicion){ frases.push(`Composición ${sel.composicion}.`); }
      if(sel.entorno){ frases.push(`Ubícalo en ${articulo(sel.entorno)} ${sel.entorno}, coherente con el carácter del dibujo.`); }
      if(sel.dof){ frases.push(`Profundidad de campo ${sel.dof}.`); }
      if(sel.tecnicas.length){ frases.push(`Técnicas de render: ${lista(sel.tecnicas)}.`); }
      if(sel.post.length){ frases.push(`Post-procesado: ${lista(sel.post)}.`); }
      if(sel.representacion){ frases.push(`Debe parecer una ${sel.representacion}.`); }
      if(sel.estilo){ frases.push(`Estilo visual ${sel.estilo}.`); }

      const base2 = `Haz que parezca que esta cosa existe en el mundo real, con materiales y respuesta de luz creíbles. Puedes añadir sombras coherentes, profundidad de campo y un entorno que encaje con la vibra del dibujo, pero sin alterar la forma ni los detalles originales creados. Nada de texturas de lápiz o estilos dibujados a mano: debe parecer una fotografía o un render CGI profesional, fiel a su imaginación.`;

      const flags = [];
      if(sel.ar){ flags.push(`--ar ${sel.ar}`); }
      if(sel.version){ flags.push(`--v ${sel.version}`); }
      if(sel.calidad){ flags.push(`--q ${sel.calidad}`); }

      const calidadExtra = (!sel.tecnicas.length)
        ? `Renderízalo con calidad ultra alta (8K), materiales físicamente correctos (PBR), iluminación global, subsurface scattering cuando proceda, ray tracing en reflejos y volumetric lighting si aporta realismo.`
        : ``;

      const cuerpo = frases.length ? "\n\n" + frases.join(" ") : "";
      const tail = (calidadExtra ? "\n\n" + calidadExtra : "") + (flags.length ? `\n${flags.join(" ")}` : "");
      return base1 + "\n\n" + base2 + cuerpo + tail;
    }

    // UI
    const previewEl = document.getElementById('preview');
    const modal = document.getElementById('modal');
    const backdrop = document.getElementById('backdrop');
    const promptFinal = document.getElementById('promptFinal');

    function openModal(){ backdrop.classList.add('show'); modal.classList.add('show'); }
    function closeModal(){ backdrop.classList.remove('show'); modal.classList.remove('show'); }

    // Historial
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    function loadHistory(){
      const items = JSON.parse(localStorage.getItem('pg_history')||'[]');
      historyList.innerHTML = "";
      if(!items.length){
        const div = document.createElement('div');
        div.className = 'muted';
        div.textContent = 'No hay prompts todavía.';
        historyList.appendChild(div);
        return;
      }
      items.forEach((text, idx)=>{
        const wrap = document.createElement('div');
        wrap.className = 'history-item';
        const pre = document.createElement('pre');
        pre.textContent = text;
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
        const row = document.createElement('div');
        row.className = 'history-actions';
        const btnCopy = document.createElement('button');
        btnCopy.className = 'btn ghost tiny';
        btnCopy.textContent = 'Copiar';
        btnCopy.addEventListener('click', ()=> navigator.clipboard.writeText(text));
        const btnExport = document.createElement('button');
        btnExport.className = 'btn ghost tiny';
        btnExport.textContent = 'Exportar .txt';
        btnExport.addEventListener('click', ()=> exportTxt(text, `prompt-${idx+1}.txt`));
        row.appendChild(btnCopy);
        row.appendChild(btnExport);
        wrap.appendChild(pre);
        wrap.appendChild(row);
        historyList.appendChild(wrap);
      });
    }
    function addToHistory(text){
      const items = JSON.parse(localStorage.getItem('pg_history')||'[]');
      items.unshift(text);
      if(items.length > 100) items.pop();
      localStorage.setItem('pg_history', JSON.stringify(items));
      loadHistory();
    }
    clearHistoryBtn.addEventListener('click', ()=>{
      localStorage.removeItem('pg_history');
      loadHistory();
    });

    // Botones
    document.getElementById('confirmBtn').addEventListener('click', ()=>{
      const sel = collectSelections();
      const prompt = buildPrompt(sel);
      promptFinal.textContent = prompt;
      previewEl.textContent = prompt;
      addToHistory(prompt);
      openModal();
    });

    document.getElementById('borradorBtn').addEventListener('click', ()=>{
      const sel = collectSelections();
      const prompt = buildPrompt(sel);
      previewEl.textContent = prompt;
      window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
    });

    document.getElementById('resetBtn').addEventListener('click', ()=>{
      document.querySelectorAll('.chips').forEach(group=>{
        group.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        const none = group.querySelector('.chip[data-value=""]');
        if(none) none.classList.add('active');
      });
      document.getElementById('versionModelo').value="";
      document.getElementById('calidad').value="";
      document.getElementById('ar').value="";
      document.getElementById('arPreset').value="";
      previewEl.textContent = "El prompt aparecerá aquí tras confirmar.";
    });

    document.getElementById('closeBtn').addEventListener('click', closeModal);

    document.getElementById('copyBtn').addEventListener('click', async ()=>{
      const text = promptFinal.textContent;
      try{
        await navigator.clipboard.writeText(text);
        flash("Copiado al portapapeles");
      }catch(e){
        alert("No se pudo copiar automáticamente.");
      }
    });

    document.getElementById('shareBtn').addEventListener('click', async ()=>{
      const text = promptFinal.textContent;
      if(navigator.share){
        try{ await navigator.share({text}); }catch{}
      }else{
        alert("Compartir no está soportado en este navegador.");
      }
    });

    document.getElementById('exportBtn').addEventListener('click', ()=>{
      const text = promptFinal.textContent;
      exportTxt(text, `prompt-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`);
    });

    backdrop.addEventListener('click', closeModal);

    function exportTxt(content, filename="prompt.txt"){
      const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    }

    function flash(msg){
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position='fixed';
      el.style.left='50%';
      el.style.bottom='24px';
      el.style.transform='translateX(-50%)';
      el.style.background='var(--ok)';
      el.style.color='#fff';
      el.style.padding='10px 14px';
      el.style.borderRadius='12px';
      el.style.boxShadow='0 10px 30px rgba(2,8,23,.25)';
      el.style.zIndex='9999';
      document.body.appendChild(el);
      setTimeout(()=>{el.remove();},1600);
    }

    // Init
    loadHistory();
  });
})();