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
    const fields = [region.country, region.province, region.city, region.isp]
      .filter(value => value && value !== '0');
    if (fields[0] === '中国' && region.province) fields.shift();
    return [...new Set(fields)].join(' ') || null;
  } catch {
    return null;
  }
}
