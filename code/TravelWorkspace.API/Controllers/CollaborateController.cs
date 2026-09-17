using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CollaborateController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CollaborateController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        private async Task<bool> IsUserInTrip(int tripId, int userId)
        {
            var trip = await _context.Trips.Include(t => t.Members).FirstOrDefaultAsync(t => t.Id == tripId);
            if (trip == null) return false;
            return trip.OwnerId == userId || trip.Members.Any(m => m.UserId == userId);
        }

        // --- MESSAGES ---

        [HttpGet("messages/{tripId}")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetMessages(int tripId)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid();

            var messages = await _context.Messages
                .Include(m => m.User)
                .Where(m => m.TripId == tripId)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    TripId = m.TripId,
                    UserId = m.UserId,
                    UserName = m.User.FullName,
                    Content = m.Content,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost("messages/{tripId}")]
        public async Task<ActionResult<MessageDto>> SendMessage(int tripId, CreateMessageDto request)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid();

            var message = new Message
            {
                TripId = tripId,
                UserId = userId,
                Content = request.Content
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);

            return Ok(new MessageDto
            {
                Id = message.Id,
                TripId = message.TripId,
                UserId = message.UserId,
                UserName = user?.FullName ?? "Unknown",
                Content = message.Content,
                CreatedAt = message.CreatedAt
            });
        }

        // --- TODO ITEMS ---

        [HttpGet("todos/{tripId}")]
        public async Task<ActionResult<IEnumerable<TodoItemDto>>> GetTodos(int tripId)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid();

            var todos = await _context.TodoItems
                .Include(td => td.AssignedToUser)
                .Where(td => td.TripId == tripId)
                .OrderBy(td => td.IsCompleted).ThenByDescending(td => td.CreatedAt)
                .Select(td => new TodoItemDto
                {
                    Id = td.Id,
                    TripId = td.TripId,
                    Title = td.Title,
                    IsCompleted = td.IsCompleted,
                    AssignedToUserId = td.AssignedToUserId,
                    AssignedToUserName = td.AssignedToUser != null ? td.AssignedToUser.FullName : null,
                    CreatedAt = td.CreatedAt
                })
                .ToListAsync();

            return Ok(todos);
        }

        [HttpPost("todos/{tripId}")]
        public async Task<ActionResult<TodoItemDto>> CreateTodo(int tripId, CreateTodoItemDto request)
        {
            var userId = GetUserId();
            if (!await IsUserInTrip(tripId, userId)) return Forbid();

            var todo = new TodoItem
            {
                TripId = tripId,
                Title = request.Title,
                AssignedToUserId = request.AssignedToUserId
            };

            _context.TodoItems.Add(todo);
            await _context.SaveChangesAsync();

            var assignedUser = todo.AssignedToUserId.HasValue 
                ? await _context.Users.FindAsync(todo.AssignedToUserId)
                : null;

            return Ok(new TodoItemDto
            {
                Id = todo.Id,
                TripId = todo.TripId,
                Title = todo.Title,
                IsCompleted = todo.IsCompleted,
                AssignedToUserId = todo.AssignedToUserId,
                AssignedToUserName = assignedUser?.FullName,
                CreatedAt = todo.CreatedAt
            });
        }

        [HttpPut("todos/{id}/toggle")]
        public async Task<ActionResult> ToggleTodo(int id)
        {
            var userId = GetUserId();
            
            var todo = await _context.TodoItems.FindAsync(id);
            if (todo == null) return NotFound();

            if (!await IsUserInTrip(todo.TripId, userId)) return Forbid();

            todo.IsCompleted = !todo.IsCompleted;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("todos/{id}")]
        public async Task<ActionResult> DeleteTodo(int id)
        {
            var userId = GetUserId();
            
            var todo = await _context.TodoItems.FindAsync(id);
            if (todo == null) return NotFound();

            if (!await IsUserInTrip(todo.TripId, userId)) return Forbid();

            _context.TodoItems.Remove(todo);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
