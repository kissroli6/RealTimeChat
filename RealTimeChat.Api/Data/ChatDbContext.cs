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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Room)
                .WithMany(r => r.Messages)
                .HasForeignKey(m => m.RoomId);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId);

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
        }
    }
}
