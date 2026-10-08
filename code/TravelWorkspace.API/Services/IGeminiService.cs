namespace TravelWorkspace.API.Services
{
    public interface IGeminiService
    {
        Task<string> GenerateItineraryAsync(string origin, string destination, int days, string userApiKey = null);
        Task<List<TravelWorkspace.API.Models.DTOs.CreateItineraryItemDto>> GenerateItineraryJsonAsync(string origin, string destination, int days, DateTime startDate, string userApiKey = null, string preferences = null, decimal budget = 0, DateTime? endDate = null);
        Task<TravelWorkspace.API.Models.DTOs.AiChatResponseDto> ChatAndModifyItineraryAsync(string userMessage, List<TravelWorkspace.API.Models.DTOs.ChatMessageDto> history, List<TravelWorkspace.API.Models.ItineraryItem> currentItems, TravelWorkspace.API.Models.Trip trip, string userApiKey = null);
        Task<List<TravelWorkspace.API.Models.DTOs.AiPackingSuggestionDto>> GeneratePackingListAsync(string destination, int days, DateTime startDate, string preferences = "", string userApiKey = null);
        Task<List<TravelWorkspace.API.Models.DTOs.PlanBItemSuggestionDto>> GeneratePlanBForDateAsync(string destination, List<TravelWorkspace.API.Models.ItineraryItem> currentDayItems, DateTime targetDate, string userApiKey = null);
        Task<TravelWorkspace.API.Models.DTOs.AiTipsSummaryDto> SummarizePlaceTipsAsync(string placeId, string placeName, List<TravelWorkspace.API.Models.PlaceReview> reviews, string userApiKey = null);
        Task<List<TravelWorkspace.API.Models.DTOs.AiFoodSuggestionDto>> GetFoodSuggestionsAsync(string location, string keyword = null, string userApiKey = null);
    }
}
