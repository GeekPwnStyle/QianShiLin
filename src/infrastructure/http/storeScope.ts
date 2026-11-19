let selectedStore='all';
export function setActiveStoreScope(id:string){selectedStore=id||'all';}
let installed=false;
// Only store-owned list APIs participate. Auth and global master settings stay global.
const scopedLists=/^\/(overview|products|customers|staff|pricing\/(categories|items)|purchase\/(orders|manual-inbound)|catalog\/(suppliers|warehouses))$/;
export function installStoreScopeFetch(){
 if(installed)return;installed=true;const original=window.fetch.bind(window);
 window.fetch=(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(input instanceof Request?input.url:String(input),location.href);
  const prefix=`${import.meta.env.BASE_URL}api`;
  const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  if(url.origin===location.origin&&url.pathname.startsWith(prefix)&&method==='GET'&&selectedStore!=='all'&&scopedLists.test(url.pathname.slice(prefix.length))){
   url.searchParams.set('storeId',selectedStore);
   return original(input instanceof Request?new Request(url,input):url,init);
  }
  return original(input,init);
 };
}
