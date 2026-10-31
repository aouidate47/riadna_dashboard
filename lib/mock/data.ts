import type { BathroomType, Riad, User } from "@/types";

export type MockUserRecord = User & { password: string };

export interface RoomSeed {
  name: string;
  capacity: number;
  price: number;
  wifi?: boolean;
  bathroom?: BathroomType;
  airConditioning?: boolean;
  heating?: boolean;
  breakfast?: boolean;
  terrace?: boolean;
  tv?: boolean;
}

export interface RiadConfig {
  riad: Riad;
  seed: number;
  bookingCount: number;
  rooms: RoomSeed[];
}

export const RIAD_CONFIGS: RiadConfig[] = [
  {
    riad: {
      id: "riad_yasmine", name: "Riad Yasmine", slug: "riad-yasmine",
      address: "12 Derb Sidi Ishak, Médina, Marrakech", phone: "+212 524 38 21 10",
      latitude: 31.6335, longitude: -7.9892,
      checkInTime: "14:00", checkOutTime: "11:00",
      about: "Riad Yasmine is a restored courtyard house in the medina, with a small pool, orange trees and a rooftop terrace. The team serves breakfast on the patio and can arrange hammam visits, cooking classes and airport transfers.",
    },
    seed: 101, bookingCount: 28,
    rooms: [
      { name: "Chambre Jasmin", capacity: 2, price: 900 }, { name: "Chambre Rose", capacity: 2, price: 950 },
      { name: "Chambre Lavande", capacity: 3, price: 1100 }, { name: "Chambre Menthe", capacity: 2, price: 850 },
      { name: "Suite Safran", capacity: 4, price: 1800 }, { name: "Chambre Orange", capacity: 2, price: 800 },
      { name: "Chambre Figuier", capacity: 3, price: 1000 }, { name: "Suite Amande", capacity: 4, price: 1650 },
    ],
  },
  {
    riad: {
      id: "dar_anika", name: "Dar Anika", slug: "dar-anika",
      address: "4 Rue Riad Zitoun el Jdid, Marrakech", phone: "+212 524 44 87 32",
      latitude: 31.6258, longitude: -7.9865,
      checkInTime: "15:00", checkOutTime: "12:00",
      about: "Dar Anika is a quiet guesthouse in the Riad Zitoun el Jdid quarter, a short walk from Jemaa el-Fna. Its six rooms open onto a plant-filled courtyard, and the rooftop has views over the medina.",
    },
    seed: 202, bookingCount: 22,
    rooms: [
      { name: "Suite Atlas", capacity: 4, price: 2100 }, { name: "Chambre Majorelle", capacity: 2, price: 1200 },
      { name: "Chambre Sahara", capacity: 2, price: 1100 }, { name: "Suite Médina", capacity: 3, price: 1750 },
      { name: "Chambre Oasis", capacity: 2, price: 1000 }, { name: "Chambre Dunes", capacity: 2, price: 950 },
    ],
  },
  {
    riad: {
      id: "riad_zitoun", name: "Riad Zitoun", slug: "riad-zitoun",
      address: "27 Derb Jdid, Kasbah, Marrakech", phone: "+212 524 39 05 76",
      latitude: 31.6175, longitude: -7.988,
      checkInTime: "14:00", checkOutTime: "11:30",
      about: "Riad Zitoun is a family-run house in the Kasbah, close to the Saadian tombs. Seven rooms surround a shaded courtyard with a fountain, and the rooftop is a calm spot for breakfast or mint tea.",
    },
    seed: 303, bookingCount: 25,
    rooms: [
      { name: "Chambre Olive", capacity: 2, price: 700 }, { name: "Chambre Argan", capacity: 2, price: 750 },
      { name: "Chambre Cèdre", capacity: 3, price: 900 }, { name: "Suite Zitoun", capacity: 4, price: 1500 },
      { name: "Chambre Henné", capacity: 2, price: 720 }, { name: "Chambre Cannelle", capacity: 2, price: 780 },
      { name: "Chambre Cumin", capacity: 3, price: 850 },
    ],
  },
];

/** All passwords are "test1234". */
export const MOCK_USERS: MockUserRecord[] = [
  { id: "u_1", riadId: "riad_yasmine", name: "Mehdi Alaoui", email: "owner@yasmine.ma", role: "OWNER", password: "test1234" },
  { id: "u_2", riadId: "riad_yasmine", name: "Salma Idrissi", email: "staff@yasmine.ma", role: "STAFF", password: "test1234" },
  { id: "u_3", riadId: "dar_anika", name: "Nadia Berrada", email: "owner@daranika.ma", role: "OWNER", password: "test1234" },
  { id: "u_4", riadId: "riad_zitoun", name: "Hassan Tazi", email: "owner@riadzitoun.ma", role: "OWNER", password: "test1234" },
];


export const GUEST_POOL = [
  { name: "Sophie Martin", country: "France", dial: "+33" }, { name: "James Walker", country: "United Kingdom", dial: "+44" },
  { name: "Lucía Fernández", country: "Spain", dial: "+34" }, { name: "Hans Müller", country: "Germany", dial: "+49" },
  { name: "Emily Johnson", country: "United States", dial: "+1" }, { name: "Giulia Rossi", country: "Italy", dial: "+39" },
  { name: "Pieter de Vries", country: "Netherlands", dial: "+31" }, { name: "Yasmine Lahlou", country: "Morocco", dial: "+212" },
  { name: "Omar Benkirane", country: "Morocco", dial: "+212" }, { name: "Chloé Dubois", country: "France", dial: "+33" },
  { name: "Liam O'Connor", country: "Ireland", dial: "+353" }, { name: "Anna Kowalska", country: "Poland", dial: "+48" },
  { name: "Mohamed Chraibi", country: "Morocco", dial: "+212" }, { name: "Elena Petrova", country: "Bulgaria", dial: "+359" },
  { name: "Lars Eriksson", country: "Sweden", dial: "+46" }, { name: "Maya Cohen", country: "Israel", dial: "+972" },
  { name: "Thomas Leclerc", country: "Belgium", dial: "+32" }, { name: "Hannah Schmidt", country: "Germany", dial: "+49" },
  { name: "Carlos Silva", country: "Portugal", dial: "+351" }, { name: "Aiko Tanaka", country: "Japan", dial: "+81" },
  { name: "Oliver Brown", country: "Canada", dial: "+1" }, { name: "Fatima Zahra El Idrissi", country: "Morocco", dial: "+212" },
  { name: "Marco Bianchi", country: "Italy", dial: "+39" }, { name: "Ingrid Larsen", country: "Norway", dial: "+47" },
  { name: "Amine Tahiri", country: "Morocco", dial: "+212" }, { name: "Julie Moreau", country: "France", dial: "+33" },
  { name: "Daniel Cruz", country: "Mexico", dial: "+52" }, { name: "Sara Ahmed", country: "United Arab Emirates", dial: "+971" },
] as const;

export const NOTES = [
  "Arrivée tardive vers 22h", "Transfert aéroport demandé", "Petit-déjeuner végétarien",
  "Anniversaire de mariage, prévoir une attention", "Lit bébé nécessaire", "Allergie aux fruits à coque",
  "Demande une chambre calme", "Dîner sur la terrasse le premier soir",
] as const;
