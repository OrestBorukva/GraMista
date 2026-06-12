/**
 * Базовий SEED-довідник НП України (обласні центри + кілька великих міст) для `db:seed`.
 * На ньому стоїть тестова БД; повний датасет (~30 тис. НП) ллється окремо через `db:import`.
 *
 * aliases — поширені відмінкові форми та латиниця для нечіткого збігу.
 * Координати/населення — наближені, для seed достатньо.
 */
export interface Settlement {
  id: string;
  name: string;
  type: 'місто';
  oblast: string;
  population: number;
  lat: number;
  lon: number;
  aliases: string[];
}

export const SETTLEMENTS: Settlement[] = [
  { id: 'kyiv', name: 'Київ', type: 'місто', oblast: 'м. Київ', population: 2952301, lat: 50.4501, lon: 30.5234, aliases: ['києві', 'києва', 'кyiv', 'kyiv', 'kiev'] },
  { id: 'kharkiv', name: 'Харків', type: 'місто', oblast: 'Харківська', population: 1421125, lat: 49.9935, lon: 36.2304, aliases: ['харкові', 'харкова', 'kharkiv'] },
  { id: 'odesa', name: 'Одеса', type: 'місто', oblast: 'Одеська', population: 1010537, lat: 46.4825, lon: 30.7233, aliases: ['одесі', 'одеси', 'одессе', 'odesa', 'odessa'] },
  { id: 'dnipro', name: 'Дніпро', type: 'місто', oblast: 'Дніпропетровська', population: 968502, lat: 48.4647, lon: 35.0462, aliases: ['дніпрі', 'дніпра', 'дніпропетровськ', 'dnipro'] },
  { id: 'donetsk', name: 'Донецьк', type: 'місто', oblast: 'Донецька', population: 901645, lat: 48.0159, lon: 37.8028, aliases: ['донецьку', 'донецька', 'donetsk'] },
  { id: 'zaporizhzhia', name: 'Запоріжжя', type: 'місто', oblast: 'Запорізька', population: 722713, lat: 47.8388, lon: 35.1396, aliases: ['запоріжжі', 'запоріжжю', 'zaporizhzhia'] },
  { id: 'lviv', name: 'Львів', type: 'місто', oblast: 'Львівська', population: 717273, lat: 49.8397, lon: 24.0297, aliases: ['львові', 'львова', 'львове', 'lviv', 'lvov'] },
  { id: 'kryvyi-rih', name: 'Кривий Ріг', type: 'місто', oblast: 'Дніпропетровська', population: 612750, lat: 47.9105, lon: 33.3918, aliases: ['кривому розі', 'кривого рогу', 'кривий ріг', 'kryvyi rih'] },
  { id: 'mykolaiv', name: 'Миколаїв', type: 'місто', oblast: 'Миколаївська', population: 476101, lat: 46.9750, lon: 31.9946, aliases: ['миколаєві', 'миколаєва', 'mykolaiv'] },
  { id: 'mariupol', name: 'Маріуполь', type: 'місто', oblast: 'Донецька', population: 425681, lat: 47.0971, lon: 37.5434, aliases: ['маріуполі', 'маріуполя', 'mariupol'] },
  { id: 'vinnytsia', name: 'Вінниця', type: 'місто', oblast: 'Вінницька', population: 369839, lat: 49.2331, lon: 28.4682, aliases: ['вінниці', 'вінницю', 'vinnytsia'] },
  { id: 'kherson', name: 'Херсон', type: 'місто', oblast: 'Херсонська', population: 283649, lat: 46.6354, lon: 32.6169, aliases: ['херсоні', 'херсона', 'kherson'] },
  { id: 'poltava', name: 'Полтава', type: 'місто', oblast: 'Полтавська', population: 283402, lat: 49.5883, lon: 34.5514, aliases: ['полтаві', 'полтави', 'poltava'] },
  { id: 'chernihiv', name: 'Чернігів', type: 'місто', oblast: 'Чернігівська', population: 285234, lat: 51.4982, lon: 31.2893, aliases: ['чернігові', 'чернігова', 'chernihiv'] },
  { id: 'cherkasy', name: 'Черкаси', type: 'місто', oblast: 'Черкаська', population: 272630, lat: 49.4444, lon: 32.0598, aliases: ['черкасах', 'cherkasy'] },
  { id: 'sumy', name: 'Суми', type: 'місто', oblast: 'Сумська', population: 256474, lat: 50.9077, lon: 34.7981, aliases: ['сумах', 'sumy'] },
  { id: 'zhytomyr', name: 'Житомир', type: 'місто', oblast: 'Житомирська', population: 261624, lat: 50.2547, lon: 28.6587, aliases: ['житомирі', 'житомира', 'zhytomyr'] },
  { id: 'khmelnytskyi', name: 'Хмельницький', type: 'місто', oblast: 'Хмельницька', population: 274176, lat: 49.4229, lon: 26.9871, aliases: ['хмельницькому', 'хмельницького', 'khmelnytskyi'] },
  { id: 'rivne', name: 'Рівне', type: 'місто', oblast: 'Рівненська', population: 245883, lat: 50.6199, lon: 26.2516, aliases: ['рівному', 'рівного', 'rivne', 'rovno'] },
  { id: 'ivano-frankivsk', name: 'Івано-Франківськ', type: 'місто', oblast: 'Івано-Франківська', population: 238196, lat: 48.9226, lon: 24.7111, aliases: ['івано-франківську', 'франківськ', 'франику', 'ivano-frankivsk'] },
  { id: 'ternopil', name: 'Тернопіль', type: 'місто', oblast: 'Тернопільська', population: 225238, lat: 49.5535, lon: 25.5948, aliases: ['тернополі', 'тернополя', 'ternopil'] },
  { id: 'lutsk', name: 'Луцьк', type: 'місто', oblast: 'Волинська', population: 217197, lat: 50.7472, lon: 25.3254, aliases: ['луцьку', 'луцька', 'lutsk'] },
  { id: 'uzhhorod', name: 'Ужгород', type: 'місто', oblast: 'Закарпатська', population: 115449, lat: 48.6208, lon: 22.2879, aliases: ['ужгороді', 'ужгорода', 'uzhhorod'] },
  { id: 'chernivtsi', name: 'Чернівці', type: 'місто', oblast: 'Чернівецька', population: 266550, lat: 48.2921, lon: 25.9358, aliases: ['чернівцях', 'chernivtsi'] },
  { id: 'kropyvnytskyi', name: 'Кропивницький', type: 'місто', oblast: 'Кіровоградська', population: 222695, lat: 48.5079, lon: 32.2623, aliases: ['кропивницькому', 'кіровоград', 'kropyvnytskyi'] },
  { id: 'kremenchuk', name: 'Кременчук', type: 'місто', oblast: 'Полтавська', population: 217710, lat: 49.0631, lon: 33.4108, aliases: ['кременчуці', 'кременчука', 'kremenchuk'] },
  { id: 'bila-tserkva', name: 'Біла Церква', type: 'місто', oblast: 'Київська', population: 208127, lat: 49.7950, lon: 30.1310, aliases: ['білій церкві', 'білої церкви', 'bila tserkva'] },
];
