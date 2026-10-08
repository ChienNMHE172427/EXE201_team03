using System;

namespace TravelWorkspace.API.Models.DTOs
{
    public class UserInvitationDto
    {
        public int TripMemberId { get; set; }
        public int TripId { get; set; }
        public string TripTitle { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string InviterName { get; set; } = string.Empty;
        public string InviterEmail { get; set; } = string.Empty;
        public string InviterAvatarUrl { get; set; } = string.Empty;
        public string Role { get; set; } = "Member";
        public string Status { get; set; } = "Pending";
        public DateTime InvitedAt { get; set; }
    }

    public class RespondInvitationDto
    {
        public bool Accept { get; set; }
    }
}
