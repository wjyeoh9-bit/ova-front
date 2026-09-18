"use client";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { ArrowUpRight, ArrowRight, ArrowLeft, Plus, Minus, ShoppingBag, Check, X, MoveUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { CART_KEY, VARIANTS, PRICE, money, normalizeCart, cartTotal, cartProperties, type CartItem, type Variant } from '@/lib/cart';
import { track, visitorId, attribution } from '@/lib/analytics';
export type Page = 'home' | 'product' | 'cart' | 'checkout' | 'confirmation';
const route: Record<Page,string> = {home:'/',product:'/product',cart:'/cart',checkout:'/checkout',confirmation:'/first-batch'};
const pageFromPath = () => (Object.entries(route).find(([,path])=>path===location.pathname.replace(/\/$/,'') || path===location.pathname)?.[0] || 'home') as Page;
const VARIANT_IMAGES: Record<Variant, string> = {
  Black: '/ova-black-v2.webp',
  Silver: '/ova-silver-v2.webp',
  Invisible: '/ova-invisible-v2.webp',
};
function ProductImage({className='',variant='Black'}:{className?:string;variant?:Variant}) {
  return <img key={variant} className={`variant-image ${className}`} src={VARIANT_IMAGES[variant]} alt={`OVA ${variant}: paired oval filter faces, silicone surrounds and a small connecting bridge`} width="1536" height="1024" />;
}
function Quantity({value,onChange,label='Quantity'}:{value:number;onChange:(v:number)=>void;label?:string}) { return <div className="quantity"><Button variant="ghost" size="icon" aria-label={`Decrease ${label}`} disabled={value<=1} onClick={()=>onChange(value-1)}><Minus size={15}/></Button><output aria-label={label}>{value}</output><Button variant="ghost" size="icon" aria-label={`Increase ${label}`} disabled={value>=10} onClick={()=>onChange(value+1)}><Plus size={15}/></Button></div>; }
export default function Storefront({initialPage='home'}:{initialPage?:Page}) {
  const [page,setPage] = useState<Page>(initialPage);
  const [cart,setCart] = useState<CartItem[]>([]);
  const [ready,setReady] = useState(false);
  const [variant,setVariant] = useState<Variant>('Black');
  const [quantity,setQuantity] = useState(1);
  const [galleryView,setGalleryView] = useState<'product'|'concept'>('product');
  const [added,setAdded] = useState(false);
  const [storageNotice,setStorageNotice] = useState(false);
  const [email,setEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const [confirmed,setConfirmed] = useState(false);
  const submitLock = useRef(false);
  const formStarted = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const total = cartTotal(cart);
  const count = cart.reduce((s,x)=>s+x.quantity,0);
  useEffect(()=>{
    setPage(pageFromPath());
    try { setCart(normalizeCart(JSON.parse(localStorage.getItem(CART_KEY)||'[]'))); }
    catch { setStorageNotice(true); }
    try { setConfirmed(sessionStorage.getItem('ova.confirmed')==='true'); } catch {}
    attribution(); setReady(true);
    const pop=()=>{setPage(pageFromPath());setError('');};
    const sync=(e:StorageEvent)=>{if(e.key===CART_KEY){try{setCart(normalizeCart(JSON.parse(e.newValue||'[]')));}catch{}}};
    window.addEventListener('popstate',pop);window.addEventListener('storage',sync);
    return ()=>{window.removeEventListener('popstate',pop);window.removeEventListener('storage',sync);};
  },[]);
  useEffect(()=>{if(ready){try{localStorage.setItem(CART_KEY,JSON.stringify(cart));}catch{setStorageNotice(true);}}},[cart,ready]);
  useEffect(()=>{
    if(!ready)return;
    document.title = `${({home:'Everyday Air Protection',product:'Meet OVA',cart:'Your bag',checkout:'You’re early',confirmation:'First batch'} as const)[page]} | OVA`;
    track('page_viewed',{page});
    if(page==='product'){
      track('product_viewed',{product_id:'ova-everyday',unit_price:PRICE,currency:'MYR'});
      for(const src of Object.values(VARIANT_IMAGES)){const preview=new window.Image();preview.src=src;}
    }
    if(page==='cart')track('cart_viewed',cartProperties(cart));
    if(page==='checkout'&&cart.length)track('checkout_intent_viewed',cartProperties(cart));
  // Deliberately track route entry, not every cart change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[page,ready]);
  useEffect(()=>{
    if(!ready)return;
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void}}).modelContext;
    if(!context)return;
    const lifecycle=new AbortController();
    try{context.registerTool({name:'read_ova_cart',description:'Read the current OVA cart, selected variants and quantities. Does not place an order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({items:cart,unit_price:PRICE,total,currency:'MYR',available_for_purchase:false})},{signal:lifecycle.signal});}catch{}
    return ()=>lifecycle.abort();
  },[cart,total,ready]);
  function go(next:Page){history.pushState({},'',route[next]);setPage(next);setError('');window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>mainRef.current?.focus());}
  function link(next:Page){return (e:MouseEvent<HTMLAnchorElement>)=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();go(next);}};}
  function NavLink({to,children,className=''}:{to:Page;children:ReactNode;className?:string}){return <a href={route[to]} onClick={link(to)} className={className}>{children}</a>;}
  function addToCart(){
    const old=cart.find(x=>x.variant===variant)?.quantity||0;
    const actual=Math.min(quantity,10-old);
    if(actual<=0)return;
    setCart(normalizeCart([...cart,{variant,quantity:actual}]));
    track('product_added_to_cart',{variant,quantity:actual,unit_price:PRICE,value:actual*PRICE,currency:'MYR',product_id:'ova-everyday'});
    setAdded(true);
  }
  function update(variant:Variant,quantity:number){setCart(normalizeCart(cart.map(x=>x.variant===variant?{...x,quantity}:x)));track('cart_quantity_changed',{variant,quantity,unit_price:PRICE,currency:'MYR'});}
  function remove(variant:Variant){setCart(cart.filter(x=>x.variant!==variant));track('product_removed_from_cart',{variant});}
  function checkout(){if(!cart.length)return;track('checkout_started',cartProperties(cart));go('checkout');}
  async function signup(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(submitLock.current||!cart.length)return;
    submitLock.current=true;setPending(true);setError('');
    track('first_batch_signup_submitted',cartProperties(cart));
    try{
      const res=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,whatsapp:phone,items:cart,consent:true,website:new FormData(e.currentTarget).get('website'),distinct_id:visitorId(),attribution:attribution()})});
      if(!res.ok)throw new Error(res.status===429?'Please wait a moment before trying again.':'We couldn’t save your signup. Please try again.');
      const data=await res.json() as {ok?:boolean;id?:string;created?:boolean};if(!data.ok)throw new Error('We couldn’t save your signup. Please try again.');
      setConfirmed(true);try{sessionStorage.setItem('ova.confirmed','true');}catch{}
      if(data.created)track('first_batch_signup_completed',{...cartProperties(cart),signup_id:data.id});
      go('confirmation');
    }catch(err){setError(err instanceof Error?err.message:'Please try again.');track('first_batch_signup_failed',{reason:'request_failed'});}
    finally{submitLock.current=false;setPending(false);}
  }
  const maxed=(cart.find(x=>x.variant===variant)?.quantity||0)>=10;
  return <div className="storefront">
    <div className="announcement">Everyday Air Protection. <span>Meet OVA.</span></div>
    <header className="site-header"><NavLink to="home" className="wordmark">ova</NavLink><nav aria-label="Main navigation"><NavLink to="home" className={page==='home'?'active':''}>Meet OVA</NavLink><NavLink to="product" className={page==='product'?'active':''}>The product</NavLink></nav><NavLink to="cart" className="bag-link"><ShoppingBag size={19}/><span>Bag</span><span className="bag-count" aria-label={`${count} items`}>{count}</span></NavLink></header>
    {storageNotice&&<div className="storage-notice" role="status">Your browser can’t save this bag between visits. You can still explore and sign up here.</div>}
    <main ref={mainRef} tabIndex={-1} key={page} className={`page page-${page}`}>
    {page==='home'&&<>
      <section className="hero"><div className="hero-copy"><div className="eyebrow">OVA / EVERYDAY AIR PROTECTION</div><h1>Meet your<br/>new everyday<span className="lime-period">.</span></h1><p>A small wearable. A fresh perspective.<br/>Made with everyday life in mind.</p><NavLink to="product" className="cta">Discover OVA <ArrowUpRight size={21}/></NavLink><div className="hero-meta"><span>RM89</span><span className="hairline"/><span>Three ways to wear it.</span></div></div><div className="hero-visual"><div className="visual-top"><span className="capsule">MEET OVA</span><span className="visual-index">01 / 01</span></div><ProductImage/><div className="visual-bottom"><span>SMALL FORM. BIG IDEA.</span><span>Black</span></div></div></section>
      <div className="concept-strip"><span>Something different is in the air.</span><span>Everyday Air Protection <ArrowUpRight size={20}/></span></div>
      <section id="product" className="idea-section lifestyle-section"><div className="lifestyle-photo"><img src="/ova-lifestyle-grey.webp" alt="Model wearing OVA in Black, styled with a blue top" width="1254" height="1254" loading="lazy" decoding="async"/></div><div className="lifestyle-copy"><div className="eyebrow">THE EVERYDAY IN BETWEEN</div><h2>For the little moments<br/>between here and there.</h2><p>The walk to the station. The roadside coffee. The journey home. Meet a small nasal wearable with a design that feels like part of your style.</p></div></section>
      <section className="edition-section"><div><div className="eyebrow">ONE IDEA. YOUR EXPRESSION.</div><h2>Find your everyday.</h2><p>Black. Silver. Invisible.</p></div><NavLink to="product" className="text-link">Explore OVA <ArrowUpRight size={21}/></NavLink></section>
    </>}
    {page==='product'&&<>
      <div className="breadcrumb"><NavLink to="home">Home</NavLink><span>/</span><span>OVA Everyday</span></div>
      <section className="product-layout"><div className="product-gallery">
        <div className={`product-art ${galleryView==='concept'?'concept-art':''}`} id="product-preview">
          {galleryView==='product'?<><span className="capsule">{variant.toUpperCase()} / OVA</span><ProductImage variant={variant}/><span className="art-caption" aria-live="polite">{variant}</span></>:<a className="concept-full-image" href="/ova-product-details-v3.png" target="_blank" rel="noopener noreferrer" aria-label="Open the full OVA product details image"><img src="/ova-product-details-v3.webp" alt="OVA nasal air wearable showing the filter faces, connecting bridge, silicone fit options, carry case and components" width="1536" height="1024"/></a>}
        </div>
        <div className="gallery-controls" aria-label="Product image views">
          <Button variant="outline" className={`gallery-view ${galleryView==='product'?'selected':''}`} aria-pressed={galleryView==='product'} aria-controls="product-preview" onClick={()=>setGalleryView('product')}><ProductImage variant={variant}/><span>{variant} view</span></Button>
          <Button variant="outline" className={`gallery-view ${galleryView==='concept'?'selected':''}`} aria-pressed={galleryView==='concept'} aria-controls="product-preview" onClick={()=>setGalleryView('concept')}><img src="/ova-product-details-v3.webp" alt="" width="90" height="60"/><span>Product details</span></Button>
        </div>
        <div className="gallery-note"><span>Designed to be a little different.</span><span>OVA</span></div>
      </div><div className="product-details"><div className="eyebrow">SMALL FORM. EVERYDAY INTENT.</div><h1>OVA</h1><h2>Everyday Air Protection</h2><div className="price">RM89 <span>MYR / per wearable</span></div><p className="product-description">A new take on the everyday wearable. A small nasal wearable, with a design that feels like you.</p><fieldset className="variant-field"><legend>Choose your expression <span>{variant}</span></legend><div className="variants">{VARIANTS.map(v=><button type="button" key={v} aria-pressed={variant===v} className={`variant ${variant===v?'selected':''}`} onClick={()=>{setVariant(v);setGalleryView('product');setAdded(false);track('variant_selected',{variant:v,product_id:'ova-everyday'});}}><span className={`swatch swatch-${v.toLowerCase()}`}/><span>{v}</span>{variant===v&&<Check size={14}/>}</button>)}</div></fieldset><div className="quantity-row"><span>Quantity</span><Quantity value={quantity} onChange={v=>{setQuantity(v);setAdded(false);}}/></div><Button className="cta add-button" disabled={!ready||maxed} onClick={addToCart}>{maxed?'Maximum 10 per expression':added?<><Check size={18}/> Added to bag</>:'Add to Cart'}<span>{money(PRICE*quantity)}</span></Button>{added&&<div role="status" className="added-notice"><span>Your everyday, in the bag.</span><NavLink to="cart">View bag <ArrowRight size={15}/></NavLink></div>}<Accordion type="single" collapsible className="product-faq"><AccordionItem value="concept"><AccordionTrigger>What is OVA?</AccordionTrigger><AccordionContent>OVA is a small nasal wearable with paired oval filter faces, soft silicone surrounds and a connecting bridge.</AccordionContent></AccordionItem><AccordionItem value="design"><AccordionTrigger>About the design</AccordionTrigger><AccordionContent>Choose from Black, Silver and Invisible. Select an expression to see its colour, or open the product details view for a closer look.</AccordionContent></AccordionItem></Accordion></div></section>
    </>}
    {page==='cart'&&<section className="cart-section"><div className="section-heading"><div><div className="eyebrow">YOUR EVERYDAY, SELECTED</div><h1>Your bag<span className="small-count">({count})</span></h1></div><NavLink to="product" className="text-link">Keep exploring <ArrowUpRight size={18}/></NavLink></div>{!ready?<p className="empty-message">Opening your bag…</p>:!cart.length?<div className="empty-bag"><ShoppingBag size={40} strokeWidth={1}/><h2>A little space for something new.</h2><p>Your bag is currently empty.</p><NavLink to="product" className="cta">Meet OVA <ArrowUpRight size={20}/></NavLink></div>:<div className="cart-layout"><div className="cart-items">{cart.map(item=><article className="cart-item" key={item.variant}><ProductImage variant={item.variant}/><div className="cart-item-info"><div className="item-title-row"><h2>OVA</h2><button aria-label={`Remove ${item.variant} from bag`} onClick={()=>remove(item.variant)} className="remove-button"><X size={18}/></button></div><p>Everyday Air Protection</p><span className="item-variant"><i className={`swatch swatch-${item.variant.toLowerCase()}`}/>{item.variant}</span><div className="item-bottom"><Quantity value={item.quantity} onChange={q=>update(item.variant,q)} label={`${item.variant} quantity`}/><div><strong>{money(item.quantity*PRICE)}</strong><span>{money(PRICE)} each</span></div></div></div></article>)}</div><aside className="order-summary"><div className="eyebrow">YOUR SELECTION</div><div className="summary-line"><span>Subtotal · {count} {count===1?'item':'items'}</span><strong>{money(total)}</strong></div><p>All prices in Malaysian Ringgit.</p><Button className="cta" onClick={checkout}>Checkout <ArrowRight size={20}/></Button><NavLink to="product" className="summary-back">Continue exploring</NavLink></aside></div>}</section>}
    {page==='checkout'&&<section className="checkout-section">{!ready?<p>Opening your selection…</p>:!cart.length?<div className="empty-bag"><h1>Your bag is empty.</h1><p>Choose your OVA expression to get started.</p><NavLink to="product" className="cta">Explore OVA <ArrowRight size={20}/></NavLink></div>:<><NavLink to="cart" className="back-link"><ArrowLeft size={16}/> Back to bag</NavLink><div className="checkout-layout"><div className="early-copy"><span className="capsule lime">A FIRST LOOK AT WHAT’S NEXT</span><h1>You’re early<span className="lime-period">.</span></h1><p className="early-lede">OVA is currently in development and isn’t available for purchase yet.</p><p>You were about to order OVA for RM89.{count>1&&<span> Your selection: {count} wearables, {money(total)} total.</span>}</p><h2>Want one when our first batch becomes available?</h2><div className="no-payment"><Check size={17}/><strong>No payment will be taken.</strong></div><div className="mini-selection">{cart.map(x=><div key={x.variant}><span><i className={`swatch swatch-${x.variant.toLowerCase()}`}/>OVA · {x.variant} × {x.quantity}</span><span>{money(x.quantity*PRICE)}</span></div>)}</div></div><div className="signup-card"><div className="eyebrow">THE FIRST-BATCH LIST</div><h2>Be part of the beginning.</h2><p>Leave your details. We’ll let you know when the first batch becomes available.</p><form onSubmit={signup} onFocus={()=>{if(!formStarted.current){track('first_batch_form_started',cartProperties(cart));formStarted.current=true;}}}><label htmlFor="email">Email address <span>Required</span></label><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} className="ph-no-capture"/><label htmlFor="whatsapp">WhatsApp <span>Optional</span></label><Input id="whatsapp" type="tel" autoComplete="tel" placeholder="+60 12 345 6789" pattern={String.raw`\+?[0-9 \(\)\-]{7,24}`} title="Use a country code and a valid phone number." maxLength={25} value={phone} onChange={e=>setPhone(e.target.value)} className="ph-no-capture"/><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><p className="signup-consent">By joining, you agree to receive OVA first-batch updates by email and, if provided, WhatsApp. You can opt out by replying to any update.</p>{error&&<p className="form-error" role="alert">{error}</p>}<Button className="cta" type="submit" disabled={pending}>{pending?'Joining…':'Join First Batch'}{!pending&&<ArrowUpRight size={20}/>}</Button><p className="form-footnote">No payment. No obligation. Just a heads-up.</p></form></div></div></>}</section>}
    {page==='confirmation'&&<section className="confirmation-section">{!ready?<p>Checking your signup…</p>:confirmed?<><div className="confirmation-icon"><Check size={34} strokeWidth={1.6}/></div><div className="eyebrow">YOU’RE ON THE FIRST-BATCH LIST</div><h1>Good things<br/>start small<span className="lime-period">.</span></h1><p>Your interest is registered. We’ll get in touch when our first batch becomes available.</p><div className="confirmation-note">No payment was taken. This is an expression of interest, not an order or a guaranteed reservation.</div><NavLink to="home" className="cta">Back to OVA <ArrowUpRight size={20}/></NavLink></>:<><div className="eyebrow">THE FIRST-BATCH LIST</div><h1>Start with your OVA.</h1><p>Explore OVA and choose your expression to register your interest.</p><NavLink to="product" className="cta">Meet OVA <ArrowUpRight size={20}/></NavLink></>}</section>}
    </main>
    <footer className="site-footer"><div className="footer-top"><NavLink to="home" className="wordmark">ova</NavLink><p>Everyday Air Protection.</p><NavLink to="product" className="text-link">A new everyday <MoveUpRight size={17}/></NavLink></div><div className="footer-bottom"><span>© {new Date().getFullYear()} OVA</span><span>Made for what’s next.</span><span>MY / MYR</span></div></footer>
    </div>;
}
