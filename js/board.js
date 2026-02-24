/* ===========================
   OKcean — Board Page JavaScript
   (Firebase Compat SDK — no ES module issues)
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

// Force long-polling — prevents WebSocket hang on localhost / 127.0.0.1
var db = firebase.firestore();
db.settings({ experimentalForceLongPolling: true });

var auth = firebase.auth();

var COLLECTION_NAME = 'posts';
var POSTS_PER_PAGE = 10;

// ── DOM Elements ──
var boardSection = document.getElementById('news') || document.querySelector('.board');
var listView = document.getElementById('listView');
var formView = document.getElementById('formView');
var detailView = document.getElementById('detailView');

var postCountEl = document.getElementById('postCount');
var listBody = document.getElementById('listBody');
var paginationEl = document.getElementById('pagination');
var writeBtn = document.getElementById('writeBtn');

var formTitle = document.getElementById('formTitle');
var inputTitle = document.getElementById('inputTitle');
var inputContent = document.getElementById('inputContent');
var saveBtn = document.getElementById('saveBtn');
var cancelBtn = document.getElementById('cancelBtn');

var detailTitle = document.getElementById('detailTitle');
var detailDate = document.getElementById('detailDate');
var detailContent = document.getElementById('detailContent');
var editBtn = document.getElementById('editBtn');
var deleteBtn = document.getElementById('deleteBtn');
var backBtn = document.getElementById('backBtn');

// Auth DOM
var adminLoginBtn = document.getElementById('adminLoginBtn');
var adminLogoutBtn = document.getElementById('adminLogoutBtn');
var loginModal = document.getElementById('loginModal');
var loginEmail = document.getElementById('loginEmail');
var loginPassword = document.getElementById('loginPassword');
var loginSubmitBtn = document.getElementById('loginSubmitBtn');
var loginCancelBtn = document.getElementById('loginCancelBtn');
var loginError = document.getElementById('loginError');

// ── State ──
var currentPage = 1;
var totalPages = 1;
var editingId = null;
var isAdmin = false;

// ── Auth State ──
auth.onAuthStateChanged(function (user) {
  isAdmin = !!user;
  if (boardSection) {
    if (isAdmin) {
      boardSection.classList.add('board--authed');
    } else {
      boardSection.classList.remove('board--authed');
    }
  }
  if (adminLoginBtn) adminLoginBtn.style.display = isAdmin ? 'none' : '';
  if (adminLogoutBtn) adminLogoutBtn.style.display = isAdmin ? '' : 'none';
});

// ── Login ──
function openLoginModal() {
  if (!loginModal) return;
  loginModal.classList.add('active');
  loginError.textContent = '';
  loginEmail.value = '';
  loginPassword.value = '';
  loginEmail.focus();
}

function closeLoginModal() {
  if (!loginModal) return;
  loginModal.classList.remove('active');
}

async function handleLogin() {
  var email = loginEmail.value.trim();
  var password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = 'Please enter email and password.';
    return;
  }

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = 'Logging in...';
  loginError.textContent = '';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeLoginModal();
  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = err.message;
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = 'Login';
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
    // If on form/detail view, go back to list
    if (formView && formView.classList.contains('board__view--active')) {
      showView(listView);
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// ── View Switching ──
function showView(view) {
  listView.classList.remove('board__view--active');
  formView.classList.remove('board__view--active');
  detailView.classList.remove('board__view--active');
  view.classList.add('board__view--active');
  if (boardSection) {
    boardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Format Date ──
function formatDate(timestamp) {
  if (!timestamp) return '-';
  var d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '.' + month + '.' + day;
}

// ── Timeout helper ──
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error('Request timed out (' + ms / 1000 + 's). Check Firestore rules & network.'));
      }, ms);
    }),
  ]);
}

// ── Escape HTML ──
function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Load Posts ──
async function loadPosts(page) {
  page = page || 1;
  currentPage = page;
  listBody.innerHTML = '<div class="board__loading">Loading...</div>';

  try {
    var snapshot = await withTimeout(
      db.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').get(),
      10000
    );

    var allDocs = snapshot.docs;
    var totalCount = allDocs.length;
    totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));
    postCountEl.textContent = '(' + String(totalCount).padStart(2, '0') + ')';

    if (totalCount === 0) {
      listBody.innerHTML = '<div class="board__empty">No posts yet.</div>';
      paginationEl.innerHTML = '';
      return;
    }

    var startIdx = (page - 1) * POSTS_PER_PAGE;
    var endIdx = startIdx + POSTS_PER_PAGE;
    var pageDocs = allDocs.slice(startIdx, endIdx);

    listBody.innerHTML = '';
    pageDocs.forEach(function (docSnap, i) {
      var data = docSnap.data();
      var num = totalCount - startIdx - i;
      var item = document.createElement('div');
      item.className = 'board__list-item';
      item.innerHTML =
        '<span class="board__list-num">' + num + '</span>' +
        '<span class="board__list-title">' + escapeHtml(data.title) + '</span>' +
        '<span class="board__list-date">' + formatDate(data.createdAt) + '</span>';
      item.addEventListener('click', function () { showDetail(docSnap.id); });
      listBody.appendChild(item);
    });

    renderPagination();
  } catch (err) {
    console.error('Error loading posts:', err);
    listBody.innerHTML = '<div class="board__empty">Failed to load posts.<br><small>' + escapeHtml(err.message) + '</small></div>';
  }
}

// ── Render Pagination ──
function renderPagination() {
  paginationEl.innerHTML = '';
  if (totalPages <= 1) return;

  var prevBtn = document.createElement('button');
  prevBtn.className = 'board__page-btn';
  prevBtn.textContent = '<';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', function () { loadPosts(currentPage - 1); });
  paginationEl.appendChild(prevBtn);

  for (var p = 1; p <= totalPages; p++) {
    (function (page) {
      var btn = document.createElement('button');
      btn.className = 'board__page-btn' + (page === currentPage ? ' board__page-btn--active' : '');
      btn.textContent = page;
      btn.addEventListener('click', function () { loadPosts(page); });
      paginationEl.appendChild(btn);
    })(p);
  }

  var nextBtn = document.createElement('button');
  nextBtn.className = 'board__page-btn';
  nextBtn.textContent = '>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', function () { loadPosts(currentPage + 1); });
  paginationEl.appendChild(nextBtn);
}

// ── Show Detail ──
async function showDetail(id) {
  showView(detailView);
  detailTitle.textContent = 'Loading...';
  detailDate.textContent = '';
  detailContent.textContent = '';

  try {
    var docSnap = await withTimeout(
      db.collection(COLLECTION_NAME).doc(id).get(),
      10000
    );

    if (!docSnap.exists) {
      alert('Post not found.');
      showView(listView);
      return;
    }

    var data = docSnap.data();
    detailTitle.textContent = data.title;
    detailDate.textContent = formatDate(data.createdAt);
    detailContent.textContent = data.content;

    editBtn.onclick = function () { showEditForm(id, data); };
    deleteBtn.onclick = function () { handleDelete(id); };
  } catch (err) {
    console.error('Error loading post:', err);
    alert('Failed to load post: ' + err.message);
    showView(listView);
  }
}

// ── Show Write Form ──
function showWriteForm() {
  if (!isAdmin) return;
  editingId = null;
  formTitle.textContent = 'New Post';
  inputTitle.value = '';
  inputContent.value = '';
  showView(formView);
  inputTitle.focus();
}

// ── Show Edit Form ──
function showEditForm(id, data) {
  if (!isAdmin) return;
  editingId = id;
  formTitle.textContent = 'Edit Post';
  inputTitle.value = data.title;
  inputContent.value = data.content;
  showView(formView);
  inputTitle.focus();
}

// ── Save Post ──
async function handleSave() {
  if (!isAdmin) return;
  var title = inputTitle.value.trim();
  var content = inputContent.value.trim();

  if (!title) {
    alert('Please enter a title.');
    inputTitle.focus();
    return;
  }
  if (!content) {
    alert('Please enter content.');
    inputContent.focus();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingId) {
      await withTimeout(
        db.collection(COLLECTION_NAME).doc(editingId).update({ title: title, content: content }),
        10000
      );
      await showDetail(editingId);
    } else {
      await withTimeout(
        db.collection(COLLECTION_NAME).add({
          title: title,
          content: content,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }),
        10000
      );
      await loadPosts(1);
      showView(listView);
    }
  } catch (err) {
    console.error('Error saving post:', err);
    alert('Failed to save: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ── Delete Post ──
async function handleDelete(id) {
  if (!isAdmin) return;
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    await withTimeout(
      db.collection(COLLECTION_NAME).doc(id).delete(),
      10000
    );
    await loadPosts(currentPage);
    showView(listView);
  } catch (err) {
    console.error('Error deleting post:', err);
    alert('Failed to delete: ' + err.message);
  }
}

// ── Event Listeners ──
writeBtn.addEventListener('click', showWriteForm);
saveBtn.addEventListener('click', handleSave);
cancelBtn.addEventListener('click', function () {
  if (editingId) {
    showDetail(editingId);
  } else {
    showView(listView);
  }
});
backBtn.addEventListener('click', function () {
  showView(listView);
});

// Auth event listeners
if (adminLoginBtn) adminLoginBtn.addEventListener('click', openLoginModal);
if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleLogout);
if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', handleLogin);
if (loginCancelBtn) loginCancelBtn.addEventListener('click', closeLoginModal);

// Close login modal on overlay click
if (loginModal) {
  loginModal.addEventListener('click', function (e) {
    if (e.target === loginModal) closeLoginModal();
  });
}

// Login on Enter key
if (loginPassword) {
  loginPassword.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleLogin();
  });
}

// ── Init ──
if (document.getElementById('listView')) {
  loadPosts(1);
}
