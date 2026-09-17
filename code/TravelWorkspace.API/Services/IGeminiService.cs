namespace TravelWorkspace.API.Services
{
    public interface IGeminiService
    {
        Task<string> GenerateItineraryAsync(string origin, string destination, int days);
        Task<List<TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto>> GenerateItineraryJsonAsync(string origin, string destination, int days, DateTime startDate);
        Task<TravelWorkspace.API.Models.DTOs.AiChatResponseDto> ChatAndModifyItineraryAsync(string userMessage, List<TravelWorkspace.API.Models.ItineraryItem> currentItems);
    }
}
