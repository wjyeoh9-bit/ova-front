// Anonymous, explicit events only. No form contents, autocapture or session replay.
let visitor = '';
export function visitorId() {
  if (visitor) return visitor;
  try { visitor = localStorage.getItem('ova.visitor') || crypto.randomUUID(); localStorage.setItem('ova.visitor',visitor); }
  catch { visitor = crypto.randomUUID(); }
  return visitor;
}
export function attribution(): Record<string,string> {
  try {
    const params = new URLSearchParams(location.search);
    const fields = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
    const fresh = Object.fromEntries(fields.filter(k=>params.has(k)).map(k=>[k,params.get(k)!.slice(0,160)]));
    if (Object.keys(fresh).length) sessionStorage.setItem('ova.attribution',JSON.stringify(fresh));
    return JSON.parse(sessionStorage.getItem('ova.attribution') || '{}');
  } catch { return {}; }
}
export function track(event: string, properties: Record<string,unknown> = {}) {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1') return;
  const payload = { event, distinct_id: visitorId(), uuid: crypto.randomUUID(), properties: { ...attribution(), ...properties, path: location.pathname } };
  // Runtime key lives on the server; failed analytics never blocks shopping.
  void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
}
