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
window.ADMIN_UIDS = ["kTV8LmdqVrZXxE1gYVYxMwFZj9G3"];

window.isAdminUser = (user) => {
  if (!user) return false;
  if (!Array.isArray(window.ADMIN_UIDS) || window.ADMIN_UIDS.length === 0) return true;
  return window.ADMIN_UIDS.includes(user.uid);
};

window.requireAdmin = (opts = {}) => {
  const { onAllowed, loginPath = 'login-admin.html', fallbackPath = 'index.html' } = opts;

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = loginPath;
      return;
    }

    if (!window.isAdminUser(user)) {
      alert('Acesso restrito: usuário sem permissão de administrador.');
      auth.signOut().finally(() => {
        window.location.href = fallbackPath;
      });
      return;
    }

    if (typeof onAllowed === 'function') onAllowed(user);
  });
};
