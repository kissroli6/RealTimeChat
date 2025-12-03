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

        // DTO, amit a /for-user és a /direct is használ
        public class RoomForUserDto
        {
            public Guid Id { get; set; }
            public string Name { get; set; } = default!;
            public bool IsPrivate { get; set; }

            // DM esetén: a másik fél adatai
            public Guid? OtherUserId { get; set; }
            public string? OtherDisplayName { get; set; }
        }

        // ÖSSZES szoba az adott usernek (publikus + DM)
        // GET: api/rooms/for-user/{userId}
        [HttpGet("for-user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<RoomForUserDto>>> GetRoomsForUser(Guid userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return NotFound("User not found");
            }

            // 1) Publikus szobák – mindenki látja
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

            // 2) DM szobák – ahol benne van a user
            var dmRooms = await _context.ChatRooms
                .Where(r => r.IsPrivate &&
                            (r.UserAId == userId || r.UserBId == userId))
                .Include(r => r.UserA)
                .Include(r => r.UserB)
                .OrderBy(r => r.CreatedAt)
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

            var result = publicRooms.Concat(dmDtos).ToList();
            return result;
        }

        // Egy konkrét szoba lekérése
        // GET: api/rooms/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ChatRoom>> GetRoom(Guid id)
        {
            var room = await _context.ChatRooms.FindAsync(id);
            if (room == null)
            {
                return NotFound();
            }

            return room;
        }

        // Új publikus szoba létrehozása
        // POST: api/rooms
        [HttpPost]
        public async Task<ActionResult<ChatRoom>> CreateRoom(ChatRoom room)
        {
            room.Id = Guid.NewGuid();
            _context.ChatRooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, room);
        }

        // DM szoba létrehozása / lekérése két user között
        // POST: api/rooms/direct?userId=...&targetUserId=...
        [HttpPost("direct")]
        public async Task<ActionResult<RoomForUserDto>> CreateOrGetDirectRoom(
            [FromQuery] Guid userId,
            [FromQuery] Guid targetUserId)
        {
            if (userId == targetUserId)
            {
                return BadRequest("Cannot create DM with yourself.");
            }

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
                if (userA == null || userB == null)
                {
                    return BadRequest("User not found.");
                }

                existing = new ChatRoom
                {
                    Id = Guid.NewGuid(),
                    IsPrivate = true,
                    Name = "DM", // a feliratot a frontend fogja képezni (pl. "DM: Roli")
                    UserAId = userA.Id,
                    UserBId = userB.Id
                };

                _context.ChatRooms.Add(existing);
                await _context.SaveChangesAsync();
            }

            var other = existing.UserAId == userId ? existing.UserB : existing.UserA;

            var dto = new RoomForUserDto
            {
                Id = existing.Id,
                Name = existing.Name,
                IsPrivate = existing.IsPrivate,
                OtherUserId = other?.Id,
                OtherDisplayName = other?.DisplayName
            };

            return Ok(dto);
        }
    }
}
