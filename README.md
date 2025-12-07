# RealTimeChat – teljes stack útmutató

Modern, real-time chat alkalmazás ASP.NET Core backenden és React + TypeScript alapú frontenden. A backend SignalR-t használ az élő kommunikációhoz, EF Core-t az adatbázishoz, a frontend pedig a Vite fejlesztői eszközt és a hivatalos `@microsoft/signalr` klienst a hub-hoz való kapcsolódáshoz.

## Fő képességek
- Publikus és privát (DM) szobák, privát csoportok tagságkezeléssel.
- Perzisztens üzenet-előzmények SQL Server adatbázisban.
- Online jelenlét jelzése és gépelésindikátor SignalR eseményekkel.
- Felhasználó létrehozás / bejelentkezés felhasználónév alapján, szobaváltás és üzenetküldés a frontendről.

## Technológiai stack
- **Backend:** .NET 8, ASP.NET Core Web API, SignalR, Entity Framework Core 8, SQL Server/LocalDB, Swagger/OpenAPI.
- **Frontend:** React 19, TypeScript 5, Vite 7, Axios, `@microsoft/signalr` kliens, ESLint.

## Mappa-struktúra
- `RealTimeChat.Api/` – ASP.NET Core Web API + SignalR hub.
- `realtime-chat-frontend/` – Vite alapú React SPA.

## Backend összefoglaló
- **Program.cs:** CORS beállítás Vite fejlesztői domainekre, Swagger a fejlesztői környezetben, `/hubs/chat` hub végpont, SQL Server kapcsolat az `DefaultConnection` connection string alapján.【F:RealTimeChat.Api/Program.cs†L7-L46】
- **Adatmodell:** `User`, `ChatRoom` (publikus/privát, DM párok), `ChatMessage`, `RoomParticipant` (privát csoport tagság) – EF Core konfiguráció a `ChatDbContext`-ben.【F:RealTimeChat.Api/Data/ChatDbContext.cs†L12-L52】【F:RealTimeChat.Api/Models/ChatRoom.cs†L7-L23】
- **API-k:**
  - `POST /api/users` új felhasználó létrehozása duplikáció-ellenőrzéssel; `GET /api/users/by-username/{userName}` beléptetéskor használható keresés; `GET /api/users` összes felhasználó listázása.【F:RealTimeChat.Api/Controllers/UsersController.cs†L21-L78】
  - `GET /api/rooms/for-user/{userId}` a felhasználóhoz tartozó publikus szobák, privát csoportok és DM-ek listázása; `POST /api/rooms/direct` meglévő DM visszaadása vagy új létrehozása; `POST /api/rooms/group` új (opcionálisan privát) csoport létrehozása résztvevőkkel; `POST /api/rooms/add-member` / `remove-member` csoporttagság kezelése.【F:RealTimeChat.Api/Controllers/ChatRoomsController.cs†L17-L157】【F:RealTimeChat.Api/Controllers/ChatRoomsController.cs†L159-L214】
  - `GET /api/rooms/{roomId}/messages` lapozható üzenet-előzmények a feladó megjelenített nevével.【F:RealTimeChat.Api/Controllers/MessagesController.cs†L16-L40】
- **SignalR hub:** `/hubs/chat` a `ChatHub`-bal – regisztráció online státuszhoz, szobába belépés/kilépés, üzenetküldés perzisztens mentéssel, gépelés események küldése és fogadása.【F:RealTimeChat.Api/Hubs/ChatHub.cs†L13-L107】【F:RealTimeChat.Api/Hubs/ChatHub.cs†L109-L172】

### Backend futtatás
1. **Előfeltételek:** .NET 8 SDK, SQL Server Express / LocalDB (alapértelmezett connection string a `appsettings.json`-ban).【F:RealTimeChat.Api/appsettings.json†L2-L10】
2. **Adatbázis migrációk:** a solution gyökeréből futtasd:
   ```bash
   dotnet ef database update --project RealTimeChat.Api
   ```
   (Ha nincs telepítve, add hozzá a dotnet-ef CLI-t: `dotnet tool install --global dotnet-ef`.)
3. **API indítása:**
   ```bash
   dotnet run --project RealTimeChat.Api
   ```
   Az alapértelmezett fejlesztői URL: `https://localhost:7274`, a Swagger UI a `/swagger` útvonalon érhető el. A SignalR hub URL: `https://localhost:7274/hubs/chat`.

## Frontend összefoglaló
- **Belépés/Regisztráció:** felhasználónév alapján keresés vagy új user létrehozása, a böngésző `localStorage`-ében tárolt állapottal.【F:realtime-chat-frontend/src/App.tsx†L19-L66】
- **Szobakezelés:** DM indítása, privát csoport létrehozása, tag hozzáadás/eltávolítás, publikus szobák megjelenítése a `GET /api/rooms/for-user` válasz alapján.【F:realtime-chat-frontend/src/App.tsx†L68-L111】【F:realtime-chat-frontend/src/hooks/useChat.ts†L111-L197】
- **Valós idejű funkciók:** SignalR klienssel online státusz, gépelésjelzés és üzenetek fogadása/küldése; lapozott üzenet-előzmények betöltése a REST API-ról.【F:realtime-chat-frontend/src/hooks/useChat.ts†L19-L108】【F:realtime-chat-frontend/src/hooks/useChat.ts†L199-L238】
- **Külön konfiguráció:** az API és hub alap URL-je a `src/config.ts` fájlban állítható (`https://localhost:7274`).【F:realtime-chat-frontend/src/config.ts†L1-L4】

### Frontend futtatás
1. **Előfeltételek:** Node.js 20+ (a Vite 7 és React 19 támogatásához), npm.
2. **Telepítés:**
   ```bash
   cd realtime-chat-frontend
   npm install
   ```
3. **Fejlesztői mód:**
   ```bash
   npm run dev
   ```
   Alapértelmezett URL: `http://localhost:5173` (CORS engedélyezve a backendben). A backend HTTPS végpontjaihoz szükség lehet a fejlesztői tanúsítvány elfogadására a böngészőben.
4. **Build / preview:**
   ```bash
   npm run build
   npm run preview
   ```

## Tippek fejlesztéshez
- A SignalR kapcsolat HTTPS-t használ; ha saját tanúsítványt használsz, importáld a böngészőbe, különben a kapcsolat elutasításra kerülhet.
- Ha a frontend más porton fut, add hozzá az origin-t a `Program.cs` CORS szabályaihoz.
- Privát csoportoknál a tagságot a REST API kezeli (`add-member` / `remove-member`), a valós idejű eseményekhez pedig a hub `JoinRoom`/`LeaveRoom` metódusait hívd meg.
