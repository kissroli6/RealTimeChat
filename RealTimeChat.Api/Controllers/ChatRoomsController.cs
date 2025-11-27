using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RealTimeChat.Api.Data;
using RealTimeChat.Api.Models;

namespace RealTimeChat.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatRoomsController : ControllerBase
    {
        private readonly ChatDbContext _context;

        public ChatRoomsController(ChatDbContext context)
        {
            _context = context;
        }

        public class CreateRoomRequest
        {
            public string Name { get; set; } = default!;
            public bool IsPrivate { get; set; }
        }

        public class CreateDirectRoomRequest
        {
            public Guid UserAId { get; set; }
            public Guid UserBId { get; set; }
        }

        // Public (vagy opcionálisan minden) room listázása
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ChatRoom>>> GetRooms([FromQuery] bool includePrivate = false)
        {
            var query = _context.ChatRooms.AsQueryable();

            if (!includePrivate)
            {
                query = query.Where(r => !r.IsPrivate);
            }

            var rooms = await query
                .OrderBy(r => r.Name)
                .ToListAsync();

            return rooms;
        }

        [HttpPost]
        public async Task<ActionResult<ChatRoom>> CreateRoom([FromBody] CreateRoomRequest request)
        {
            var room = new ChatRoom
            {
                Name = request.Name,
                IsPrivate = request.IsPrivate
            };

            _context.ChatRooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, room);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ChatRoom>> GetRoom(Guid id)
        {
            var room = await _context.ChatRooms.FindAsync(id);
            if (room == null) return NotFound();
            return room;
        }

        [HttpPost("direct")]
        public async Task<ActionResult<ChatRoom>> CreateDirectRoom([FromBody] CreateDirectRoomRequest request)
        {
            if (request.UserAId == request.UserBId)
            {
                return BadRequest("A két felhasználó nem lehet ugyanaz.");
            }

            // rendezzük a GUID-okat, hogy (A,B) és (B,A) ugyanazt jelentse
            var first = request.UserAId;
            var second = request.UserBId;

            if (first.CompareTo(second) > 0)
            {
                (first, second) = (second, first);
            }

            var users = await _context.Users
                .Where(u => u.Id == first || u.Id == second)
                .ToListAsync();

            if (users.Count != 2)
            {
                return BadRequest("Az egyik vagy mindkét felhasználó nem létezik.");
            }

            // van-e már ilyen privát DM szoba?
            var existing = await _context.ChatRooms
                .FirstOrDefaultAsync(r =>
                    r.IsPrivate &&
                    r.UserAId == first &&
                    r.UserBId == second);

            if (existing != null)
            {
                return Ok(existing);
            }

            // új DM szoba létrehozása
            var room = new ChatRoom
            {
                Name = $"DM-{first}-{second}",
                IsPrivate = true,
                UserAId = first,
                UserBId = second
            };

            _context.ChatRooms.Add(room);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, room);
        }

        [HttpGet("direct/user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<ChatRoom>>> GetDirectRoomsForUser(Guid userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                return NotFound("User not found");
            }

            var rooms = await _context.ChatRooms
                .Where(r => r.IsPrivate &&
                            (r.UserAId == userId || r.UserBId == userId))
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();

            return rooms;
        }
    }
}
