# iEat Fast Food · Oran

Site vitrine premium + panel administrateur pour **iEat Fast Food** (Belgaïd, Oran).

- `/` : site public : logo 3D animé, étagère courbe 3D des 14 packs (glisser / cliquer pour ouvrir la fiche), carte à l'unité, contacts, carte Google Maps, boutons d'appel, mode sombre animé.
- `/admin` : panel administrateur (glassmorphism). Identifiants par défaut : `user` / `Ieat` (modifiables dans *Sécurité & données*).

## Données
Les modifications de l'admin sont enregistrées via `api/state.js` dans **Vercel Blob** (variable `BLOB_READ_WRITE_TOKEN`), donc visibles par tous les visiteurs.
Sans stockage Blob configuré, le panel bascule en mode local (navigateur uniquement).
Variable optionnelle : `ADMIN_SECRET` (clé de signature des sessions).

## Structure
- `index.html`, `css/site.css`, `js/site.js` : site public
- `admin.html`, `css/admin.css`, `js/admin.js` : panel admin
- `js/data.js` : données par défaut (packs, carte, stock, équipe) + chargement
- `api/state.js` : API Vercel (lecture publique, connexion, sauvegarde, changement d'identifiants)
- `assets/` : logo détouré et photos des packs
