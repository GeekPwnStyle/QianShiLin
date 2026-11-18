import { BlockList, isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ip2region from 'ip2region';
import { City } from 'ipip-ipdb';
import qqwryFile from 'qqwry.ipdb';

const privateNetworks = new BlockList();
for (const [address, prefix] of [['10.0.0.0', 8], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['100.64.0.0', 10]]) {
  privateNetworks.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of [['fc00::', 7], ['fe80::', 10], ['::1', 128]]) {
  privateNetworks.addSubnet(address, prefix, 'ipv6');
}

const geofeedUrl = 'https://api.cloudflare.com/local-ip-ranges.csv';
const countries = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
let providerRanges = [];
function loadGeofeed(content) {
  const ranges = content.split(/\r?\n/).flatMap(line => {
    const [cidr, country, , city] = line.split(',');
    if (!/^[A-Z]{2}$/.test(country ?? '')) return [];
    const [address, bits] = cidr.split('/');
    if (!isIP(address) || !/^\d+$/.test(bits) || Number(bits) > (isIP(address) === 4 ? 32 : 128)) return [];
    return [{address, bits:Number(bits), country, city}];
  });
  if (ranges.length < 1000) throw new Error('Incomplete Cloudflare geofeed');
  // Match the most specific prefix first.
  const index = new Map();
  for (const item of ranges) {
    const family = isIP(item.address);
    const key = family + '/' + item.bits;
    let bucket = index.get(key);
    if (!bucket) index.set(key, bucket = { family, bits: item.bits, entries: new Map() });
    bucket.entries.set(networkKey(item.address, item.bits), item);
  }
  providerRanges = [...index.values()].sort((a, b) => b.bits - a.bits);
}
function networkKey(ip, bits) {
  if (isIP(ip) === 4) {
    const number = ip.split('.').reduce((value, part) => value * 256 + Number(part), 0);
    return Math.floor(number / 2 ** (32 - bits)).toString();
  }
  const normalized = new URL('http://[' + ip + ']').hostname.slice(1, -1);
  const [head, tail] = normalized.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const parts = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  const value = parts.reduce((number, part) => (number << 16n) + BigInt('0x' + part), 0n);
  return (value >> BigInt(128 - bits)).toString();
}

try { loadGeofeed(readFileSync(resolve('data/cloudflare-geofeed.csv'), 'utf8')); } catch {}
if (process.env.NODE_ENV === 'production' || process.env.QSL_REFRESH_GEOFEED === '1') {
  const refresh = async () => {
    try {
      const response = await fetch(geofeedUrl, {signal:AbortSignal.timeout(60000)});
      if (response.ok) loadGeofeed(await response.text());
    } catch { /* Keep the last available snapshot. */ }
  };
  void refresh();
  setInterval(refresh, 24 * 60 * 60 * 1000).unref();
}

let primary;
let secondary;
function open(factory) {
  try { return factory(); } catch (error) {
    console.warn('Unable to open IP location source:', error.message);
    return null;
  }
}
const clean = value => typeof value === 'string' && value.trim() !== '0' ? value.trim() : '';
function find(read) {
  try { return { result: read(), failed: false }; } catch { return { result: null, failed: true }; }
}
const provinceName = name => ['四川','河北','山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','海南','贵州','云南','陕西','甘肃','青海','台湾'].includes(name) ? name + '省' : name;

function formatCity(city, country) {
  return country === '中国' && city && !/[市州盟区县]$/.test(city) ? city + '市' : city;
}

export function lookupIpRegion(raw) {
  const ip = typeof raw === 'string' ? raw.trim().replace(/^::ffff:(?=\d+\.)/i, '').split('%')[0] : '';
  const version = isIP(ip);
  if (!version) return null;
  if (privateNetworks.check(ip, version === 4 ? 'ipv4' : 'ipv6')) return '内网地址';
  for (const {family, bits, entries} of providerRanges) {
    if (family !== version) continue;
    const item = entries.get(networkKey(ip, bits));
    if (item) return [...new Set([countries.of(item.country), item.city === 'Singapore' ? '新加坡' : item.city, 'Cloudflare'].filter(Boolean))].join(' · ');
  }

  if (primary === undefined) primary = open(() => new ip2region.default());
  if (secondary === undefined && version === 4) secondary = open(() => new City(qqwryFile));
  const first = primary ? find(() => primary.search(ip)) : {result:null, failed:true};
  const fallback = version !== 4 ? {result:null,failed:false}
    : secondary ? find(() => {
        const [country, province, city, , , isp] = secondary.find(ip, 'CN');
        return {country, province, city, isp};
      }) : {result:null,failed:true};

  const sources = [first.result, fallback.result].filter(Boolean);
  const country = clean(sources.find(source => clean(source.country))?.country);
  const compatible = sources.filter(source => !clean(source.country) || clean(source.country) === country);
  const best = compatible.toSorted((a,b) => (Number(Boolean(clean(b.city))) * 2 + Number(Boolean(clean(b.province)))) - (Number(Boolean(clean(a.city))) * 2 + Number(Boolean(clean(a.province)))))[0];
  const province = provinceName(clean(best?.province));
  const city = formatCity(clean(best?.city), country);
  const isp = clean(best?.isp) || clean(compatible.find(source => clean(source.isp))?.isp);
  const locality = [...new Set([province,city].filter(Boolean))].join(country === '中国' ? '' : ' ');
  const location = country === '中国' && locality ? locality : [country,locality].filter(Boolean).join(' ');
  const failed = first.failed || fallback.failed;
  const detail = country === '中国' && !city ? (failed ? '部分数据源不可用' : province ? '城市未收录' : '省市未收录') : '';
  return [...new Set([location,isp,detail].filter(Boolean))].join(' · ') || (failed ? '归属地查询暂不可用' : null);
}


const onlineCache = new Map();
const inFlight = new Map();
const providerRetryAt = new Map();

function extractIp138Location(html, ip) {
  if (!html.includes(ip)) return null;
  const plain = value => value.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim();
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => plain(cell[1]));
    if (!/^(?:ASN\s*归属地|本站数据|IP归属地)[:：]?$/i.test(cells[0] ?? '')) continue;
    const data = cells[1]?.replace(/\s+/g, ' ').trim();
    if (data && data.length <= 100 && !/未知|保留地址|查询失败/.test(data)) return data;
  }
  return null;
}

export async function resolveIpRegion(raw) {
  const local = lookupIpRegion(raw);
  const ip = typeof raw === 'string' ? raw.trim().replace(/^::ffff:(?=\d+\.)/i, '') : '';
  const marker = / · (?:(?:省市|城市)未收录|部分数据源不可用)$/;
  const incomplete = marker.test(local ?? '');
  const visibleLocal = local?.replace(marker, '') ?? null;
  const mainland = /^(?:[\p{Script=Han}]{2,12}(?:省|自治区)|(?:北京|天津|上海|重庆)市)/u.test(visibleLocal ?? '');
  if (!isIP(ip) || (local && !mainland && !incomplete && local !== '归属地查询暂不可用')) return visibleLocal;
  const cached = onlineCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (inFlight.has(ip)) return inFlight.get(ip);
  const provider = mainland ? 'ipwhois' : 'ip138';
  if (providerRetryAt.get(provider) > Date.now() || inFlight.size >= 4) return visibleLocal;
  const lookup = (async () => {
    let value = visibleLocal;
    let ttl = 10 * 60 * 1000;
    try {
      if (mainland) {
        const endpoint = new URL(`https://ipwho.is/${ip}`);
        endpoint.search = new URLSearchParams({ lang: 'zh-CN', fields: 'ip,success,country_code,region,city' });
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          redirect: 'error',
          signal: AbortSignal.timeout(1800),
        });
        if (!response.ok) throw new Error('IP location service unavailable');
        const data = await response.json();
        const province = provinceName(clean(data?.region));
        const city = clean(data?.city);
        const chineseName = /^[\p{Script=Han}]{2,16}$/u;
        if (data?.success === true && data.ip === ip && data.country_code === 'CN' &&
            chineseName.test(province) && chineseName.test(city) && !/未知|不详/.test(province + city)) {
          const location = [...new Set([province, formatCity(city, '中国')])].join('');
          const isp = visibleLocal?.startsWith(province) ? visibleLocal.split(' · ')[1] : null;
          value = [location, isp].filter(Boolean).join(' · ');
          ttl = 24 * 60 * 60 * 1000;
        }
      } else {
        const endpoint = new URL('https://www.ip138.com/iplookup.php');
        endpoint.search = new URLSearchParams({ ip, action: '2' });
        const response = await fetch(endpoint, {
          headers: { Accept: 'text/html' },
          redirect: 'error',
          signal: AbortSignal.timeout(1800),
        });
        if (!response.ok) throw new Error('IP138 page unavailable');
        const html = await response.text();
        const location = extractIp138Location(html, ip);
        if (location && (!visibleLocal || /(?:省|自治区|市)\s*[^\s]+(?:市|州|盟)|新加坡/.test(location))) {
          value = location.replace(/^中国\s+(?=\S)/, '').replace(/(省|自治区)\s+/g, '$1');
          ttl = 24 * 60 * 60 * 1000;
        }
      }
    } catch {
      providerRetryAt.set(provider, Date.now() + 5 * 60 * 1000);
    }
    if (onlineCache.size >= 2048) onlineCache.delete(onlineCache.keys().next().value);
    onlineCache.set(ip, { value, expires: Date.now() + ttl });
    return value;
  })();
  inFlight.set(ip, lookup);
  try { return await lookup; } finally { inFlight.delete(ip); }
}
