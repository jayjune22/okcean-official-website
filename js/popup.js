/* ===========================
   OKcean — Popup Display
   index.html 로드 시 Firestore에서
   활성 팝업을 읽어 띠배너/모달로 표시
   =========================== */

(function () {

  function today() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function futureDate(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function isSkipped(type) {
    var skipUntil = localStorage.getItem('popupSkipUntil_' + type);
    return skipUntil && today() < skipUntil;
  }

  // ═══════════════════════════
  //  띠배너
  // ═══════════════════════════

  function createBannerEl(data) {
    var banner = document.createElement('div');
    banner.id = 'eventBanner';
    banner.className = 'popup-banner';

    var flag = document.createElement('span');
    flag.className = 'popup-banner__flag';
    flag.textContent = 'NEW!';
    banner.appendChild(flag);

    if (data.title) {
      var title;
      if (data.buttonLink) {
        title = document.createElement('a');
        title.href = data.buttonLink;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
      } else {
        title = document.createElement('span');
      }
      title.className = 'popup-banner__title';
      title.textContent = data.title;
      banner.appendChild(title);
    }

    var actions = document.createElement('div');
    actions.className = 'popup-banner__actions';

    var skipBtn = document.createElement('button');
    skipBtn.className = 'popup-banner__action-btn';
    skipBtn.textContent = '3일간 보지 않기';
    skipBtn.addEventListener('click', function () {
      closeBanner(banner, 3);
    });
    actions.appendChild(skipBtn);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-banner__action-btn';
    closeBtn.textContent = '닫기';
    closeBtn.addEventListener('click', function () {
      closeBanner(banner, 0);
    });
    actions.appendChild(closeBtn);

    banner.appendChild(actions);
    return banner;
  }

  function showBanner(data) {
    var banner = createBannerEl(data);
    document.body.prepend(banner);

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
  }

  function closeBanner(banner, skipDays) {
    if (skipDays > 0) {
      localStorage.setItem('popupSkipUntil_banner', futureDate(skipDays));
    }

    banner.classList.remove('popup-banner--visible');
    document.body.style.paddingTop = '';

    var header = document.getElementById('header');
    if (header) header.style.top = '';

    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 400);
  }

  // ═══════════════════════════
  //  모달
  // ═══════════════════════════

  function createModalEl(data) {
    var overlay = document.createElement('div');
    overlay.id = 'eventModal';
    overlay.className = 'popup-modal-overlay';

    var box = document.createElement('div');
    box.className = 'popup-modal-box';

    if (data.imageUrl) {
      var img = document.createElement('img');
      img.src = data.imageUrl;
      img.alt = data.title || '';
      img.className = 'popup-modal-image';
      box.appendChild(img);
    }

    var body = document.createElement('div');
    body.className = 'popup-modal-body';

    if (data.title) {
      var h2 = document.createElement('h2');
      h2.className = 'popup-modal-title';
      h2.textContent = data.title;
      body.appendChild(h2);
    }

    if (data.body) {
      var p = document.createElement('p');
      p.className = 'popup-modal-desc';
      p.textContent = data.body;
      body.appendChild(p);
    }

    if (data.buttonText && data.buttonLink) {
      var btn = document.createElement('a');
      btn.href = data.buttonLink;
      btn.textContent = data.buttonText;
      btn.className = 'popup-modal-btn';
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      body.appendChild(btn);
    }

    box.appendChild(body);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'popup-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', '팝업 닫기');
    closeBtn.addEventListener('click', function () {
      closeModal(overlay, 0);
    });
    box.appendChild(closeBtn);

    var footer = document.createElement('div');
    footer.className = 'popup-modal-footer';

    var skipLabel = document.createElement('label');
    skipLabel.className = 'popup-modal-skip';
    var skipCheck = document.createElement('input');
    skipCheck.type = 'checkbox';
    skipCheck.id = 'modalSkipToday';
    var skipText = document.createTextNode(' 오늘 하루 보지 않기');
    skipLabel.appendChild(skipCheck);
    skipLabel.appendChild(skipText);
    footer.appendChild(skipLabel);

    var footerClose = document.createElement('button');
    footerClose.className = 'popup-modal-footer-close';
    footerClose.textContent = '닫기';
    footerClose.addEventListener('click', function () {
      closeModal(overlay, 0);
    });
    footer.appendChild(footerClose);

    box.appendChild(footer);
    overlay.appendChild(box);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay, 0);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal(overlay, 0);
    });

    return overlay;
  }

  function showModal(data) {
    var overlay = createModalEl(data);
    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('popup-modal-overlay--visible');
      });
    });
  }

  function closeModal(overlay, skipDays) {
    var skip = document.getElementById('modalSkipToday');
    if (skip && skip.checked) {
      localStorage.setItem('popupSkipUntil_modal', futureDate(1));
    } else if (skipDays > 0) {
      localStorage.setItem('popupSkipUntil_modal', futureDate(skipDays));
    }

    overlay.classList.remove('popup-modal-overlay--visible');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }

  // ═══════════════════════════
  //  메인 로직
  // ═══════════════════════════

  function initPopup() {
    var bannerSkipped = isSkipped('banner');
    var modalSkipped = isSkipped('modal');
    if (bannerSkipped && modalSkipped) return;

    var db = firebase.firestore();

    db.collection('popups')
      .where('active', '==', true)
      .get()
      .then(function (snapshot) {
        if (snapshot.empty) return;

        var t = today();
        var bannerData = null;
        var modalData = null;

        snapshot.forEach(function (doc) {
          var d = doc.data();
          var start = d.startDate || '0000-00-00';
          var end   = d.endDate   || '9999-99-99';
          if (t < start || t > end) return;

          var type = d.type || 'banner';
          if (type === 'banner' && !bannerData && !bannerSkipped) {
            bannerData = d;
          } else if (type === 'modal' && !modalData && !modalSkipped) {
            modalData = d;
          }
        });

        if (bannerData) showBanner(bannerData);
        if (modalData) showModal(modalData);
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
