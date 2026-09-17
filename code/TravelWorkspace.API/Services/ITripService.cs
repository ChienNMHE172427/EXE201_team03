using TravelWorkspace.API.Models.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TravelWorkspace.API.Services
{
    public interface ITripService
    {
        Task<IEnumerable<TripDto>> GetTripsAsync(int userId);
        Task<TripDto?> GetTripByIdAsync(int tripId, int userId);
        Task<TripDto> CreateTripAsync(CreateTripDto request, int userId);
        Task<TripDto?> UpdateTripAsync(int tripId, UpdateTripDto request, int userId);
        Task<bool> DeleteTripAsync(int tripId, int userId);
        Task<bool> InviteMemberAsync(int tripId, InviteDto request, int inviterUserId);
    }
}
