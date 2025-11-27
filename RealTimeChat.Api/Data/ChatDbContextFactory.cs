using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RealTimeChat.Api.Data
{
    public class ChatDbContextFactory : IDesignTimeDbContextFactory<ChatDbContext>
    {
        public ChatDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ChatDbContext>();

            var connectionString =
                "Server=(localdb)\\mssqllocaldb;Database=RealTimeChatDb;Trusted_Connection=True;MultipleActiveResultSets=true";

            optionsBuilder.UseSqlServer(connectionString);

            return new ChatDbContext(optionsBuilder.Options);
        }
    }
}
