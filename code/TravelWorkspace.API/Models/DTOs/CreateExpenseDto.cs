namespace TravelWorkspace.API.Models.DTOs
{
    public class CreateExpenseDto
    {
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }
}
