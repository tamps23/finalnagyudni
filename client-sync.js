// client-sync.js
(function(){
  const API_SET = '/api/set';
  const API_STATE = '/api/state';
  const API_EVENTS = '/api/events';
  let ignoreNext = false;

  // Apply remote update to localStorage without re-posting
  function applyRemote(key, value){
    ignoreNext = true;
    try { localStorage.setItem(key, value); } catch(e){ console.warn('localStorage set failed', e); }
    setTimeout(()=> { ignoreNext = false; }, 50);
  }

  // Patch setItem to also send to server
  const originalSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v){
    originalSet.apply(this, [k, v]);
    if(ignoreNext) return;
    try{
      fetch(API_SET, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key:k, value:v }) }).catch(()=>{});
    }catch(e){}
  };

  // Initial sync: fetch server state and populate localStorage
  fetch(API_STATE).then(r=>r.json()).then(s=>{
    if(!s) return;
    Object.keys(s).forEach(k=>{
      try{ const v = s[k]; if(typeof v === 'object') localStorage.setItem(k, JSON.stringify(v)); else localStorage.setItem(k, String(v)); }catch(e){}
    });
  }).catch(()=>{});

  // Listen for server-sent events
  try{
    const es = new EventSource(API_EVENTS);
    es.onmessage = function(ev){
      try{ const data = JSON.parse(ev.data); if(data && data.key){ applyRemote(data.key, data.value); } } catch(e){}
    };
  }catch(e){ console.warn('SSE not available', e); }

})();
