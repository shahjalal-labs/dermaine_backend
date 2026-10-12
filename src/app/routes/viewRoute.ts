const getLegalTemplate = (
  titleEn: string,
  titleAr: string,
  subtitleEn: string,
  subtitleAr: string,
  updateDateAr: string,
  updateDateEn: string
) => {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${titleEn} / ${titleAr}</title>
  <meta name="description" content="${subtitleEn} - ${subtitleAr}" />
  <style>
    :root{
      --bg:#07111f;
      --bg-soft:#0d1b2f;
      --card:rgba(10, 23, 42, 0.82);
      --card-border:rgba(148, 163, 184, 0.16);
      --muted:#9fb0c7;
      --text:#eaf1fb;
      --accent:#4dd4ac;
      --accent-2:#7cdaff;
      --danger:#ff6b6b;
      --success:#66e29f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    html,body{height:100%}
    body{
      margin:0;
      color:var(--text);
      background:
        radial-gradient(circle at top left, rgba(77, 212, 172, 0.18), transparent 30%),
        radial-gradient(circle at top right, rgba(124, 218, 255, 0.14), transparent 26%),
        linear-gradient(180deg, var(--bg) 0%, var(--bg-soft) 100%);
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
      line-height:1.6;
      padding:24px;
    }
    .wrap{max-width:1040px;margin:0 auto}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
    header h1{font-size:28px;line-height:1.2;margin:0;color:var(--text);letter-spacing:-0.03em}
    header p{margin:6px 0 0;color:var(--muted);font-size:14px;max-width:68ch}
    .card{background:var(--card);border:1px solid var(--card-border);border-radius:20px;padding:24px;box-shadow:0 18px 45px rgba(1, 6, 15, 0.28);backdrop-filter:blur(14px);margin-bottom:16px}
    h2{margin:0 0 14px 0;font-size:20px;color:var(--accent);border-bottom:1px solid rgba(77, 212, 172, 0.15);padding-bottom:8px}
    h3{margin:8px 0;color:var(--text);font-size:16px}
    p{margin:8px 0;color:var(--text)}
    ul{margin:10px 0 10px 20px;color:var(--muted)}
    ol{margin:10px 0 10px 20px;color:var(--muted)}
    .legal-list li { margin-bottom: 8px; }
    .muted{color:var(--muted);font-size:13px}
    .pill{display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(77, 212, 172, 0.14);color:var(--accent);font-weight:700;font-size:12px;border:1px solid rgba(77, 212, 172, 0.18)}
    footer{margin-top:24px;font-size:12px;color:var(--muted);text-align:center;padding-bottom:24px;border-top:1px solid var(--card-border);padding-top:16px}
    
    /* Switcher styling */
    .switcher-container {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }
    .switcher {
      display: inline-flex;
      background: var(--bg-soft);
      border: 1px solid var(--card-border);
      border-radius: 999px;
      padding: 4px;
      gap: 4px;
    }
    .switcher label {
      padding: 8px 24px;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      color: var(--muted);
      transition: all 0.25s ease;
      user-select: none;
    }
    .switcher label:hover {
      color: var(--text);
    }
    #tab-ar:checked ~ .switcher-container .switcher label[for="tab-ar"] {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #07111f;
    }
    #tab-en:checked ~ .switcher-container .switcher label[for="tab-en"] {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #07111f;
    }
    
    /* Content visibility based on radio checks */
    .content-ar, .content-en {
      display: none;
      animation: fadeIn 0.4s ease;
    }
    #tab-ar:checked ~ .content-ar {
      display: block;
    }
    #tab-en:checked ~ .content-en {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    input[type="radio"] { display: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <input type="radio" id="tab-ar" name="lang-select" checked />
    <input type="radio" id="tab-en" name="lang-select" />

    <div class="switcher-container">
      <div class="switcher">
        <label for="tab-ar">العربية</label>
        <label for="tab-en">English</label>
      </div>
    </div>

    <!-- ARABIC CONTENT -->
    <div class="content-ar" dir="rtl">
      <header>
        <div>
          <h1>منصة شَعْرة (Shaara)</h1>
          <p class="muted">${subtitleAr}</p>
        </div>
        <div>
          <span class="pill">آخر تحديث: ${updateDateAr}</span>
        </div>
      </header>

      <section class="card">
        <h2>لوﺑﻘﻟاو ﺔﻣدﻘﻣﻟا</h2>
        <p>مازﺗﻟﻻا ﻰﻠﻋ طرﺷ وأ دﯾﻗ نودﺑو ًﺔﺣارﺻ قﻓاوﺗ كﻧﺈﻓ ،ﺎﮭﯾﻓ ﺎًﺑﺎﺳﺣ كﺋﺎﺷﻧﺈﺑ وأ Shaara ﺔﺻﻧﻣ ﻰﻟإ كﻟوﺧد وأ كﻣادﺧﺗﺳﺎﺑ. ﺎﮭﯾﻠﻋ أرطﺗ تﻼﯾدﻌﺗ وأ تﺎﺛﯾدﺣﺗ يأ ﻰﻠﻋ ﺔﯾﺋﺎﮭﻧ ًﺔﻘﻓاوﻣ ﺔﺻﻧﻣﻟا مادﺧﺗﺳا ﻲﻓ كرارﻣﺗﺳا دﻌُﯾو ،ﺎﻧھ ةروﻛذﻣﻟا دوﻧﺑﻟا ﻊﯾﻣﺟﺑ دﻌُﯾ ﺔﻣدﺧﻠﻟ ﮫﻣادﺧﺗﺳا نأو ،ﺔﯾﻗﺎﻔﺗﻻا هذھ ﻲﻓ لوﺧدﻟاو ﺔﺻﻧﻣﻟا مادﺧﺗﺳﻻ ﺔﻠﻣﺎﻛﻟا ﺔﯾﻧوﻧﺎﻘﻟا ﺔﯾﻠھﻷﺎﺑ ﻊﺗﻣﺗﯾ ﮫﻧﺄﺑ مدﺧﺗﺳﻣﻟا رﻘُﯾ. ﺔﺻﻧﻣﻟا ﺎﮭﯾﻓ مدﺧﺗﺳﯾ ةرﻣ لﻛ ﻲﻓ تﺎﺛﯾدﺣﺗ يﻷ ﮫﺗﻌﺟارﻣو طورﺷﻟا هذﮭﻟ ﮫﺗءارﻗ ﻰﻠﻋ اًدﯾﻛﺄﺗ. نﯾﻣدﺧﺗﺳﻣﻟا ﻊﯾﻣﺟﻟ ﺔﻣزﻠﻣ دﻌُﺗو ،ﺔﯾدوﻌﺳﻟا ﺔﯾﺑرﻌﻟا ﺔﻛﻠﻣﻣﻟا ﺔﻣظﻧﻷ ﺔﻘﯾﺛوﻟا هذھ ﻊﺿﺧﺗ.</p>
      </section>

      <section class="card">
        <h2>تﺎﻔﯾرﻌﺗﻟا</h2>
        <ul class="legal-list">
          <li><strong>منصة شَعْرة (Shaara):</strong> منصة وسيطة تقنية تربط بين العملاء ومقدمي خدمات العناية والتجميل.</li>
          <li><strong>المستخدم:</strong> أي شخص طبيعي أو اعتباري يقوم بزيارة المنصة أو استخدامها أو إنشاء حساب فيها، سواء كان مسجلاً أو غير مسجل.</li>
          <li><strong>مقدم الخدمة:</strong> أي صالون، حلاق، مركز عناية، منشأة أو فرد يقدم خدماته داخل المنصة، ويقر بأنه حاصل على التراخيص السارية والوثائق النظامية اللازمة من الجهات المختصة في المملكة لممارسة النشاط (إن كانت مطلوبة).</li>
          <li><strong>المحتوى:</strong> يشمل جميع المعلومات والبيانات والصور والأسعار والروابط والرسائل والتقييمات وأي مواد يتم رفعها أو نشرها أو مشاركتها عبر المنصة.</li>
          <li><strong>الإعلان:</strong> أي محتوى تسويقي أو عرض أو خدمة تُنشر داخل المنصة سواء كان مجانياً أو مدفوعاً، ويشمل النصوص والصور والوسائط والروابط.</li>
        </ul>
      </section>

      <section class="card">
        <h2>بﺎﺳﺣﻟا ﺔﯾﻟوؤﺳﻣو ﺔﯾﻧوﻧﺎﻘﻟا ﺔﯾﻠھﻷا</h2>
        <p>يقر المستخدم بأنه يمثل نفسه أو الجهة المخول نظاماً بتمثيلها. وإذا كان مقدم خدمة، فإنه يقر بأن حساب منشأته قد يُسخدم من قبله أو من موظفين تابعين له بنفس بيانات الدخول. والمنصة غير ملزمة بالتحقق من هوية الشخص الذي استخدم الحساب فعلياً.</p>
        <p>يتحمل صاحب الحساب كامل المسؤولية القانونية والمالية والإدارية عن جميع الإجراءات التي تتم عبر حسابه، سواء قام بها هو أو موظفوه أو أي شخص حصل على بيانات الدخول منه.</p>
      </section>

      <section class="card">
        <h2>أولاً: الأحكام العامة والمشتركة</h2>
        <ol class="legal-list">
          <li>الالتزام الكامل بجميع الأنظمة واللوائح المعمول بها في المملكة العربية السعودية.</li>
          <li>يُمنع نشر أي محتوى مسيء، مخالف، عنصري، تحريضي، مخل بالآداب، أو ينتهك حقوق الآخرين.</li>
          <li>المستخدم مسؤول عن صحة ودقة جميع المعلومات التي يقوم بإدخالها أو نشرها عبر المنصة.</li>
          <li>يُمنع نسخ أو إعادة نشر محتوى أي مستخدم آخر أو محتوى المنصة دون إذن كتابي مسبق.</li>
          <li>يحظر أي استخدام آلي للمنصة مثل (Bots / Scripts / Crawlers) دون إذن رسمي من إدارة المنصة.</li>
          <li>المنصة وسيط تقني فقط، ولا تتحمل مسؤولية النزاعات أو نتائج الخدمات بين الأطراف.</li>
          <li>للمنصة الحق في:
            <ul>
              <li>حذف أي محتوى مخالف دون إشعار مسبق.</li>
              <li>تقييد، تعليق، إيقاف، أو شطب أي حساب يخالف الشروط أو يسيء استخدام المنصة.</li>
            </ul>
          </li>
        </ol>
      </section>

      <section class="card">
        <h2>ثانياً: الأحكام الخاصة بالعملاء</h2>
        <ol class="legal-list">
          <li>العميل مسؤول عن التحقق من جودة الخدمة، ومصداقية المعلومات (السعر، الموقع، نوع الخدمة، المواعيد) قبل إتمام الحجز.</li>
          <li>لا تتحمل المنصة أي مسؤولية عن إلغاء الموعد، أو تأخر مقدم الخدمة، أو عدم حضوره، أو اختلاف مستوى الخدمة عن المتوقع، أو أي أضرار أو نتائج ناتجة عن الخدمة المقدمة.</li>
          <li>التقييمات تعبر عن آراء أصحابها فقط، ولا تمثل المنصة، ولا تلتزم المنصة بتعديلها أو حذفها إلا وفق ما تراه مناسباً.</li>
          <li>يُمنع الإساءة، التحرش، التهديد، أو استخدام ألفاظ غير لائقة أثناء التواصل داخل أو خارج المنصة.</li>
          <li>أي تواصل أو اتفاق أو دفع يتم خارج المنصة يكون مسؤولية الطرفين فقط.</li>
          <li>في حال الخدمات المنزلية أو الميدانية:
            <ul>
              <li>العميل مسؤول عن صحة عنوانه الجغرافي، وعن السماح بالدخول لمقدم الخدمة وآثاره القانونية.</li>
              <li>لا تتحمل المنصة مسؤولية أي فقدان أو أضرار أو سوء فهم يشمل الموقع، الأشخاص، الأطفال، الممتلكات، أو الحيوانات داخل موقع الخدمة.</li>
              <li>يقر العميل بأن جميع الزيارات المنزلية تتم بمحض إرادته وعلى مسؤوليته الشخصية دون أي مسؤولية أو ضمانات من المنصة.</li>
            </ul>
          </li>
        </ol>
      </section>

      <section class="card">
        <h2>ثالثاً: الأحكام الخاصة بمقدمي الخدمة</h2>
        <ol class="legal-list">
          <li>يُمنع تقديم أو الإعلان عن أي خدمة مخالفة للأنظمة أو التعليمات أو الآداب العامة في المملكة.</li>
          <li>يُمنع تقديم خدمات تتطلب ترخيصاً طبياً/صحياً مثل: الحقن التجميلية (بوتوكس/فيلر/خيوط)، أو الليزر، أو التقشير الكيميائي، أو الإجراءات الطبية أو الجلدية، ما لم يكن مقدم الخدمة مرخصاً نظامياً ويقدم الوثائق عند الطلب.</li>
          <li>يُمنع استخدام عمالة غير نظامية أو أشخاص غير مؤهلين أو غير مخولين بتقديم الخدمة.</li>
          <li>تتحمل المنشأة أو صاحب الحساب المسؤولية الكاملة عن أي انتهاك للخصوصية أو إساءة استخدام بيانات العملاء.</li>
          <li>يحظر إضافة رسوم غير معلنة بعد تأكيد الحجز، أو إلغاء/تأخير المواعيد بشكل متكرر دون مبرر، أو إساءة التعامل اللفظي أو السلوكي مع العملاء بما في ذلك التحرش أو التهديد أو التمييز.</li>
          <li>تحتفظ المنصة بالحق في إيقاف الحساب أو شطبه نهائياً دون تعويض عند ارتكاب المخالفات أو انخفاض مستوى الخدمات أو كثرة البلاغات.</li>
        </ol>
      </section>

      <section class="card">
        <h2>بند التوثيق</h2>
        <p>حصول مقدم الخدمة على حالة "موثق" داخل المنصة لا يعني ضمان المنصة أو مصادقتها على جودة الخدمة أو كفاءة مقدم الخدمة أو نتائجه أو التزامه المستقبلي، وإنما يعني فقط أن مقدم الخدمة قد استوفى متطلبات التحقق التي تحددها المنصة وقت التوثيق. وتحتفظ المنصة بحق سحب أو تعليق حالة التوثيق في أي وقت وفقاً لتقديرها.</p>
      </section>

      <section class="card">
        <h2>بند التقييمات والمراجعات</h2>
        <p>يجب أن تكون جميع التقييمات والمراجعات مبنية على تجربة حقيقية وواقعية. ويُمنع التلاعب بالتقييمات أو نشر تقييمات مضللة أو غير صحيحة أو الحصول على تقييمات مقابل مبالغ مالية أو منافع مباشرة أو غير مباشرة. وتحتفظ المنصة بحق تعديل أو إخفاء أو حذف أي تقييم ترى أنه مخالف أو مضلل أو يهدف للتأثير غير المشروع على المستخدمين.</p>
      </section>

      <section class="card">
        <h2>بند الصور والمحتوى المرفوع والملكية الفكرية</h2>
        <p>يقر مقدم الخدمة بأنه يمتلك أو حصل على جميع الحقوق والتصاريح اللازمة لاستخدام الصور والمحتويات والمواد التي يقوم برفعها داخل المنصة. ويتحمل وحده المسؤولية القانونية الكاملة عن أي انتهاك لحقوق الملكية الفكرية أو حقوق النشر أو العلامات التجارية أو حقوق الغير. وتخلي المنصة مسؤوليتها عن أي مطالبات أو نزاعات تنشأ بسبب المحتوى المرفوع من قبل المستخدمين.</p>
      </section>

      <section class="card">
        <h2>بند الإشعارات والتنبيهات</h2>
        <p>يوافق المستخدم على استقبال الإشعارات والتنبيهات المتعلقة بالحساب والمواعيد والحجوزات والتنبيهات التشغيلية والتحديثات المهمة الخاصة بالمنصة. كما يحق للمنصة إرسال الإشعارات اللازمة لتشغيل الخدمة وتحسين تجربة المستخدم. ويمكن للمستخدم التحكم ببعض إعدادات الإشعارات من خلال جهازه أو التطبيق عند توفر ذلك.</p>
      </section>

      <section class="card">
        <h2>بند الأسعار والمعلومات المعروضة</h2>
        <p>يلتزم مقدم الخدمة بأن تكون جميع الأسعار والخدمات والعروض والمعلومات المعروضة داخل المنصة صحيحة وواضحة ومحدثة باستمرار. ويتحمل مقدم الخدمة المسؤولية الكاملة عن أي اختلاف أو تضليل أو أخطاء تتعلق بالأسعار أو تفاصيل الخدمات أو العروض المقدمة للعملاء.</p>
      </section>

      <section class="card">
        <h2>بند الخدمات المالية المستقبلية</h2>
        <p>تحتفظ المنصة بحق إضافة خدمات الدفع الإلكتروني أو المحافظ الرقمية أو خدمات التحصيل أو أي خدمات مالية أخرى مستقبلاً. وفي حال إضافة أي من هذه الخدمات، يحق للمنصة تحديث الشروط والأحكام والسياسات ذات العلاقة بما يتوافق مع الأنظمة واللوائح المعمول بها في المملكة العربية السعودية. ويُعد استمرار المستخدم في استخدام المنصة موافقة على تلك التحديثات.</p>
      </section>

      <section class="card">
        <h2>رابعاً: أحكام الإعلان</h2>
        <ol class="legal-list">
          <li>يُمنع نشر أي إعلان يحتوي على:
            <ul>
              <li>محتوى مخالف لأنظمة المملكة أو الآداب العامة.</li>
              <li>صور مزيفة أو صور تم الحصول عليها من الإنترنت.</li>
              <li>إعلانات مضللة أو وعود بنتائج غير واقعية.</li>
              <li>بيانات شخصية أو وثائق حكومية أو صور لأشخاص دون إذنهم.</li>
              <li>روابط أو محتوى يهدف لجمع بيانات المستخدمين أو تحويلهم خارج المنصة.</li>
              <li>محتوى استغلالي أو احتيالي أو يضر بالمنصة أو مستخدميها.</li>
            </ul>
          </li>
          <li>للمنصة الحق في:
            <ul>
              <li>حذف أي إعلان مخالف فوراً دون إشعار مسبق.</li>
              <li>إيقاف أو شطب الحساب المرتبط به.</li>
              <li>إحالة المخالفات الجسيمة للجهات المختصة دون التزام باسترداد أي مبالغ مدفوعة أو بالتعويض.</li>
            </ul>
          </li>
        </ol>
        <p class="muted">يقر المستخدم بأن المنصة لا تضمن صحة الإعلانات، وأنها تخلي مسؤوليتها بالكامل عن أي أضرار أو خسائر أو تضليل ناتج عن الاعتماد على الإعلانات.</p>
      </section>

      <section class="card">
        <h2>خامساً: الأمن والخصوصية</h2>
        <ol class="legal-list">
          <li>تلتزم المنصة بتوفير بيئة آمنة قدر الإمكان.</li>
          <li>يُمنع التحرش، التنمر، التهديد، أو الإساءة بين المستخدمين.</li>
          <li>توصي المنصة بعدم مشاركة أي بيانات حساسة خارج التطبيق، خصوصاً للنساء والفتيات حفاظاً على الخصوصية والأمان.</li>
          <li>لا تتحمل المنصة مسؤولية أي حوالات أو تعاملات مالية تتم خارجها، ويتحمل المستخدم وحده التحقق منها.</li>
          <li>يحق للمنصة:
            <ul>
              <li>إيقاف أي حساب عند الاشتباه بأنه يشكل خطراً على الأمان.</li>
              <li>إحالة أي نشاط مشبوه للجهات المختصة دون إشعار مسبق.</li>
            </ul>
          </li>
        </ol>
      </section>

      <section class="card">
        <h2>سادساً: سياسة جمع البيانات والاحتفاظ بها</h2>
        <ol class="legal-list">
          <li>قد تجمع المنصة بيانات ضرورية للتشغيل تشمل: الاسم، رقم الجوال/البريد الإلكتروني، الموقع التقريبي، بيانات الجهاز، وبيانات الاستخدام لغرض تشغيل الخدمة وتحسين التجربة.</li>
          <li>يجوز للمنصة مشاركة بعض البيانات الضرورية فقط مع: مقدمي الخدمة عند الحجز، ومزودي الخدمات التقنية (استضافة/رسائل/مدفوعات) بما يخدم تشغيل الخدمة فقط.</li>
          <li>الإنترنت ليس آمناً 100% ولا تضمن المنصة حماية مطلقة من الاختراقات الخارجة عن إرادتها.</li>
          <li>عند طلب حذف الحساب: تُحذف البيانات ما لم يوجد التزام نظامي أو أمر رسمي من الجهات المختصة يقتضي الاحتفاظ بها لمدة محددة.</li>
        </ol>
      </section>

      <section class="card">
        <h2>sابعاً: حدود المسؤولية</h2>
        <ol class="legal-list">
          <li>لا تقدم المنصة أي ضمان حول دقة أو صحة أو اكتمال المحتوى المنشور أو الإعلانات.</li>
          <li>لا تتحمل المنصة أي مسؤولية عن: فقدان البيانات، الخسائر المالية، الأعطال التقنية، الانقطاعات، الفيروسات، الهجمات السيبرانية، أو أي ظرف طارئ خارج عن إرادتها.</li>
          <li>المستخدم يعفي المنصة نهائياً وغير قابل للرجوع من أي مطالبات أو تعويضات تنشأ عن استخدامه للمنصة، أو الخدمات المعروضة داخلها، أو التعاملات خارجها.</li>
        </ol>
      </section>

      <section class="card">
        <h2>ثامناً: التعويض</h2>
        <p>يتعهد المستخدم بتعويض المنصة عن أي دعاوى أو أضرار أو خسائر أو تكاليف (بما في ذلك أتعاب المحاماة) تنشأ بسبب محتوى نشره، أو إساءة استخدامه، أو إهماله، أو استخدام بيانات الدخول له من قبل طرف غير مصرح له.</p>
      </section>

      <section class="card">
        <h2>تاسعاً: سريان البنود</h2>
        <p>لا يتأثر سريان بقية البنود إذا أصبح أي بند غير قابل للتطبيق بموجب حكم قضائي أو لائحة سعودية، ويتم استبدال البند ببند نظامي يحقق نفس الغرض بأقرب صورة ممكنة.</p>
      </section>

      <section class="card">
        <h2>عاشراً: الإبلاغ</h2>
        <p>يمكن للمسخدم تقديم البلاغات عبر زر مباشر داخل التطبيق أو من خلال القنوات الرسمية المعتمدة. وتحتفظ الإدارة بحق تقدير خطورة البلاغ واتخاذ الإجراء المناسب دون إلزامها بإجراء محدد.</p>
      </section>

      <section class="card">
        <h2>حادي عشر: التعديلات</h2>
        <p>يحق للمنصة تعديل الشروط في أي وقت دون إشعار. واستمرار المستخدم في الاستخدام يعني موافقته النهائية على التعديلات. والمستخِدم مسؤول عن مراجعة الشروط بشكل دوري.</p>
      </section>

      <footer>
        حقوق الطبع والنشر محفوظة لمنصة شَعْرة (Shaara).
      </footer>
    </div>

    <!-- ENGLISH CONTENT -->
    <div class="content-en" dir="ltr">
      <header>
        <div>
          <h1>Shaara Platform</h1>
          <p class="muted">${subtitleEn}</p>
        </div>
        <div>
          <span class="pill">Last Updated: ${updateDateEn}</span>
        </div>
      </header>

      <section class="card">
        <h2>Introduction and Acceptance</h2>
        <p>By accessing or using the Shaara Platform, browsing it, or creating an account, you unconditionally agree to comply with all terms outlined below. Continued use constitutes final acceptance of any updates or modifications.</p>
        <p>The user confirms full legal capacity to use the platform and enter into this agreement. This document is governed by the laws of the Kingdom of Saudi Arabia and is binding on all users.</p>
      </section>

      <section class="card">
        <h2>Definitions</h2>
        <ul class="legal-list">
          <li><strong>Platform:</strong> Shaara, a technical intermediary platform connecting clients with grooming, beauty, and personal care service providers.</li>
          <li><strong>User:</strong> Any individual or legal entity visiting, registering, browsing, or using the platform, registered or unregistered.</li>
          <li><strong>Service Provider:</strong> Any salon, barber, beauty center, independent professional, or establishment acknowledged to hold valid licenses or required Saudi legal documents if mandated by authorities for service practice.</li>
          <li><strong>Content:</strong> Includes all uploaded or shared items such as data, descriptions, images, prices, links, messages, reviews, and advertisements.</li>
          <li><strong>Advertisement:</strong> Any free or paid promotional content including text, images, media, or links displayed on the platform.</li>
        </ul>
      </section>

      <section class="card">
        <h2>Legal Eligibility and Account Responsibility</h2>
        <p>Users confirm they represent themselves or the entity they are legally authorized to represent. The account owner bears full legal, financial, and administrative responsibility for all actions performed through their credentials.</p>
        <p>The platform is not obligated to verify the actual identity of the person operating the account using shared login details. If a Service Provider is a business entity, their account might be operated by authorized employees using the same login credentials.</p>
      </section>

      <section class="card">
        <h2>General Rules for All Users</h2>
        <ol class="legal-list">
          <li>Users must fully comply with Saudi applicable laws and regulations.</li>
          <li>It is strictly prohibited to publish content that is offensive, racist, abusive, unlawful, unethical, or violates public morals or others’ rights.</li>
          <li>Users are solely responsible for ensuring accuracy and legal rights to publish their content, without copying or republishing others’ platform content without prior written permission.</li>
          <li>Automated access or data scraping using (Bots / Scripts / Crawlers) is fully prohibited unless explicitly authorized by platform management.</li>
          <li>The platform acts only as a technical intermediary and is not liable for service disputes or service outcomes between users and providers.</li>
          <li>Platform management reserves the right to delete violating or suspicious content, restrict, suspend, or permanently deactivate any account without notice or compensation if misuse or violations occur.</li>
        </ol>
      </section>

      <section class="card">
        <h2>Client-Specific Terms</h2>
        <ol class="legal-list">
          <li>Clients are solely responsible for verifying service information before booking, including pricing, service type, provider credibility, location, and appointment details.</li>
          <li>The platform bears no responsibility for provider delays, appointment cancellation, failures to show, unsatisfactory results, or any damages or consequences resulting from the provided service.</li>
          <li>Reviews express their authors’ opinions only, with platform management having discretionary rights to modify or remove content if deemed appropriate.</li>
          <li>Communications, agreements, or payments outside the platform are the responsibility of involved parties only.</li>
          <li>For home or mobile services: clients are solely responsible for address accuracy and permitting provider entry, along with associated legal and security consequences.</li>
          <li>The platform has no liability concerning service site safety, individuals, property, children, or animals at the visit location.</li>
          <li>Users confirm home or mobile visits are performed under their own free will and personal responsibility without platform liability or guarantees.</li>
        </ol>
      </section>

      <section class="card">
        <h2>Service Provider-Specific Terms</h2>
        <ol class="legal-list">
          <li>Providers must not advertise or provide services that violate Saudi regulations or public morals.</li>
          <li>Health/medical-related beauty services such as: Botox, fillers, threads, laser procedures, chemical peels, or clinical dermatological treatments are strictly prohibited unless properly licensed by Saudi health authorities and required documents are submitted when officially requested.</li>
          <li>It is strictly forbidden to employ unqualified or non-licensed or unauthorized personnel or illegal workers to perform services within the platform operations or visits.</li>
          <li>Collecting, storing, or capturing client data, images, recordings, or undisclosed charges post-booking confirmation is prohibited. Establishments and account owners bear full liability for any privacy or data misuse violations.</li>
          <li>Providers must not cancel or delay appointments repeatedly without valid justification, or engage in improper client conduct including harassment, threats, abuse, discrimination, or adding unforeseen fees post-confirmation.</li>
          <li>Platform management holds the right to restrict, suspend, or permanently deactivate provider accounts without explanation or compensation if violations, repeated complaints, or significant rating decline occur.</li>
        </ol>
      </section>

      <section class="card">
        <h2>Verification Status</h2>
        <p>Obtaining a “Verified” status on the platform does not constitute a guarantee, endorsement, warranty, or certification by the Platform regarding the quality, performance, legality, reliability, future conduct, or outcomes of the Service Provider. Verification only indicates that the Service Provider has completed the verification requirements established by the Platform at the time of verification. The Platform reserves the right to suspend, remove, or revoke the verification status at any time at its sole discretion.</p>
      </section>

      <section class="card">
        <h2>Ratings and Reviews</h2>
        <p>All ratings and reviews must be based on genuine and actual service experiences. Users are strictly prohibited from manipulating ratings, publishing misleading or false reviews, purchasing reviews, exchanging incentives for reviews, or engaging in any activity intended to artificially influence ratings. The Platform reserves the right to remove, modify, hide, or investigate any review that it considers inaccurate, misleading, fraudulent, abusive, or in violation of these Terms.</p>
      </section>

      <section class="card">
        <h2>Images and Intellectual Property</h2>
        <p>The Service Provider represents and warrants that it owns or has obtained all necessary rights, permissions, licenses, and authorizations to upload, publish, display, and use any images, content, trademarks, logos, or materials submitted through the Platform. The Service Provider shall bear full legal responsibility for any infringement of intellectual property rights, copyrights, trademarks, privacy rights, or any third-party rights. The Platform disclaims any liability arising from user-generated content and reserves the right to remove any content that may violate applicable laws or third-party rights.</p>
      </section>

      <section class="card">
        <h2>Notifications and Communications</h2>
        <p>By using the Platform, the User agrees to receive notifications, alerts, reminders, operational messages, booking-related communications, account updates, service announcements, and other communications necessary for the operation of the Platform. The Platform may send such communications through in-app notifications, SMS messages, email, push notifications, or any other available communication channels. Users may manage certain notification preferences where such options are provided.</p>
      </section>

      <section class="card">
        <h2>Pricing and Service Information</h2>
        <p>Service Providers are solely responsible for ensuring that all prices, service descriptions, promotions, availability information, and related details displayed on the Platform are accurate, complete, current, and not misleading. The Service Provider shall bear full responsibility for any discrepancies, inaccuracies, omissions, misrepresentations, or misleading information relating to services, pricing, promotions, or offers presented to Users.</p>
      </section>

      <section class="card">
        <h2>Future Financial Services</h2>
        <p>The Platform reserves the right to introduce electronic payment services, digital wallets, payment processing services, commissions, fees, subscription plans, financial products, or other related services in the future. In such cases, the Platform may update these Terms and Conditions, Privacy Policy, or any related policies as required by applicable laws and regulations. Continued use of the Platform following such updates shall constitute acceptance of the revised terms and policies.</p>
      </section>

      <section class="card">
        <h2>Advertisement Compliance Rules</h2>
        <ol class="legal-list">
          <li>Publishing advertisements that violate Saudi law or public morals is strictly prohibited including: suspicious/fake/internet-taken/before-after-manipulated advertisements, misleading offers, unreal results-promising advertisements, unauthorized external data redirection or data collection links, government documents or personal images without consent, or fraudulent/scam/misuse content.</li>
          <li>Management holds the right to: delete advertisements instantly, suspend or permanently deactivate accounts, report serious violations to competent Saudi authorities, reject refunds of advertisement payments, or compensation obligations if any misuse or violations occur.</li>
        </ol>
        <p class="muted">Users explicitly confirm that the platform is not responsible for any losses or damages or misleading information caused by advertisements or reliance on advertisement content.</p>
      </section>

      <section class="card">
        <h2>Data Collection, Usage, and Retention</h2>
        <ol class="legal-list">
          <li>The platform may collect essential data such as: name, phone/email, approximate location, device and usage data for booking operations and platform functionality and experience improvement only.</li>
          <li>The platform may share booking-essential data only with: providers post-booking, hosting, SMS, and payment service partners to operate platform services only, with no external non-mandated usage.</li>
          <li>Internet operations are not fully secure and absolute protection against external breaches beyond platform control is not guaranteed.</li>
          <li>User-requested account deletion results in full data deletion unless a mandated binding Saudi request orders retention for a defined period.</li>
          <li>The platform does not share private data except when mandated by Saudi law or competent authority official request.</li>
        </ol>
      </section>

      <section class="card">
        <h2>Liability Limitations</h2>
        <ol class="legal-list">
          <li>The platform does not guarantee accuracy or completeness or validity of user-submitted or advertisement content.</li>
          <li>The platform is not liable for: technical errors, data loss, interruptions, viruses, or cyber attacks beyond its control.</li>
          <li>The platform is not liable for: external platform communications, agreements, provider conduct, appointment no-show/delay/cancellation, unsatisfactory results, or home/mobile service visits.</li>
          <li>Users hereby waive platform liability fully and finally, non-reversible, from all claims or compensation obligations including direct/indirect/incidental/consequential losses or damages resulting from platform use or services or advertisements posted on or accessed through it.</li>
        </ol>
      </section>

      <section class="card">
        <h2>User Compensation Clause</h2>
        <p>Users agree to compensate the platform for any: legal claims, financial loss, damages, or expenses caused by user or employee or third-party misuse or negligence or violating Saudi regulations using their credentials or posted content using their account.</p>
      </section>

      <section class="card">
        <h2>Severability, Reporting, and Modifications</h2>
        <ol class="legal-list">
          <li>Invalid clause rulings do not affect other binding clauses, with replacement with the nearest compliant clause fulfilling the purpose under Saudi regulations.</li>
          <li>Users may report through Report/Contact Us features, with management reserving discretionary rights in severity evaluation and actions.</li>
          <li>The platform may edit terms at any point without notice, with users responsible for ongoing reviews and acceptance via use continuation.</li>
        </ol>
      </section>

      <footer>
        Copyright © Shaara Platform. Use of the service is subject to these terms.
      </footer>
    </div>
  </div>
</body>
</html>`;
};

export const privacyPolicy = () => {
  return getLegalTemplate(
    "Shaara - Privacy Policy",
    "منصة شَعْرة - سياسة الخصوصية",
    "Privacy Policy for the Shaara Platform booking and grooming services",
    "سياسة الخصوصية لمنصة شَعْرة لخدمات العناية والتجميل والحجوزات",
    "2025",
    "2025"
  );
};

export const termsandconditions = () => {
  return getLegalTemplate(
    "Shaara - Terms and Conditions",
    "منصة شَعْرة - الشروط والأحكام",
    "Terms and Conditions for the Shaara Platform booking and grooming services",
    "الشروط والأحكام لمنصة شَعْرة لخدمات العناية والتجميل والحجوزات",
    "2025",
    "2025"
  );
};
