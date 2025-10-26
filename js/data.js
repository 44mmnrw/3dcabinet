// Данные оборудования
const EQUIPMENT_DATA = [
  {
    id: 1,
    name: "Коммутатор Cisco 2960",
    description: "24-port Gigabit Switch",
    units: 1,
    power: 45,
    weight: 3.2,
    depth: 250,
    category: "network"
  },
  {
    id: 2,
    name: "Сервер Dell R740",
    description: "2U Rack Server",
    units: 2,
    power: 750,
    weight: 28.5,
    depth: 650,
    category: "server"
  },
  {
    id: 3,
    name: "Патч-панель 24 порта",
    description: "Cat6 UTP 24-port",
    units: 1,
    power: 0,
    weight: 1.5,
    depth: 150,
    category: "network"
  },
  {
    id: 4,
    name: "ИБП APC Smart-UPS 1500",
    description: "1500VA/1000W UPS",
    units: 2,
    power: 0,
    weight: 35,
    depth: 450,
    category: "power"
  },
  {
    id: 5,
    name: "Роутер Cisco ISR 4321",
    description: "Integrated Services Router",
    units: 1,
    power: 90,
    weight: 5.8,
    depth: 400,
    category: "network"
  },
  {
    id: 6,
    name: "Сервер HP ProLiant DL360",
    description: "1U Rack Server",
    units: 1,
    power: 500,
    weight: 18.2,
    depth: 700,
    category: "server"
  },
  {
    id: 7,
    name: "PDU управляемый 8 розеток",
    description: "Power Distribution Unit",
    units: 1,
    power: 0,
    weight: 2.8,
    depth: 450,
    category: "power"
  },
  {
    id: 8,
    name: "Коммутатор HP 5130 48G",
    description: "48-port Gigabit L3 Switch",
    units: 1,
    power: 55,
    weight: 4.5,
    depth: 300,
    category: "network"
  },
  {
    id: 9,
    name: "KVM переключатель 16 портов",
    description: "16-port KVM Switch",
    units: 1,
    power: 15,
    weight: 2.1,
    depth: 300,
    category: "accessories"
  },
  {
    id: 10,
    name: "Сервер Supermicro 4U",
    description: "4U Storage Server",
    units: 4,
    power: 1200,
    weight: 45,
    depth: 750,
    category: "server"
  },
  {
    id: 11,
    name: "Полка кабельная 1U",
    description: "Cable Management Panel",
    units: 1,
    power: 0,
    weight: 1.2,
    depth: 200,
    category: "accessories"
  },
  {
    id: 12,
    name: "Вентиляторный блок 1U",
    description: "Fan Tray Unit",
    units: 1,
    power: 120,
    weight: 3.5,
    depth: 250,
    category: "accessories"
  }
];

// Конфигурация шкафа
const CABINET_CONFIG = {
  name: 'Стандарт 19" RACK',
  units: 42,
  width: 600,
  depth: 800,
  maxWeight: 800,
  maxPower: 3500
};
