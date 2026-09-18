import { normalizeCart, cartTotal, cartProperties, VARIANTS } from '../lib/cart';
export type Env = { DB?: D1Database; POSTHOG_KEY?: string; POSTHOG_HOST?: string };
const json = (body: unknown,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function validOrigin(req:Request) { const origin=req.headers.get('origin'); return !origin||origin===new URL(req.url).origin; }
async function body(req:Request) {
  if(!validOrigin(req))throw new Error('origin');
  if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('type');
  if(Number(req.headers.get('content-length')||0)>8192)throw new Error('size');
  const reader=req.body?.getReader();if(!reader)throw new Error('body');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw new Error('size');}chunks.push(value);}
  const all=new Uint8Array(length);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
  const parsed=JSON.parse(new TextDecoder().decode(all));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('json');return parsed;
}
function sanitizeAttribution(value:unknown) {
  if(!value||typeof value!=='object')return {};
  return Object.fromEntries(Object.entries(value).filter(([k,v])=>['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].includes(k)&&typeof v==='string').map(([k,v])=>[k,(v as string).slice(0,160)]));
}
export async function signupHandler(req:Request,env:Env) {
  let data;try{data=await body(req);}catch{return json({error:'Invalid request.'},400);}
  const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  const phone=typeof data.whatsapp==='string'?data.whatsapp.trim():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||data.consent!==true||data.website)return json({error:'Please check your details.'},400);
  if(phone&&(!/^\+?[0-9 ()-]{7,24}$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15))return json({error:'Please check your WhatsApp number.'},400);
  if(!Array.isArray(data.items)||!data.items.length||data.items.length>3||data.items.some((x: {variant:string;quantity:number})=>!x||!VARIANTS.includes(x.variant as typeof VARIANTS[number])||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>10)||new Set(data.items.map((x:{variant:string})=>x.variant)).size!==data.items.length)return json({error:'Please check your bag.'},400);
  const items=normalizeCart(data.items);
  if(!env.DB)return json({error:'Signup is temporarily unavailable. Please try again.'},503);
  try{
    // Hash a platform-provided IP with the current day. Never store raw IPs.
    const ip=req.headers.get('cf-connecting-ip');
    if(ip){
      const day=new Date().toISOString().slice(0,10);
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`ova:${day}:${ip}`));
      const key=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
      const window=Math.floor(Date.now()/3600000);
      const row=await env.DB.prepare('INSERT INTO signup_rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END, window = excluded.window RETURNING count').bind(key,window).first<{count:number}>();
      if(row&&row.count>10)return json({error:'Please wait before trying again.'},429);
      // Bounded, temporary abuse-control data only.
      await env.DB.prepare('DELETE FROM signup_rate_limits WHERE window < ?').bind(window-24).run();
    }
    const id=crypto.randomUUID();
    const distinctId=typeof data.distinct_id==='string'&&/^[a-f0-9-]{36}$/.test(data.distinct_id)?data.distinct_id:crypto.randomUUID();
    const result=await env.DB.prepare('INSERT INTO first_batch_signups (id, email, whatsapp, items, total_myr, attribution, distinct_id, consent_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').bind(id,email,phone||null,JSON.stringify(items),cartTotal(items),JSON.stringify(sanitizeAttribution(data.attribution)),distinctId,'first-batch-v1',new Date().toISOString()).run();
    // Duplicate emails are idempotent. Never return an existing contact record.
    return json({ok:true,id,created:result.meta.changes>0},201);
  }catch{console.error('OVA signup storage failed');return json({error:'We couldn’t save your signup. Please try again.'},503);}
}
const events=new Set(['page_viewed','product_viewed','variant_selected','product_added_to_cart','cart_viewed','cart_quantity_changed','product_removed_from_cart','checkout_started','checkout_intent_viewed','first_batch_form_started','first_batch_signup_submitted','first_batch_signup_completed','first_batch_signup_failed']);
export async function eventsHandler(req:Request,env:Env) {
  let data;try{data=await body(req);}catch{return json({error:'Invalid event'},400);}
  if(!events.has(data.event)||typeof data.distinct_id!=='string'||!/^[a-f0-9-]{36}$/.test(data.distinct_id))return json({error:'Invalid event'},400);
  if(!env.POSTHOG_KEY)return json({enabled:false},202);
  const p=data.properties&&typeof data.properties==='object'?data.properties:{};
  const properties:Record<string,unknown>={...sanitizeAttribution(p),$process_person_profile:false,$geoip_disable:true,product_id:'ova-everyday',currency:'MYR',unit_price:89};
  if(Array.isArray(p.items))Object.assign(properties,cartProperties(normalizeCart(p.items)));
  for(const k of ['quantity','value'])if(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0&&p[k]<=2670)properties[k]=p[k];
  if(VARIANTS.includes(p.variant))properties.variant=p.variant;
  if(['home','product','cart','checkout','confirmation'].includes(p.page))properties.page=p.page;
  if(['/','/product','/cart','/checkout','/first-batch'].includes(p.path))properties.path=p.path;
  if(p.reason==='request_failed')properties.reason=p.reason;
  if(typeof p.signup_id==='string'&&/^[a-f0-9-]{36}$/.test(p.signup_id))properties.signup_id=p.signup_id;
  const host=env.POSTHOG_HOST||'https://us.i.posthog.com';
  if(!['https://us.i.posthog.com','https://eu.i.posthog.com'].includes(host))return json({error:'Analytics host is not configured correctly.'},503);
  try{
    const response=await fetch(`${host}/i/v0/e/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:env.POSTHOG_KEY,event:data.event,distinct_id:data.distinct_id,properties,uuid:typeof data.uuid==='string'&&/^[a-f0-9-]{36}$/.test(data.uuid)?data.uuid:crypto.randomUUID(),timestamp:new Date().toISOString()}),signal:AbortSignal.timeout(4000)});
    return json({ok:response.ok},response.ok?200:502);
  }catch{return json({ok:false},502);}
}
