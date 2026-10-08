namespace TravelWorkspace.API.Models.DTOs
{
    public class CreateExpenseDto
    {
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime? ExpenseDate { get; set; }
        public bool IsPersonal { get; set; } = false;
        public string? ImageUrl { get; set; }
    }
}
