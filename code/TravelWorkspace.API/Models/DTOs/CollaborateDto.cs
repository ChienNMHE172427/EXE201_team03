namespace TravelWorkspace.API.Models.DTOs
{
    public class MessageDto
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateMessageDto
    {
        public string Content { get; set; } = string.Empty;
    }

    public class TodoItemDto
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
        public int? AssignedToUserId { get; set; }
        public string? AssignedToUserName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTodoItemDto
    {
        public string Title { get; set; } = string.Empty;
        public int? AssignedToUserId { get; set; }
    }
}
