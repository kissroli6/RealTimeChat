using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RealTimeChat.Api.Data;
using RealTimeChat.Api.Models;

namespace RealTimeChat.Api.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ChatDbContext _context;

        // connectionId -> userId
        private static readonly ConcurrentDictionary<string, Guid> _connections = new();

        // userId -> aktív connection darabszám
        private static readonly ConcurrentDictionary<Guid, int> _userConnectionCounts = new();

        public ChatHub(ChatDbContext context)
        {
            _context = context;
        }

        // ============================
        // ✅ USER REGISZTRÁCIÓ / ONLINE
        // ============================
        public async Task Register(Guid userId)
        {
            _connections[Context.ConnectionId] = userId;

            var connectionCount = _userConnectionCounts.AddOrUpdate(
                userId,
                1,
                (_, current) => current + 1
            );

            // ✅ Csak akkor küldünk UserOnline-t,
            // ha ez az ELSŐ aktív kapcsolata
            if (connectionCount == 1)
            {
                await Clients.All.SendAsync("UserOnline", userId);
            }

            // ✅ A frissen belépő kliens megkapja,
            // kik vannak már online
            var onlineUserIds = _userConnectionCounts
                .Where(x => x.Value > 0)
                .Select(x => x.Key)
                .ToList();

            await Clients.Caller.SendAsync("InitialOnlineUsers", onlineUserIds);
        }

        // ============================
        // ✅ USER DISCONNECT / OFFLINE
        // ============================
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connections.TryRemove(Context.ConnectionId, out var userId))
            {
                if (_userConnectionCounts.TryGetValue(userId, out var count))
                {
                    var newCount = count - 1;

                    if (newCount <= 0)
                    {
                        _userConnectionCounts.TryRemove(userId, out _);

                        // ✅ Csak akkor küldünk UserOffline-t,
                        // ha az UTOLSÓ kapcsolata is megszűnt
                        await Clients.All.SendAsync("UserOffline", userId);
                    }
                    else
                    {
                        _userConnectionCounts[userId] = newCount;
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ============================
        // ROOM KEZELÉS
        // ============================
        public async Task JoinRoom(Guid roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());

            await Clients.Group(roomId.ToString())
                .SendAsync("UserJoinedRoom",
                    roomId,
                    _connections.GetValueOrDefault(Context.ConnectionId));
        }

        public async Task LeaveRoom(Guid roomId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId.ToString());

            await Clients.Group(roomId.ToString())
                .SendAsync("UserLeftRoom",
                    roomId,
                    _connections.GetValueOrDefault(Context.ConnectionId));
        }

        // ============================
        // ÜZENETKÜLDÉS + DB MENTÉS
        // ============================
        public async Task SendMessageToRoom(Guid roomId, Guid senderId, string content)
        {
            var roomExists = await _context.ChatRooms.AnyAsync(r => r.Id == roomId);
            if (!roomExists)
                throw new HubException("Room does not exist.");

            var userExists = await _context.Users.AnyAsync(u => u.Id == senderId);
            if (!userExists)
                throw new HubException("Sender user does not exist.");

            var message = new ChatMessage
            {
                RoomId = roomId,
                SenderId = senderId,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            var senderDisplayName = await _context.Users
                .Where(u => u.Id == senderId)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync();

            await Clients.Group(roomId.ToString()).SendAsync("ReceiveMessage", new
            {
                message.Id,
                message.RoomId,
                message.SenderId,
                message.Content,
                message.SentAt,
                DisplayName = senderDisplayName
            });
        }

        // ============================
        // TYPING INDICATOR
        // ============================
        public async Task Typing(Guid roomId, Guid userId, bool isTyping)
        {
            string? displayName = null;

            // Ha elkezdett gépelni, lekérjük a nevét, hogy kiírhassuk
            if (isTyping)
            {
                displayName = await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => u.DisplayName)
                    .FirstOrDefaultAsync();
            }

            await Clients.Group(roomId.ToString())
                .SendAsync("UserTyping", new
                {
                    RoomId = roomId,
                    UserId = userId,
                    DisplayName = displayName, // <--- ÚJ MEZŐ
                    IsTyping = isTyping
                });
        }
    }
}
