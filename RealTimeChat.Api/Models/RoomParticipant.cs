namespace RealTimeChat.Api.Models
{
    public class RoomParticipant
    {
        public Guid RoomId { get; set; }
        public ChatRoom Room { get; set; } = null!;

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
    }
}