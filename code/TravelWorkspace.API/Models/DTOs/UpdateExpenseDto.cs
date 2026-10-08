namespace TravelWorkspace.API.Models.DTOs
{
    public class UpdateExpenseDto
    {
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime? ExpenseDate { get; set; }
        public int? PaidById { get; set; }
        public bool? IsPersonal { get; set; }
        public string? ImageUrl { get; set; }
    }
}
