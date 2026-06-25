import { Locale, i18n } from "../../utils";
import type { Tokens } from "./types";

export const dictionary = i18n.dictionary({
  price: i18n.template<Tokens.Price>({
    [Locale.En]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "GBP" })
        .format(tokens.amount);
    },
    [Locale.Fr]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "EUR" })
        .format(tokens.amount);
    },
    [Locale.De]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "EUR" })
        .format(tokens.amount);
    },
    [Locale.It]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "EUR" })
        .format(tokens.amount);
    },
    [Locale.Es]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "EUR" })
        .format(tokens.amount);
    },
    [Locale.Ar]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "AED" })
        .format(tokens.amount);
    },
    [Locale.Ja]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "JPY" })
        .format(tokens.amount);
    },
    [Locale.Ru]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "RUB" })
        .format(tokens.amount);
    },
    [Locale.Uk]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "UAH" })
        .format(tokens.amount);
    },
    [Locale.Ka]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "GEL" })
        .format(tokens.amount);
    },
    [Locale.Zh]({ tokens, helpers }) {
      return helpers
        .numberFormat({ style: "currency", currency: "CNY" })
        .format(tokens.amount);
    },
  }),

  espressoName: i18n.template({
    [Locale.En]: () => "Espresso",
    [Locale.Fr]: () => "Expresso",
    [Locale.De]: () => "Espresso",
    [Locale.It]: () => "Espresso",
    [Locale.Es]: () => "Espresso",
    [Locale.Ar]: () => "إسبريسو",
    [Locale.Ja]: () => "エスプレッソ",
    [Locale.Ru]: () => "Эспрессо",
    [Locale.Uk]: () => "Еспресо",
    [Locale.Ka]: () => "ესპრესო",
    [Locale.Zh]: () => "浓缩咖啡",
  }),
  espressoDescription: i18n.template({
    [Locale.En]: () =>
      "A small, concentrated shot brewed by forcing hot water through finely-ground beans under pressure.",
    [Locale.Fr]: () =>
      "Un café court et concentré, obtenu en faisant passer de l'eau chaude sous pression à travers des grains finement moulus.",
    [Locale.De]: () =>
      "Ein kleiner, konzentrierter Kaffeeschuss, gebrüht indem heißes Wasser unter Druck durch fein gemahlene Bohnen gepresst wird.",
    [Locale.It]: () =>
      "Un caffè breve e concentrato, ottenuto facendo passare acqua calda sotto pressione attraverso chicchi macinati finemente.",
    [Locale.Es]: () =>
      "Un café corto y concentrado, preparado pasando agua caliente bajo presión a través de granos finamente molidos.",
    [Locale.Ar]: () =>
      "جرعة قهوة قصيرة ومركّزة، تُحضَّر بدفع الماء الساخن تحت الضغط عبر حبوب مطحونة ناعماً.",
    [Locale.Ja]: () =>
      "細かく挽いた豆に高圧の熱湯を通して抽出した、小さく濃厚なショット。",
    [Locale.Ru]: () =>
      "Маленькая концентрированная порция кофе, приготовленная пропусканием горячей воды под давлением через мелко молотые зёрна.",
    [Locale.Uk]: () =>
      "Невелика концентрована порція кави, заварена пропусканням гарячої води під тиском крізь дрібно змелені зерна.",
    [Locale.Ka]: () =>
      "მცირე, კონცენტრირებული ულუფა, რომელიც მზადდება ცხელი წყლის ზეწოლის ქვეშ წვრილად დაფქული მარცვლების გავლით.",
    [Locale.Zh]: () => "用细磨咖啡豆在高压下萃取的小份浓缩咖啡。",
  }),

  cappuccinoName: i18n.template({
    [Locale.En]: () => "Cappuccino",
    [Locale.Fr]: () => "Cappuccino",
    [Locale.De]: () => "Cappuccino",
    [Locale.It]: () => "Cappuccino",
    [Locale.Es]: () => "Cappuccino",
    [Locale.Ar]: () => "كابتشينو",
    [Locale.Ja]: () => "カプチーノ",
    [Locale.Ru]: () => "Капучино",
    [Locale.Uk]: () => "Капучино",
    [Locale.Ka]: () => "კაპუჩინო",
    [Locale.Zh]: () => "卡布奇诺",
  }),
  cappuccinoDescription: i18n.template({
    [Locale.En]: () =>
      "Equal parts espresso, steamed milk, and a thick crown of milk foam.",
    [Locale.Fr]: () =>
      "Un espresso surmonté de lait chaud à parts égales et d'une épaisse couronne de mousse de lait.",
    [Locale.De]: () =>
      "Espresso mit gleichen Teilen heißer Milch und einer dicken Krone aus Milchschaum.",
    [Locale.It]: () =>
      "Un espresso con pari parti di latte caldo e una densa corona di schiuma di latte.",
    [Locale.Es]: () =>
      "Un espresso con partes iguales de leche caliente y una espesa corona de espuma de leche.",
    [Locale.Ar]: () =>
      "كميات متساوية من الإسبريسو والحليب المبخّر، يعلوها تاج كثيف من رغوة الحليب.",
    [Locale.Ja]: () =>
      "エスプレッソ、スチームミルク、そして厚いミルクフォームの王冠が等しい割合。",
    [Locale.Ru]: () =>
      "Равные части эспрессо и взбитого молока, увенчанные густой шапкой молочной пены.",
    [Locale.Uk]: () =>
      "Рівні частини еспресо та спіненого молока, увінчані густою короною молочної піни.",
    [Locale.Ka]: () =>
      "ესპრესოს, ნაორთქლი რძისა და სქელი რძის ქაფის გვირგვინი თანაბარი წილებით.",
    [Locale.Zh]: () => "等量的浓缩咖啡、蒸奶和厚厚的奶泡。",
  }),

  latteName: i18n.template({
    [Locale.En]: () => "Latte",
    [Locale.Fr]: () => "Café Latte",
    [Locale.De]: () => "Latte",
    [Locale.It]: () => "Caffè Latte",
    [Locale.Es]: () => "Café con Leche",
    [Locale.Ar]: () => "لاتيه",
    [Locale.Ja]: () => "ラテ",
    [Locale.Ru]: () => "Латте",
    [Locale.Uk]: () => "Лате",
    [Locale.Ka]: () => "ლატე",
    [Locale.Zh]: () => "拿铁",
  }),
  latteDescription: i18n.template({
    [Locale.En]: () =>
      "A generous pour of steamed milk over a single shot of espresso, topped with a thin layer of foam.",
    [Locale.Fr]: () =>
      "Un grand verre de lait chaud versé sur un espresso, garni d'une fine couche de mousse.",
    [Locale.De]: () =>
      "Großzügig aufgeschäumte Milch über einem Espresso, gekrönt von einer feinen Schaumschicht.",
    [Locale.It]: () =>
      "Generosa colata di latte caldo su un singolo espresso, sormontato da uno strato sottile di schiuma.",
    [Locale.Es]: () =>
      "Una generosa cantidad de leche caliente vertida sobre un espresso, coronada por una fina capa de espuma.",
    [Locale.Ar]: () =>
      "كمية وفيرة من الحليب المبخّر فوق جرعة إسبريسو، تعلوها طبقة رقيقة من الرغوة.",
    [Locale.Ja]: () =>
      "シングルショットのエスプレッソの上にたっぷりのスチームミルクを注ぎ、薄いフォームの層をかぶせる。",
    [Locale.Ru]: () =>
      "Щедрая порция взбитого молока поверх одного эспрессо, увенчанная тонким слоем пены.",
    [Locale.Uk]: () =>
      "Щедра порція спіненого молока поверх одного еспресо, увінчана тонким шаром піни.",
    [Locale.Ka]: () =>
      "ნაორთქლი რძის ნაყვი მოცემული ერთი ულუფა ესპრესოს თავზე, ზემოდან თხელი ქაფის ფენით.",
    [Locale.Zh]: () => "在一份浓缩咖啡上倒入大量蒸奶，顶部覆盖一层薄薄的奶泡。",
  }),

  mochaName: i18n.template({
    [Locale.En]: () => "Mocha",
    [Locale.Fr]: () => "Mocha",
    [Locale.De]: () => "Mokka",
    [Locale.It]: () => "Moka",
    [Locale.Es]: () => "Moca",
    [Locale.Ar]: () => "موكا",
    [Locale.Ja]: () => "モカ",
    [Locale.Ru]: () => "Мокка",
    [Locale.Uk]: () => "Мока",
    [Locale.Ka]: () => "მოკა",
    [Locale.Zh]: () => "摩卡",
  }),
  mochaDescription: i18n.template({
    [Locale.En]: () =>
      "A chocolatey twist on the latte — espresso, steamed milk, and a swirl of dark chocolate.",
    [Locale.Fr]: () =>
      "Une variante chocolatée du latte — espresso, lait chaud et un tourbillon de chocolat noir.",
    [Locale.De]: () =>
      "Eine schokoladige Variante des Latte — Espresso, heiße Milch und ein Schuss dunkle Schokolade.",
    [Locale.It]: () =>
      "Una variante cioccolatosa del latte — espresso, latte caldo e un vortice di cioccolato fondente.",
    [Locale.Es]: () =>
      "Una variante achocolatada del latte — espresso, leche caliente y un toque de chocolate oscuro.",
    [Locale.Ar]: () =>
      "تنويعة شوكولاتية من اللاتيه — إسبريسو، حليب مبخّر، ولمسة من الشوكولاتة الداكنة.",
    [Locale.Ja]: () =>
      "チョコレート風味のラテ — エスプレッソ、スチームミルク、ダークチョコレートの渦巻き。",
    [Locale.Ru]: () =>
      "Шоколадная вариация латте — эспрессо, взбитое молоко и завихрение тёмного шоколада.",
    [Locale.Uk]: () =>
      "Шоколадна варіація лате — еспресо, спінене молоко й вихор темного шоколаду.",
    [Locale.Ka]: () =>
      "ლატეს შოკოლადის ვერსია — ესპრესო, ნაორთქლი რძე და მუქი შოკოლადის ტრიალი.",
    [Locale.Zh]: () => "拿铁的巧克力变体——浓缩咖啡、蒸奶和黑巧克力。",
  }),

  americanoName: i18n.template({
    [Locale.En]: () => "Americano",
    [Locale.Fr]: () => "Americano",
    [Locale.De]: () => "Americano",
    [Locale.It]: () => "Americano",
    [Locale.Es]: () => "Americano",
    [Locale.Ar]: () => "أمريكانو",
    [Locale.Ja]: () => "アメリカーノ",
    [Locale.Ru]: () => "Американо",
    [Locale.Uk]: () => "Американо",
    [Locale.Ka]: () => "ამერიკანო",
    [Locale.Zh]: () => "美式咖啡",
  }),
  americanoDescription: i18n.template({
    [Locale.En]: () =>
      "An espresso lengthened with hot water for a smoother, drip-style cup.",
    [Locale.Fr]: () =>
      "Un espresso allongé à l'eau chaude pour une tasse plus douce, façon café filtre.",
    [Locale.De]: () =>
      "Ein mit heißem Wasser verlängerter Espresso für eine mildere, filterkaffeeartige Tasse.",
    [Locale.It]: () =>
      "Un espresso allungato con acqua calda per una tazza più morbida, in stile filtro.",
    [Locale.Es]: () =>
      "Un espresso alargado con agua caliente para una taza más suave, estilo café de filtro.",
    [Locale.Ar]: () =>
      "إسبريسو مخفّف بالماء الساخن لفنجان أكثر نعومةً، بأسلوب القهوة المقطرة.",
    [Locale.Ja]: () =>
      "エスプレッソをお湯で薄めた、ドリップ風の口当たりの良い一杯。",
    [Locale.Ru]: () =>
      "Эспрессо, разбавленный горячей водой, для более мягкой чашки в стиле фильтр-кофе.",
    [Locale.Uk]: () =>
      "Еспресо, розбавлене гарячою водою, для м'якшої чашки у стилі фільтр-кави.",
    [Locale.Ka]: () =>
      "ცხელი წყლით განზავებული ესპრესო უფრო რბილი, ფილტრის სტილის ფინჯნისთვის.",
    [Locale.Zh]: () => "用热水稀释的浓缩咖啡，口感更柔和，类似滴滤咖啡。",
  }),

  flatWhiteName: i18n.template({
    [Locale.En]: () => "Flat White",
    [Locale.Fr]: () => "Flat White",
    [Locale.De]: () => "Flat White",
    [Locale.It]: () => "Flat White",
    [Locale.Es]: () => "Flat White",
    [Locale.Ar]: () => "فلات وايت",
    [Locale.Ja]: () => "フラットホワイト",
    [Locale.Ru]: () => "Флэт уайт",
    [Locale.Uk]: () => "Флет-вайт",
    [Locale.Ka]: () => "ფლეტ ვაიტი",
    [Locale.Zh]: () => "馥芮白",
  }),
  flatWhiteDescription: i18n.template({
    [Locale.En]: () =>
      "A double espresso topped with velvety microfoam — bolder than a latte, smoother than a cappuccino.",
    [Locale.Fr]: () =>
      "Un double espresso surmonté d'une microfoam veloutée — plus corsé qu'un latte, plus doux qu'un cappuccino.",
    [Locale.De]: () =>
      "Ein doppelter Espresso mit samtigem Mikroschaum — kräftiger als ein Latte, weicher als ein Cappuccino.",
    [Locale.It]: () =>
      "Un doppio espresso con vellutata microschiuma — più deciso di un latte, più morbido di un cappuccino.",
    [Locale.Es]: () =>
      "Un doble espresso con microespuma aterciopelada — más intenso que un latte, más suave que un cappuccino.",
    [Locale.Ar]: () =>
      "إسبريسو مزدوج تعلوه رغوة دقيقة كالحرير — أقوى من اللاتيه، أنعم من الكابتشينو.",
    [Locale.Ja]: () =>
      "ダブルエスプレッソにベルベットのようなマイクロフォームをのせた — ラテより力強く、カプチーノよりまろやか。",
    [Locale.Ru]: () =>
      "Двойной эспрессо с бархатистой микропеной — насыщеннее латте, мягче капучино.",
    [Locale.Uk]: () =>
      "Подвійне еспресо з оксамитовою мікропіною — насиченіше за лате, м'якше за капучино.",
    [Locale.Ka]: () =>
      "ორმაგი ესპრესო ხავერდოვანი მიკრო-ქაფით — ლატესთან შედარებით უფრო ძლიერი, კაპუჩინოსთან შედარებით უფრო რბილი.",
    [Locale.Zh]: () =>
      "在双份浓缩咖啡上覆盖丝滑微泡——比拿铁浓郁，比卡布奇诺顺滑。",
  }),
});
