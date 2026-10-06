import { SKILL_LABELS } from "./copy";
import { seededShuffle } from "./rng";
import type {
  Answer,
  CodeLine,
  Difficulty,
  FillToken,
  PublicLevel,
  Skill,
} from "./types";

export { SKILL_LABELS };

/**
 * Определения уровней вместе с правильными ответами. Файл используется только
 * на сервере: в браузер уходит результат sanitizeLevel(), где ответов нет.
 */

interface LevelDefBase {
  id: string;
  title: string;
  chapter: string;
  fileName: string;
  story: string;
  task: string;
  nextHook?: string;
  difficulty: Difficulty;
  skills: Skill[];
  basePoints: number;
  timeLimitSec: number;
  hint: string;
  explanation: string;
}

interface OrderDef extends LevelDefBase {
  kind: "order";
  /** Строки в правильном порядке. */
  lines: CodeLine[];
}

interface FillDef extends LevelDefBase {
  kind: "fill";
  template: FillToken[];
  bank: CodeLine[];
  /** Слот -> правильный элемент из набора команд. */
  solution: Record<string, string>;
}

interface FindDef extends LevelDefBase {
  kind: "find";
  lines: CodeLine[];
  badIds: string[];
}

interface ChoiceDef extends LevelDefBase {
  kind: "choice";
  question: string;
  facts: string[];
  options: CodeLine[];
  correctIds: string[];
  multiple: boolean;
}

interface MatchDef extends LevelDefBase {
  kind: "match";
  left: CodeLine[];
  right: CodeLine[];
  /** Требование заказчика -> функция приложения. */
  pairs: Record<string, string>;
}

export type LevelDef = OrderDef | FillDef | FindDef | ChoiceDef | MatchDef;

const LEVEL_LIST: LevelDef[] = [
  {
    id: "start-screen",
    kind: "order",
    title: "Приложение не запускается",
    chapter: "Запуск «ХлебТут»",
    fileName: "запуск.логика",
    story:
      "Вы открываете сборку, которую утром должны скачать клиенты пекарни. Вместо витрины с булочками — серый экран. «КРАКЕН» перетасовал самые первые команды: приложение даже не понимает, с чего начинать.",
    task: "Соберите запуск в правильном порядке: сначала включить приложение, потом показать логотип, загрузить меню и только затем открыть главный экран.",
    nextHook:
      "Экран ожил. Клиенты уже заходят в витрину и кладут хлеб в корзину — проверьте, не уходят ли вместе с заказом чужие данные.",
    difficulty: "easy",
    skills: ["алгоритмы"],
    basePoints: 100,
    timeLimitSec: 70,
    hint: "Сначала приложение должно запуститься, и только потом что-то показывать. А меню пекарни нужно загрузить до того, как откроется главный экран.",
    explanation:
      "Это и есть алгоритм — строгая последовательность шагов. Компьютер выполняет команды сверху вниз и не догадывается о вашем замысле.",
    lines: [
      { id: "l1", text: 'Начать(Приложение "ХлебТут")' },
      { id: "l2", text: "Показать(Логотип, 2 сек)" },
      { id: "l3", text: "Загрузить(Меню.Пекарни)" },
      { id: "l4", text: "Открыть(Экран.Главный)" },
    ],
  },
  {
    id: "basket-spy",
    kind: "find",
    title: "Чужая строка в корзине",
    chapter: "Корзина заказа",
    fileName: "корзина.логика",
    story:
      "Запуск починен, люди собирают заказ. Корзина считает сумму и показывает кнопку «Оформить» — слишком гладко для ночной атаки. В студии правило: если модуль «просто работает» после взлома, его всё равно читают глазами. Где-то внутри может быть закладка.",
    task: "Найдите в файле корзины строку, которой здесь быть не должно, и удалите её.",
    nextHook:
      "Утечку вырезали. Теперь ломается сам смысл корзины: человек нажимает «Заказать» и попадает на оплату пустого пакета.",
    difficulty: "easy",
    skills: ["безопасность"],
    basePoints: 110,
    timeLimitSec: 70,
    hint: "Посмотрите, куда уходят данные. Один адрес не принадлежит ни пекарне, ни вашей студии.",
    explanation:
      "Такую строку называют закладкой: приложение работает как обычно, но копия данных уходит третьим лицам. За утечку платёжных данных компания отвечает и деньгами, и репутацией.",
    lines: [
      { id: "b1", text: "Открыть(Экран.Корзина)" },
      { id: "b2", text: "Посчитать(Сумма заказа)" },
      { id: "b3", text: 'Показать(Кнопка "Оформить заказ")' },
      { id: "b4", text: 'Отправить(Данные карты, "kraken-cloud.ru")' },
      { id: "b5", text: "Сохранить(Заказ, База пекарни)" },
    ],
    badIds: ["b4"],
  },
  {
    id: "order-button",
    kind: "fill",
    title: "Кнопка «Заказать» ничего не делает",
    chapter: "Оформление заказа",
    fileName: "кнопка_заказа.логика",
    story:
      "Это сердце «ХлебТут»: человек собрал булочки и жмёт «Заказать». Две команды вырезаны, поэтому приложение не проверяет корзину и не сообщает пекарне, что пора печь. Без этого релиз бессмысленен — продажи не доходят до кассы.",
    task: "Верните пропавшие команды на свои места: проверку корзины и отправку заказа в пекарню.",
    nextHook:
      "Заказы снова доходят до печи. Тут же звонит владелец сети «Корка»: заказов много, а денег в кассе не прибавилось. Нужен расчёт, а не код.",
    difficulty: "easy",
    skills: ["алгоритмы", "логика"],
    basePoints: 130,
    timeLimitSec: 100,
    hint: "Перед оплатой стоит убедиться, что человеку вообще есть что покупать. А после успешной оплаты о заказе должна узнать пекарня.",
    explanation:
      "Порядок проверок — это деньги: без проверки корзины клиент заплатит за пустой заказ, а без отправки заказа в пекарню заплатит и не получит хлеб.",
    template: [
      { type: "line", text: 'Кнопка("Заказать") при нажатии:' },
      { type: "slot", id: "s1", indent: 1 },
      { type: "line", text: "Показать(Экран.Оплата)", indent: 1 },
      { type: "line", text: "ЕСЛИ Оплата.Успешна ТО", indent: 1 },
      { type: "slot", id: "s2", indent: 2 },
      {
        type: "line",
        text: 'Показать(Сообщение "Спасибо! Хлеб уже в печи")',
        indent: 2,
      },
      { type: "line", text: "КОНЕЦ ЕСЛИ", indent: 1 },
    ],
    bank: [
      { id: "c1", text: "Проверить(Корзина не пуста)" },
      { id: "c2", text: "Отправить(Заказ, Пекарня)" },
      { id: "c3", text: "Очистить(Корзина)" },
      { id: "c4", text: "Показать(Реклама)" },
      { id: "c5", text: "Закрыть(Приложение)" },
    ],
    solution: { s1: "c1", s2: "c2" },
  },
  {
    id: "unit-economics",
    kind: "choice",
    title: "Заказчик спрашивает: мы вообще зарабатываем?",
    chapter: "Деньги с одного заказа",
    fileName: "экономика.расчёт",
    story:
      "PIXEL OVEN чинит продукт, но студия отвечает и за цифры. Владелец пекарни не программист: он видит очередь в приложении и пустую кассу. Пока команда восстанавливает файлы, вам нужно посчитать, сколько остаётся с одного среднего заказа после продуктов, курьера и комиссии.",
    task: "По фактам ниже посчитайте прибыль пекарни с одного заказа.",
    nextHook:
      "С заказа остаётся 100 ₽ — бизнес живой, если не раздавать скидки всем подряд. А «КРАКЕН» как раз сломал условие скидки.",
    difficulty: "medium",
    skills: ["экономика"],
    basePoints: 150,
    timeLimitSec: 110,
    hint: "2% от 500 ₽ — это 10 ₽. Вычитайте по очереди: продукты, курьер, комиссия.",
    explanation:
      "Вы посчитали юнит-экономику — прибыль с одного заказа. Именно так проверяют, выживет ли идея: если с заказа остаётся 100 ₽, то реклама дороже 100 ₽ за клиента делает бизнес убыточным.",
    question: "Сколько денег остаётся пекарне с одного среднего заказа?",
    facts: [
      "Средний заказ в приложении — 500 ₽",
      "Себестоимость продуктов — 300 ₽",
      "Оплата курьеру — 90 ₽",
      "Комиссия платёжной системы — 2% от суммы заказа",
    ],
    options: [
      { id: "e1", text: "200 ₽" },
      { id: "e2", text: "110 ₽" },
      { id: "e3", text: "100 ₽" },
      { id: "e4", text: "10 ₽" },
    ],
    correctIds: ["e3"],
    multiple: false,
  },
  {
    id: "discount-logic",
    kind: "order",
    title: "Скидку получают все",
    chapter: "Правило скидки",
    fileName: "скидки.логика",
    story:
      "Маркетинг «Корки» обещал 10% только на заказы от 1000 ₽ — чтобы люди брали больше. После атаки скидку получает даже тот, кто купил одну булочку. Вы только что видели: с заказа и так остаётся 100 ₽. Раздать их всем — значит работать в минус.",
    task: "Соберите условие так, чтобы скидка включалась только для больших заказов.",
    nextHook:
      "Скидка больше не съедает маржу. Юрист пекарни смотрит на форму заказа: имя, телефон, адрес. «Вы вообще имеете право это собирать?»",
    difficulty: "medium",
    skills: ["логика", "экономика"],
    basePoints: 170,
    timeLimitSec: 120,
    hint: "ЕСЛИ идёт первым, за ним — действия при выполненном условии, затем ИНАЧЕ, и только в самом конце КОНЕЦ ЕСЛИ.",
    explanation:
      "Ветвление — место, где ошибка стоит дороже всего: одна строка не на месте, и вы дарите скидку всем подряд. В реальных проектах такие правила описывает бизнес-аналитик, а проверяют тесты.",
    lines: [
      { id: "d1", text: "ЕСЛИ Заказ.Сумма >= 1000 ₽ ТО" },
      { id: "d2", text: "Применить(Скидка 10%)", indent: 1 },
      {
        id: "d3",
        text: 'Показать(Сообщение "Скидка за большой заказ")',
        indent: 1,
      },
      { id: "d4", text: "ИНАЧЕ" },
      { id: "d5", text: "Применить(Скидка 0%)", indent: 1 },
      { id: "d6", text: "КОНЕЦ ЕСЛИ" },
    ],
  },
  {
    id: "personal-data",
    kind: "choice",
    title: "Звонок юриста",
    chapter: "Данные клиентов",
    fileName: "согласие.документ",
    story:
      "Чтобы курьер привёз хлеб, «ХлебТут» просит имя, телефон и адрес. Это не «просто поля в форме» — это персональные данные живых людей. Релиз без ответа юристу не подпишут: пекарня боится штрафа сильнее, чем серого экрана.",
    task: "Выберите, что обязательно сделать до сбора таких данных.",
    nextHook:
      "Согласие и политика должны быть в продукте. Осталось вернуть карту требований: «КРАКЕН» стёр, какие функции заказчик вообще просил.",
    difficulty: "medium",
    skills: ["право"],
    basePoints: 160,
    timeLimitSec: 110,
    hint: "Имя, телефон и адрес — это персональные данные. Ключевое слово в законе — согласие.",
    explanation:
      "Это Федеральный закон № 152-ФЗ «О персональных данных». Бизнес-информатик здесь переводчик: юрист говорит «нужно согласие», а вы понимаете, что в приложении появятся отдельный экран, галочка и запись в базе.",
    question: "Что обязательно сделать, прежде чем собирать эти данные?",
    facts: [
      "Приложение просит имя, телефон и адрес доставки",
      "Данные хранятся в базе пекарни и передаются курьеру",
    ],
    options: [
      {
        id: "p1",
        text: "Получить согласие пользователя на обработку персональных данных и опубликовать политику конфиденциальности",
      },
      {
        id: "p2",
        text: "Ничего: раз данные нужны для доставки, спрашивать разрешение не требуется",
      },
      {
        id: "p3",
        text: 'Добавить мелким шрифтом приписку «студия не несёт ответственности»',
      },
      {
        id: "p4",
        text: "Просто хранить данные на зарубежном сервере, чтобы закон не применялся",
      },
    ],
    correctIds: ["p1"],
    multiple: false,
  },
  {
    id: "requirements",
    kind: "match",
    title: "Перевод с языка заказчика",
    chapter: "Что пекарня хотела получить",
    fileName: "требования.карта",
    story:
      "PIXEL OVEN собирала «ХлебТут» не из воздуха: владелец «Корки» на созвоне говорил обычными фразами. «КРАКЕН» стёр карту, где эти фразы превращены в функции. Без неё команда не знает, что ещё должно работать к утру — отчёт, статус курьера, часы работы, бонусы.",
    task: "Соедините фразу заказчика с функцией, которая её выполняет.",
    nextHook:
      "Карта требований на месте. Последний сломанный модуль — курьеры. Без них заказ принят, оплачен и никуда не едет.",
    difficulty: "hard",
    skills: ["аналитика", "экономика"],
    basePoints: 200,
    timeLimitSec: 140,
    hint: "Ищите в фразе главное слово: «видеть» — это отчёт, «когда приедет» — статус, «когда закрыта» — условие, «возвращались» — бонусы.",
    explanation:
      "Вы поработали системным аналитиком: превратили пожелания на человеческом языке в требования к системе. Это ядро профессии — заказчик почти никогда не говорит готовыми функциями.",
    left: [
      { id: "r1", text: "«Хочу видеть, какие булочки берут чаще»" },
      { id: "r2", text: "«Клиент должен понимать, когда приедет курьер»" },
      { id: "r3", text: "«Не принимайте заказы, когда пекарня закрыта»" },
      { id: "r4", text: "«Хочу, чтобы постоянные клиенты возвращались»" },
    ],
    right: [
      { id: "f1", text: "Отчёт(Продажи по товарам)" },
      { id: "f2", text: "Показать(Статус заказа, Карта курьера)" },
      { id: "f3", text: "ЕСЛИ Время в РабочихЧасах ТО Принять(Заказ)" },
      { id: "f4", text: "Начислить(Бонусы, 5% от заказа)" },
    ],
    pairs: { r1: "f1", r2: "f2", r3: "f3", r4: "f4" },
  },
  {
    id: "couriers",
    kind: "fill",
    title: "Финальный модуль: курьеры",
    chapter: "Доставка до двери",
    fileName: "курьеры.логика",
    story:
      "Цепочка почти собрана: приложение открывается, корзина чистая, заказ уходит в пекарню, скидка и закон на месте. Осталось раздать живые заказы курьерам. Две команды вырезаны из цикла — без них хлеб останется на полке, а клиент будет ждать на карте.",
    task: "Верните в цикл две вырезанные команды: найти курьера рядом с пекарней и назначить ему заказ.",
    nextHook:
      "Сборка собирается. Релиз можно выпускать. Если останутся силы — маркетолог, инвестор и платёжный сбой ещё попросят вас не уходить.",
    difficulty: "hard",
    skills: ["алгоритмы", "логика"],
    basePoints: 210,
    timeLimitSec: 150,
    hint: "Сначала курьера нужно найти, и только потом проверять, найден ли он. А внутри ЕСЛИ найденному курьеру уже можно отдать заказ.",
    explanation:
      "Цикл «для каждого» — то, как программы одинаково обрабатывают сотни заказов. Обратите внимание на порядок: сначала действие, потом проверка результата, иначе приложение проверяет то, чего ещё не произошло.",
    template: [
      { type: "line", text: "ДЛЯ КАЖДОГО Заказ ИЗ Заказы.Новые" },
      { type: "slot", id: "k1", indent: 1 },
      { type: "line", text: "ЕСЛИ Курьер.Найден ТО", indent: 1 },
      { type: "slot", id: "k2", indent: 2 },
      {
        type: "line",
        text: 'Отправить(Сообщение клиенту "Курьер выехал")',
        indent: 2,
      },
      { type: "line", text: "ИНАЧЕ", indent: 1 },
      { type: "line", text: "Добавить(Заказ, Очередь.Ожидание)", indent: 2 },
      { type: "line", text: "КОНЕЦ ЕСЛИ", indent: 1 },
      { type: "line", text: "КОНЕЦ ДЛЯ" },
    ],
    bank: [
      { id: "m1", text: "Найти(Курьер, рядом с пекарней)" },
      { id: "m2", text: "Назначить(Заказ, Курьер)" },
      { id: "m3", text: "Удалить(Заказ)" },
      { id: "m4", text: 'Отправить(Заказ, "kraken-cloud.ru")' },
      { id: "m5", text: "Повысить(Цена доставки, 300%)" },
      { id: "m6", text: 'Показать(Ошибка "Что-то пошло не так")' },
    ],
    solution: { k1: "m1", k2: "m2" },
  },
];

const BONUS_LIST: LevelDef[] = [
  {
    id: "spam-law",
    kind: "find",
    title: "Сверхурочные: рассылка",
    chapter: "После релиза · маркетинг",
    fileName: "рассылка.логика",
    story:
      "«ХлебТут» снова собирается, но маркетолог «Корки» уже написал рассылку «всем, кто когда-либо оставлял телефон». Он просит «быстро глянуть перед утром». Если отправить это как есть, пекарню оштрафуют — и релиз вспоминать не будут.",
    task: "Найдите две строки, из-за которых пекарню ждёт штраф.",
    nextHook:
      "Спам-ловушку сняли. В переговорку заходит инвестор: готов дать денег на рекламу приложения, если вы объясните два числа.",
    difficulty: "bonus",
    skills: ["право", "безопасность"],
    basePoints: 220,
    timeLimitSec: 120,
    hint: "Ищите строку, которая отправляет то, о чём не спрашивали, и строку, которая мешает от рассылки отказаться.",
    explanation:
      "Закон «О рекламе» требует предварительного согласия на рассылку, а отказаться от неё человек должен одним нажатием. Штраф за спам легко превышает месячную выручку небольшой пекарни.",
    lines: [
      { id: "s1", text: "Взять(Список клиентов, База пекарни)" },
      { id: "s2", text: "Отправить(Реклама, Всем клиентам без согласия)" },
      { id: "s3", text: 'Скрыть(Кнопка "Отписаться от рассылки")' },
      { id: "s4", text: "Записать(Отчёт о рассылке, Панель управления)" },
    ],
    badIds: ["s2", "s3"],
  },
  {
    id: "metrics",
    kind: "choice",
    title: "Сверхурочные: разговор с инвестором",
    chapter: "После релиза · рост",
    fileName: "метрики.расчёт",
    story:
      "Инвестор не спрашивает, красиво ли кнопка нарисована. Он спрашивает: сколько стоит новый клиент и сколько он приносит за год. Это решение о деньгах на рекламу «ХлебТут» — его тоже принимает студия, не только пекарня.",
    task: "По двум цифрам выберите верный вывод для руководителя.",
    nextHook:
      "Рекламу можно масштабировать. Последняя дыра: оплата работает, только когда всё идёт хорошо. Если платёж не прошёл — приложение зависает.",
    difficulty: "bonus",
    skills: ["экономика", "аналитика"],
    basePoints: 230,
    timeLimitSec: 120,
    hint: "Сравните, сколько клиент стоит и сколько он приносит. Отношение 900 к 300 — и есть ответ.",
    explanation:
      "LTV / CAC = 3 — классический ориентир здорового роста. Такие метрики считают, чтобы решение о рекламе принимали цифры, а не интуиция.",
    question: "Что эти цифры говорят руководителю?",
    facts: [
      "Привлечение одного нового клиента через рекламу — 300 ₽ (CAC)",
      "За год один клиент приносит 900 ₽ прибыли (LTV)",
    ],
    options: [
      {
        id: "i1",
        text: "Каждый рубль рекламы возвращается тройной прибылью — рекламу можно масштабировать",
      },
      {
        id: "i2",
        text: "Реклама убыточна: клиент стоит дороже, чем приносит",
      },
      {
        id: "i3",
        text: "Цифры бесполезны, пока мы не узнаем выручку конкурентов",
      },
      {
        id: "i4",
        text: "Единственный выход — поднять цену доставки в три раза",
      },
    ],
    correctIds: ["i1"],
    multiple: false,
  },
  {
    id: "payment-recovery",
    kind: "order",
    title: "Сверхурочные: оплата не прошла",
    chapter: "После релиза · оплата",
    fileName: "оплата.логика",
    story:
      "Последняя правка перед тем, как студия погасит свет: сценарий оплаты написан только для счастливого случая. Если банк ответил отказом, «ХлебТут» зависает — клиент думает, что деньги сняли, пекарня думает, что заказа нет.",
    task: "Соберите сценарий, который корректно обрабатывает и успех, и ошибку.",
    nextHook: "Ночь закрыта. «ХлебТут» можно выпускать.",
    difficulty: "bonus",
    skills: ["алгоритмы", "логика"],
    basePoints: 240,
    timeLimitSec: 160,
    hint: "Сначала всё, что происходит при успешной оплате, затем ветка ИНАЧЕ с возвратом денег, и только в конце — закрывающие строки.",
    explanation:
      "Половина реальной разработки — не «как должно работать», а «что делать, если сломалось». Именно поэтому в IT так ценят внимание к пограничным случаям.",
    lines: [
      { id: "y1", text: "Начать(Оплата, Сумма заказа)" },
      { id: "y2", text: "ЕСЛИ Платёж.Подтверждён ТО" },
      { id: "y3", text: "Сохранить(Заказ, База пекарни)", indent: 1 },
      { id: "y4", text: 'Показать(Экран "Заказ принят")', indent: 1 },
      { id: "y5", text: "ИНАЧЕ" },
      { id: "y6", text: "Вернуть(Деньги, Клиенту)", indent: 1 },
      {
        id: "y7",
        text: 'Показать(Сообщение "Оплата не прошла, попробуйте снова")',
        indent: 1,
      },
      { id: "y8", text: "КОНЕЦ ЕСЛИ" },
    ],
  },
];

export const REQUIRED_LEVEL_IDS = LEVEL_LIST.map((level) => level.id);
export const BONUS_LEVEL_IDS = BONUS_LIST.map((level) => level.id);

const LEVELS_BY_ID = new Map<string, LevelDef>(
  [...LEVEL_LIST, ...BONUS_LIST].map((level) => [level.id, level]),
);

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS_BY_ID.get(id);
}

export function isBonusLevel(id: string): boolean {
  return BONUS_LEVEL_IDS.includes(id);
}

/** Убирает правильные ответы и перемешивает варианты, чтобы соседи не списывали. */
export function sanitizeLevel(
  def: LevelDef,
  seed: string,
  position: number,
): PublicLevel {
  const shared = {
    id: def.id,
    title: def.title,
    chapter: def.chapter,
    story: def.story,
    task: def.task,
    difficulty: def.difficulty,
    skills: def.skills,
    basePoints: def.basePoints,
    timeLimitSec: def.timeLimitSec,
    position,
    isBonus: isBonusLevel(def.id),
    hintAvailable: Boolean(def.hint),
    fileName: def.fileName,
  };

  switch (def.kind) {
    case "order": {
      let lines = seededShuffle(def.lines, `${seed}:${def.id}:lines`);
      const isUnchanged = lines.every((line, i) => line.id === def.lines[i].id);
      if (isUnchanged) lines = [...lines].reverse();
      return { ...shared, kind: "order", lines };
    }
    case "fill":
      return {
        ...shared,
        kind: "fill",
        template: def.template,
        bank: seededShuffle(def.bank, `${seed}:${def.id}:bank`),
      };
    case "find":
      return {
        ...shared,
        kind: "find",
        lines: def.lines,
        selectCount: def.badIds.length,
      };
    case "choice":
      return {
        ...shared,
        kind: "choice",
        question: def.question,
        facts: def.facts,
        options: seededShuffle(def.options, `${seed}:${def.id}:options`),
        multiple: def.multiple,
      };
    case "match":
      return {
        ...shared,
        kind: "match",
        left: seededShuffle(def.left, `${seed}:${def.id}:left`),
        right: seededShuffle(def.right, `${seed}:${def.id}:right`),
      };
  }
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

export function checkAnswer(def: LevelDef, answer: Answer): boolean {
  if (def.kind !== answer.kind) return false;

  switch (def.kind) {
    case "order": {
      const submitted = (answer as { order: string[] }).order;
      return (
        submitted.length === def.lines.length &&
        submitted.every((id, i) => id === def.lines[i].id)
      );
    }
    case "fill": {
      const slots = (answer as { slots: Record<string, string> }).slots ?? {};
      const slotIds = Object.keys(def.solution);
      return slotIds.every((slotId) => slots[slotId] === def.solution[slotId]);
    }
    case "find":
      return sameSet((answer as { selected: string[] }).selected ?? [], def.badIds);
    case "choice":
      return sameSet(
        (answer as { selected: string[] }).selected ?? [],
        def.correctIds,
      );
    case "match": {
      const pairs = (answer as { pairs: Record<string, string> }).pairs ?? {};
      const leftIds = Object.keys(def.pairs);
      return leftIds.every((leftId) => pairs[leftId] === def.pairs[leftId]);
    }
  }
}

/** Текстовый разбор правильного ответа — показывается, если игрок сдался. */
export function solutionLines(def: LevelDef): string[] {
  switch (def.kind) {
    case "order":
      return def.lines.map(
        (line) => `${"    ".repeat(line.indent ?? 0)}${line.text}`,
      );
    case "fill":
      return def.template.map((token) => {
        const indent = "    ".repeat(token.indent ?? 0);
        if (token.type === "line") return `${indent}${token.text}`;
        const correct = def.bank.find(
          (item) => item.id === def.solution[token.id],
        );
        return `${indent}${correct?.text ?? "?"}`;
      });
    case "find":
      return def.lines
        .filter((line) => def.badIds.includes(line.id))
        .map((line) => `Лишняя строка: ${line.text}`);
    case "choice":
      return def.options
        .filter((option) => def.correctIds.includes(option.id))
        .map((option) => `Верно: ${option.text}`);
    case "match":
      return Object.entries(def.pairs).map(([leftId, rightId]) => {
        const left = def.left.find((item) => item.id === leftId);
        const right = def.right.find((item) => item.id === rightId);
        return `${left?.text ?? "?"} → ${right?.text ?? "?"}`;
      });
  }
}

