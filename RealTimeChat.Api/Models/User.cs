using System;

namespace RealTimeChat.Api.Models
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserName { get; set; } = default!;
        public string DisplayName { get; set; } = default!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
