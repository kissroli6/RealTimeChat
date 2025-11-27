using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RealTimeChat.Api.Data;

namespace RealTimeChat.Api.Controllers
{
    [ApiController]
    [Route("api/rooms/{roomId:guid}/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly ChatDbContext _context;

        public MessagesController(ChatDbContext context)
        {
            _context = context;
        }

        // Utolsó N üzenet egy szobában (history)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetMessages(
            Guid roomId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50)
        {
            var roomExists = await _context.ChatRooms.AnyAsync(r => r.Id == roomId);
            if (!roomExists) return NotFound("Room not found");

            var messages = await _context.ChatMessages
                .Where(m => m.RoomId == roomId)
                .OrderByDescending(m => m.SentAt)
                .Skip(skip)
                .Take(take)
                .Select(m => new
                {
                    m.Id,
                    m.RoomId,
                    m.SenderId,
                    m.Content,
                    m.SentAt
                })
                .ToListAsync();

            // fordítás: régi → új sorrend
            messages.Reverse();

            return messages;
        }
    }
}
