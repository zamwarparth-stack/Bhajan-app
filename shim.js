/* Runs the app's /api/* calls inside the page, so the original Bhajan Sangini app works without Netlify's server.
   Built-in bhajans: the corrected Bhajan Book (window.__SEED__). Master-PIN changes are kept in this page's shared Claude database. */
(function(){
  var p=location.pathname, base=p.slice(0,p.lastIndexOf('/')+1);
  window.__BASE=base; window.__BASE_PATH=base==='/'?'':base.replace(/\/$/,''); window.__MANDALA=base+'img/mandala.webp';
  try{var bt=document.createElement('base');bt.href=base;document.head.insertBefore(bt,document.head.firstChild)}catch(e){}
  var m=(location.hash||'').match(/^#b(\d+)$/);
  var start=m?base+'bhajan/'+m[1]:(location.hash==='#list'?base+'bhajans':base);
  try{history.replaceState(history.state,'',start)}catch(e){}

  var realFetch=window.fetch.bind(window);
  var seed=window.__SEED__.map(function(b){return{id:b.n,number:b.n,title:b.t,lyrics:b.l,created_at:'2026-11-02T16:11:07Z',updated_at:'2026-11-21T00:00:00Z'}});
  var dbP=null;
  function getDb(){
    if(!dbP) dbP=new Promise(function(res){
      var done=false, t=setTimeout(function(){done=true;res(null)},2500);
      try{window.claude&&window.claude.use?window.claude.use('db').then(function(d){if(!done){clearTimeout(t);res(d)}},function(){if(!done){clearTimeout(t);res(null)}}):(clearTimeout(t),res(null))}catch(e){clearTimeout(t);res(null)}
    });
    return dbP;
  }
  // claude.use may appear slightly after load
  function waitClaude(ms){return new Promise(function(r){var t0=Date.now();(function chk(){if(window.claude&&window.claude.use)return r(true);if(Date.now()-t0>ms)return r(false);setTimeout(chk,100)})()})}
  async function db(){await waitClaude(1500);return getDb()}

  async function changes(){
    var d=await db(); if(!d) return [];
    try{var snap=await Promise.race([d.collection('bhajans').get(),new Promise(function(_,rj){setTimeout(function(){rj(new Error('timeout'))},8000)})]);
      var out=[];(snap.docs||snap).forEach(function(doc){var v=typeof doc.data==='function'?doc.data():doc.data;out.push(Object.assign({},v,{_ver:doc.version}))});return out}catch(e){console.warn('db read failed',e);return []}
  }
  async function current(){
    var map={};seed.forEach(function(b){map[b.id]=Object.assign({},b)});
    (await changes()).forEach(function(c){ if(c.deleted){delete map[c.id]} else map[c.id]={id:c.id,number:c.number,title:c.title,lyrics:c.lyrics||'',created_at:c.created_at||'',updated_at:c.updated_at||''} });
    return Object.values(map).sort(function(a,b){return a.number-b.number});
  }
  async function sha(s){var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bhajan-sangini:'+s));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
  async function pinOk(pin){
    if(!pin) return false; var d=await db(); if(!d) return false;
    try{var doc=await d.doc('config/pin').get(); var v=doc&&(typeof doc.data==='function'?doc.data():doc.data); return !!v&&v.hash===await sha(String(pin).trim())}catch(e){return false}
  }
  function json(status,obj){return new Response(JSON.stringify(obj),{status:status,headers:{'content-type':'application/json'}})}
  var hi=function(){return (document.documentElement.lang||'hi')!=='en'};
  function err(status,hiMsg,enMsg){var l='hi';try{l=localStorage.getItem('bhajan-lang')||l}catch(e){}return json(status,{error:hiMsg+' / '+enMsg})}
  function clean(b){var n=parseInt(b&&b.number,10);return{number:n,title:String(b&&b.title||'').trim(),lyrics:String(b&&b.lyrics||'').replace(/\r\n/g,'\n').trim()}}

  async function writeDoc(id,data){
    var d=await db(); var ref=d.collection('bhajans').doc(String(id));
    await ref.set(Object.assign({id:id},data,{updated_at:new Date().toISOString()}));
  }
  async function handle(path,method,headers,body){
    if(path==='/api/bhajans'&&method==='GET') return json(200,await current());
    if(path==='/api/pin'&&method==='POST'){var ok=await pinOk(body&&body.pin);return ok?json(200,{ok:true}):err(401,'पिन सही नहीं है','Wrong PIN')}
    var pin=headers['x-master-pin'];
    if(!(await db())) return err(503,'बदलाव सेव करने के लिए Claude में साइन इन करें','Sign in to Claude to save changes');
    if(!(await pinOk(pin))) return err(401,'मास्टर पिन सही नहीं है','Master PIN is not correct');
    var list=await current();
    if(path==='/api/bhajans'&&method==='POST'){
      var b=clean(body); if(!b.number||b.number<1) return err(400,'सही नंबर डालें','Enter a valid number'); if(!b.title) return err(400,'शीर्षक डालें','Enter a title');
      var dup=list.find(function(x){return x.number===b.number}); if(dup) return err(409,'नंबर '+b.number+' पर पहले से “'+dup.title+'” है','Number '+b.number+' is already “'+dup.title+'”');
      var id=Date.now(); var now=new Date().toISOString();
      try{await writeDoc(id,Object.assign(b,{created_at:now}))}catch(e){return err(403,'सेव नहीं हो सका — केवल मालिक बदलाव कर सकते हैं','Could not save — only the owner can make changes')}
      return json(201,Object.assign({id:id},b,{created_at:now,updated_at:now}));
    }
    var mm=path.match(/^\/api\/bhajans\/(\d+)$/);
    if(mm){
      var id2=Number(mm[1]); var cur=list.find(function(x){return x.id===id2}); if(!cur) return err(404,'भजन नहीं मिला','Bhajan not found');
      try{
        if(method==='PUT'){var nb=Object.assign({},cur,clean(Object.assign({},cur,body)));
          if(!nb.number||nb.number<1) return err(400,'सही नंबर डालें','Enter a valid number');
          var d2=list.find(function(x){return x.number===nb.number&&x.id!==id2}); if(d2) return err(409,'नंबर '+nb.number+' पर पहले से “'+d2.title+'” है','Number '+nb.number+' is already “'+d2.title+'”');
          await writeDoc(id2,{number:nb.number,title:nb.title,lyrics:nb.lyrics,created_at:cur.created_at}); return json(200,Object.assign(nb,{id:id2,updated_at:new Date().toISOString()}))}
        if(method==='DELETE'){await writeDoc(id2,{deleted:true,number:cur.number,title:cur.title});return json(200,{ok:true})}
      }catch(e){return err(403,'सेव नहीं हो सका — केवल मालिक बदलाव कर सकते हैं','Could not save — only the owner can make changes')}
    }
    if(path==='/api/photo-to-bhajan'&&method==='POST') return photo(body);
    return err(404,'नहीं मिला','Not found');
  }
  async function photo(body){
    await waitClaude(1500); var sample=null; try{sample=window.claude&&await window.claude.use('sample')}catch(e){}
    if(!sample) return err(503,'फोटो पढ़ने की सुविधा अभी उपलब्ध नहीं है','Photo reading is not available here');
    try{
      var imgs=(body.images||[]).slice(0,6).map(function(im){var bin=atob(im.data),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:im.mimeType||'image/jpeg'})});
      var prompt='These are photos of pages from a Hindi bhajan book. Transcribe every bhajan you can see, exactly as written, in Devanagari. '+
        'Return JSON only: {"bhajans":[{"number":<the bhajan number printed on the page, or null>,"title":"<the bhajan heading>","lyrics":"<all lines, one per line, separated by \\n>"}]}. '+
        'Keep the original words and line order. Write [?] in place of any word you cannot read. Do not translate. If there is no bhajan, return {"bhajans":[]}.';
      var out=await sample.json(prompt,{images:imgs,modelTier:'complex'});
      var arr=(out&&out.bhajans)||[]; return json(200,{bhajans:arr.map(function(b){return{number:b.number==null?null:Number(b.number),title:String(b.title||''),lyrics:String(b.lyrics||'')}})});
    }catch(e){return err(e&&e.code==='rate_limited'?429:500,'फोटो नहीं पढ़ी जा सकी, दोबारा कोशिश करें','Could not read the photo. Please try again.')}
  }
  window.fetch=async function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||String(input);
    var u;try{u=new URL(url,location.href)}catch(e){return realFetch(input,init)}
    if(u.origin===location.origin&&u.pathname.indexOf('/api/')===0){
      init=init||{}; var method=(init.method||'GET').toUpperCase(); var h={};
      var hh=init.headers||{}; if(hh instanceof Headers) hh.forEach(function(v,k){h[k.toLowerCase()]=v}); else Object.keys(hh).forEach(function(k){h[k.toLowerCase()]=hh[k]});
      var body=null;try{body=init.body?JSON.parse(init.body):null}catch(e){}
      try{return await handle(u.pathname,method,h,body)}catch(e){console.error(e);return err(500,'कुछ गड़बड़ हुई, दोबारा कोशिश करें','Something went wrong. Please try again.')}
    }
    return realFetch(input,init);
  };
})();
