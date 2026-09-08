(function(){
  var ENDPOINT = window.__SAEDOW_HEAT__ || 'https://peachfall-heat.vercel.app/api/heat';
  var sid = localStorage.getItem('pf_heat_sid');
  if(!sid){ sid = Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('pf_heat_sid', sid); }
  function send(kind, extra){
    try{
      var body = JSON.stringify(Object.assign({
        t: Date.now(), sid: sid, kind: kind,
        path: location.pathname + location.hash,
        w: innerWidth, h: innerHeight
      }, extra||{}));
      if(navigator.sendBeacon){ navigator.sendBeacon(ENDPOINT, new Blob([body],{type:'application/json'})); }
      else { fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:body,keepalive:true,mode:'cors'}); }
    }catch(e){}
  }
  send('page');
  document.addEventListener('click', function(e){
    var el = e.target; var id = el && (el.id|| (el.getAttribute && el.getAttribute('data-testid')) || el.tagName);
    send('click',{x:e.clientX,y:e.clientY,id:String(id||'').slice(0,64)});
  }, true);
  document.addEventListener('touchstart', function(e){
    var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
    send('touch',{x:t.clientX,y:t.clientY});
  }, {passive:true,capture:true});
})();
