namespace TravelWorkspace.API.Services
{
    public interface IGeminiService
    {
        Task<string> GenerateItineraryAsync(string destination, int days);
    }
}
