using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public interface IExpenseService
    {
        Task<IEnumerable<ExpenseDto>> GetExpensesByTripIdAsync(int tripId, int userId, bool? isPersonal = null);
        Task<ExpenseSummaryDto?> GetExpenseSummaryAsync(int tripId, int userId);
        Task<ExpenseDto?> AddExpenseAsync(int tripId, CreateExpenseDto request, int userId);
        Task<ExpenseDto?> UpdateExpenseAsync(int tripId, int expenseId, UpdateExpenseDto request, int userId);
        Task<bool> DeleteExpenseAsync(int tripId, int expenseId, int userId);
    }
}
