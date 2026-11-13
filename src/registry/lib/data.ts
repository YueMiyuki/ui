import { avatar, landscape, type Mood } from "@/registry/lib/art";

export interface Person {
  name: string;
  role: string;
  handle: string;
  email: string;
  avatar: string;
}

export interface Place {
  name: string;
  region: string;
  blurb: string;
  image: string;
}

export interface Quote {
  text: string;
  name: string;
  role: string;
}

function person(name: string, role: string, handle: string, email: string): Person {
  return {
    name,
    role,
    handle,
    email,
    get avatar() {
      return avatar(handle);
    },
  };
}

function place(name: string, region: string, blurb: string, mood: Mood): Place {
  return {
    name,
    region,
    blurb,
    get image() {
      return landscape(name.toLowerCase(), { mood });
    },
  };
}

export const people: Person[] = [
  person("Aiko Tanaka", "Mountain guide", "aiko.tanaka", "aiko@kitakaze.example"),
  person("Kenji Mori", "Station master, Otaru", "kenjimori", "k.mori@northline.example"),
  person("Yuna Sato", "Weather forecaster", "yunasato", "yuna@hoshizora.example"),
  person("Haruto Ishikawa", "Glassblower", "haruto.glass", "haruto@tsurara.example"),
  person("Mei Watanabe", "Product designer", "meiwatanabe", "mei@paperandpine.example"),
  person("Lars Eriksen", "Ski patrol lead", "larseriksen", "lars@kitakaze.example"),
  person("Ingrid Solberg", "Cartographer", "ingrid.maps", "ingrid@fjellfjord.example"),
  person("Mateo Álvarez", "Photographer", "mateo.alvarez", "mateo@paperandpine.example"),
  person("Amara Okafor", "Hydrologist", "amaraokafor", "amara@hoshizora.example"),
  person("Chen Wei", "Rail operations engineer", "chenwei", "chen.wei@northline.example"),
  person("Priya Raman", "Tea buyer", "priyaraman", "priya@yukimitea.example"),
  person("Élodie Martin", "Innkeeper", "elodie.martin", "elodie@ryokanshizuku.example"),
];

export const places: Place[] = [
  place(
    "Otaru",
    "Hokkaido",
    "A canal town of stone warehouses, glass workshops and gas lamps that come on at a quarter past four.",
    "dusk",
  ),
  place("Hakuba", "Nagano", "Three valleys under the Northern Alps, with powder that holds well into March.", "day"),
  place(
    "Nozawa",
    "Nagano",
    "A hot spring village with thirteen free public baths and a ski hill at the end of the lane.",
    "snow",
  ),
  place(
    "Shirakawa",
    "Gifu",
    "Steep thatched farmhouses in a narrow valley, lit up on a few winter evenings each year.",
    "night",
  ),
  place(
    "Aomori",
    "Aomori",
    "A port at the top of Honshu, known for deep snow, scallops and the summer lantern floats.",
    "dawn",
  ),
  place(
    "Lake Tōya",
    "Hokkaido",
    "A round caldera lake that never freezes, with an island in the middle and a volcano on the shore.",
    "day",
  ),
  place(
    "Niseko",
    "Hokkaido",
    "Light, dry snow off the Sea of Japan and a near-perfect cone of a mountain across the valley.",
    "aurora",
  ),
  place("Kiso", "Nagano", "Old post towns on the Nakasendō, joined by a forest trail you can walk in a day.", "snow"),
  place(
    "Matsumoto",
    "Nagano",
    "A black castle, clear spring water in the streets, and the Alps at the end of every road.",
    "dawn",
  ),
  place(
    "Yakushima",
    "Kagoshima",
    "A rain-soaked island of cedar forest, where it can snow on the peaks while the coast stays mild.",
    "dusk",
  ),
];

export const quotes: Quote[] = [
  {
    text: "The forecast said fourteen centimetres by morning. We measured fifteen, and the first lift ran on time.",
    name: "Lars Eriksen",
    role: "Ski patrol lead",
  },
  {
    text: "I keep the timetable on my phone now. When the 9:12 is late, I know before the platform does.",
    name: "Kenji Mori",
    role: "Station master, Otaru",
  },
  {
    text: "We moved the whole booking flow over in a weekend. Guests stopped calling to ask if it had worked.",
    name: "Élodie Martin",
    role: "Innkeeper",
  },
  {
    text: "Good maps leave things out. The hard part is deciding what.",
    name: "Ingrid Solberg",
    role: "Cartographer",
  },
  {
    text: "Glass and snow have the same problem: everything shows. So you work slowly and you clean as you go.",
    name: "Haruto Ishikawa",
    role: "Glassblower",
  },
];
