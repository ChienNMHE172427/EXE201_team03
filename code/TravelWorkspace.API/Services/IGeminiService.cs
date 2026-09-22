namespace TravelWorkspace.API.Services
{
    public interface IGeminiService
    {
        Task<string> GenerateItineraryAsync(string origin, string destination, int days, string userApiKey = null);
        Task<List<TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto>> GenerateItineraryJsonAsync(string origin, string destination, int days, DateTime startDate, string userApiKey = null);
        Task<TravelWorkspace.API.Models.DTOs.AiChatResponseDto> ChatAndModifyItineraryAsync(string userMessage, List<TravelWorkspace.API.Models.DTOs.ChatMessageDto> history, List<TravelWorkspace.API.Models.ItineraryItem> currentItems, TravelWorkspace.API.Models.Trip trip, string userApiKey = null);
    }
}
