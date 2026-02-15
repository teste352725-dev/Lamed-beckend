// Config compartilhado do Admin - Seja Profeta
const firebaseConfig = {
  apiKey: "AIzaSyCn1WxBe77o__An60x3MLpDqYWWm6aEPYs",
  authDomain: "seja-profeta.firebaseapp.com",
  projectId: "seja-profeta",
  storageBucket: "seja-profeta.firebasestorage.app",
  messagingSenderId: "723319911712",
  appId: "1:723319911712:web:9a674107795088f7281345",
  measurementId: "G-SK49J6BZ34"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.auth = firebase.auth();
window.db = firebase.firestore();

// UIDs autorizados no admin.
// Para liberar mais administradores, adicione novos UIDs neste array.
window.ADMIN_UIDS = ["kTV8LmdqVrZXxE1gYVYxMwFZj9G3", "fBCtrgljvnUZyMcoFrUi7MbvZu73"];
window.ADMIN_EMAILS = [];

window.isAdminUser = async (user) => {
  if (!user) return false;

  const uidMatch = Array.isArray(window.ADMIN_UIDS) && window.ADMIN_UIDS.includes(user.uid);
  const email = (user.email || '').toLowerCase();
  const emailMatch = Array.isArray(window.ADMIN_EMAILS)
    && window.ADMIN_EMAILS.map(e => (e || '').toLowerCase()).includes(email);

  let claimMatch = false;
  try {
    const token = await user.getIdTokenResult(true);
    claimMatch = !!(token?.claims?.admin || token?.claims?.isAdmin);
  } catch (_) {
    claimMatch = false;
  }

  return uidMatch || emailMatch || claimMatch;
};

window.requireAdmin = (opts = {}) => {
  const { onAllowed, loginPath = 'login-admin.html', fallbackPath = 'login-admin.html' } = opts;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = loginPath;
      return;
    }

    const allowed = await window.isAdminUser(user);
    if (!allowed) {
      auth.signOut().finally(() => {
        const sep = fallbackPath.includes('?') ? '&' : '?';
        window.location.href = `${fallbackPath}${sep}erro=sem-permissao-admin`;
      });
      return;
    }

    if (typeof onAllowed === 'function') onAllowed(user);
  });
};
