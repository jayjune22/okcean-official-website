/* ===========================
   OKcean — Popup Display
   index.html 로드 시 Firestore에서
   활성 팝업을 읽어 화면에 표시
   =========================== */

(function () {

  // ── 오늘 날짜 (YYYY-MM-DD) ──
  function today() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  // ── 팝업 HTML 생성 & 삽입 ──
  function createPopupEl(data) {
    var overlay = document.createElement('div');
    overlay.id = 'eventPopup';
    overlay.className = 'popup-overlay';

    var box = document.createElement('div');
    box.className = 'popup-box';

    // 이미지
    if (data.imageUrl) {
      var img = document.createElement('img');
      img.src = data.imageUrl;
      img.alt = data.title;
      img.className = 'popup-image';
      box.appendChild(img);
    }

    // 텍스트 영역
    var body = document.createElement('div');
    body.className = 'popup-body';

    if (data.title) {
      var h2 = document.createElement('h2');
      h2.className = 'popup-title';
      h2.textContent = data.title;
      body.appendChild(h2);
    }

    if (data.body) {
      var p = document.createElement('p');
      p.className = 'popup-desc';
      p.textContent = data.body;
      body.appendChild(p);
    }

    if (data.buttonText && data.buttonLink) {
      var btn = document.createElement('a');
      btn.href = data.buttonLink;
      btn.textContent = data.buttonText;
      btn.className = 'popup-btn';
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      body.appendChild(btn);
    }

    box.appendChild(body);

    // 닫기 버튼
    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', '팝업 닫기');
    closeBtn.addEventListener('click', function () {
      closePopup(overlay);
    });
    box.appendChild(closeBtn);

    // 오늘 하루 보지 않기
    var footer = document.createElement('div');
    footer.className = 'popup-footer';
    var skipLabel = document.createElement('label');
    skipLabel.className = 'popup-skip';
    var skipCheck = document.createElement('input');
    skipCheck.type = 'checkbox';
    skipCheck.id = 'popupSkipToday';
    var skipText = document.createTextNode(' 오늘 하루 보지 않기');
    skipLabel.appendChild(skipCheck);
    skipLabel.appendChild(skipText);
    footer.appendChild(skipLabel);
    box.appendChild(footer);

    overlay.appendChild(box);

    // 오버레이 클릭으로 닫기
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup(overlay);
    });

    // ESC로 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePopup(overlay);
    });

    return overlay;
  }

  // ── 팝업 닫기 ──
  function closePopup(overlay) {
    var skip = document.getElementById('popupSkipToday');
    if (skip && skip.checked) {
      localStorage.setItem('popupSkipped', today());
    }
    overlay.classList.remove('popup-overlay--visible');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }

  // ── 메인 로직 ──
  function initPopup() {
    // 오늘 하루 보지 않기 체크 여부 확인
    if (localStorage.getItem('popupSkipped') === today()) return;

    var db = firebase.firestore();
    db.settings({ experimentalForceLongPolling: true });

    db.collection('popups')
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        if (snapshot.empty) return;

        var t = today();
        var matched = null;

        snapshot.forEach(function (doc) {
          if (matched) return; // 첫 번째 조건 맞는 팝업만 표시
          var d = doc.data();
          var start = d.startDate || '0000-00-00';
          var end   = d.endDate   || '9999-99-99';
          if (t >= start && t <= end) {
            matched = d;
          }
        });

        if (!matched) return;

        var el = createPopupEl(matched);
        document.body.appendChild(el);

        // 애니메이션을 위해 한 프레임 뒤에 클래스 추가
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.classList.add('popup-overlay--visible');
          });
        });
      })
      .catch(function (err) {
        console.warn('Popup load error:', err);
      });
  }

  // DOM 준비 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }

})();
