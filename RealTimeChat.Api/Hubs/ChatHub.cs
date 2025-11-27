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

        public ChatHub(ChatDbContext context)
        {
            _context = context;
        }

        // USER REGISZTRÁCIÓ / ONLINE PRESENCE
        public async Task Register(Guid userId)
        {
            _connections[Context.ConnectionId] = userId;

            await Clients.All.SendAsync("UserOnline", userId);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connections.TryRemove(Context.ConnectionId, out var userId))
            {
                await Clients.All.SendAsync("UserOffline", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ROOM KEZELÉS
        public async Task JoinRoom(Guid roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
            await Clients.Group(roomId.ToString())
                .SendAsync("UserJoinedRoom", roomId, _connections.GetValueOrDefault(Context.ConnectionId));
        }

        public async Task LeaveRoom(Guid roomId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId.ToString());
            await Clients.Group(roomId.ToString())
                .SendAsync("UserLeftRoom", roomId, _connections.GetValueOrDefault(Context.ConnectionId));
        }

        // ÜZENETKÜLDÉS SZOBÁBA + MENTÉS DB-BE
        public async Task SendMessageToRoom(Guid roomId, Guid senderId, string content)
        {
            var roomExists = await _context.ChatRooms.AnyAsync(r => r.Id == roomId);
            if (!roomExists)
            {
                throw new HubException("Room does not exist.");
            }

            var userExists = await _context.Users.AnyAsync(u => u.Id == senderId);
            if (!userExists)
            {
                throw new HubException("Sender user does not exist.");
            }

            var message = new ChatMessage
            {
                RoomId = roomId,
                SenderId = senderId,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            await Clients.Group(roomId.ToString()).SendAsync("ReceiveMessage", new
            {
                message.Id,
                message.RoomId,
                message.SenderId,
                message.Content,
                message.SentAt
            });
        }

        // TYPING INDICATOR
        public async Task Typing(Guid roomId, Guid userId, bool isTyping)
        {
            await Clients.Group(roomId.ToString())
                .SendAsync("UserTyping", new
                {
                    RoomId = roomId,
                    UserId = userId,
                    IsTyping = isTyping
                });
        }
    }
}
