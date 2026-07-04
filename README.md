# Vippin

A startup-ready Next.js app wired with **Tailwind CSS v4**, **shadcn/ui**, and
**Firebase** — built around a **backend-agnostic data layer** so Firebase can be
replaced with a proper backend later **without touching the UI**.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, TypeScript, `src/` dir)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) (new-york style)
- [Firebase](https://firebase.google.com/) (Auth + Firestore, client SDK)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. Add a **Web app** and copy the config values.
3. Enable **Authentication → Email/Password** and create a **Firestore** database.
4. Copy the env template and fill in your values:

```bash
cp .env.local.example .env.local
```

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>. Use `/login` to sign up / sign in and `/`
for a protected route.

## Architecture: the swappable backend layer

The whole point of the layout is **dependency inversion**: the UI depends on
interfaces (`core`), never on Firebase directly.

```
src/
├── app/                       # Next.js routes (UI only)
│   ├── login/                 # Email/password auth screen
│   └── dashboard/             # Client-guarded protected route
├── components/
│   ├── ui/                    # shadcn components
│   └── providers/             # AuthProvider (React context over AuthRepository)
├── lib/
│   ├── utils.ts               # cn() helper
│   └── firebase/client.ts     # Firebase init — ISOLATED here
├── core/                      # Backend-agnostic domain layer
│   ├── models/                # Plain domain types (no Firebase imports)
│   └── repositories/          # Interfaces only (the contracts)
├── infrastructure/
│   └── firebase/              # Concrete Firebase implementations
└── services/
    └── repository-factory.ts  # The single place implementations are chosen
```

**Dependency direction:** `app → services → core`. `infrastructure` also depends
on `core`. `core` depends on nothing — that's what makes swapping painless.

### Swapping Firebase for a real backend later

You only do two things, and the **UI never changes**:

1. Add a new implementation under `src/infrastructure/<backend>/` that satisfies
   the same interface, e.g.:

   ```ts
   // src/infrastructure/api/rest-user-repository.ts
   export class RestUserRepository implements UserRepository {
     /* fetch(...) */
   }
   ```

2. Flip the line in `src/services/repository-factory.ts`:

   ```ts
   export const userRepository: UserRepository = new RestUserRepository();
   ```

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start the dev server     |
| `npm run build` | Production build         |
| `npm run start` | Run the production build |
| `npm run lint`  | Lint with ESLint         |

## Notes

- Uses the **Firebase client SDK** only. A server-side **Admin SDK** layer (for
  secure server reads/writes and verified sessions) can be added later as another
  implementation behind the same repository interfaces.
- The `/` guard is client-side. For sensitive data, also verify the
  session on the server once an Admin layer exists.
