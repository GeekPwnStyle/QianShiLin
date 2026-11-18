import { BlockList, isIP } from 'node:net';
import ip2region from 'ip2region';

const privateNetworks = new BlockList();
for (const [address, prefix] of [['10.0.0.0', 8], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['100.64.0.0', 10]]) {
  privateNetworks.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of [['fc00::', 7], ['fe80::', 10], ['::1', 128]]) {
  privateNetworks.addSubnet(address, prefix, 'ipv6');
}

let searcher;
let initializationFailed = false;

export function lookupIpRegion(raw) {
  const ip = typeof raw === 'string' ? raw.trim().replace(/^::ffff:(?=\d+\.)/i, '') : '';
  const version = isIP(ip);
  if (!version) return null;
  if (privateNetworks.check(ip, version === 4 ? 'ipv4' : 'ipv6')) return '内网地址';
  if (initializationFailed) return null;
  if (!searcher) {
    try {
      searcher = new ip2region.default();
    } catch (error) {
      initializationFailed = true;
      console.warn('Unable to load offline IP region database:', error.message);
      return null;
    }
  }
  try {
    const region = searcher.search(ip);
    if (!region) return null;
    const clean = value => typeof value === 'string' && value.trim() !== '0' ? value.trim() : '';
    const country = clean(region.country);
    const province = clean(region.province);
    const city = clean(region.city);
    const isp = clean(region.isp);
    const locality = [...new Set([province, city].filter(Boolean))].join(country === '中国' ? '' : ' ');
    const location = country === '中国' && locality ? locality : [country, locality].filter(Boolean).join(' ');
    const detail = country === '中国' && !city ? (province ? '城市未收录' : '省市未收录') : '';
    return [...new Set([location, isp, detail].filter(Boolean))].join(' · ') || null;
  } catch {
    return null;
  }
}
