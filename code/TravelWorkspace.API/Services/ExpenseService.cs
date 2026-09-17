using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public class ExpenseService : IExpenseService
    {
        private readonly AppDbContext _context;

        public ExpenseService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ExpenseDto>> GetExpensesByTripIdAsync(int tripId, int userId)
        {
            var hasAccess = await _context.Trips.AnyAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));
            if (!hasAccess) return new List<ExpenseDto>();

            var expenses = await _context.Expenses
                .Include(e => e.PaidBy)
                .Where(e => e.TripId == tripId)
                .ToListAsync();

            return expenses.Select(e => new ExpenseDto
            {
                Id = e.Id,
                TripId = e.TripId,
                PaidById = e.PaidById,
                PaidByName = e.PaidBy.FullName,
                Description = e.Description,
                Amount = e.Amount,
                ExpenseDate = e.ExpenseDate
            });
        }

        public async Task<ExpenseDto?> AddExpenseAsync(int tripId, CreateExpenseDto request, int userId)
        {
            var hasAccess = await _context.Trips.AnyAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));
            if (!hasAccess) return null;

            var expense = new Expense
            {
                TripId = tripId,
                PaidById = userId,
                Description = request.Description,
                Amount = request.Amount,
                ExpenseDate = DateTime.UtcNow
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
            
            var user = await _context.Users.FindAsync(userId);

            return new ExpenseDto
            {
                Id = expense.Id,
                TripId = expense.TripId,
                PaidById = expense.PaidById,
                PaidByName = user?.FullName ?? "Unknown",
                Description = expense.Description,
                Amount = expense.Amount,
                ExpenseDate = expense.ExpenseDate
            };
        }
    }
}
