export interface ServiceCapability {
  type: 'request' | 'location' | 'coupon' | 'geofence' | 'photo' | 'note' | 'timebox' | 'prices' | 'map';
}

export interface Service {
  slug: string;
  name: string;
  category: 'help' | 'perks' | 'info' | 'safety';
  capabilities: string[];
  deeplink: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
}

export interface ServiceRegistry {
  version: number;
  services: Service[];
  lastUpdated?: string;
}

// Default service registry
export const DEFAULT_SERVICES: Service[] = [
  {
    slug: "roadside",
    name: "Roadside Assist",
    category: "help",
    capabilities: ["request", "location"],
    deeplink: "homi://services?slug=roadside",
    icon: "truck",
    description: "Get help when you're stranded",
  },
  {
    slug: "carwash",
    name: "Car Wash Deals",
    category: "perks",
    capabilities: ["coupon", "geofence"],
    deeplink: "homi://services?slug=carwash",
    icon: "droplets",
    description: "Find nearby car wash discounts",
  },
  {
    slug: "fuel",
    name: "Fuel Nearby",
    category: "info",
    capabilities: ["prices", "map"],
    deeplink: "homi://services?slug=fuel",
    icon: "fuel",
    description: "Compare gas prices around you",
  },
  {
    slug: "evidence",
    name: "Evidence Locker",
    category: "safety",
    capabilities: ["photo", "note", "timebox"],
    deeplink: "homi://services?slug=evidence",
    icon: "camera",
    description: "Secure incident documentation",
  },
  {
    slug: "parking",
    name: "Smart Parking",
    category: "info",
    capabilities: ["map", "location"],
    deeplink: "homi://services?slug=parking",
    icon: "map-pin",
    description: "Find available parking spots",
  },
  {
    slug: "electric-charging",
    name: "Electric Charging",
    category: "info",
    capabilities: ["prices", "map", "geofence"],
    deeplink: "homi://services?slug=electric-charging",
    icon: "zap",
    description: "Find EV charging stations nearby",
  },
  {
    slug: "food-places",
    name: "Food Places",
    category: "perks",
    capabilities: ["map", "location", "prices"],
    deeplink: "homi://services?slug=food-places",
    icon: "utensils",
    description: "Find restaurants and cafes nearby",
  },
];

export const DEFAULT_REGISTRY: ServiceRegistry = {
  version: 1,
  services: DEFAULT_SERVICES,
  lastUpdated: new Date().toISOString(),
};

// Query keys
export const serviceQk = {
  registry: () => ["service-registry"] as const,
  service: (slug: string) => ["service", slug] as const,
};

// Mock API functions (replace with real endpoints)
export async function fetchServiceRegistry(): Promise<ServiceRegistry> {
  // In production, this would fetch from your server
  // For now, return the default registry
  await new Promise(resolve => setTimeout(resolve, 100)); // simulate network delay
  return DEFAULT_REGISTRY;
}

export async function fetchService(slug: string): Promise<Service | null> {
  const registry = await fetchServiceRegistry();
  return registry.services.find(s => s.slug === slug) || null;
}