using Microsoft.EntityFrameworkCore;
using RealTimeChat.Api.Models;

namespace RealTimeChat.Api.Data
{
    public class ChatDbContext : DbContext
    {
        public ChatDbContext(DbContextOptions<ChatDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<ChatRoom> ChatRooms => Set<ChatRoom>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

        // ÚJ TÁBLA
        public DbSet<RoomParticipant> RoomParticipants => Set<RoomParticipant>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // --- ChatMessage kapcsolatok ---
            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Room)
                .WithMany(r => r.Messages)
                .HasForeignKey(m => m.RoomId);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId);

            // --- DM kapcsolatok (UserA, UserB) ---
            modelBuilder.Entity<ChatRoom>()
                .HasOne(r => r.UserA)
                .WithMany()
                .HasForeignKey(r => r.UserAId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatRoom>()
                .HasOne(r => r.UserB)
                .WithMany()
                .HasForeignKey(r => r.UserBId)
                .OnDelete(DeleteBehavior.Restrict);

            // --- ÚJ: RoomParticipant Many-to-Many konfiguráció ---

            // 1. Összetett kulcs (RoomId + UserId)
            modelBuilder.Entity<RoomParticipant>()
                .HasKey(rp => new { rp.RoomId, rp.UserId });

            // 2. Kapcsolat a szobával
            modelBuilder.Entity<RoomParticipant>()
                .HasOne(rp => rp.Room)
                .WithMany(r => r.Participants) // Ez most már létezik a ChatRoom-ban!
                .HasForeignKey(rp => rp.RoomId);

            // 3. Kapcsolat a felhasználóval
            modelBuilder.Entity<RoomParticipant>()
                .HasOne(rp => rp.User)
                .WithMany() // A User modellben nem kötelező listát tartani a szobákról, ha nem akarunk
                .HasForeignKey(rp => rp.UserId);
        }
    }
}