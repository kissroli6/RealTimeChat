# RealTimeChat – Backend

ASP.NET Core alapú real-time chat alkalmazás back-endje, SignalR-rel és EF Core-ral.
A projekt a következő funkciókat valósítja meg:

- Public chat roomok
- Private direct message (DM) szobák két felhasználó között
- Üzenetek perzisztens tárolása adatbázisban
- Online jelenlét jelzése (user online/offline)
- Typing indicator (ki gépel éppen)

---

## Technológiák

- .NET 8
- ASP.NET Core Web API
- SignalR
- Entity Framework Core 8 (SQL Server / LocalDB)
- Swagger (OpenAPI) – teszteléshez

---

## Projekt felépítés (főbb részek)

- `Program.cs` – ASP.NET Core konfiguráció, DI, routing, SignalR hub regisztrálása
- `Data/ChatDbContext.cs` – EF Core DbContext (Users, ChatRooms, ChatMessages)
- `Models/` – domain modellek:
  - `User`
  - `ChatRoom` (public + private/DM, UserA/UserB)
  - `ChatMessage`
- `Hubs/ChatHub.cs` – SignalR hub:
  - `Register`, `JoinRoom`, `LeaveRoom`
  - `SendMessageToRoom`
  - `Typing`
- `Controllers/` – Web API endpointok:
  - `UsersController` – user létrehozás és lekérdezés
  - `ChatRoomsController` – public roomok, DM room létrehozása és listázása
  - `MessagesController` – szobánkénti üzenet history lekérdezése

---

## Futztatás / fejlesztői környezet

### Előfeltételek

- .NET 8 SDK
- Visual Studio 2022 (vagy VS Code)
- SQL Server Express / LocalDB (alapértelmezett connection stringhez)

### Adatbázis inicializálása

1. Nyisd meg a solutiont Visual Studio-ban.
2. `Tools → NuGet Package Manager → Package Manager Console`
3. Alul a **Default project** legyen: `RealTimeChat.Api`
4. Futtasd:

   ```powershell
   Update-Database
