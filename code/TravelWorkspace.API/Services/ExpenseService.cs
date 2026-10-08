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

        public async Task<IEnumerable<ExpenseDto>> GetExpensesByTripIdAsync(int tripId, int userId, bool? isPersonal = null)
        {
            // 1. Kiểm tra quyền truy cập vào chuyến đi
            var hasAccess = await _context.Trips.AnyAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));
            if (!hasAccess) return new List<ExpenseDto>();

            // 2. Query cơ sở lọc theo tripId
            var query = _context.Expenses
                .Include(e => e.PaidBy)
                .Where(e => e.TripId == tripId);

            // 3. Phân tách Quỹ chung vs Ví riêng và bảo vệ bảo mật dữ liệu riêng tư
            if (isPersonal.HasValue)
            {
                if (isPersonal.Value)
                {
                    // Lọc chỉ lấy chi phí cá nhân của CHÍNH USER đang đăng nhập
                    query = query.Where(e => e.IsPersonal && e.PaidById == userId);
                }
                else
                {
                    // Lọc chỉ lấy chi phí chung của cả nhóm
                    query = query.Where(e => !e.IsPersonal);
                }
            }
            else
            {
                // Mặc định: Lấy chi phí chung + chi phí cá nhân của chính user (tuyệt đối không lộ chi phí cá nhân của người khác)
                query = query.Where(e => !e.IsPersonal || (e.IsPersonal && e.PaidById == userId));
            }

            var expenses = await query.OrderByDescending(e => e.ExpenseDate).ToListAsync();

            return expenses.Select(e => new ExpenseDto
            {
                Id = e.Id,
                TripId = e.TripId,
                PaidById = e.PaidById,
                PaidByName = e.PaidBy?.FullName ?? "Thành viên",
                Description = e.Description,
                Amount = e.Amount,
                ExpenseDate = e.ExpenseDate,
                IsPersonal = e.IsPersonal,
                ImageUrl = e.ImageUrl
            });
        }

        public async Task<ExpenseSummaryDto?> GetExpenseSummaryAsync(int tripId, int userId)
        {
            var trip = await _context.Trips
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));

            if (trip == null) return null;

            // BẢO VỆ THUẬT TOÁN CHIA TIỀN: Bắt buộc dùng Where(e => !e.IsPersonal) để loại bỏ chi phí cá nhân
            var groupExpenses = await _context.Expenses
                .Where(e => e.TripId == tripId && !e.IsPersonal)
                .ToListAsync();

            var groupTotalSpent = groupExpenses.Sum(e => e.Amount);

            // Tổng chi phí cá nhân của chính user này
            var personalTotalSpent = await _context.Expenses
                .Where(e => e.TripId == tripId && e.IsPersonal && e.PaidById == userId)
                .SumAsync(e => e.Amount);

            var remaining = trip.Budget - groupTotalSpent;
            var percent = trip.Budget > 0 ? Math.Min((groupTotalSpent / trip.Budget) * 100, 100) : 0;

            // Thuật toán tính số dư bù trừ (Debt settlement) cho từng thành viên trong Quỹ chung
            var usersMap = new Dictionary<int, User>();
            var owner = await _context.Users.FindAsync(trip.OwnerId);
            if (owner != null) usersMap[owner.Id] = owner;

            foreach (var m in trip.Members)
            {
                if (m.User != null && !usersMap.ContainsKey(m.UserId))
                {
                    usersMap[m.UserId] = m.User;
                }
            }

            int participantCount = usersMap.Count > 0 ? usersMap.Count : (trip.NumberOfParticipants > 0 ? trip.NumberOfParticipants : 1);
            decimal sharePerMember = participantCount > 0 ? Math.Round(groupTotalSpent / participantCount, 2) : 0;

            var balances = new List<MemberExpenseBalanceDto>();
            foreach (var user in usersMap.Values)
            {
                // Chỉ tính tổng số tiền thành viên này đã chi trả cho QUỸ CHUNG (!IsPersonal)
                var memberPaidForGroup = groupExpenses.Where(e => e.PaidById == user.Id).Sum(e => e.Amount);
                balances.Add(new MemberExpenseBalanceDto
                {
                    UserId = user.Id,
                    FullName = user.FullName,
                    AvatarUrl = user.AvatarUrl,
                    PaidAmount = memberPaidForGroup,
                    ShareAmount = sharePerMember,
                    NetBalance = memberPaidForGroup - sharePerMember
                });
            }

            return new ExpenseSummaryDto
            {
                GroupTotalSpent = groupTotalSpent,
                PersonalTotalSpent = personalTotalSpent,
                TripBudget = trip.Budget,
                GroupRemainingBudget = remaining,
                GroupSpentPercentage = Math.Round(percent, 1),
                Balances = balances
            };
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
                ExpenseDate = request.ExpenseDate ?? DateTime.UtcNow,
                IsPersonal = request.IsPersonal,
                ImageUrl = request.ImageUrl
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
            
            var user = await _context.Users.FindAsync(userId);

            return new ExpenseDto
            {
                Id = expense.Id,
                TripId = expense.TripId,
                PaidById = expense.PaidById,
                PaidByName = user?.FullName ?? "Thành viên",
                Description = expense.Description,
                Amount = expense.Amount,
                ExpenseDate = expense.ExpenseDate,
                IsPersonal = expense.IsPersonal,
                ImageUrl = expense.ImageUrl
            };
        }

        public async Task<ExpenseDto?> UpdateExpenseAsync(int tripId, int expenseId, UpdateExpenseDto request, int userId)
        {
            // 1. Kiểm tra quyền truy cập vào chuyến đi
            var hasAccess = await _context.Trips.AnyAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));
            if (!hasAccess) return null;

            // 2. Chống IDOR: Xác thực expenseId phải thuộc đúng tripId
            var expense = await _context.Expenses
                .Include(e => e.PaidBy)
                .FirstOrDefaultAsync(e => e.Id == expenseId && e.TripId == tripId);

            if (expense == null) return null;

            // 3. Bảo vệ chi phí cá nhân: Nếu là khoản chi cá nhân, chỉ chính chủ sở hữu mới có quyền sửa
            if (expense.IsPersonal && expense.PaidById != userId)
            {
                return null;
            }

            // 4. Cập nhật các trường thông tin
            expense.Description = request.Description;
            expense.Amount = request.Amount;
            if (request.ExpenseDate.HasValue)
            {
                expense.ExpenseDate = request.ExpenseDate.Value;
            }
            if (request.IsPersonal.HasValue)
            {
                expense.IsPersonal = request.IsPersonal.Value;
            }
            if (request.ImageUrl != null)
            {
                expense.ImageUrl = request.ImageUrl;
            }
            if (request.PaidById.HasValue && !expense.IsPersonal)
            {
                var userExists = await _context.Users.AnyAsync(u => u.Id == request.PaidById.Value);
                if (userExists)
                {
                    expense.PaidById = request.PaidById.Value;
                }
            }

            await _context.SaveChangesAsync();

            var paidUser = await _context.Users.FindAsync(expense.PaidById);

            return new ExpenseDto
            {
                Id = expense.Id,
                TripId = expense.TripId,
                PaidById = expense.PaidById,
                PaidByName = paidUser?.FullName ?? "Thành viên",
                Description = expense.Description,
                Amount = expense.Amount,
                ExpenseDate = expense.ExpenseDate,
                IsPersonal = expense.IsPersonal,
                ImageUrl = expense.ImageUrl
            };
        }

        public async Task<bool> DeleteExpenseAsync(int tripId, int expenseId, int userId)
        {
            // 1. Kiểm tra quyền truy cập vào chuyến đi
            var hasAccess = await _context.Trips.AnyAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));
            if (!hasAccess) return false;

            // 2. Chống IDOR: Xác thực expenseId phải thuộc đúng tripId
            var expense = await _context.Expenses
                .FirstOrDefaultAsync(e => e.Id == expenseId && e.TripId == tripId);

            if (expense == null) return false;

            // 3. Bảo vệ chi phí cá nhân: Nếu là khoản chi cá nhân, chỉ chính chủ sở hữu mới được xóa
            if (expense.IsPersonal && expense.PaidById != userId)
            {
                return false;
            }

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
