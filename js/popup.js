/* ===========================
   OKcean — Top Banner Popup
   index.html 로드 시 Firestore에서
   활성 팝업을 읽어 띠배너로 표시
   =========================== */

(function () {

  function today() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  // ── 띠배너 HTML 생성 ──
  function createBannerEl(data) {
    var banner = document.createElement('div');
    banner.id = 'eventPopup';
    banner.className = 'popup-banner';

    // 제목
    if (data.title) {
      var title = document.createElement('span');
      title.className = 'popup-banner__title';
      title.textContent = data.title;
      banner.appendChild(title);
    }

    // CTA 버튼
    if (data.buttonText && data.buttonLink) {
      var btn = document.createElement('a');
      btn.href = data.buttonLink;
      btn.textContent = data.buttonText;
      btn.className = 'popup-banner__btn';
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      banner.appendChild(btn);
    }

    // 닫기 버튼
    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-banner__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', '배너 닫기');
    closeBtn.addEventListener('click', function () {
      closeBanner(banner);
    });
    banner.appendChild(closeBtn);

    return banner;
  }

  // ── 배너 닫기 ──
  function closeBanner(banner) {
    // 오늘 하루 보지 않기 자동 저장
    localStorage.setItem('popupSkipped', today());

    banner.classList.remove('popup-banner--visible');
    document.body.style.paddingTop = '';

    // 헤더를 원위치로
    var header = document.getElementById('header');
    if (header) header.style.top = '';

    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 400);
  }

  // ── 메인 로직 ──
  function initPopup() {
    if (localStorage.getItem('popupSkipped') === today()) return;

    var db = firebase.firestore();

    db.collection('popups')
      .where('active', '==', true)
      .get()
      .then(function (snapshot) {
        if (snapshot.empty) return;

        var t = today();
        var matched = null;

        snapshot.forEach(function (doc) {
          if (matched) return;
          var d = doc.data();
          var start = d.startDate || '0000-00-00';
          var end   = d.endDate   || '9999-99-99';
          if (t >= start && t <= end) {
            matched = d;
          }
        });

        if (!matched) return;

        var banner = createBannerEl(matched);
        document.body.prepend(banner);

        // 배너 높이만큼 헤더와 body를 밀어냄
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            banner.classList.add('popup-banner--visible');
            var h = banner.offsetHeight;
            document.body.style.paddingTop = h + 'px';

            var header = document.getElementById('header');
            if (header) {
              header.style.top = h + 'px';
              header.style.transition = 'top 0.4s ease, background-color 0.4s ease, box-shadow 0.4s ease';
            }
          });
        });
      })
      .catch(function (err) {
        console.warn('Popup load error:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }

})();
