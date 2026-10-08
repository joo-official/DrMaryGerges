/* =====================================================
   تركيبات د. ماري جرجس — Script
   ===================================================== */

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1raXbc1Cn1JDuz4StIKchTuLaQDSbO6ugIxYZbWroBm8/gviz/tq?tqx=out:csv&headers=1';
const WA = '201025220781';

// تنبيه: مفتاح textmebot ظاهر لأي حد يفتح الصفحة. الأفضل ينتقل لسيرفر وسيط (Apps Script / Cloudflare Worker)
const WA_SEND = {
  textmebotKey: 'T3hE1UW5Sucn'
};

let S = {
  wa: WA,
  products: [],
  courses: []
};

const $ = s => document.querySelector(s);

const esc = s =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  );

/* =====================================================
   الصور
   ===================================================== */

// يحوّل روابط Google Drive / Dropbox لرابط صورة مباشر، ويرفع http إلى https
function normImg(u){
  u = String(u || '').trim().replace(/[,;|]+$/, '');

  const d = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([\w-]{10,})/);
  if (d) return 'https://lh3.googleusercontent.com/d/' + d[1] + '=w1000';

  if (/^https?:\/\/(www\.)?dropbox\.com\//.test(u)){
    u = u.replace(/[?&]dl=\d/, '');
    u += (u.includes('?') ? '&' : '?') + 'raw=1';
  }

  return u.replace(/^http:\/\//i, 'https://');
}

// no-referrer: بعض المواقع (درايف وغيره) بتمنع الصورة لو جاية من موقع تاني، وده سبب إنها تظهر في الإيديتور وما تظهرش في كروم
// onerror: لو الصورة اتكسرت نخفيها ونعرض الإيموجي البديل بدل أيقونة مكسورة
const imgHTML = (src, alt = '', attrs = '') =>
  `<img ${attrs} src="${esc(src)}" alt="${esc(alt)}" referrerpolicy="no-referrer" decoding="async" onerror="this.classList.add('broken')">`;


const CATS = [
  ['hair','منتجات الشعر','💆‍♀️'],
  ['skin','منتجات البشرة','🌿'],
  ['basic','منتجات أساسية','🧴']
];

const price = p =>
  p > 0 ? p + ' ج.م' : 'السعر عند الطلب';

let cart = {},
    q = 1,
    CI = [],
    IT = [],
    TT = 0,
    CU = { n:'', p:'', a:'' };

try {
  CU = JSON.parse(localStorage.getItem('mg_cu')) || CU;
} catch(e) {}

try {
  cart = JSON.parse(localStorage.getItem('mg_cart') || '{}');
} catch(e) {}

const sv = () => {
  try {
    localStorage.setItem('mg_cart', JSON.stringify(cart));
  } catch(e) {}
};

const gp = id => S.products.find(p => p.id === id);
const gn = n => S.products.find(p => p.name === n);


/* =====================================================
   Toast
   ===================================================== */

function toast(s){
  const t = $('#t');
  if (!t) return;

  t.textContent = s;
  t.style.display = 'block';

  clearTimeout(window._tt);

  window._tt = setTimeout(() => {
    t.style.display = 'none';
  }, 2200);
}


/* =====================================================
   Modal
   ===================================================== */

function modal(h){
  $('#m').innerHTML = `
    <div class="md" onclick="if(event.target===this)cm()">
      <div class="sh">${h}</div>
    </div>
  `;
}

function cm(){
  $('#m').innerHTML = '';
}


/* =====================================================
   Product Card
   ===================================================== */

function pc(p){
  const c = CATS.find(x => x[0] === p.cat) || CATS[2];

  return `
    <div class="pc rv" onclick="op('${p.id}')">

      <div class="im t-${p.cat || 'basic'}" data-fb="${c[2]}">
        ${
          p.img
            ? imgHTML(p.img, p.name, 'loading="lazy"')
            : `<span>${c[2]}</span>`
        }
      </div>

      <div class="pi">

        <h3>${esc(p.name)}</h3>

        ${
          p.desc
            ? `<p class="cl">${esc(p.desc)}</p>`
            : ''
        }

        <div class="pr">
          <b>${price(p.price)}</b>

          <button
            class="ad2"
            onclick="event.stopPropagation();add('${p.id}')">
            + للسلة
          </button>
        </div>

      </div>
    </div>
  `;
}


/* =====================================================
   Courses
   ===================================================== */

function cc(c){

  const ps = (c.ids || [])
    .map(gp)
    .filter(Boolean);

  const tot =
    c.price > 0
      ? c.price
      : ps.reduce((a,p) => a + (+p.price || 0), 0);

  return `
    <div class="cc rv">

      <span class="tag">كورس</span>

      <h3>${esc(c.name)}</h3>

      ${
        c.desc
          ? `<p>${esc(c.desc)}</p>`
          : ''
      }

      <ul>
        ${
          ps.map(p => `
            <li onclick="op('${p.id}')">
              <span>${esc(p.name)}</span>
              <i>${price(p.price)}</i>
            </li>
          `).join('')
          ||
          '<li class="soon">المنتجات قريباً ✨</li>'
        }
      </ul>

      ${
        tot > 0
          ? `
            <div class="tot">
              <span>إجمالي الكورس</span>
              <span>${tot} ج.م</span>
            </div>
          `
          : ''
      }

      ${
        ps.length
          ? `
            <button
              class="ad3"
              onclick="addC('${c.id}')">
              أضف الكورس للسلة 🛒
            </button>
          `
          : ''
      }

    </div>
  `;
}


/* =====================================================
   Open Product
   ===================================================== */

function op(id){

  const p = gp(id);

  if (!p) return;

  q = 1;

  const c =
    CATS.find(x => x[0] === p.cat) || CATS[2];

  /*
     الصور محفوظة في p.imgs
     ولو لم توجد نستخدم p.img
  */

  const imgs =
    Array.isArray(p.imgs) && p.imgs.length
      ? p.imgs
      : p.img
        ? [p.img]
        : [];

  const mainImg = imgs[0] || '';

  const gallery = imgs.length
    ? `
      <div class="product-gallery">

        <div class="gallery-main" data-fb="${c[2]}">

          ${imgHTML(mainImg, p.name, 'id="mainProductImg"')}

        </div>

        ${
          imgs.length > 1
            ? `
              <div class="gallery-thumbs">

                ${imgs.map((img, i) => `
                  <button
                    type="button"
                    class="gallery-thumb ${i === 0 ? 'active' : ''}"
                    data-src="${esc(img)}"
                    onclick="changeProductImg(this.dataset.src, this)"
                  >

                    ${imgHTML(img)}

                  </button>
                `).join('')}

              </div>
            `
            : ''
        }

      </div>
    `
    : `
      <div class="im big t-${p.cat || 'basic'}">
        <span>${c[2]}</span>
      </div>
    `;


  modal(`

    <button
      class="x"
      onclick="cm()">
      ✕
    </button>

    ${gallery}

    <div class="tg">
      ${p.cat ? c[1] : 'ضمن كورس'}
    </div>

    <div class="dn">
      ${esc(p.name)}
    </div>

    <div class="dp">
      ${price(p.price)}
    </div>

    <h4>
      وصف المنتج
    </h4>

    <p class="dd">
      ${
        esc(p.desc) ||
        'من تركيبات الدكتورة ماري جرجس.'
      }
    </p>

    <div class="qr">

      <span>
        الكمية
      </span>

      <div class="qs">

        <button onclick="qc(-1)">
          −
        </button>

        <b id="qn">
          1
        </b>

        <button onclick="qc(1)">
          +
        </button>

      </div>

    </div>

    <button
      class="pri full"
      onclick="add('${id}',q);cm();ct(1)">
      أضف للسلة 🛒
    </button>

  `);
}


/* =====================================================
   Change Product Image
   ===================================================== */

function changeProductImg(src, btn){

  const main =
    document.querySelector('#mainProductImg');

  if (main){
    main.classList.remove('broken');
    main.src = src;
  }

  document
    .querySelectorAll('.gallery-thumb')
    .forEach(x => {
      x.classList.remove('active');
    });

  if (btn){
    btn.classList.add('active');
  }
}


/* =====================================================
   Quantity
   ===================================================== */

function qc(d){

  q = Math.max(1, q + d);

  const el = $('#qn');

  if (el){
    el.textContent = q;
  }
}


/* =====================================================
   Cart
   ===================================================== */

function add(id, n){

  const p = gp(id);

  if (!p) return;

  cart[p.name] =
    (cart[p.name] || 0) + (n || 1);

  sv();
  rc();

  toast('اتضاف للسلة ✓');
}


function addC(id){

  const c =
    S.courses.find(x => x.id === id);

  if (!c) return;

  c.ids
    .map(gp)
    .filter(Boolean)
    .forEach(p => {
      cart[p.name] =
        (cart[p.name] || 0) + 1;
    });

  sv();
  rc();
  ct(1);
}


function cq(i, d){

  const n = CI[i];

  if (!n) return;

  cart[n] =
    (cart[n] || 0) + d;

  if (cart[n] <= 0){
    delete cart[n];
  }

  sv();
  rc();
}


/* =====================================================
   Render Cart
   ===================================================== */

function rc(){

  const it =
    Object.keys(cart)
      .map(n => [n, gn(n), cart[n]])
      .filter(x => x[1]);

  CI = it.map(x => x[0]);

  const cnt =
    it.reduce((a,x) => a + x[2], 0);

  const tot =
    it.reduce(
      (a,x) => a + x[1].price * x[2],
      0
    );

  const np =
    it.some(x => !x[1].price);

  IT = it;
  TT = tot;


  const b = $('#cn');

  if (b){

    b.textContent =
      cnt || '';

    b.style.display =
      cnt ? 'grid' : 'none';
  }


  const e = $('#cb');

  if (!e) return;


  e.innerHTML = it.length

    ? it.map((x,i) => `

        <div class="ci">

          <div class="cm" data-fb="🧴">

            ${
              x[1].img
                ? imgHTML(x[1].img)
                : '🧴'
            }

          </div>

          <div class="cd">

            <b>
              ${esc(x[0])}
            </b>

            <span>
              ${price(x[1].price)}
            </span>

            <div class="qs">

              <button onclick="cq(${i},-1)">
                −
              </button>

              <b>
                ${x[2]}
              </b>

              <button onclick="cq(${i},1)">
                +
              </button>

            </div>

          </div>

        </div>

      `).join('')

      + `
        <div class="tot2">

          <span>
            الإجمالي
          </span>

          <b>
            ${tot} ج.م
          </b>

        </div>
      `

      + (
        np
          ? `
            <small>
              بعض المنتجات سعرها عند الطلب
              وغير محسوبة في الإجمالي
            </small>
          `
          : ''
      )

      + `
        <div class="cf">

          <b>
            بيانات الطلب
          </b>

          <input
            placeholder="الاسم"
            value="${esc(CU.n || '')}"
            oninput="CU.n=this.value;su()"
          >

          <input
            type="tel"
            inputmode="tel"
            placeholder="رقم التليفون"
            value="${esc(CU.p || '')}"
            oninput="CU.p=this.value;su()"
          >

          <input
            placeholder="العنوان"
            value="${esc(CU.a || '')}"
            oninput="CU.a=this.value;su()"
          >

        </div>
      `

      + `
        <button
          class="pri full"
          id="ckb"
          onclick="ck()">
          إتمام الطلب 🛒
        </button>
      `

      + `
        <div class="note">
          سيتم التواصل معك لتأكيد الطلب 🤍
        </div>
      `

    : `
      <div class="empty">
        السلة فاضية 🛒
      </div>
    `;
}


/* =====================================================
   Save Customer Data
   ===================================================== */

function su(){

  try {
    localStorage.setItem(
      'mg_cu',
      JSON.stringify(CU)
    );
  } catch(e) {}

}


/* =====================================================
   WhatsApp
   ===================================================== */

async function sendWA(text){

  const to =
    '+' +
    String(S.wa || '').replace(/\D/g,'');


  if (
    WA_SEND.textmebotKey
  ){

    const u =
      'https://api.textmebot.com/send.php'
      + '?recipient=' +
      encodeURIComponent(to)
      + '&apikey=' +
      encodeURIComponent(
        WA_SEND.textmebotKey
      )
      + '&text=' +
      encodeURIComponent(text);

    await fetch(u, {
      mode: 'no-cors',
      cache: 'no-store'
    });

    return true;
  }


  return false;
}


/* =====================================================
   Order Done
   ===================================================== */

function done(n){

  modal(`

    <button
      class="x"
      onclick="cm()">
      ✕
    </button>

    <div class="done">

      <div class="ok">
        ✓
      </div>

      <h3>
        وصلنا طلبك يا ${esc(n)}!
      </h3>

      <p>
        تم إرسال طلبك للمتجر بنجاح 🤍
      </p>

      <p class="note2">
        سيتم التواصل معك لتأكيد الطلب في أقرب وقت
      </p>

      <button
        class="pri full"
        onclick="cm()">
        تمام
      </button>

    </div>

  `);
}


/* =====================================================
   Checkout
   ===================================================== */

async function ck(){

  const n =
    (CU.n || '').trim();

  const p =
    (CU.p || '')
      .replace(
        /[٠-٩]/g,
        d => AR.indexOf(d)
      )
      .replace(/\D/g,'');


  if (!n || p.length < 8){

    toast(
      'اكتب اسمك ورقم تليفونك الأول'
    );

    return;
  }


  const t =
    'طلب جديد 🛒\n' +
    'الاسم: ' + n +
    '\nالتليفون: ' + p +
    (
      CU.a
        ? '\nالعنوان: ' + CU.a
        : ''
    ) +
    '\n\nالطلب:\n' +

    IT.map(x =>
      '• ' +
      x[0] +
      ' × ' +
      x[2] +
      (
        x[1].price
          ? ' = ' +
            x[1].price * x[2] +
            ' ج.م'
          : ''
      )
    ).join('\n') +

    '\n\nالإجمالي: ' +
    TT +
    ' ج.م' +

    '\n\n(سيتم التواصل مع العميل لتأكيد الطلب)';


  const b = $('#ckb');

  if (b){

    b.disabled = true;

    b.textContent =
      'جاري إرسال الطلب...';
  }


  let ok = false;

  try {
    ok = await sendWA(t);
  } catch(e) {
    ok = false;
  }


  if (b){

    b.disabled = false;

    b.textContent =
      'إتمام الطلب 🛒';
  }


  if (ok){

    cart = {};

    sv();
    rc();
    ct(0);
    done(n);

  } else {

    window.open(
      'https://wa.me/' +
      S.wa +
      '?text=' +
      encodeURIComponent(t),
      '_blank'
    );

    toast(
      'افتح واتساب واضغط إرسال'
    );
  }
}


/* =====================================================
   Drawers
   ===================================================== */

function dr(o){

  $('#dw').classList.toggle(
    'on',
    o
  );

  $('#ov').classList.toggle(
    'on',
    o
  );
}


function ct(o){

  $('#cp').classList.toggle(
    'on',
    o
  );

  $('#ov').classList.toggle(
    'on',
    o
  );
}


function cl(){

  dr(0);
  ct(0);
}


/* =====================================================
   Render Website
   ===================================================== */

function render(){

  const sec =
    CATS.map(c => {

      const l =
        S.products.filter(
          p => p.cat === c[0]
        );

      return `
        <section id="${c[0]}">

          <div class="wrap">

            <h2>
              ${c[1]}
            </h2>

            <div class="sub">
              ${c[2]}
              تركيبات محضّرة بعناية
            </div>

            <div class="grid">

              ${
                l.map(pc).join('')
                ||
                `
                  <div class="empty">
                    قريباً ✨ منتجات جديدة على الطريق
                  </div>
                `
              }

            </div>

          </div>

        </section>
      `;

    }).join('');


  const hc =
    S.courses.length > 0;


  const crs =
    hc
      ? `
        <section id="courses">

          <div class="wrap">

            <h2>
              كورسات
            </h2>

            <div class="sub">
              برامج متكاملة لمشكلة محددة،
              كل كورس فيه منتجاته
            </div>

            <div class="cs">
              ${S.courses.map(cc).join('')}
            </div>

          </div>

        </section>
      `
      : '';


  const mq =
    'عناية بالبشرة ✦ عناية بالجسم ✦ عناية بالشعر ✦ '
      .repeat(6);


  $('#app').innerHTML = `

    <nav>

      <div class="wrap nb">

        <button
          class="ib"
          onclick="dr(1)"
          aria-label="القائمة">

          <span class="hb">
            <i></i>
            <i></i>
            <i></i>
          </span>

        </button>

        <b class="lg">
          د. ماري جرجس
        </b>

        <button
          class="ib"
          onclick="ct(1)"
          aria-label="السلة">

          🛒
          <span
            class="bd"
            id="cn">
          </span>

        </button>

      </div>

    </nav>


    <div
      class="ov"
      id="ov"
      onclick="cl()">
    </div>


    <aside
      class="dw"
      id="dw">

      <h3>
        الأقسام
      </h3>

      <a
        href="#top"
        onclick="cl()">
        🏠 الرئيسية
      </a>

      <a
        href="#about"
        onclick="cl()">
        ✨ احنا مين
      </a>

      ${
        hc
          ? `
            <a
              href="#courses"
              onclick="cl()">
              🎓 كورسات
            </a>
          `
          : ''
      }

      <a
        href="#hair"
        onclick="cl()">
        💆‍♀️ منتجات الشعر
      </a>

      <a
        href="#skin"
        onclick="cl()">
        🌿 منتجات البشرة
      </a>

      <a
        href="#basic"
        onclick="cl()">
        🧴 منتجات أساسية
      </a>

    </aside>


    <aside
      class="dw ct"
      id="cp">

      <h3>
        سلة المشتريات
      </h3>

      <div id="cb"></div>

    </aside>


    <header
      class="hero"
      id="top">

      <div class="blob b1"></div>
      <div class="blob b2"></div>
      <div class="blob b3"></div>

      <div class="wrap">

        <div class="hi">
          نورتنا
        </div>

        <h1>
          تركيبات الدكتورة
          <span style="color:var(--a)">
            ماري جرجس
          </span>
        </h1>

        <p>
          عناية بالبشرة والجسم والشعر،
          بتركيبات متخصصة بتتحضّر بعناية
          عشان تدّيك أحسن نتيجة.
        </p>

        <a
          class="btn"
          href="#about">
          تعرّف علينا
        </a>

      </div>

    </header>


    <div class="strip">
      <div>
        ${mq}
        ${mq}
      </div>
    </div>


    <section id="about">

      <div class="wrap">

        <h2>
          احنا مين؟
        </h2>

        <div class="sub">
          تركيبات الدكتورة ماري جرجس،
          رعاية كاملة من الراس للقدم
        </div>


        <div class="rich">

          <p class="lead rv">
            تركيبات الدكتورة
            <b>ماري جرجس رمزي</b>
            هي صيدلية متخصصة في التركيبات
            الصيدلانية والتجميلية ومنتجات
            العناية بالشعر والبشرة.
          </p>


          <p class="lead rv">
            يقع مقرنا الرئيسي في
            <b>
              السويس – منطقة الملاحة الجديدة،
              تقسيم المحروسة
            </b>،
            وتتوفر منتجاتنا من خلال الوكلاء
            والموزعين وخدمات الشحن في عدد
            من المحافظات المصرية.
          </p>


          <div class="mv">

            <div class="mv-card mv-v rv">

              <span class="mv-ic">
                🎯
              </span>

              <h3>
                رؤيتنا
              </h3>

              <p>
                أن نكون من الأسماء الموثوقة
                والمميزة في مجال التركيبات
                والعناية بالشعر والبشرة في مصر،
                مع الحفاظ على جودة منتجاتنا
                الطبيعية 100٪ وثقة عملائنا.
              </p>

            </div>


            <div class="mv-card mv-m rv">

              <span class="mv-ic">
                💚
              </span>

              <h3>
                رسالتنا
              </h3>

              <p>
                تقديم تركيبات يتم إعدادها بعناية
                داخل معمل الصيدلية، مع الاهتمام
                بجودة المكونات الطبيعية ودقة
                التحضير والتعبئة، وتوفير تجربة
                موثوقة ومميزة لعملائنا.
              </p>

            </div>

          </div>


          <div class="why rv">

            <h3>
              لماذا نحن؟
            </h3>

            <ul>

              <li>
                تخصص في التركيبات الصيدلانية
                والتجميلية
              </li>

              <li>
                تحضير التركيبات داخل معمل الصيدلية
              </li>

              <li>
                إشراف صيدلاني
              </li>

              <li>
                اهتمام بالجودة ودقة التحضير
              </li>

              <li>
                توفير وشحن المنتجات لعدة محافظات
              </li>

            </ul>

          </div>


          <div class="lic rv">

            <span class="lic-ic">
              📜
            </span>

            <div>

              <h3>
                التراخيص
              </h3>

              <p>
                الصيدلية مقيدة بالسجل التجاري
                رقم <b>52144</b>،
                ومرخصة كـ <b>صيدلية عامة</b>
                تابعة لمديرية الشؤون الصحية
                بمحافظة السويس.
              </p>

            </div>

          </div>


          <div class="slogan rv">
            من السويس إلى مختلف أنحاء مصر —
            تركيبات الدكتورة ماري جرجس رمزي.
          </div>

        </div>


        <div class="cats-title rv">
          تصفّح أقسام العناية
        </div>


        <div class="abt">

          <a
            class="ab rv"
            href="#skin">

            <span>🌿</span>

            <h3>
              العناية بالبشرة
            </h3>

            تركيبات لبشرة صافية ومتوازنة

            <em>
              شوف المنتجات ←
            </em>

          </a>


          <a
            class="ab rv"
            href="#basic">

            <span>🧴</span>

            <h3>
              العناية بالجسم
            </h3>

            منتجات يومية أساسية
            بتركيبات لطيفة

            <em>
              شوف المنتجات ←
            </em>

          </a>


          <a
            class="ab rv"
            href="#hair">

            <span>💆‍♀️</span>

            <h3>
              العناية بالشعر
            </h3>

            حلول للتساقط وتغذية الشعر والفروة

            <em>
              شوف المنتجات ←
            </em>

          </a>

        </div>

      </div>

    </section>


    ${crs}

    ${sec}


    <footer>
      © تركيبات د. ماري جرجس 🤍
    </footer>

  `;


  const els =
    document.querySelectorAll('.rv');


  if (
    'IntersectionObserver' in window
  ){

    const o =
      new IntersectionObserver(
        e => e.forEach(x => {

          if (x.isIntersecting){

            x.target.classList.add('in');

            o.unobserve(x.target);

          }

        }),
        { threshold: .1 }
      );

    els.forEach(e => o.observe(e));

  } else {

    els.forEach(
      e => e.classList.add('in')
    );

  }


  rc();
}


/* =====================================================
   Arabic Numbers
   ===================================================== */

const AR =
  '٠١٢٣٤٥٦٧٨٩';


const num = s =>
  +String(s || '')
    .replace(
      /[٠-٩]/g,
      d => AR.indexOf(d)
    )
    .replace(/[^\d.]/g,'')
  || 0;


const norm = s =>
  /شعر/.test(s)
    ? 'hair'
    : /بشر/.test(s)
      ? 'skin'
      : /اس/.test(s)
        ? 'basic'
        : '';


/* =====================================================
   CSV Parser
   ===================================================== */

function csv(t){

  const r = [];

  let w = [],
      c = '',
      q = false;


  for (
    let i = 0;
    i < t.length;
    i++
  ){

    const h = t[i];


    if (q){

      if (h == '"'){

        if (t[i + 1] == '"'){

          c += '"';
          i++;

        } else {

          q = false;

        }

      } else {

        c += h;

      }

    }

    else if (h == '"'){

      q = true;

    }

    else if (h == ','){

      w.push(c);
      c = '';

    }

    else if (
      h == '\n' ||
      h == '\r'
    ){

      if (
        h == '\r' &&
        t[i + 1] == '\n'
      ){

        i++;

      }

      w.push(c);
      r.push(w);

      w = [];
      c = '';

    }

    else {

      c += h;

    }

  }


  if (c || w.length){

    w.push(c);
    r.push(w);

  }

  return r;
}


/* =====================================================
   Load Google Sheets
   ===================================================== */

function load(rows){


  S.products = [];

  const byCourse = {};


  rows.slice(1).forEach((r, i) => {

    const n =
      (r[0] || '').trim();

    if (
      !n ||
      n === 'الاسم'
    ) return;


    const co =
      (r[5] || '').trim();


    /*
       العمود الخامس = الصور

       يمكن وضع أكثر من رابط
       داخل نفس الخلية، كل رابط
       في سطر جديد.
    */

    const imgs =
      (r[4] || '')
        .split(/[\s,;|]+(?=https?:\/\/)/i)   // مسافة / سطر جديد / فاصلة / ; / |
        .map(normImg)
        .filter(x => /^https:\/\//.test(x));


    const p = {

      id: 'p' + i,

      name: n,

      cat:
        norm(r[1] || ''),

      price:
        num(r[2]),

      desc:
        (r[3] || '').trim(),

      /*
         أول صورة تستخدم في
         كارت المنتج والسلة
      */

      img:
        imgs[0] || '',

      /*
         كل الصور تستخدم في
         معرض المنتج
      */

      imgs:
        imgs

    };


    S.products.push(p);


    if (co){

      (
        byCourse[co] =
          byCourse[co] || {
            id: 'c' + i,
            name: co,
            desc: '',
            price: 0,
            ids: []
          }
      ).ids.push(p.id);

    }

  });


  S.courses =
    Object.values(byCourse);


  render();
}


/* =====================================================
   Initial Render
   ===================================================== */

render();

const sp = $('#sp');
if (sp){
  sp.onclick = () => sp.classList.add('x');
  setTimeout(() => sp.classList.add('x'), 2200);
}

if (SHEET_URL){
  fetch(SHEET_URL)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(t => load(csv(t)))
    .catch(err => {
      console.error('فشل تحميل المنتجات من الشيت:', err);
      toast('تعذّر تحميل المنتجات، حدّث الصفحة');
    });
}
