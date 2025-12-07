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
            public List<Guid> ParticipantIds { get; set; } = new();
        }

        public class CreateGroupRequest
        {
            public string Name { get; set; } = default!;
            public List<Guid> UserIds { get; set; } = new();
            public bool IsPrivate { get; set; }
        }

        public class RoomMemberRequest
        {
            public Guid RoomId { get; set; }
            public Guid UserId { get; set; }
        }

        [HttpGet("for-user/{userId:guid}")]
        public async Task<ActionResult<IEnumerable<RoomForUserDto>>> GetRoomsForUser(Guid userId)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists) return NotFound("User not found");

            // 1) Publikus szobák
            var publicRooms = await _context.ChatRooms
                .Where(r => !r.IsPrivate)
                .Select(r => new RoomForUserDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    IsPrivate = false,
                    ParticipantIds = new List<Guid>()
                })
                .ToListAsync();

            // 2) Privát Csoportok
            var privateGroups = await _context.ChatRooms
                .Include(r => r.Participants)
                .Where(r => r.IsPrivate
                            && r.UserAId == null
                            && r.UserBId == null
                            && r.Participants.Any(p => p.UserId == userId))
                .Select(r => new RoomForUserDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    IsPrivate = true,
                    ParticipantIds = r.Participants.Select(p => p.UserId).ToList()
                })
                .ToListAsync();

            // 3) DM-ek
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
                    OtherDisplayName = other?.DisplayName,
                    ParticipantIds = new List<Guid>()
                };
            });

            return publicRooms.Concat(privateGroups).Concat(dmDtos).ToList();
        }

        [HttpPost("direct")]
        public async Task<ActionResult<RoomForUserDto>> CreateDirectMessage([FromQuery] Guid userId, [FromQuery] Guid targetUserId)
        {
            var existingRoom = await _context.ChatRooms
                .Where(r => r.IsPrivate &&
                            ((r.UserAId == userId && r.UserBId == targetUserId) ||
                             (r.UserAId == targetUserId && r.UserBId == userId)))
                .Include(r => r.UserA)
                .Include(r => r.UserB)
                .FirstOrDefaultAsync();

            if (existingRoom != null)
            {
                var otherUser = existingRoom.UserAId == userId ? existingRoom.UserB : existingRoom.UserA;
                return Ok(new RoomForUserDto
                {
                    Id = existingRoom.Id,
                    Name = existingRoom.Name,
                    IsPrivate = true,
                    OtherUserId = otherUser?.Id,
                    OtherDisplayName = otherUser?.DisplayName
                });
            }

            var newRoom = new ChatRoom
            {
                Id = Guid.NewGuid(),
                Name = "DM",
                IsPrivate = true,
                UserAId = userId,
                UserBId = targetUserId
            };

            _context.ChatRooms.Add(newRoom);
            await _context.SaveChangesAsync();

            var targetUser = await _context.Users.FindAsync(targetUserId);

            return Ok(new RoomForUserDto
            {
                Id = newRoom.Id,
                Name = newRoom.Name,
                IsPrivate = true,
                OtherUserId = targetUser?.Id,
                OtherDisplayName = targetUser?.DisplayName
            });
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

            if (request.IsPrivate && request.UserIds.Any())
            {
                var uniqueUserIds = request.UserIds.Distinct().ToList();

                foreach (var uid in uniqueUserIds)
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
                IsPrivate = newRoom.IsPrivate,
                ParticipantIds = request.UserIds
            });
        }

        [HttpPost("add-member")]
        public async Task<IActionResult> AddMember([FromBody] RoomMemberRequest request)
        {
            var room = await _context.ChatRooms.Include(r => r.Participants).FirstOrDefaultAsync(r => r.Id == request.RoomId);
            if (room == null) return NotFound("Szoba nem található");
            if (!room.IsPrivate) return BadRequest("Publikus szobához nem lehet így hozzáadni.");

            var exists = room.Participants.Any(p => p.UserId == request.UserId);
            if (exists) return BadRequest("A felhasználó már tagja a csoportnak.");

            room.Participants.Add(new RoomParticipant { RoomId = request.RoomId, UserId = request.UserId });
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("remove-member")]
        public async Task<IActionResult> RemoveMember([FromBody] RoomMemberRequest request)
        {
            var participant = await _context.RoomParticipants
                .FirstOrDefaultAsync(p => p.RoomId == request.RoomId && p.UserId == request.UserId);

            if (participant == null) return NotFound("A felhasználó nem tagja a szobának.");

            _context.RoomParticipants.Remove(participant);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}