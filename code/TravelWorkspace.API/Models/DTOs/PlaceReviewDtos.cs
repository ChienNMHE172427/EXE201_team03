namespace TravelWorkspace.API.Models.DTOs
{
    public class CreatePlaceReviewDto
    {
        public int Rating { get; set; } = 5;
        public string Content { get; set; } = string.Empty;
        public string? PlaceName { get; set; }
    }

    public class PlaceReviewDto
    {
        public int Id { get; set; }
        public string PlaceId { get; set; } = string.Empty;
        public string? PlaceName { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public int Rating { get; set; }
        public string Content { get; set; } = string.Empty;
        public int HelpfulCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PlaceReviewsResponseDto
    {
        public string PlaceId { get; set; } = string.Empty;
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public List<PlaceReviewDto> Reviews { get; set; } = new();
    }

    public class AiTipsSummaryDto
    {
        public string PlaceId { get; set; } = string.Empty;
        public string PlaceName { get; set; } = string.Empty;
        public int TotalReviewsAnalyzed { get; set; }
        public List<string> SummaryTips { get; set; } = new();
        public List<string> KeyTips { get => SummaryTips; set => SummaryTips = value; }
        public string OverallAdvice { get; set; } = string.Empty;
    }
}
