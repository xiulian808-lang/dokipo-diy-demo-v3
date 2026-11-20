(function () {
  const R = u => (window.OPT && OPT[u]) || u;
  const D = window.DK;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const cat = id => D.cats.find(c => c.id === id);
  const P = id => D.prods[id];
  const A = p => 'assets/' + p;
  const money = v => '$' + Number(v).toFixed(2);
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let userArt = null;
  // 同行页面选项是 JS 渲染没抓到时，用其 Specification 里的多值行（尺寸/颜色/材质）作为可选项
  Object.values(D.prods).forEach(p => {
    if (p.opts.length) return;
    p.spec.filter(([k, v]) => /^(Size|Measurement|Colou?r|Material|Style)/i.test(k) && /,|\//.test(v)).forEach(([k, v]) => {
      const split = x => x.split(/,\s*|\s\/\s/).map(y => y.trim()).filter(Boolean);
      const parts = v.split(' - ');
      if (parts.length > 2) { // "Kid's Shirt - S, M, 4XL Adult's Shirt - XS, S" → Style + Size
        const labels = [parts[0].trim()], vals = [];
        for (let i = 1; i < parts.length; i++) {
          const items = split(parts[i]);
          if (i < parts.length - 1) { const last = items.pop() || ''; const sp = last.indexOf(' '); items.push(last.slice(0, sp)); labels.push(last.slice(sp + 1)); }
          vals.push(items);
        }
        p.opts.push(['Style', labels, {}]); p.opts.push(['Size', vals[0], {}]);
      } else p.opts.push([/^Measurement/i.test(k) ? 'Size' : k, split(parts.length === 2 ? parts[1] : v), {}]);
    });
  });

  const tag = t => t ? `<span class="tag ${t}">${{ hot: 'HOT', new: 'NEW', have: '已上线' }[t]}</span>` : '';
  const ref = p => p.ref ? '<span class="ref">参考图</span>' : '';
  const catItems = c => c.types.flatMap(t => t.items);
  const typeOf = (c, tid) => c.types.find(t => t.id === tid);
  const minPrice = ids => Math.min(...ids.map(i => P(i).price));
  const hotFirst = ids => ids.slice().sort((a, b) => ({ hot: 0, have: 1, new: 2, '': 3 }[P(a).tag] - { hot: 0, have: 1, new: 2, '': 3 }[P(b).tag]));

  // ---------- 卡片 ----------
  function productCard(p) {
    return `<a class="card" href="#p/${p.id}">
      <div class="ph">${tag(p.tag)}<img src="${A(p.imgs[0])}" loading="lazy">${ref(p)}</div>
      <div class="meta"><div><div class="nm">${esc(p.name)}</div><div class="cn">${p.cn}</div><div class="pr">${money(p.price)} <small>USD</small></div></div><span class="arrow">→</span></div></a>`;
  }
  // 类型卡 / 大类卡 —— 点击进二级页
  function typeCard(c, t) {
    const lead = P(hotFirst(t.items)[0]);
    return `<a class="card" href="#cat/${c.id}?type=${t.id}">
      <div class="ph"><img src="${A(lead.imgs[0])}" loading="lazy">${ref(lead)}</div>
      <div class="meta"><div><div class="count">${t.items.length} styles · from ${money(minPrice(t.items))}</div><div class="nm nm-lg">${esc(t.name)}</div><div class="cn">${t.cn}</div></div><span class="arrow">→</span></div></a>`;
  }
  function bigCard(c) {
    const ids = catItems(c); const lead = P(hotFirst(ids)[0]);
    return `<a class="card" href="#diy/${c.tab}?go=${c.id}">
      <div class="ph"><img src="${A(lead.imgs[0])}" loading="lazy">${ref(lead)}</div>
      <div class="meta"><div><div class="count">${ids.length} styles · from ${money(minPrice(ids))}</div><div class="nm nm-lg">${esc(c.name)}</div><div class="cn">${c.cn}</div></div><span class="arrow">→</span></div></a>`;
  }

  // ---------- ① 首页入口 ----------
  function viewHome() {
    app.innerHTML = `<div class="wrap">
      <div class="home-hero starry"><div><h1>Welcome to Dokipo World</h1><p>…首页其他板块不变…</p></div></div>
      <div class="entry entry-v3">
        <div>
          <h2 class="big">Your art, <em>made real.</em></h2>
          <p class="lead">Keychains, stands, stickers and more. Choose a product and start from 1 piece.</p>
          <a class="btn btn-p hl" style="width:auto" href="#diy/all">Upload &amp; make it →</a>
        </div>
        <a class="entry-flow" href="#diy/all"><img src="${A('mock/flow.png')}" alt="Your art made into a keychain, a stand and a sticker"></a>
      </div>
      <div class="note"><span class="pin">1</span><b>首页 DIY 入口</b>：布局按设计稿（左文案 + 按钮，右侧一条转化流程），<b>不再调整</b>。<br>
      右侧图换成同一个 Dokipo IP 的「原图 → 亚克力钥匙扣 → 亚克力立牌 → 贴纸」，突出“一张图变成多种周边”。点图或按钮进 DIY 首页。</div>
    </div>`;
  }

  // ---------- ②③④ DIY 首页（顶部沿用线上原样） ----------
  function viewDiy(tab = 'all', q = {}) {
    const open = st.open = st.open || {};
    const icons = { all: 'dokipo-make-category-all.webp', gifts: 'dokipo-make-category-gifts.webp', goods: 'dokipo-make-category-goods.webp' };
    const tabs = [['all', 'All'], ['gifts', 'Gifts'], ['goods', 'Merch']].map(([id, n]) => `<a class="tabcard ${id === tab ? 'on' : ''}" href="#diy/${id}"><img src="assets/live/${icons[id]}">${n}</a>`).join('');
    const cats = D.cats.filter(c => tab === 'all' || c.tab === tab);
    const pills = cats.map(c => `<a class="pill" data-go="${c.id}">${c.name}</a>`).join('');
    const body = tab === 'all'
      ? `<div class="grid">${cats.map(bigCard).join('')}</div>
         <div class="note"><span class="pin">3</span><b>All</b>：8 大类各 1 张代表卡（Merch 5 + Gifts 3），按热门排序。点卡片切到对应标签（Merch / Gifts）并<b>直接滚到这一类</b>，不再进二级页。</div>`
      : cats.map(c => { const ids = hotFirst(catItems(c)); const isOpen = open[c.id] || q.go === c.id; return `<section class="group" id="sec-${c.id}"><div class="group-hd"><div><h3>${c.name} <span class="cn">${c.cn}</span> <small class="muted-s">${ids.length} styles</small></h3></div>${ids.length > 4 ? `<button class="viewall" data-open="${c.id}">${isOpen ? 'Show less ↑' : `View all ${ids.length} ↓`}</button>` : ''}</div>
          <div class="grid">${(isOpen ? ids : ids.slice(0, 4)).map(i => productCard(P(i))).join('')}</div></section>`; }).join('') +
        `<div class="note"><span class="pin">4</span><b>${tab === 'goods' ? 'Merch 谷子' : 'Gifts 礼品'}</b>：这一页就是原来的二级页。每个大类一排 4 个热门款；<b>「View all N ↓」就地展开全部</b>，再点「Show less ↑」收起，不跳页。<br>
         上方大类标签往下滚时<b>吸顶</b>，点了直接滚到那一类。点商品卡片直接进「商品页 = 编辑器」。${tab === 'gifts' ? '<br>礼品已去掉玻璃杯、马克杯等易碎品。' : ''}</div>`;
    app.innerHTML = `<div class="wrap">
      <div class="crumb"><a href="#home">⌂ Home</a> &nbsp;›&nbsp; <b>Make your own</b></div>
      <div class="diy-hero">
        <div>
          <div class="eyebrow"><span style="color:var(--accent)">●</span> A little art. Endless possibilities.</div>
          <h1 class="lilita">Your art.<br>Your merch.</h1>
          <p style="color:var(--muted);font-size:16px;line-height:1.6">From a little imagination<br>to something you can hold.</p>
          <label class="upload"><input type="file" accept="image/*" hidden id="heroUp"><span class="up-ico">⇪</span><b>Upload your picture</b><small>or drag &amp; drop it here<br>PNG, JPG, WebP · Up to 20 MB</small></label>
          <p style="font-size:12px;color:var(--muted);text-align:center">✓ No minimums. Just your imagination.</p>
        </div>
        <div><img class="live-banner" src="assets/live/hero-banner.png">
          <div class="steps"><span class="on"><i>01</i>Upload artwork</span><hr><span><i>02</i>Choose your merch</span><hr><span><i>03</i>Customize &amp; order</span></div></div>
      </div>
      <div class="note"><span class="pin">2</span><b>DIY 首页顶部</b>：保持线上原样，不改。</div>
      <div class="panel">
        <div class="picker">
          <div><div class="eyebrow">A little art. Endless possibilities.</div><h2 class="lilita" style="font-size:40px;margin:6px 0 4px">Made real. <em>Made yours.</em></h2><p style="color:var(--muted);margin:0">Pick a product. Make it personal.</p></div>
          <div class="tabs">${tabs}</div>
        </div>
        <div class="searchrow sticky-pills"><div class="search">🔍 Find your next favourite…</div>${pills}</div>
        ${body}
      </div><div style="height:60px"></div></div>`;
    $('#heroUp').onchange = onUpload;
    const goTo = id => { if (tab === 'all') { location.hash = `#diy/${cat(id).tab}?go=${id}`; return; } const el = $('#sec-' + id); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 190, behavior: 'smooth' }); };
    app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => goTo(b.dataset.go));
    app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const id = b.dataset.open; open[id] = !open[id]; const y = scrollY; viewDiy(tab, {}); scrollTo(0, y); if (!open[id]) goTo(id); });
    if (q.go) setTimeout(() => goTo(q.go), 60);
  }

  // ---------- ⑤ 二级页 ----------
  function viewCat(id, q) {
    const c = cat(id); if (!c) return viewDiy();
    const tabName = c.tab === 'goods' ? 'Merch' : 'Gifts';
    const sel = q.type || 'all';
    const ids = sel === 'all' ? hotFirst(catItems(c)) : typeOf(c, sel).items;
    const banner = hotFirst(catItems(c)).slice(0, 3).map(P);
    const siblings = `<a class="pill" href="#all/${c.tab}">All ${tabName}</a>` + D.cats.filter(x => x.tab === c.tab).map(x => `<a class="pill ${x.id === id ? 'on' : ''}" href="#cat/${x.id}">${x.name}</a>`).join('') + crossPill(c.tab === 'goods' ? 'gifts' : 'goods');
    const typePills = `<a class="pill ${sel === 'all' ? 'on' : ''}" href="#cat/${id}">All ${catItems(c).length}</a>` + c.types.map(t => `<a class="pill ${sel === t.id ? 'on' : ''}" href="#cat/${id}?type=${t.id}">${t.name} ${t.items.length}</a>`).join('');
    const compare = id === 'keychains' ? `<div class="compare"><h3>Same keychain, 9 finishes</h3><p style="color:var(--muted);margin:6px 0 0">Not sure which one? Compare the real thing. <span class="cn">每种工艺是一个独立商品，这里用实物图并排对比，点击进对应商品</span></p>
        <div class="compare-row">${typeOf(c, 'acrylic').items.map(P).map(p => `<a class="fcard" href="#p/${p.id}"><img src="${A(p.imgs[0])}">${esc(p.name.replace('Custom ', '').replace(' Acrylic Keychain', '').replace(' Keychain', ''))}<div class="cn">${p.cn.replace('钥匙扣', '')}</div></a>`).join('')}</div></div>` : '';
    app.innerHTML = `<div class="wrap">
      <div class="crumb"><a href="#home">⌂ Home</a> › <a href="#diy/all">Make your own</a> › <a href="#diy/${c.tab}">${tabName}</a> › <b>${c.name}</b></div>
      <div class="cat-banner starry">
        <div><div class="eyebrow" style="color:#C9D6FF;position:relative;z-index:1">${tabName} · ${catItems(c).length} styles</div><h1>Custom ${c.name}</h1><p>${c.cn} · from ${money(minPrice(catItems(c)))}</p>
        <a class="btn btn-y" style="position:relative;z-index:1;margin-top:10px" href="#p/${banner[0].id}">Start with your art →</a></div>
        <div class="vis">${banner.map(p => `<a href="#p/${p.id}"><img src="${A(p.imgs[0])}"></a>`).join('')}</div>
      </div>
      <div class="subnav">${siblings}</div>
      ${compare}
      <div class="filters">${typePills}<span class="sp"></span><select class="sort"><option>Sort: Best selling</option><option>Price: Low to high</option><option>Newest</option></select></div>
      <div class="grid">${ids.map(i => productCard(P(i))).join('')}</div>
      <div class="note"><span class="pin">5</span><b>二级页</b>：Banner 右侧和「工艺对比」全部换成<b>实物图</b>。下方类型标签筛选（从上一页点类型卡进来会自动选中），列表按 热门 → 已上线 → 新品 → 其他 排序。<b>一个工艺 = 一个商品</b>，点卡片进三级商品页。</div>
      <div style="height:60px"></div></div>`;
  }

  // ---------- ⑤' 二级页 · All Merch / All Gifts ----------
  function viewAll(tab, q) {
    const tabName = { goods: 'Merch', gifts: 'Gifts', all: 'Products' }[tab] || 'Products';
    const cats = D.cats.filter(x => tab === 'all' || x.tab === tab);
    const all = hotFirst(cats.flatMap(catItems));
    const types = cats.flatMap(c => c.types.map(t => ({ c, t })));
    const selT = q.type, selC = q.cat;
    const banner = cats.map(c => P(hotFirst(catItems(c))[0])).slice(0, 3);
    const other = tab === 'goods' ? 'gifts' : 'goods';
    const siblings = `<a class="pill on" href="#all/${tab}">All ${tabName}</a>` + cats.map(x => `<a class="pill" href="#cat/${x.id}">${x.name}</a>`).join('') + (tab === 'all' ? '' : crossPill(other));
    const pills = `<a class="pill ${!selT && !selC ? 'on' : ''}" href="#all/${tab}">All ${all.length}</a>` + types.map(({ c, t }) => `<a class="pill ${selT === t.id ? 'on' : ''}" href="#all/${tab}?type=${t.id}">${t.name} ${t.items.length}</a>`).join('');
    let body;
    if (selT) { const { t } = types.find(x => x.t.id === selT); body = `<h3 class="sec-h">${t.name} <span class="cn">${t.cn}</span></h3><div class="grid">${hotFirst(t.items).map(i => productCard(P(i))).join('')}</div>`; }
    else body = cats.filter(c => !selC || c.id === selC).map(c => `<section class="bigsec"><h2 class="sec-big">${c.name} <span class="cn">${c.cn}</span><small>${catItems(c).length} styles</small></h2>
        ${c.types.map(t => `<div class="group"><div class="group-hd"><h3>${t.name} <span class="cn">${t.cn}</span> <small class="muted-s">${t.items.length}</small></h3>${t.items.length > 4 ? `<a class="viewall" href="#all/${tab}?type=${t.id}">View all ${t.items.length} →</a>` : ''}</div>
        <div class="grid">${hotFirst(t.items).slice(0, 4).map(i => productCard(P(i))).join('')}</div></div>`).join('')}</section>`).join('');
    app.innerHTML = `<div class="wrap">
      <div class="crumb"><a href="#home">⌂ Home</a> › <a href="#diy/all">Make your own</a> › ${tab === 'all' ? '' : `<a href="#diy/${tab}">${tabName}</a> › `}<b>All ${tabName}</b></div>
      <div class="cat-banner starry">
        <div><div class="eyebrow" style="color:#C9D6FF;position:relative;z-index:1">${tabName} · ${all.length} styles</div><h1>All ${tabName}</h1><p>${{ goods: '谷子全部款式', gifts: '礼品全部款式', all: '全部 DIY 款式' }[tab]} · from ${money(minPrice(all))}</p>
        <a class="btn btn-y" style="position:relative;z-index:1;margin-top:10px" href="#p/${banner[0].id}">Start with your art →</a></div>
        <div class="vis">${banner.map(p => `<a href="#p/${p.id}"><img src="${A(p.imgs[0])}"></a>`).join('')}</div>
      </div>
      <div class="subnav">${siblings}</div>
      <div class="filters scroll">${pills}<span class="sp"></span><select class="sort"><option>Sort: Best selling</option><option>Price: Low to high</option><option>Newest</option></select></div>
      ${body}
      <div class="note"><span class="pin">5</span><b>二级页 · All ${tabName}</b>：按<b>大类 → 子类分段</b>展示，每个子类一排 4 款（按热门），超过 4 款的右侧有「View all N →」；顶部标签按<b>子类</b>筛选（例如 Pajama Pants 5 / Phone Cases 4），点了只看这一类。${tab === 'all' ? '' : `大类标签最后的「${other === 'gifts' ? '🎁 Shop Gifts' : '🧸 Shop Merch'} →」跳到另一个板块的二级页。`}</div>
      <div style="height:60px"></div></div>`;
  }
  function crossPill(t) { return `<a class="pill cross" href="#all/${t}">${t === 'gifts' ? '🎁 Shop Gifts' : '🧸 Shop Merch'} →</a>`; }

  // ---------- ⑤ 商品页 = 编辑器（方案 1：两页合并；编辑区参考 Vograce） ----------
  const st = {};
  const FONT = { Sans: 'Figtree', Serif: 'Georgia', Script: 'cursive' };
  const cutCache = {};
  // 生成“贴着图案轮廓的刀线 + 白边”：把图案剪影向外扩 r 像素铺白，再多扩 2px 铺红色作为刀线
  function makeCut(src, r, semi) {
    const key = src.slice(0, 80) + src.length + r + semi;
    if (cutCache[key]) return Promise.resolve(cutCache[key]);
    return new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const bb = (() => { const k = document.createElement('canvas'); k.width = im.width; k.height = im.height; const x = k.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, im.width, im.height).data; let x0 = im.width, y0 = im.height, x1 = 0, y1 = 0; for (let y = 0; y < im.height; y += 2) for (let xx = 0; xx < im.width; xx += 2) if (d[(y * im.width + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 > x0 ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : [0, 0, im.width, im.height]; })();
        const src0 = im; const crop = document.createElement('canvas'); crop.width = bb[2]; crop.height = bb[3]; crop.getContext('2d').drawImage(src0, -bb[0], -bb[1]);
        const imW = bb[2], imH = bb[3];
        const S = 600 / Math.max(imW, imH), w = Math.round(imW * S), h = Math.round(imH * S), pad = r + 8;
        const sil = c => { const k = document.createElement('canvas'); k.width = w; k.height = h; const x = k.getContext('2d'); x.drawImage(crop, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = c; x.fillRect(0, 0, w, h); return k; };
        const cv = document.createElement('canvas'); cv.width = w + pad * 2; cv.height = h + pad * 2; const g = cv.getContext('2d');
        const ring = (k, rad) => { for (let i = 0; i < 36; i++) { const t = i / 36 * Math.PI * 2; g.drawImage(k, pad + Math.cos(t) * rad, pad + Math.sin(t) * rad); } g.drawImage(k, pad, pad); };
        ring(sil('#E5372B'), r + 2.5);
        g.globalCompositeOperation = 'destination-out'; ring(sil('#000'), r); g.globalCompositeOperation = 'source-over';
        ring(sil(semi ? 'rgba(214,232,255,0.45)' : '#FFFFFF'), r);
        g.drawImage(crop, pad, pad, w, h);
        // 默认孔位：白边最高点（往里收一点）
        const dd = g.getImageData(0, 0, cv.width, cv.height).data; let hx = cv.width / 2, hy = 0;
        outer: for (let y = 0; y < cv.height; y++) for (let xx = 0; xx < cv.width; xx++) if (dd[(y * cv.width + xx) * 4 + 3] > 200) { hx = xx; hy = y; break outer; }
        cutCache[key] = { url: cv.toDataURL(), w: cv.width, h: cv.height, hx: hx / cv.width * 100, hy: (hy + r * 0.55) / cv.height * 100 };
        res(cutCache[key]);
      };
      im.src = src;
    });
  }
  const IPART = () => userArt || (window.IPDATA && IPDATA[9]) || 'assets/ip/ip9.png';

  function viewStudio(pid, q = {}) {
    const p = P(pid); if (!p) return viewDiy();
    const c = cat(p.cat), t = typeOf(c, p.type);
    const acrylic = p.cat === 'keychains' && p.type !== 'other-kc' || p.cat === 'standees';
    const isKC = p.cat === 'keychains';
    const e = st['ed' + pid] = st['ed' + pid] || { mode: acrylic ? 'design' : 'photos', img: 0, tool: '', scale: 100, rot: 0, x: 0, y: 0, flip: false, side: 'front', text: '', font: 'Sans', color: '#14182E', tx: 0, ty: 0, shape: 0, acol: 0, acc: 7, accol: 9, size: 2, qty: 1, opt: {}, semi: false, hx: null, hy: null, tab: 'details', hist: [] };
    const shapes = [['Die-cut', 'keychain-shape-die-cut'], ['Round', 'keychain-shape-round'], ['Rectangle', 'keychain-shape-rectangle']];
    const acols = ['clear', 'pink', 'lilac', 'mint', 'blue'];
    const accs = ['carabiner', 'ball_chain', 'star', 'heart', 'bow', 'charm_ring', 'bunny', 'lobster_clasp', 'cat', 'sakura', 'd_ring', 'phone_strap', 'crescent_moon', 'bear', 'bat', 'apple'];
    const accols = ['orange', 'white', 'pink', 'purple', 'red', 'blue', 'mint', 'yellow', 'black', 'silver', 'gold', 'rose-gold', 'olive-green', 'gunmetal', 'satin-silver', 'lime-green'];
    const sizes = ['1.18" (3 cm)', '1.57" (4 cm)', '1.97" (5 cm)', '2.36" (6 cm)', '2.76" (7 cm)', '3.15" (8 cm)', '3.94" (10 cm)'];
    const sizeMM = [30, 40, 50, 60, 70, 80, 100];
    const cap = s => s.replace(/[-_]/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    const tierRow = p.tiers.length ? p.tiers : [];
    const unit = isKC ? p.price * [1, 1.2, 1.45, 1.75, 2.05, 2.4, 3.1][e.size] : p.price;
    const mm = acrylic ? Math.round(sizeMM[e.size] * e.scale / 100) : 0;
    const finishRow = t.items.length > 1 ? `<div class="lbl">${isKC || p.cat === 'standees' ? 'Finish' : 'Style'} <span class="muted-s">· ${t.items.length} options</span></div>
      <div class="finishes">${t.items.map(P).map(x => `<a class="fin ${x.id === pid ? 'on' : ''}" href="#p/${x.id}"><img src="${A(x.imgs[0])}"><span>${esc(x.name.replace('Custom ', '').replace(/ Acrylic Keychains?| Keychain| Acrylic Standee| Acrylic Stand/, '') || x.name)}</span></a>`).join('')}</div>` : '';
    const opt3 = isKC ? `
      <div class="lbl">Size <span class="muted-s">· longest side</span></div><div class="og4">${sizes.map((s, i) => `<button class="sz ${i === e.size ? 'on' : ''}" data-k="size" data-v="${i}">${s}</button>`).join('')}</div>
      <div class="lbl">Acrylic shape</div><div class="og3">${shapes.map((s, i) => `<button class="oc ${i === e.shape ? 'on' : ''}" data-k="shape" data-v="${i}"><img src="${R(`assets/opt/dokipo-option-r4-${s[1]}.webp`)}">${s[0]}</button>`).join('')}</div>
      <div class="lbl">Accessory</div><div class="og4 scrolly">${accs.map((s, i) => `<button class="oc sm ${i === e.acc ? 'on' : ''}" data-k="acc" data-v="${i}"><img src="${R(`assets/opt/dokipo-customizer-v3-clasp_${s}.webp`)}">${cap(s)}</button>`).join('')}</div>
      <div class="lbl">Accessory colour</div><div class="dots">${accols.map((s, i) => `<button class="dot ${i === e.accol ? 'on' : ''}" title="${cap(s)}" data-k="accol" data-v="${i}"><img src="${R(`assets/opt/dokipo-option-r4-clasp-colour-${s}.webp`)}"></button>`).join('')}</div>`
      : p.opts.map(([name, vals, imgs], oi) => `<div class="lbl">${esc(name)}</div><div class="${imgs && Object.keys(imgs).length ? 'og4' : 'chips'}">${vals.map((v, i) => `<button class="${imgs && imgs[v] ? 'oc sm' : 'chip'} ${(e.opt[oi] ?? 0) === i ? 'on' : ''}" data-ok="${oi}" data-v="${i}">${imgs && imgs[v] ? `<img src="${A(imgs[v])}">` : ''}${esc(v)}</button>`).join('')}</div>`).join('') || '<p class="muted-s">No extra options.</p>';
    const tiers = tierRow.length ? `<details class="tierd"><summary>Buy more, save more · <b>${esc(p.lead || 'bulk discounts')}</b></summary>
      <table class="tier-tb"><tr><th>Quantity</th><th>Discount (%)</th><th>Price</th></tr>${tierRow.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="red">${r[2]}</td></tr>`).join('')}</table>
      <p class="tip">${esc(p.tip || 'Discounts still available for different designs but with the same size & same clasps!')}</p></details>` : '';
    const specRows = (p.spec.length ? p.spec : p.opts.map(o => [o[0], o[1].join(' / ')]));
    const tabsBody = {
      details: `<p>${esc(p.desc || 'Upload your own art and order from 1 piece.')}</p><p>Made to order: arrives in 3–4 weeks.</p><p>Only upload art you own or have permission to use.</p>${p.box.length ? `<h4>What's in the box</h4><div class="boxlist">${p.box.map(b => `<span>✓ ${esc(b)}</span>`).join('')}</div>` : ''}`,
      specs: `<table class="spec">${specRows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table><p class="muted-s">Sizes are approximate and can vary by a few millimeters.</p>`,
      shipping: `<table class="spec"><tr><th>United States</th><td>$6.25 · 8–10 business days</td></tr><tr><th>United Kingdom</th><td>$3.99 · 8–16 business days</td></tr><tr><th>Canada</th><td>$5.99 · 8–16 business days</td></tr><tr><th>Australia</th><td>$4.39 · 8–15 business days</td></tr><tr><th>Production</th><td>Made to order in 8–10 business days</td></tr></table>`,
      care: `<p>Wipe gently with a soft dry cloth. Keep away from heat and direct sunlight.</p>`
    };
    const tools = acrylic ? [['image', '🖼', 'Image'], ['hole', '◎', 'Hole'], ['semi', '◐', 'Semi<br>Transparent'], ['text', 'T', 'Text'], ['photos', '📷', 'Photos']] : [['image', '🖼', 'Image'], ['text', 'T', 'Text'], ['photos', '📷', 'Photos']];
    const stage = e.mode === 'photos'
      ? `<div class="ph-stage"><img src="${A(p.imgs[e.img] || p.imgs[0])}">${ref(p)}<span class="count">${e.img + 1}/${p.imgs.length}</span></div>
         <div class="thumbs2">${p.imgs.map((im, i) => `<div class="${i === e.img ? 'on' : ''}" data-img="${i}"><img src="${A(im)}"></div>`).join('')}</div>`
      : `<div class="vg-canvas ${e.tool === 'hole' ? 'holemode' : ''}" id="vgc">
          <div class="vg-ruler-v"><span>${mm} mm</span></div>
          <div class="vg-art ${e.side}" id="edArt">
            ${isKC ? `<img class="vg-clasp" id="clasp" src="${R(`assets/opt/dokipo-customizer-v3-clasp_${accs[e.acc]}.webp`)}">` : ''}
            <img class="vg-cut" id="cutImg" draggable="false">
            ${isKC ? `<i class="vg-hole" id="hole"></i>` : ''}
            <i class="h tl" data-h="s"></i><i class="h br" data-h="s"></i><i class="h rot" data-h="r">↻</i>
          </div>
          <div class="ed2-text" id="edText" style="${e.text ? '' : 'display:none;'}font-family:${FONT[e.font]};color:${e.color}">${esc(e.text)}</div>
          ${e.tool === 'hole' ? `<div class="vg-tip">Drag the ◎ hole along the edge · the accessory follows it</div>` : ''}
        </div>
        <div class="vg-mini"><button data-t="zout">－</button><span>${Math.round(e.scale)}%</span><button data-t="zin">＋</button><i></i><button data-t="rl">⟲</button><button data-t="rr">⟳</button><button data-t="flip">⇋</button><button data-t="center">⊕</button><i></i><button data-t="undo">↶ Undo</button></div>`;
    app.innerHTML = `<div class="wrap">
      <div class="crumb"><a href="#home">⌂ Home</a> › <a href="#diy/${c.tab}?go=${c.id}">${c.tab === 'goods' ? 'Merch' : 'Gifts'} · ${c.name}</a> › <b>${esc(p.name)}</b></div>
      <div class="studio">
        <div class="vg">
          <div class="vg-top">
            <div class="vg-spec"><b>${esc(p.name.replace('Custom ', ''))}</b><small>${isKC ? `${sizes[e.size]} · ${shapes[e.shape][0]} · ${cap(accs[e.acc])}` : esc((p.opts[0] || ['', ['']])[1][e.opt[0] || 0] || 'Made to order')}</small></div>
            <div class="side-tg vg-side"><button class="${e.side === 'front' ? 'on' : ''}" data-side="front">Front</button><button class="${e.side === 'back' ? 'on' : ''}" data-side="back">Back</button></div>
            <div class="vg-act"><b class="vg-price">${money(unit)}</b>${acrylic ? '<button class="btn btn-o vg-3d" id="pv3d">⟳ 3D Preview</button>' : ''}</div>
          </div>
          <div class="vg-body">
            <div class="vg-tools">${tools.map(([k, ic, n]) => `<button class="${(k === 'photos' ? e.mode === 'photos' : e.mode === 'design' && (e.tool === k || (k === 'semi' && e.semi))) ? 'on' : ''}" data-tool="${k}"><i>${ic}</i><span>${n}</span></button>`).join('')}</div>
            <div class="vg-main">${stage}</div>
          </div>
        </div>
        <div class="buyp">
          <h1>${esc(p.name)}</h1><div class="cn">${p.cn}</div>
          <div class="price2">${money(unit)}${p.rating ? ` <span class="rating">★ ${p.rating} (${p.reviews})</span>` : ''}</div>
          <div class="mto"><b>Made to order · Arrives in 3–4 weeks</b> · No minimum · Ships worldwide</div>
          ${finishRow}
          ${tiers}
          <div class="stepc"><div class="sh"><i>01</i><div><b>Your artwork</b><small>PNG with a transparent background works best.</small></div></div>
            <label class="upbox"><input type="file" hidden accept="image/*" id="eUp"><div><b>${userArt ? 'my-artwork.png ✓' : 'Upload your artwork'}</b><small>PNG, JPG, WebP · Up to 20 MB</small></div><span class="btn btn-o">⇪ ${userArt ? 'Replace' : 'Upload'}</span></label></div>
          <div class="stepc"><div class="sh"><i>02</i><div><b>Make it personal</b> <small style="display:inline">(optional)</small></div></div>
            <input class="inp" id="txt" maxlength="20" placeholder="A name or word" value="${esc(e.text)}">
            <div class="row2"><div class="og3">${['Sans', 'Serif', 'Script'].map(f => `<button class="sz ${f === e.font ? 'on' : ''}" data-k="font" data-v="${f}"><b style="font-family:${FONT[f]}">Aa</b> ${f}</button>`).join('')}</div>
            <div class="swatches">${['#14182E', '#FFFFFF', '#E8559A', '#9B5CF6', '#2D5BFF'].map(col => `<button class="sw ${col === e.color ? 'on' : ''}" style="background:${col}" data-k="color" data-v="${col}"></button>`).join('')}</div></div></div>
          <div class="stepc"><div class="sh"><i>03</i><div><b>Choose your options</b></div></div>${opt3}</div>
          <div class="ed2-buy"><div class="qty"><button data-q="-1">−</button><b>${e.qty}</b><button data-q="1">+</button></div><b class="ed2-price">${money(unit * e.qty)}</b><button class="btn btn-grad" id="review">Add to cart →</button></div>
          <div class="ok">✓ Damaged or wrong item? Send one photo and we reship free.</div><div class="ok">✓ Cancel any time before production starts.</div>
          <details class="faq"><summary>Will it look like the preview?</summary><p>Yes — the red line is where we cut. You'll see a 3D preview before you pay.</p></details>
          <details class="faq"><summary>Can I return it?</summary><p>Made-to-order items can't be returned, except where local law requires.</p></details>
        </div>
      </div>
      <div class="note"><span class="pin">5</span><b>商品页 = 编辑器（两页合并）</b>：点商品卡片直接进这里，少点一层。<ol>
        <li><b>左侧编辑区参考 Vograce</b>：顶部 规格 · Front/Back · 价格 · 3D Preview；左侧竖排工具 <b>Image</b>（换图）/ <b>Hole</b>（拖动孔位，挂扣跟着走）/ <b>Semi Transparent</b>（白底改半透明）/ Text / <b>Photos</b>（切回商品实物图集）。红线 = 贴着图案轮廓的刀线，白边自动生成；拖动移动、角点缩放、↻ 旋转、滚轮缩放。</li>
        <li><b>右侧</b>：标题价格 → <b>Finish 工艺切换</b>（同一类的不同工艺并排小图，点了切到对应商品，后台仍是独立商品）→ 阶梯价（折叠）→ 01 上传 / 02 加字 / 03 选项（名称与同行原商品一致）→ 加购。</li>
        <li>下方保留线上详情标签页（Details / Specs / Shipping / Care）和推荐。</li></ol>
        ${p.wurl || p.curl ? `规格来源：<a href="${p.wurl || p.curl}" target="_blank" style="color:var(--accent)">${p.wurl ? 'wooacry' : 'Callie'} 原商品页 ↗</a>` : '规格来源：我们线上原商品页'}</div>
      <div class="lower">
        <div class="tabbox"><div class="tabhd">${[['details', 'Details'], ['specs', 'Specs'], ['shipping', 'Shipping & returns'], ['care', 'Care']].map(([k, n]) => `<button class="${e.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div><div class="tabbd">${tabsBody[e.tab]}</div></div>
      </div>
      <div class="section"><h2 style="font-size:22px">You might also like</h2><div class="grid" style="margin-top:14px">${t.items.filter(i => i !== pid).concat(catItems(c).filter(i => P(i).type !== p.type)).slice(0, 4).map(i => productCard(P(i))).join('')}</div></div>
      <div style="height:60px"></div></div>`;

    const rer = () => { const y = scrollY; viewStudio(pid); scrollTo(0, y); };
    const snap = () => { const { hist, ...rest } = e; e.hist.push(JSON.stringify(rest)); if (e.hist.length > 50) e.hist.shift(); };
    app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { snap(); const k = b.dataset.k, v = b.dataset.v; e[k] = isNaN(+v) || k === 'color' ? v : +v; rer(); });
    app.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { snap(); e.opt[b.dataset.ok] = +b.dataset.v; rer(); });
    app.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { e.side = b.dataset.side; e.mode = 'design'; rer(); });
    app.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { e.qty = Math.max(1, e.qty + +b.dataset.q); rer(); });
    app.querySelectorAll('[data-img]').forEach(b => b.onclick = () => { e.img = +b.dataset.img; rer(); });
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { e.tab = b.dataset.tab; rer(); });
    app.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => {
      const k = b.dataset.tool;
      if (k === 'photos') { e.mode = e.mode === 'photos' ? 'design' : 'photos'; return rer(); }
      e.mode = 'design';
      if (k === 'image') return $('#eUp').click();
      if (k === 'semi') { snap(); e.semi = !e.semi; toast(e.semi ? 'Semi transparent: white layer off' : 'White layer on'); return rer(); }
      if (k === 'text') { e.tool = ''; rer(); const i = $('#txt'); i.scrollIntoView({ block: 'center' }); return i.focus(); }
      e.tool = e.tool === k ? '' : k; rer();
    });
    $('#txt').oninput = ev => { e.text = ev.target.value; const t2 = $('#edText'); if (t2) { t2.textContent = e.text; t2.style.display = e.text ? '' : 'none'; } };
    $('#eUp').onchange = ev => onUpload(ev, rer);
    $('#review').onclick = () => openModal(`<h2>Added to cart ✓</h2><p style="color:var(--muted)">${esc(p.name)} × ${e.qty} · ${money(unit * e.qty)}</p><div style="text-align:right;margin-top:14px"><button class="btn btn-p" onclick="closeModal()">Continue</button></div>`);
    const pv = $('#pv3d'); if (pv) pv.onclick = () => open3D(e, isKC ? R(`assets/opt/dokipo-customizer-v3-clasp_${accs[e.acc]}.webp`) : null);
    if (e.mode !== 'design') return;

    const T = { zin: () => e.scale = Math.min(250, e.scale + 10), zout: () => e.scale = Math.max(30, e.scale - 10), rl: () => e.rot -= 15, rr: () => e.rot += 15, flip: () => e.flip = !e.flip, center: () => { e.x = e.y = 0; } };
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      if (b.dataset.t === 'undo') { const h = e.hist.pop(); if (h) Object.assign(e, JSON.parse(h)); return rer(); }
      snap(); T[b.dataset.t](); rer();
    });
    const artEl = $('#edArt'), txtEl = $('#edText'), cut = $('#cutImg'), hole = $('#hole'), clasp = $('#clasp');
    const apply = () => {
      artEl.style.transform = `translate(calc(-50% + ${e.x}px), calc(-50% + ${e.y}px)) rotate(${e.rot}deg) scale(${e.scale / 100}) scaleX(${(e.flip ? -1 : 1) * (e.side === 'back' ? -1 : 1)})`;
      txtEl.style.transform = `translate(calc(-50% + ${e.tx}px), ${e.ty}px)`;
      const z = $('.vg-mini span'); if (z) z.textContent = Math.round(e.scale) + '%';
      const rl = $('.vg-ruler-v span'); if (rl && acrylic) rl.textContent = Math.round(sizeMM[e.size] * e.scale / 100) + ' mm';
      if (hole && e.hx != null) { hole.style.left = e.hx + '%'; hole.style.top = e.hy + '%'; }
      if (clasp && e.hx != null) { clasp.style.left = e.hx + '%'; clasp.style.top = e.hy + '%'; }
    };
    const shapeR = isKC ? [0, 1, 2][e.shape] : 0;
    makeCut(IPART(), 22, e.semi).then(k => {
      cut.src = k.url;
      const H = 330, Wd = Math.round(k.w * H / k.h); artEl.style.width = Wd + 'px'; artEl.style.height = H + 'px';
      artEl.classList.toggle('round', shapeR === 1); artEl.classList.toggle('rect', shapeR === 2);
      if (e.hx == null) { e.hx = k.hx; e.hy = k.hy; }
      apply();
    });
    apply();
    const center = () => { const r = artEl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const drag = (ev, kind) => {
      ev.preventDefault(); ev.stopPropagation(); snap();
      const [cx, cy] = center(); const r0 = artEl.getBoundingClientRect();
      const s0 = { ...e, mx: ev.clientX, my: ev.clientY, d: Math.hypot(ev.clientX - cx, ev.clientY - cy) || 1, a: Math.atan2(ev.clientY - cy, ev.clientX - cx) };
      artEl.classList.add('dragging');
      const move = m => {
        const dx = m.clientX - s0.mx, dy = m.clientY - s0.my;
        if (kind === 'move') { e.x = s0.x + dx; e.y = s0.y + dy; }
        else if (kind === 'text') { e.tx = s0.tx + dx; e.ty = s0.ty + dy; }
        else if (kind === 's') e.scale = Math.max(30, Math.min(250, s0.scale * Math.hypot(m.clientX - cx, m.clientY - cy) / s0.d));
        else if (kind === 'r') e.rot = s0.rot + (Math.atan2(m.clientY - cy, m.clientX - cx) - s0.a) * 180 / Math.PI;
        else if (kind === 'hole') { const w = artEl.offsetWidth, h = artEl.offsetHeight, sc = e.scale / 100; e.hx = Math.max(4, Math.min(96, s0.hx + dx / (w * sc) * 100 * (e.flip ? -1 : 1))); e.hy = Math.max(0, Math.min(96, s0.hy + dy / (h * sc) * 100)); }
        apply();
      };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); artEl.classList.remove('dragging'); e.rot = Math.round(e.rot); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
    artEl.onpointerdown = ev => drag(ev, ev.target.dataset.h || (ev.target === hole ? 'hole' : 'move'));
    if (hole) hole.onpointerdown = ev => drag(ev, 'hole');
    txtEl.onpointerdown = ev => drag(ev, 'text');
    $('#vgc').onwheel = ev => { ev.preventDefault(); e.scale = Math.max(30, Math.min(250, e.scale - ev.deltaY * 0.1)); apply(); };
    if (q.preview && pv) setTimeout(() => pv.click(), 300);
  }

  // 3D 预览：正面 + 镜像背面 + 叠层厚度，可拖动旋转
  function open3D(e, claspSrc) {
    makeCut(IPART(), 22, e.semi).then(k => {
      const H = 360, W = Math.round(k.w * H / k.h), layers = 12;
      const slab = Array.from({ length: layers }, (_, i) => `<img class="p3-l" src="${k.url}" style="width:${W}px;height:${H}px;transform:translateZ(${(i - layers / 2) * 0.7}px)">`).join('');
      openModal(`<h2 style="margin:0">3D Preview</h2><p class="muted-s" style="margin:4px 0 0">Drag to rotate · 3 mm clear acrylic · red line = cut line（实物不印红线）</p>
        <div class="p3" id="p3"><div class="p3-obj" id="p3o" style="width:${W}px;height:${H}px">
          ${slab}
          <img class="p3-f" src="${k.url}" style="width:${W}px;height:${H}px;transform:translateZ(${layers * 0.35 + 0.5}px)">
          <img class="p3-f" src="${k.url}" style="width:${W}px;height:${H}px;transform:rotateY(180deg) translateZ(${layers * 0.35 + 0.5}px)">
          ${claspSrc ? `<img class="p3-c" src="${claspSrc}" style="left:${e.hx ?? 50}%;top:${e.hy ?? 3}%">` : ''}
        </div></div>
        <div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-o" onclick="closeModal()">Keep editing</button><button class="btn btn-p" onclick="closeModal()">Looks good · Add to cart</button></div>`);
      const o = $('#p3o'); let ry = -25, rx = 8, auto = true, last = performance.now();
      const draw = () => { o.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
      const tick = now => { if (!$('#modal').classList.contains('open') || !document.body.contains(o)) return; if (auto) ry += (now - last) * 0.04; last = now; draw(); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      $('#p3').onpointerdown = ev => { auto = false; const sx = ev.clientX, sy = ev.clientY, r0 = ry, x0 = rx;
        const mv = m => { ry = r0 + (m.clientX - sx) * 0.6; rx = Math.max(-40, Math.min(40, x0 - (m.clientY - sy) * 0.4)); draw(); };
        const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
        addEventListener('pointermove', mv); addEventListener('pointerup', up); };
    });
  }

  // ---------- 通用 ----------
  function onUpload(ev, cb) {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { userArt = r.result; toast('Artwork uploaded ✓'); cb ? cb() : route(); };
    r.readAsDataURL(f);
  }
  window.openModal = h => { $('#modalBody').innerHTML = h; $('#modal').classList.add('open'); };
  window.closeModal = () => $('#modal').classList.remove('open');
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

  function route() {
    window.onmousemove = null;
    const h = location.hash.slice(1) || 'home';
    const [path, qs] = h.split('?');
    const q = {}; (qs || '').split('&').filter(Boolean).forEach(x => { const [k, v] = x.split('='); q[k] = v; });
    const [v, a] = path.split('/');
    if (v === 'diy') viewDiy(a || 'all', q);
    else if (v === 'cat') viewCat(a, q);
    else if (v === 'all') viewAll(a, q);
    else if (v === 'p' || v === 'editor') viewStudio(a, q);
    else viewHome();
    document.querySelectorAll('#flow a').forEach(x => { const hr = x.getAttribute('href').slice(1); x.classList.toggle('on', v === 'diy' ? hr === path : (v === 'p' || v === 'editor') ? hr.split('?')[0] === h.split('?')[0] && (hr.includes('preview') === !!q.preview) : hr.split('/')[0] === v); });
    scrollTo(0, 0);
  }
  $('#cnToggle').onchange = ev => document.body.classList.toggle('hide-cn', !ev.target.checked);
  addEventListener('hashchange', route);
  route();
})();
