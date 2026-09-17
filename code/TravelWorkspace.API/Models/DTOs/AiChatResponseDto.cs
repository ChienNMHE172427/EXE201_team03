namespace TravelWorkspace.API.Models.DTOs
{
    public class AiChatResponseDto
    {
        public string Reply { get; set; } = string.Empty;
        public List<CreateItineraryItemDto> Items { get; set; } = new List<CreateItineraryItemDto>();
    }
}
