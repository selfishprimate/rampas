# OKLCH Ramp Studio — Proje Günlüğü (Konuşma & Karar Geçmişi)

Bu döküman, projeyi sıfırdan kurarken yaptığımız tüm konuşmaların ve kararların
kronolojik kaydıdır — sadece *ne* karar verdiğimizin değil, *neden* karar
verdiğimizin geçmişi. `CLAUDE.md` kısa çalışma brifidir (Claude Code onu otomatik
okur); bu döküman ise arkadaki gerekçeleri ve kavramsal açıklamaları saklar.

Bağlam: Invisible için shadcn / Tailwind v4 tabanlı kapsamlı bir tasarım sistemi
üretiyoruz. Tasarım sistemine başlamadan önce, tüm renk primitive'lerini üretip
ilişkilendirebileceğimiz ve export alabileceğimiz bu aracı yaptık.

---

## 1. Token mimarisi araştırması

Önce shadcn + Tailwind v4 tabanlı bir tasarım sisteminde token yapısının nasıl
olması gerektiğini araştırdık.

**Üç katman:**
- **Primitive (referans):** anlamı olmayan ham palet (`--blue-500`, `--spacing-4`).
- **Semantic (sistem):** amaca göre isim (`--primary`, `--background`,
  `--foreground`, `--destructive`). Tema/dark mode değiştirmenin tek noktası.
  shadcn'in `-foreground` ikili konvansiyonu: yüzey + üstündeki metin çifti.
- **Component:** bileşene özel (`--sidebar-*`), semantic'e referans verir.

Kural tek yönlü: **component → semantic → primitive.**

**Tailwind v4'te kritik nokta (sık yanılınan yer):**
- `@theme { --color-x: ... }` → değişkeni `:root`'a yazar **ve** utility üretir,
  ama değeri tanım anında "pişirir". → primitive'ler buraya.
- `@theme inline { --color-primary: var(--primary) }` → sadece utility üretir,
  çıktısı `var(--primary)`'e referanstır; `--primary`'i `:root`/`.dark`'ta ayrıca
  tanımlarsın, dark mode override bu yüzden akar. → semantic'ler buraya.

**Registry yolu:** `registry-item.json` içindeki `cssVars` üç scope taşır
(`theme`, `light`, `dark`); `npx shadcn add` bunları tüketicinin `globals.css`'ine
yazar ve utility class'ları üretilir. Tam bir sistemi paketlemek için v4'te
`registry:base` kullanılır.

**Export için iki hedef:** shadcn `registry-item.json` ve **W3C DTCG**
(`$type`/`$value` + `{alias}` referans sözdizimi). DTCG'yi tek kaynak (source of
truth) tutup oradan hem registry JSON'ı hem ham CSS'i derlemek ideal.

---

## 2. Ramp derinliği: 11 → 14 → 16 basamak

Standart 11 adımlı skala (50–950) **dark mode'da yetersiz** kaldı: page bg, card,
popover, hover, border gibi koyu yüzeyleri 800/900/950'nin içine sığdırmak zor.
Önce 14'e çıkardık, sonra şu gerekçeyle 16'ya:

Tek bir ramp hem light hem dark'ı besleyecekse **iki ucun da yoğun** olması
gerekir. Çözüm, 500'ün öncesine ve sonrasına basamak eklemek, artı bir de sıfır.

---

## 3. Nihai 16 basamaklı şema ve ilkeler

```
0, 10, 20, 50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000
```

- **Açık küme (0,10,20,50):** light mod subtle/elevated yüzeyler.
- **Gövde (100–800):** accent, primary, metin.
- **Koyu küme (850,900,950,1000):** dark mod surface elevation — başlangıçtaki
  sıkışıklık sorununu çözen kısım.

**Kararlar:**
- **Beyaz/siyah ramp'ta DEĞİL.** `onPrimary` gibi token'lar saf beyaz/siyah ister
  ve bu hue'dan bağımsızdır; her ramp'ta tekrar etmek yerine ayrı `base.white` /
  `base.black` alias'ı olur, semantic katman oradan çeker. (Senin kararın:
  "beyazlar zaten alias kullanacak, base.white gibi bir şeyden çekecek.")
- **1000 saf siyah değil.** Literal `#000` dark yüzeyde sert kontrast + OLED
  smearing yapar; en koyu stop near-black (OKLCH L ≈ 0.13–0.18).
- **Çamurlaşmayı önleme** chroma bell ile (bkz. §6).

---

## 4. "Önce uygulamayı yapalım" kararı

Tasarım sistemine başlamadan önce, primitive ramp'ları üretip
çamurlaşmadan yönetebileceğimiz bir araç yapmaya karar verdik. Gerekçe: semantic
katman bu ramp'lardan besleneceği için, önce sağlam bir primitive üreticiye sahip
olmak doğru temel.

İlk planda tek-dosya araç düşünüldü; sonra **Next.js + shadcn + Tailwind v4** ile
gerçek bir proje olarak kurmaya karar verdik — kendi tasarım sistemimizle aynı
stack, araç ile çıktı tutarlı.

---

## 5. OKLCH nedir, neden HSL değil (kavramsal)

**OKLCH:** Oklab renk uzayının silindirik hâli. Üç eksen:
- **L** — algısal parlaklık (0=siyah, 1=beyaz). *Gerçek* parlaklık; `oklch(0.5 0 0)`
  gerçekten orta-gri görünür.
- **C** — chroma (griden uzaklık / doygunluk). 0 = nötr gri. sRGB'de pratik üst
  sınır ~0.37.
- **H** — ton açısı (0–360°).

Kilit özellik: **algısal düzgünlük** — sayısal eşit adımlar göze de eşit görünür.
L'yi sabit tutup H'yi döndürünce parlaklık sabit kalır.

**Token mantığında kullanımı:** işi ikiye ayır — **L ekseni ramp'ı** (açık→koyu
merdiven), **H ekseni renk ailesini** (blue, red, lime…) verir. Hepsi aynı L
merdivenini paylaştığı için `primary-500`, `success-500` *aynı parlaklıkta* ⇒
*aynı kontrast* olur. shadcn v4'ün HSL'den OKLCH'ye geçme sebebi de bu.

**Neden HSL değil:** HSL'in "L"i sahtedir (RGB max/min ortası), gözün gördüğü
parlaklık değil. `hsl(60 100% 50%)` (sarı) ile `hsl(240 100% 50%)` (mavi) — ikisi
de "lightness %50" ama sarı çok daha parlak görünür. Sonuç: HSL'de aynı L'de farklı
ton ⇒ savruk parlaklık ⇒ tutarsız kontrast. OKLCH üçünü birden çözer: gerçek
parlaklık, düzgün hue, öngörülebilir kontrast. Bedeli, chroma'nın gamut'a bağımlı
olması — onu da chroma bell + gamut işaretçisiyle yönetiyoruz.

---

## 6. Chroma bell (çamurlaşma/yıkanma önleme)

sRGB gamut'u küre değil: **orta parlaklıkta en geniş**, beyaza ve siyaha doğru
daralır. Yani çok açık/koyu tonda yüksek chroma tutulamaz — taşar, koyuda
çamurlaşır, açıkta yıkanır.

Çözüm: chroma'yı sabit tutma, **çan eğrisi** uygula. En canlı noktada tepe, uçlara
doğru sıfıra in:

```
C(L) = cMax · exp( −(L − lPeak)² / (2·σ²) )
```

`σ` (bell width) inişin hızını ayarlar; küçük σ uçlarda chroma'yı daha hızlı
düşürür. Nötr gri ailesinde `cMax → 0`. Hue sabit, L gezilir, chroma çan yapar.

---

## 7. Light/dark stop eşleme ve semantic katman

Soru: "light için 500, dark için 400'ü nasıl belirleriz?" Cevap: bunu ramp'ın
*içinde* değil, **semantic katmanda** belirleriz. Her semantic token'ın **iki
ataması** olur:

```
--primary:  light → brand-600
            dark  → brand-400
```

shadcn dilinde: `:root { --primary: var(--brand-600) }` ve
`.dark { --primary: var(--brand-400) }`.

**Index'ler kontrastla seçilir, keyfî değil:** light bg açık ⇒ primary daha koyuya
iner (600); dark bg koyu ⇒ daha açığa çıkar (400). Material 3 mantığı: light tone
40, dark tone 80.

Rol→stop tablosu (başlangıç, kontrastla doğrulanır):

| rol | light | dark |
|---|---|---|
| subtle-bg | 50 | 900 |
| muted-bg | 100 | 850 |
| border | 200 | 800 |
| solid (primary fill) | 600 | 400 |
| solid-hover | 700 | 300 |
| text-on-bg | 700 | 300 |
| on-solid | base.white | base.white |

İki kısıt: (1) iki stop da chroma tepesine yakın kalsın (renk her iki modda canlı
dursun); (2) koyu zeminde chroma daha sıcak okunur. **Uyarı:** WCAG kontrastı ≠
OKLCH L; doğrulamayı gerçek hex'ten yap, dark için APCA daha güvenilir.

---

## 8. Lime problemi ve iki eksenin ayrılması (en önemli düzeltme)

**Problem:** Invisible'ın primary'si çok açık bir lime. Ramp'a vurunca diğer
renklerin 200–300'üne denk geliyor; o zaman koyu taraf için daha çok step
oluşuyor, merdiven dengesizleşiyor (bir uç sıkışık, bir uç seyrek).

**Kök sebep:** o anki araçta tek bir `lAnchor` ayarı **hem** chroma tepesini **hem**
lightness merdiveninin pivotunu kontrol ediyordu. Anchor'ı lime'ın yüksek
açıklığına çekince light tarafa az, dark tarafa çok L aralığı kalıyor, ama her iki
tarafa **eşit sayıda** stop konunca açık basamaklar yapışıyor, koyular açılıyordu.

**Yanlış varsayım:** marka rengin ramp'ta "500 olması gerektiği". Gerek yok. Stop
etiketleri bir *lightness pozisyonudur*, semantik rol değil. `primary` semantic
katmanda bir alias'tır ve ramp'ın herhangi bir stop'una işaret edebilir. Açık lime
doğal olarak ~300'dür; `--primary → lime-300` denir.

**Çözüm — iki ekseni ayır (kavramsal "iki kaldıraç"):**
1. **Lightness merdiveni sabit.** Bir tonun açıklığı yalnızca kendi etiket
   değerine bağlı (lTop–lBottom arası). Lime de blue de aynı düzgün merdiveni
   kullanır, hiç çarpılma olmaz. Yan etki: **stop eklemek/çıkarmak diğerlerini
   kaydırmaz**, ve yoğun etiketler (0,10,20,50 / 850,900,950) o bölgede yoğun ton
   verir.
2. **Chroma tepesi (`lPeak`) bağımsız.** Lime için "en canlı yer yukarıda" dersin,
   merdivene dokunmadan. Bell formülünün merkezi kayar, basamaklar düzgün kalır.

**Kontrast gerçeği:** açık lime beyaz zeminde okunmaz. İki semantic'e bölünür:
`primary` (fill) = lime-300, `on-primary` = **base.black** (beyaz değil!), ayrı bir
`primary-text` (açık zeminde link/ikon) = koyu bir ton (örn. lime-700).

Bu, kodda `lAnchor`'ı kaldırıp **sabit etiket-bazlı merdiven** + **bağımsız
`lPeak`** ile çözüldü. (Test: lPeak 0.85 → lime tepe ~stop 200/300, açık tonlar
500'den daha doygun, merdiven bozulmuyor, eklenen stop diğerlerini kaydırmıyor.)

---

## 9. Renk eşleme: hex / HSL / OKLCH girişi + snap/pin

Bir renk kodu girilince ramp'ta nereye düştüğünü göstermek istedik. Gerçek: girilen
renk neredeyse hiç tam bir basamağa oturmaz, ikisinin arasına düşer. İki yol:

- **Snap (varsayılan):** hue + lPeak + cMax'i girilen renge ayarla; marka en yakın
  *üretilmiş* stop'a yakın oturur (renk ramp'ın değeridir, birebir hex değil).
- **Pin exact:** en yakın stop'u *birebir* girilen renge sabitle; gerisi etrafında
  üretilir. Marka hex'i korunmalıysa bu (genelde korunmalı; brand book'ta o değer
  yazar).

Giriş kutusu üç format okur (varsayılan **hex**, çünkü en kolayı), ters dönüşümle
(sRGB/HSL → OKLab → OKLCH) OKLCH'ye çevirir, en yakın stop'u ve "senin rengin vs
ramp'ın o stop'ta ürettiği renk" karşılaştırmasını gösterir. Pin'lenen stop
önizlemede 📌 ile işaretlenir.

---

## 10. Light/dark önizleme + ayarlanabilir zemin renkleri

Renkleri gerçek zemin üzerinde görmek için bir **light/dark anahtarı** eklendi (hem
arayüzü hem önizleme zeminini çevirir; yüklenmede titreme olmasın diye temayı ilk
boyamadan önce ayarlayan küçük bir script). Kullanıcı **light ve dark zemin
renklerini** ayarlardan (önizleme başlığındaki L/D seçicileri) bağımsız seçer.
Swatch şeridi aktif zeminin üstünde oturur. Tema ve zeminler localStorage'da
kalıcı.

---

## 11. Proje katmanı

Ramp'lar artık **projelerin** içinde yaşıyor. "Invisible" diye proje açıp içine
istediğin kadar ramp ekliyorsun; başlık altındaki çubuktan projeler arası geçiş +
rename/delete. Save/Update/New ve export'un "all in project" kapsamı aktif projeye
göre çalışır.

```
Project { id, name, ramps: Ramp[], createdAt }
```

Eski düz ramp listesi (`oklch-ramp:saved`) ilk projeye otomatik **migrate** edilir.
Proje silmek iki adımlı onaylı; son proje silinirse boş bir tane oluşur.

**Ürünleştirme (henüz değil, sadece konuşuldu):** her şey tek kullanıcı,
localStorage. Gerçek ürün için additive bir backend katmanı gerekir — auth, bulut
kalıcılık (çoklu cihaz), paylaşılabilir proje linkleri, ve her projeyi bir shadcn
`registry:base` endpoint'i olarak yayınlama (ekip `npx shadcn add` ile çeksin). Veri
modeli zaten proje→ramp olduğu için mevcut mimariyi bozmaz.

---

## 12. Test + CLAUDE.md + altyapı

- **Testler** (`npm test`, `node:test` + `tsx`): OKLCH dönüşümleri, sabit merdiven,
  lime senaryosu, "stop eklemek kaydırmıyor", pin override, export formatları.
  `lib/`'e dokununca yeşil kalmalı.
- **CLAUDE.md**: Claude Code'un otomatik okuduğu kısa çalışma brifi.
- **.nvmrc** (Node 22).

---

## Kararlar özeti

| Konu | Karar | Gerekçe |
|---|---|---|
| Token katmanı | primitive → semantic → component | tek yönlü referans, tema swap semantic'te |
| Tailwind v4 | primitive `@theme`, semantic `@theme inline` | override'ın akması için |
| Ramp derinliği | 16 stop (iki uç yoğun) | tek ramp light+dark besliyor |
| Stop 0 | soluk tint, saf beyaz değil (lTop=0.97) | saf beyaz ramp'ta değil; base.white alias |
| Beyaz/siyah | ramp'ta değil, `base.white/black` alias | hue-bağımsız, tekrar etmemek için |
| 1000 | near-black, saf siyah değil | smearing/sert kontrast |
| Lightness merdiveni | **sıra-bazlı (ordinal)** + lCurve | etiketler nominal; bitişik adımlar eşit (Tailwind/ColorBox gibi) |
| Chroma | `lPeak`'te tepe yapan çan, merdivenden bağımsız | çamur/yıkanma önleme; açık marka için tepe yukarı |
| Marka rengi | "500" olmak zorunda değil | etiket = pozisyon, `primary` alias herhangi stop'a |
| Renk eşleme | snap (yakın) / pin (birebir) | brand hex'i koruma seçeneği |
| Arayüz | nötr gri, mono | renk aracı hue katmamalı |
| Renk uzayı | OKLCH | gerçek parlaklık, öngörülebilir kontrast |

---

## 13. Gamut-fit + simetrik stop ölçeği (sonraki oturum)

**Gamut-fit (default açık).** Açık uçtaki yüksek-chroma stop'lar sRGB dışına
taşıp ⚠ ile işaretleniyordu. Naive RGB kırpma hue'yu kaydırdığı için, bunun
yerine **chroma'yı L ve H'yi koruyarak sRGB sınırına çeken** bir gamut mapping
eklendi (`maxChromaInGamut`, binary search). Önizleme başlığındaki "fit gamut"
toggle ile kontrol ediliyor, varsayılan açık → hiçbir stop kırpılmıyor. Pin'ler
asla map'lenmez (marka hex'i birebir). Lib'de **opt-in** tutuldu (`DEFAULT_PARAMS`
boş bırakır) çünkü koşulsuz kırpma, lime senaryosunda tepe stop'un chroma'sını
gövdedeki bir stop'un altına düşürüp kilitli "tepe = max chroma" invariant'ını
bozuyordu; `normalizeParams` ve UI'ın `INITIAL_PARAMS`'ı varsayılanı açar.

**16 → 15 stop, 500 etrafında simetrik.** Eski açık küme `0,10,20,50` ilk 50
birime sıkışıyordu → lineer merdivende 0/10/20 arası ΔL ≈ 0.008, near-white'ta
neredeyse ayırt edilemez ("0,10,20 birbirine çok yakın" feedback'i). Koyu taraf
(`800,850,900,950,1000`, ΔL 0.04) zaten düzgündü. Birkaç deneme oldu: önce açık
etiketler koyu tarafın aynası yapıldı (`0,50,100,150,200…`) ama bu 10/20'yi
düşürüyordu; kullanıcı bunu istemedi. Sonra ince basamaklar (30,40) ve `750`
denendi, ardından geri alındı. **Nihai karar:** orijinal 16-stop sete dönüldü
(`0,10,20,50,100,…,1000`) + **stop 0 saf beyaz** (`lTop = 1.0`; fitGamut chroma'yı
0'a kırpar → `#ffffff`).

**Açık tartışma — "500 altı çok koyu":** Lineer merdivende 200–400 orta-koyu
doygun maviye düşüyor. Bunu açmak için merdiveni eğmek (light-side lift) gerekir
ama bu, ince açık basamakları (0–50) daha da yaklaştırır — yani "ince ayrık açık
basamak" ile "açık orta-tonlar" tek bir monoton eğride çakışır. Çözüm kullanıcının
önceliğine bağlı; per-stop lightness / eğri kontrolü ileride değerlendirilecek.

**Layout.** Önizleme/grid responsive yapıldı: grid kolonları `minmax(0,1fr)` ile
küçülebilir; swatch'lar her boyutta tek sıra sığar (scroll yok), per-swatch
etiket/⚠/hex bilgisi yer açıldıkça kademeli görünür (sm/lg breakpoint'leri).

## 14. Lightness eğrisi — Material / Carbon / Tailwind araştırması

"500 altı çok koyu" gözlemi üzerine üç olgun sistemin renk skalasını inceledik:

- **Material Design 3:** tone numarası **doğrudan L*** (CIELAB algısal lightness).
  Tonal palet 0–100; açık uçta ince tonlar (90, **95, 99**, 100) — yani en-açık
  subtle yüzeyler birbirine yakındır, bu kasıtlı/normaldir.
- **IBM Carbon:** blue 10→100 OKLCH L'leri ≈ `0.967, 0.908, 0.828, 0.736, 0.647,
  0.557, 0.454, 0.363, 0.280, 0.204`. **Lineer değil** — açık uçta küçük ΔL
  (10→20 = 0.059), ortada en dik (~0.09–0.10), koyu uçta tekrar yumuşar (S eğri).
  Kontrast-odaklı (50 grade fark ≈ WCAG AA).
- **Tailwind v4:** L'ler `0.978, 0.936, 0.881, 0.827, 0.742, 0.648, 0.573, 0.469,
  0.394, 0.320, 0.238` (50→950). Yine **non-linear**; 500 = **0.648** (orta noktadan
  açık), açık tonlar üstte sıkışık (açık kalır), en dik düşüş ortada. El ile
  ayarlanmış ("nothing beats the trained eye").

**Bulgu:** Üçü de lineer kullanmıyor; hepsi **konveks/S** lightness dağılımı +
"base" L ≈ 0.55–0.65. Bizim lineer merdivenin 500'ü (0.585/0.593) Tailwind'inkinden
(0.648) daha koyuydu ve 200–400 gereğinden hızlı koyulaşıyordu — kullanıcının
gözlemi doğru.

**Karar:** Merdivene `lCurve` eklendi. İlk deneme düz gamma (`t^lCurve`, 1.2) idi
ama bu açık ucu **düzleştirip** 0/10/20'yi beyaza yapıştırıyordu (kullanıcı: "10,20
çok açık/washed"). Düzeltme: **mid-ağırlıklı gamma** —
`L = lTop + (lBottom−lTop)·t^(1+(lCurve−1)·t)`. Üs açık uçta ~1 (lineer, 10/20
yıkanmaz), koyuya doğru `lCurve`'e yükselir → mid-tonlar açılır ama en açık
basamaklar korunur. **1.4 (UI varsayılanı)** mid-tonları Tailwind'e yaklaştırır
(500: 0.645 vs 0.648) ve 10=0.992 / 20=0.984 lineerle aynı kalır. Slider 1.0–2.0.
Geometrik gerçek: 0=beyaz iken 10,20 (etiket olarak %1–2 uzakta) hiçbir düz eğride
beyazdan çok ayrılamaz — Tailwind/Material de beyazın hemen yanına o kadar ince
basamak koymaz (ilk tint ~0.94–0.97'ye atlar). Daha ayrık isteniyorsa çözüm eğri
değil daha kaba açık etiketlerdir.

Kaynaklar: m3.material.io/styles/color · carbondesignsystem.com/elements/color ·
github.com/carbon-design-system/carbon (colors) · tailwindcss.com/docs/colors ·
evilmartians.com (OKLCH/Tailwind).

## 15. Büyük marka araştırması → sıra-bazlı (ordinal) lightness

"0–50 arası kırılımlar birbirine çok yakın, daha dramatik olsun" geri bildirimi
üzerine büyük markaların renk formüllerini inceledik:

- **Tailwind v4 / Material 3 / IBM Carbon:** stop isimleri (50,100,200… / tone 0–100)
  sadece **sıra etiketi**; lightness her *slot*'a eşit/eased dağıtılıyor. Material'de
  tone = L* doğrudan. Hiçbiri etiket-değerine oranlamıyor.
- **Lyft ColorBox:** N adım seçiyorsun; luminosity `start→end` arası bir **bezier
  easing eğrisiyle adımlara** dağıtılıyor (etikete değil). Hue/saturation da ayrı
  eğriler.
- **Adobe Leonardo:** her swatch'a hedef **kontrast oranı / lightness** atıyor;
  renkler lightness'a göre diziliyor.
- **uicolors.app (§ önceki):** el-ayarlı referans paletin lightness'ını ödünç alıp
  hue/saturation transplant ediyor — yine sabit, ordinal slot mantığı.

**Kök sorun:** Bizim araç tek istisnaydı — lightness'ı `label/1000` ile *oranlıyordu*.
Bu yüzden 0,10,25 (skalanın en üst %2.5'i) matematiksel olarak yapışıyordu; hiçbir
eğri çözemezdi.

**Karar:** Lightness artık etiket değerine değil **sıra indeksine** bağlı:
`t = index/(count−1)`, `L = lightnessAt(t)`. Böylece 0→10→25→50, tıpkı 800→850→900
gibi eşit/dramatik adımlıyor (ΔL ≈ 0.04–0.07, eskiden 0.008). `lCurve` (mid-ağırlıklı
gamma) hâlâ konveks şekli veriyor. **Bedeli:** "stop eklemek diğerlerini kaydırmaz"
özelliği gitti — artık stop eklemek/çıkarmak slot'ları yeniden dağıtıyor (yalnızca
lTop/lBottom uçları sabit). Bu bilinçli takas: kümelenen etiketler artık sıkışamaz,
ve davranış Tailwind/ColorBox ile aynı hizada. Etiketler artık nominal isim.

Kaynaklar: tailwindcss.com/docs/colors · m3.material.io/styles/color ·
carbondesignsystem.com · colorbox.io (Lyft) · github.com/lyft/coloralgorithm ·
leonardocolor.io · github.com/adobe/leonardo · uicolors.app.

**Sonradan — koyu surface yoğunluğu.** Ordinal her şeyi eşitleyince dark-mode için
gereken yoğun/derin koyu küme (850–1000) yayıldı ("koyu renkler bozuldu" geri
bildirimi). Çözüm `lCurve` ile: mid-ağırlıklı gammada **lCurve < 1**, adımları koyu
uca doğru *sıkıştırıp* derinleştiriyor (850≈0.32, 900≈0.27, 950≈0.23, ΔL ~0.04 — çok
sayıda kullanılabilir surface tonu), açık ucu dramatik bırakıyor. **>1** ise tersine
mid'leri açar, koyuyu yayar. Varsayılan **0.8** (yoğun derin koyu + makul mid).
Bedeli geometrik: derin/yoğun koyu ⟺ mid'ler bir miktar koyulaşır; ikisi tek monoton
eğride çakışır, slider (0.5–2.0) ile dengelenebilir.

## Sıradaki adımlar (niyet sırası)

1. **Per-swatch kontrast okumaları** seçili light/dark zemine karşı (WCAG 2 oranı +
   APCA Lc). WCAG ≠ OKLCH L — hex'ten hesapla. Özellikle lime gibi açık fill'lerde
   (siyah metin) kritik.
2. **Semantic eşleme katmanı** — mod başına rol→stop tablosu (`surface-0..3`,
   `border-subtle/default/strong`, `primary`, `primary-text`, `on-primary` …) **DTCG
   alias** olarak emit. Light koyu stop'a, dark açık stop'a (örn. primary light=600
   / dark=400), kontrastla doğrulanır. Açık marka için `on-primary` = `base.black`.
3. **Per-project zemin renkleri** (şu an global app prefs).
4. **Ürünleştirme** (musing): auth, bulut, paylaşım, registry yayınlama.

> Teknik dosya haritası, veri modeli anahtarları ve "bozma" uyarıları için
> `CLAUDE.md`'ye bak. Bu döküman gerekçeleri, o döküman güncel durumu tutar.
