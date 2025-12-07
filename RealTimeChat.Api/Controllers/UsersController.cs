using Microsoft.AspNetCore.Mvc;
using RealTimeChat.Api.Data;
using RealTimeChat.Api.Models;
using Microsoft.EntityFrameworkCore;

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

        // POST: api/users -> Új felhasználó regisztrálása
        [HttpPost]
        public async Task<ActionResult<User>> CreateUser([FromBody] CreateUserRequest request)
        {
            // 1. Validáció
            if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.DisplayName))
            {
                return BadRequest("Minden mező kitöltése kötelező.");
            }

            // 2. Duplikáció ellenőrzés
            var exists = await _context.Users.AnyAsync(u => u.UserName == request.UserName);
            if (exists)
            {
                return Conflict("Ez a felhasználónév (ID) már foglalt. Válassz másikat.");
            }

            // 3. Létrehozás
            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = request.UserName,
                DisplayName = request.DisplayName,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 4. Visszatérés a létrehozott objektummal (fontos az azonnali belépéshez)
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<User>> GetUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            return user;
        }

        [HttpGet("by-username/{userName}")]
        public async Task<ActionResult<User>> GetByUserName(string userName)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserName == userName);

            if (user == null)
            {
                return NotFound("User not found");
            }

            return user;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetAllUsers()
        {
            var users = await _context.Users
                .OrderBy(u => u.DisplayName)
                .ToListAsync();

            return users;
        }
    }
}