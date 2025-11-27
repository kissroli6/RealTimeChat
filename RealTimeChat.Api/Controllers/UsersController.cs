using Microsoft.AspNetCore.Mvc;
using RealTimeChat.Api.Data;
using RealTimeChat.Api.Models;

namespace RealTimeChat.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ChatDbContext _context;

        public UsersController(ChatDbContext context)
        {
            _context = context;
        }

        public class CreateUserRequest
        {
            public string UserName { get; set; } = default!;
            public string DisplayName { get; set; } = default!;
        }

        [HttpPost]
        public async Task<ActionResult<User>> CreateUser([FromBody] CreateUserRequest request)
        {
            var user = new User
            {
                UserName = request.UserName,
                DisplayName = request.DisplayName
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<User>> GetUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return user;
        }
    }
}
