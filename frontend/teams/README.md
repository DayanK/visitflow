# Teams App Package

## Steps to deploy VisitFlow in Microsoft Teams

### 1. Host the app (required — Teams can't use localhost)

Option A — **Azure App Service** (recommended for production):
```
az webapp up --name visitflow --resource-group myRG --runtime "NODE:20-lts"
```

Option B — **Vercel** (fastest for testing):
```
npm i -g vercel
vercel --prod
```

Option C — **ngrok** (local dev only):
```
ngrok http 3000
# use the https://xxxxx.ngrok.io URL below
```

---

### 2. Update manifest.json

Replace every `YOUR_APP_URL` with your real URL, e.g. `https://visitflow.azurewebsites.net`
Replace `YOUR_DOMAIN` with just the domain, e.g. `visitflow.azurewebsites.net`

---

### 3. Update Azure AD App Registration

In portal.azure.com → App registrations → VisitFlow:
- **Authentication** → Add redirect URI:
  `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id`
- **Expose an API** → set Application ID URI:
  `api://YOUR_DOMAIN/67c5cf1a-7c3d-4f1b-b8d9-72b4b4417d1f`

---

### 4. Add icons

Place two PNG files in this folder:
- `color.png` — 192×192 px, full color app icon
- `outline.png` — 32×32 px, white/transparent outline icon

You can generate them at https://adaptivecards.io/designer/ or use any image editor.

---

### 5. Package the app

```bash
cd visitflow/teams
zip -r visitflow-teams.zip manifest.json color.png outline.png
```

---

### 6. Upload to Teams

**Option A — Upload for yourself only (no admin needed):**
1. Open Microsoft Teams
2. Apps (left sidebar) → Manage your apps → Upload an app
3. Select `visitflow-teams.zip`
4. Click Add

**Option B — Deploy for the whole organisation (needs Teams admin):**
1. Teams Admin Center → Teams apps → Manage apps → Upload
2. Upload `visitflow-teams.zip`
3. Set to Available for all users or specific groups

---

### 7. SSO note

Teams opens the app in an iframe. NextAuth will redirect to the Microsoft login page
inside the iframe, which is blocked by default. To fix this:

Add to `next.config.ts`:
```ts
headers: async () => [
  {
    source: '/(.*)',
    headers: [{ key: 'X-Frame-Options', value: 'ALLOW-FROM https://teams.microsoft.com' }],
  },
],
```

For full Teams SSO (no login popup), consider upgrading to the
**Teams JS SDK + `microsoftTeams.authentication.getAuthToken()`** flow.
