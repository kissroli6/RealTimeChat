using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RealTimeChat.Api.Data;
using RealTimeChat.Api.Models;

namespace RealTimeChat.Api.Controllers
{
    [ApiController]
    [Route("api/rooms")]
    public class ChatRoomsController : ControllerBase
    {
        private readonly ChatDbContext _context;

        public ChatRoomsController(ChatDbContext context)
        {
            _context = context;
        }

        // --- DTO-k ---

        public class RoomForUserDto
        {
            public Guid Id { get; set; }
            public string Name { get; set; } = default!;
            public bool IsPrivate { get; set; }
            public Guid? OtherUserId { get; set; }
            public string? OtherDisplayName { get; set; }
        }

        public class CreateGroupRequest
        {
            public string Name { get; set; } = default!;
            public List<Guid> UserIds { get; set; } = new();
        }

        // --- VÉGPONTOK ---

        // GET: api/rooms/for-user/{userId}
        [HttpGet("for-user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<RoomForUserDto>>> GetRoomsForUser(Guid userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists) return NotFound("User not found");

            // 1) Publikus szobák (ezek jelennek meg a 'Groups' fülön)
            var publicRooms = await _context.ChatRooms
                .Where(r => !r.IsPrivate)
                .OrderBy(r => r.Name)
                .Select(r => new RoomForUserDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    IsPrivate = r.IsPrivate,
                    OtherUserId = null,
                    OtherDisplayName = null
                })
                .ToListAsync();

            // 2) DM szobák (ezek jelennek meg a 'DMs' fülön)
            var dmRooms = await _context.ChatRooms
                .Where(r => r.IsPrivate &&
                            (r.UserAId == userId || r.UserBId == userId))
                .Include(r => r.UserA)
                .Include(r => r.UserB)
                // Ha van CreatedAt, aszerint rendezzük, ha nincs, akkor Id vagy más szerint
                // .OrderBy(r => r.CreatedAt) 
                .ToListAsync();

            var dmDtos = dmRooms.Select(r =>
            {
                var other = r.UserAId == userId ? r.UserB : r.UserA;
                return new RoomForUserDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    IsPrivate = true,
                    OtherUserId = other?.Id,
                    OtherDisplayName = other?.DisplayName
                };
            });

            return publicRooms.Concat(dmDtos).ToList();
        }

        // GET: api/rooms/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ChatRoom>> GetRoom(Guid id)
        {
            var room = await _context.ChatRooms.FindAsync(id);
            if (room == null) return NotFound();
            return room;
        }

        // POST: api/rooms (Hagyományos publikus szoba létrehozás)
        [HttpPost]
        public async Task<ActionResult<ChatRoom>> CreateRoom(ChatRoom room)
        {
            room.Id = Guid.NewGuid();
            _context.ChatRooms.Add(room);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, room);
        }

        // POST: api/rooms/direct (Privát beszélgetés indítása)
        [HttpPost("direct")]
        public async Task<ActionResult<RoomForUserDto>> CreateOrGetDirectRoom(
            [FromQuery] Guid userId,
            [FromQuery] Guid targetUserId)
        {
            if (userId == targetUserId) return BadRequest("Cannot create DM with yourself.");

            var existing = await _context.ChatRooms
                .Include(r => r.UserA)
                .Include(r => r.UserB)
                .FirstOrDefaultAsync(r =>
                    r.IsPrivate &&
                    ((r.UserAId == userId && r.UserBId == targetUserId) ||
                     (r.UserAId == targetUserId && r.UserBId == userId)));

            if (existing == null)
            {
                var userA = await _context.Users.FindAsync(userId);
                var userB = await _context.Users.FindAsync(targetUserId);
                if (userA == null || userB == null) return BadRequest("User not found.");

                existing = new ChatRoom
                {
                    Id = Guid.NewGuid(),
                    IsPrivate = true,
                    Name = "DM",
                    UserAId = userA.Id,
                    UserBId = userB.Id
                    // CreatedAt = DateTime.UtcNow // Ha van ilyen property a modellben
                };

                _context.ChatRooms.Add(existing);
                await _context.SaveChangesAsync();
            }

            var other = existing.UserAId == userId ? existing.UserB : existing.UserA;
            return Ok(new RoomForUserDto
            {
                Id = existing.Id,
                Name = existing.Name,
                IsPrivate = existing.IsPrivate,
                OtherUserId = other?.Id,
                OtherDisplayName = other?.DisplayName
            });
        }

        // ⬇⬇⬇ EZ A HIÁNYZÓ RÉSZ ⬇⬇⬇

        // POST: api/rooms/group (Csoportos beszélgetés létrehozása)
        [HttpPost("group")]
        public async Task<ActionResult<RoomForUserDto>> CreateGroup([FromBody] CreateGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("A csoport nevének megadása kötelező.");
            }

            // A jelenlegi adatbázis modell alapján (IsPrivate = false) hozunk létre szobát.
            // Ez technikailag egy "Publikus szoba", ami megjelenik a Groups fülön mindenkinél.
            // (Ha privát csoportot szeretnénk zárt tagsággal, ahhoz bővíteni kellene az adatbázis sémát egy kapcsolótáblával)

            var newRoom = new ChatRoom
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                IsPrivate = false, // Fontos: false, hogy a Groups fülre kerüljön
                // CreatedAt = DateTime.UtcNow // Ha van ilyen property
            };

            _context.ChatRooms.Add(newRoom);
            await _context.SaveChangesAsync();

            // Visszatérünk a frontend által várt formátummal
            return Ok(new RoomForUserDto
            {
                Id = newRoom.Id,
                Name = newRoom.Name,
                IsPrivate = newRoom.IsPrivate,
                OtherUserId = null,
                OtherDisplayName = null
            });
        }
    }
}