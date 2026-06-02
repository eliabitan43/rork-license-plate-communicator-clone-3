export type LatLng = { lat: number; lng: number };

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lng: number, precision: number = 6): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lng >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}

export function decodeBbox(hash: string) {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (let i = 0; i < hash.length; i++) {
    const idx = BASE32.indexOf(hash[i]);
    if (idx === -1) throw new Error('Invalid geohash');
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) lonMin = lonMid; else lonMax = lonMid;
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) latMin = latMid; else latMax = latMid;
      }
      evenBit = !evenBit;
    }
  }

  return { latMin, latMax, lonMin, lonMax };
}

export function neighbors(hash: string): string[] {
  const { latMin, latMax, lonMin, lonMax } = decodeBbox(hash);
  const latSpan = latMax - latMin;
  const lonSpan = lonMax - lonMin;
  const latCenter = (latMin + latMax) / 2;
  const lonCenter = (lonMin + lonMax) / 2;
  const result: string[] = [];
  const offsets = [
    [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]
  ];
  for (const [dy, dx] of offsets) {
    result.push(encodeGeohash(latCenter + dy * latSpan, lonCenter + dx * lonSpan, hash.length));
  }
  return result;
}

export function neighborsOf(gh: string): string[] {
  return neighbors(gh);
}

export const gh = {
  encodeToPrecision: (lat: number, lng: number, p = 7) => encodeGeohash(lat, lng, p),
  neighbors: neighborsOf,
};
