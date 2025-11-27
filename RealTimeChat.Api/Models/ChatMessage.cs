using System;

namespace RealTimeChat.Api.Models
{
    public class ChatMessage
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid RoomId { get; set; }
        public ChatRoom Room { get; set; } = default!;

        public Guid SenderId { get; set; }
        public User Sender { get; set; } = default!;

        public string Content { get; set; } = default!;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
