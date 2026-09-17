namespace TravelWorkspace.API.Models.DTOs
{
    public class ExpenseDto
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public int PaidById { get; set; }
        public string PaidByName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; }
    }
}
