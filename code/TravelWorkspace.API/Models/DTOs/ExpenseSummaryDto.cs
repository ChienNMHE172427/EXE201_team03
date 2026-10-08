namespace TravelWorkspace.API.Models.DTOs
{
    public class ExpenseSummaryDto
    {
        public decimal GroupTotalSpent { get; set; }
        public decimal PersonalTotalSpent { get; set; }
        public decimal TripBudget { get; set; }
        public decimal GroupRemainingBudget { get; set; }
        public decimal GroupSpentPercentage { get; set; }
        public List<MemberExpenseBalanceDto> Balances { get; set; } = new();
    }

    public class MemberExpenseBalanceDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal ShareAmount { get; set; }
        public decimal NetBalance { get; set; }
    }
}
