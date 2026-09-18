using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Data;
using TravelWorkspace.API.Models;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public class TripService : ITripService
    {
        private readonly AppDbContext _context;

        public TripService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<TripDto>> GetTripsAsync(int userId)
        {
            var trips = await _context.Trips
                .Where(t => t.OwnerId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return trips.Select(MapToDto);
        }

        public async Task<TripDto?> GetTripByIdAsync(int tripId, int userId)
        {
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripId && t.OwnerId == userId);

            return trip == null ? null : MapToDto(trip);
        }

        public async Task<TripDto> CreateTripAsync(CreateTripDto request, int userId)
        {
            var isDuplicate = await _context.Trips.AnyAsync(t => 
                t.OwnerId == userId &&
                t.Title == request.Title &&
                t.Origin == request.Origin &&
                t.Destination == request.Destination &&
                t.StartDate == request.StartDate &&
                t.EndDate == request.EndDate);

            if (isDuplicate)
            {
                throw new InvalidOperationException("Chuyến đi với dữ liệu giống hệt đã tồn tại.");
            }

            var trip = new Trip
            {
                Title = request.Title,
                Origin = request.Origin,
                Destination = request.Destination,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Budget = request.Budget,
                NumberOfParticipants = request.NumberOfParticipants,
                Preferences = request.Preferences,
                OwnerId = userId
            };

            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();

            return MapToDto(trip);
        }

        public async Task<TripDto?> UpdateTripAsync(int tripId, UpdateTripDto request, int userId)
        {
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripId && t.OwnerId == userId);

            if (trip == null) return null;

            trip.Title = request.Title;
            trip.Origin = request.Origin;
            trip.Destination = request.Destination;
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.Budget = request.Budget;
            trip.NumberOfParticipants = request.NumberOfParticipants;
            trip.Preferences = request.Preferences;

            await _context.SaveChangesAsync();
            return MapToDto(trip);
        }

        public async Task<bool> DeleteTripAsync(int tripId, int userId)
        {
            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripId && t.OwnerId == userId);

            if (trip == null) return false;

            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> InviteMemberAsync(int tripId, InviteDto request, int inviterUserId)
        {
            var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId && t.OwnerId == inviterUserId);
            if (trip == null) return false;

            var invitedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (invitedUser == null) return false; 

            if (await _context.TripMembers.AnyAsync(m => m.TripId == tripId && m.UserId == invitedUser.Id))
                return true; 

            var tripMember = new TripMember
            {
                TripId = tripId,
                UserId = invitedUser.Id,
                Role = request.Role
            };

            _context.TripMembers.Add(tripMember);
            await _context.SaveChangesAsync();

            return true;
        }

        private static TripDto MapToDto(Trip trip)
        {
            return new TripDto
            {
                Id = trip.Id,
                Title = trip.Title,
                Origin = trip.Origin,
                Destination = trip.Destination,
                StartDate = trip.StartDate,
                EndDate = trip.EndDate,
                Budget = trip.Budget,
                NumberOfParticipants = trip.NumberOfParticipants,
                Preferences = trip.Preferences,
                OwnerId = trip.OwnerId,
                CreatedAt = trip.CreatedAt
            };
        }

        public async Task<IEnumerable<MemberDto>> GetTripMembersAsync(int tripId, int userId)
        {
            var trip = await _context.Trips
                .Include(t => t.Owner)
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(t => t.Id == tripId);

            if (trip == null) return new List<MemberDto>();
            
            bool isMember = trip.OwnerId == userId || trip.Members.Any(m => m.UserId == userId);
            if (!isMember) return new List<MemberDto>();

            var members = new List<MemberDto>();

            string ownerInitials = string.Join("", trip.Owner.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(s => s[0])).ToUpper();
            members.Add(new MemberDto
            {
                Id = trip.OwnerId,
                Name = trip.Owner.FullName,
                Role = "Quản trị viên (Host)",
                Initials = ownerInitials
            });

            foreach (var m in trip.Members)
            {
                string initials = string.Join("", m.User.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(s => s[0])).ToUpper();
                members.Add(new MemberDto
                {
                    Id = m.UserId,
                    Name = m.User.FullName,
                    Role = m.Role,
                    Initials = initials
                });
            }

            return members;
        }
    }
}
