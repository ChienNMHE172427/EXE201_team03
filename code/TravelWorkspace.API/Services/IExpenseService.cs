using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public interface IExpenseService
    {
        Task<IEnumerable<ExpenseDto>> GetExpensesByTripIdAsync(int tripId, int userId);
        Task<ExpenseDto?> AddExpenseAsync(int tripId, CreateExpenseDto request, int userId);
    }
}
