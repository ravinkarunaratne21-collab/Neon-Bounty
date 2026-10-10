export interface Stage {
  name: string;
  district: string;
  boss: string;
  top: string;
  bottom: string;
  far: string;
  middle: string;
  trim: string;
  neon: string;
  accent: string;
  length: number;
  signs: string[];
  weather: 'none' | 'rain' | 'petal' | 'mist' | 'ember' | 'sand' | 'spark';
}

export const STAGES: Stage[] = [
  {
    name: 'MEGABUILD H10', district: 'INTERIOR', boss: 'DEXTER DESHAWN',
    top: '#0b0f1c', bottom: '#232f47', far: '#131a2a', middle: '#1c2536', trim: '#3d4d69',
    neon: '#59e6ef', accent: '#cdd9e8', length: 1850,
    signs: ['H10', 'KABUKI', 'LIFT', 'RECEP', 'B42', 'CARGO'],
    weather: 'none',
  },
  {
    name: 'JIG JIG STREET', district: 'RED LIGHT DIST', boss: 'JOY TOYE',
    top: '#140610', bottom: '#521231', far: '#2c1030', middle: '#34153a', trim: '#712c54',
    neon: '#ff2f6d', accent: '#ff8ac2', length: 1940,
    signs: ['LOVE H', '24H', 'JIGJIG', 'MIRU', 'NEON', 'BAR'],
    weather: 'rain',
  },
  {
    name: 'JAPAN TOWN', district: 'H10 WEST', boss: 'MANTIS CYBERPSYCHO',
    top: '#0f0a1e', bottom: '#4a183c', far: '#251638', middle: '#2f1d41', trim: '#6f3d5e',
    neon: '#ff4d6d', accent: '#ffd166', length: 2030,
    signs: ['RAMEN', 'MIRU', 'SUSHI', 'MOTEL', 'TETSU', 'ONSEN'],
    weather: 'petal',
  },
  {
    name: 'WESTBROOK', district: 'DOWNTOWN', boss: 'ARASAKA ENFORCER',
    top: '#050912', bottom: '#1f3856', far: '#16283e', middle: '#1e344b', trim: '#43607c',
    neon: '#63c7ff', accent: '#cfe4ff', length: 2120,
    signs: ['WSTBRK', 'REVNT', 'CLOUD', 'NINE', 'NIGHT', 'OCELOT'],
    weather: 'none',
  },
  {
    name: 'PACIFICA', district: 'GANG DISTRICT', boss: 'PLACIDE',
    top: '#0a110d', bottom: '#2c3a20', far: '#1c291b', middle: '#253320', trim: '#4c5b33',
    neon: '#9dff4d', accent: '#58d97a', length: 2210,
    signs: ['VOODOO', 'VVBYS', 'RUSTY', 'PACFCA', 'JUNK', 'LOWBRO'],
    weather: 'mist',
  },
  {
    name: 'CORPO PLAZA', district: 'UPTOWN', boss: 'CORPO CYBERPSYCHO',
    top: '#0b0f1a', bottom: '#313a4f', far: '#1d2534', middle: '#273043', trim: '#5d6d88',
    neon: '#ffd978', accent: '#fff2c8', length: 2300,
    signs: ['CORPO', 'LUXE', 'PLAZA', 'SUITE', 'GOLD', 'SPARK'],
    weather: 'none',
  },
  {
    name: 'ARASAKA TOWER', district: 'THE 9F', boss: 'SABURO ARASAKA',
    top: '#120407', bottom: '#47121e', far: '#200810', middle: '#2b0d15', trim: '#6d2130',
    neon: '#ff1f3d', accent: '#ff7a7a', length: 2390,
    signs: ['ARASAKA', 'HONOR', 'BLACK', 'RED', 'TWR', '9F'],
    weather: 'ember',
  },
  {
    name: 'BADLANDS', district: 'WASTELAND', boss: 'NASH',
    top: '#23130a', bottom: '#c56f33', far: '#8a4a26', middle: '#a05a2b', trim: '#c97a3d',
    neon: '#ffd166', accent: '#ff8a3d', length: 2480,
    signs: ['SOLR', 'WIND', 'WASTE', 'FUEL', 'SCRAP', 'DUNE'],
    weather: 'sand',
  },
  {
    name: 'DOG TOWN', district: 'MILITARY ZONE', boss: 'KURT HANSEN',
    top: '#0d1114', bottom: '#3c4239', far: '#1f2622', middle: '#2b322b', trim: '#5a6353',
    neon: '#ffb04d', accent: '#d9e3c8', length: 2570,
    signs: ['DOG TOW', 'ARMY', 'SECURE', 'WATCH', 'BUNKR', 'R2'],
    weather: 'rain',
  },
  {
    name: 'EMBERS', district: "HANAKO'S BAR", boss: 'ADAM SMASHER',
    top: '#150b06', bottom: '#421f10', far: '#251309', middle: '#2f1911', trim: '#6e3a1e',
    neon: '#ff9a4d', accent: '#ffd978', length: 2660,
    signs: ['EMBERS', 'HANAKO', 'BAR', 'LIVE', 'DJ', 'NITE'],
    weather: 'spark',
  },
];

export const CLEAR_LINES = [
  'RIP. RIP. RIP.',
  'The city never sleeps, choom.',
  'You just went full edgerunner.',
  'Chrome it and leave.',
  'Stick and move, choom.',
  'NetWatch owes you a coffee.',
  'The streets will talk about this one.',
  'Full send.',
  'That is how you run.',
  'Legend status increased.',
];

export const LOSS_LINES = [
  'The city always gets another shot.',
  'R.I.P. choom — the streets remember.',
  'The net runs deeper than you.',
  'Another ghost for the gutter.',
];
