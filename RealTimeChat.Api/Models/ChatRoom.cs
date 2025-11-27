using System;
using System.Collections.Generic;

namespace RealTimeChat.Api.Models
{
    public class ChatRoom
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Name { get; set; } = default!;

        // public room vs privát (DM)
        public bool IsPrivate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

        // DM specifikus mezők: két résztvevő user
        public Guid? UserAId { get; set; }
        public User? UserA { get; set; }

        public Guid? UserBId { get; set; }
        public User? UserB { get; set; }
    }
}
