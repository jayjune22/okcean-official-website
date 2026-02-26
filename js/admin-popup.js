/* ===========================
   OKcean — Admin Popup Manager
   =========================== */

// ── Firebase init ──
firebase.initializeApp({
  apiKey: "AIzaSyCGo_-GKe3EFQH2YyFaxbD1EHAXKzaxgZU",
  authDomain: "okcean-official-website.firebaseapp.com",
  projectId: "okcean-official-website",
  storageBucket: "okcean-official-website.firebasestorage.app",
  messagingSenderId: "840546519883",
  appId: "1:840546519883:web:5aea2182b2b20df0d476ce",
  measurementId: "G-X5NBBDH0XG"
});

var db = firebase.firestore();
db.settings({ experimentalForceLongPolling: true });
var auth = firebase.auth();
var storage = firebase.storage();

var COLLECTION = 'popups';

// ── DOM ──
var authGate    = document.getElementById('authGate');
var adminMain   = document.getElementById('adminMain');
var loginEmail  = document.getElementById('loginEmail');
var loginPassword = document.getElementById('loginPassword');
var loginBtn    = document.getElementById('loginBtn');
var loginError  = document.getElementById('loginError');
var logoutBtn   = document.getElementById('logoutBtn');

var newPopupBtn = document.getElementById('newPopupBtn');
var popupForm   = document.getElementById('popupForm');
var formHeading = document.getElementById('formHeading');
var inputImageFile = document.getElementById('inputImageFile');
var uploadProgress = document.getElementById('uploadProgress');
var inputImageUrl = document.getElementById('inputImageUrl');
var imagePreview  = document.getElementById('imagePreview');
var inputTitle  = document.getElementById('inputTitle');
var inputBody   = document.getElementById('inputBody');
var inputBtnText = document.getElementById('inputBtnText');
var inputBtnLink = document.getElementById('inputBtnLink');
var inputStartDate = document.getElementById('inputStartDate');
var inputEndDate   = document.getElementById('inputEndDate');
var inputType   = document.getElementById('inputType');
var saveBtn     = document.getElementById('saveBtn');
var cancelBtn   = document.getElementById('cancelBtn');
var popupList   = document.getElementById('popupList');

var editingId = null;

// ── Auth ──
auth.onAuthStateChanged(function(user) {
  if (user) {
    authGate.style.display = 'none';
    adminMain.style.display = 'block';
    loadPopups();
  } else {
    authGate.style.display = 'flex';
    adminMain.style.display = 'none';
  }
});

loginBtn.addEventListener('click', function() {
  var email = loginEmail.value.trim();
  var pw = loginPassword.value;
  if (!email || !pw) { loginError.textContent = '이메일과 비밀번호를 입력해주세요.'; return; }
  loginBtn.disabled = true;
  loginBtn.textContent = '로그인 중...';
  loginError.textContent = '';
  auth.signInWithEmailAndPassword(email, pw)
    .catch(function(err) {
      loginError.textContent = '로그인 실패: ' + err.message;
    })
    .finally(function() {
      loginBtn.disabled = false;
      loginBtn.textContent = '로그인';
    });
});

loginPassword.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', function() {
  auth.signOut();
});

// ── Image preview ──
inputImageUrl.addEventListener('input', function() {
  var url = inputImageUrl.value.trim();
  if (url) {
    imagePreview.src = url;
    imagePreview.style.display = 'block';
    imagePreview.onerror = function() { imagePreview.style.display = 'none'; };
  } else {
    imagePreview.style.display = 'none';
  }
});

// 파일 선택 시 미리보기
inputImageFile.addEventListener('change', function() {
  var file = inputImageFile.files[0];
  if (file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    inputImageUrl.value = '';
  }
});

// 이미지를 Storage에 업로드하고 URL 반환
async function uploadImage(file) {
  var timestamp = Date.now();
  var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var ref = storage.ref('popups/' + timestamp + '_' + safeName);

  uploadProgress.style.display = 'block';
  uploadProgress.textContent = '업로드 중...';

  var task = ref.put(file);

  return new Promise(function(resolve, reject) {
    task.on('state_changed',
      function(snapshot) {
        var pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        uploadProgress.textContent = '업로드 중... ' + pct + '%';
      },
      function(err) {
        uploadProgress.style.display = 'none';
        reject(err);
      },
      function() {
        task.snapshot.ref.getDownloadURL().then(function(url) {
          uploadProgress.style.display = 'none';
          resolve(url);
        });
      }
    );
  });
}

// ── Form open/close ──
newPopupBtn.addEventListener('click', function() {
  editingId = null;
  formHeading.textContent = '새 팝업 작성';
  clearForm();
  popupForm.style.display = 'block';
  popupForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

cancelBtn.addEventListener('click', function() {
  popupForm.style.display = 'none';
  editingId = null;
});

function clearForm() {
  inputType.value = 'banner';
  inputImageFile.value = '';
  uploadProgress.style.display = 'none';
  inputImageUrl.value = '';
  imagePreview.style.display = 'none';
  inputTitle.value = '';
  inputBody.value = '';
  inputBtnText.value = '';
  inputBtnLink.value = '';
  inputStartDate.value = '';
  inputEndDate.value = '';
}

// ── Save ──
saveBtn.addEventListener('click', async function() {
  var title = inputTitle.value.trim();
  if (!title) { alert('제목을 입력해주세요.'); return; }

  // 파일이 선택되었으면 업로드
  var imageUrl = inputImageUrl.value.trim();
  var file = inputImageFile.files[0];
  if (file) {
    saveBtn.disabled = true;
    saveBtn.textContent = '이미지 업로드 중...';
    try {
      imageUrl = await uploadImage(file);
    } catch(err) {
      alert('이미지 업로드 실패: ' + err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
      return;
    }
  }

  var data = {
    type:       inputType.value,
    imageUrl:   imageUrl,
    title:      title,
    body:       inputBody.value.trim(),
    buttonText: inputBtnText.value.trim(),
    buttonLink: inputBtnLink.value.trim(),
    startDate:  inputStartDate.value,
    endDate:    inputEndDate.value,
    active:     true,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
  };

  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    if (editingId) {
      await db.collection(COLLECTION).doc(editingId).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(COLLECTION).add(data);
    }
    popupForm.style.display = 'none';
    editingId = null;
    await loadPopups();
  } catch(err) {
    alert('저장 실패: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
});

// ── Load list ──
async function loadPopups() {
  popupList.innerHTML = '<div class="empty-state">불러오는 중...</div>';
  try {
    var snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
      popupList.innerHTML = '<div class="empty-state">등록된 팝업이 없습니다.</div>';
      return;
    }
    popupList.innerHTML = '';
    snapshot.forEach(function(docSnap) {
      popupList.appendChild(renderCard(docSnap));
    });
  } catch(err) {
    popupList.innerHTML = '<div class="empty-state">불러오기 실패: ' + err.message + '</div>';
  }
}

// ── Render card ──
function renderCard(docSnap) {
  var d = docSnap.data();
  var card = document.createElement('div');
  card.className = 'popup-card';

  // 썸네일
  if (d.imageUrl) {
    var img = document.createElement('img');
    img.className = 'popup-card__thumb';
    img.src = d.imageUrl;
    img.alt = d.title;
    card.appendChild(img);
  } else {
    var ph = document.createElement('div');
    ph.className = 'popup-card__thumb-placeholder';
    ph.textContent = '이미지 없음';
    card.appendChild(ph);
  }

  // 정보
  var info = document.createElement('div');
  info.className = 'popup-card__info';

  var titleEl = document.createElement('div');
  titleEl.className = 'popup-card__title';
  titleEl.textContent = d.title;

  var meta = document.createElement('div');
  meta.className = 'popup-card__meta';
  var typeLabel = (d.type === 'modal') ? '[모달]' : '[띠배너]';
  var period = (d.startDate || '?') + ' ~ ' + (d.endDate || '?');
  meta.textContent = typeLabel + ' ' + period;

  info.appendChild(titleEl);
  info.appendChild(meta);
  card.appendChild(info);

  // 활성화 토글
  var badge = document.createElement('span');
  badge.className = 'popup-card__badge ' + (d.active ? 'badge-active' : 'badge-inactive');
  badge.textContent = d.active ? '노출 중' : '비활성';
  card.appendChild(badge);

  var toggleLabel = document.createElement('label');
  toggleLabel.className = 'toggle';
  toggleLabel.title = '노출 ON/OFF';
  var toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = !!d.active;
  toggleInput.addEventListener('change', function() {
    db.collection(COLLECTION).doc(docSnap.id).update({ active: toggleInput.checked })
      .then(loadPopups);
  });
  var slider = document.createElement('span');
  slider.className = 'toggle-slider';
  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(slider);
  card.appendChild(toggleLabel);

  // 수정 / 삭제
  var actions = document.createElement('div');
  actions.className = 'popup-card__actions';

  var editBtn = document.createElement('button');
  editBtn.className = 'btn btn-secondary';
  editBtn.textContent = '수정';
  editBtn.style.fontSize = '0.78rem';
  editBtn.style.padding = '7px 14px';
  editBtn.addEventListener('click', function() { openEditForm(docSnap.id, d); });

  var delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger';
  delBtn.textContent = '삭제';
  delBtn.style.fontSize = '0.78rem';
  delBtn.style.padding = '7px 14px';
  delBtn.addEventListener('click', function() { handleDelete(docSnap.id); });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  card.appendChild(actions);

  return card;
}

// ── Edit ──
function openEditForm(id, data) {
  editingId = id;
  formHeading.textContent = '팝업 수정';
  inputImageUrl.value = data.imageUrl || '';
  if (data.imageUrl) {
    imagePreview.src = data.imageUrl;
    imagePreview.style.display = 'block';
  } else {
    imagePreview.style.display = 'none';
  }
  inputType.value = data.type || 'banner';
  inputTitle.value = data.title || '';
  inputBody.value = data.body || '';
  inputBtnText.value = data.buttonText || '';
  inputBtnLink.value = data.buttonLink || '';
  inputStartDate.value = data.startDate || '';
  inputEndDate.value = data.endDate || '';
  popupForm.style.display = 'block';
  popupForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Delete ──
async function handleDelete(id) {
  if (!confirm('이 팝업을 삭제하시겠습니까?')) return;
  try {
    await db.collection(COLLECTION).doc(id).delete();
    await loadPopups();
  } catch(err) {
    alert('삭제 실패: ' + err.message);
  }
}
