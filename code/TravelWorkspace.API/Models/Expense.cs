namespace TravelWorkspace.API.Models
{
    public class Expense
    {
        public int Id { get; set; }
        
        public int TripId { get; set; }
        public Trip Trip { get; set; } = null!;
        
        public int PaidById { get; set; }
        public User PaidBy { get; set; } = null!;
        
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// true = Chi phí cá nhân (Ví riêng), false = Chi phí chung của nhóm (Group Fund)
        /// </summary>
        public bool IsPersonal { get; set; } = false;

        public string? ImageUrl { get; set; }
    }
}
