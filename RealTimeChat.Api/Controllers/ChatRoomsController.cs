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
            public bool IsPrivate { get; set; }
        }

        [HttpGet("for-user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<RoomForUserDto>>> GetRoomsForUser(Guid userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists) return NotFound("User not found");

            // 1) Publikus szobák (Mindenki látja)
            var publicRooms = await _context.ChatRooms
                .Where(r => !r.IsPrivate)
                .Select(r => new RoomForUserDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    IsPrivate = false
                })
                .ToListAsync();

            // 2) Privát Csoportok (Csak tagok látják)
            // Itt használjuk az új Participants kapcsolatot!
            var privateGroups = await _context.ChatRooms
                .Include(r => r.Participants)
                .Where(r => r.IsPrivate
                            && r.UserAId == null
                            && r.UserBId == null
                            && r.Participants.Any(p => p.UserId == userId)) // <--- A LÉNYEG
                .Select(r => new RoomForUserDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    IsPrivate = true
                })
                .ToListAsync();

            // 3) DM-ek (UserA / UserB alapján)
            var dmRooms = await _context.ChatRooms
                .Where(r => r.IsPrivate && (r.UserAId == userId || r.UserBId == userId))
                .Include(r => r.UserA).Include(r => r.UserB)
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

            return publicRooms.Concat(privateGroups).Concat(dmDtos).ToList();
        }

        [HttpPost("group")]
        public async Task<ActionResult<RoomForUserDto>> CreateGroup([FromBody] CreateGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Név kötelező.");

            var newRoom = new ChatRoom
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                IsPrivate = request.IsPrivate
            };

            // Ha privát csoport, mentsük el a résztvevőket!
            if (request.IsPrivate && request.UserIds.Any())
            {
                foreach (var uid in request.UserIds)
                {
                    newRoom.Participants.Add(new RoomParticipant
                    {
                        RoomId = newRoom.Id,
                        UserId = uid
                    });
                }
            }

            _context.ChatRooms.Add(newRoom);
            await _context.SaveChangesAsync();

            return Ok(new RoomForUserDto
            {
                Id = newRoom.Id,
                Name = newRoom.Name,
                IsPrivate = newRoom.IsPrivate
            });
        }
    }
}