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
                .Include(t => t.Members)
                .Where(t => t.OwnerId == userId || t.Members.Any(m => m.UserId == userId && m.Status == "Accepted"))
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return trips.Select(MapToDto);
        }

        public async Task<TripDto?> GetTripByIdAsync(int tripId, int userId)
        {
            var trip = await _context.Trips
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId && m.Status == "Accepted")));

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
                IsPublic = request.IsPublic ?? false,
                CloneCount = 0,
                OwnerId = userId
            };

            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();

            return MapToDto(trip);
        }

        public async Task<TripDto?> UpdateTripAsync(int tripId, UpdateTripDto request, int userId)
        {
            var trip = await _context.Trips
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == tripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId)));

            if (trip == null) return null;

            trip.Title = request.Title;
            trip.Origin = request.Origin;
            trip.Destination = request.Destination;
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.Budget = request.Budget;
            trip.NumberOfParticipants = request.NumberOfParticipants;
            trip.Preferences = request.Preferences;
            if (request.IsPublic.HasValue)
            {
                trip.IsPublic = request.IsPublic.Value;
            }

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
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                throw new ArgumentException("Email không được để trống.");
            }

            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripId);
            if (trip == null)
            {
                throw new KeyNotFoundException("Không tìm thấy chuyến đi.");
            }

            // 1. Kiểm tra người gửi CÓ PHẢI LÀ OWNER của tripId hay không. Nếu không, ném UnauthorizedAccessException
            if (trip.OwnerId != inviterUserId)
            {
                throw new UnauthorizedAccessException("Bạn không phải là chủ sở hữu (Owner) của chuyến đi này.");
            }

            var normalizedEmail = request.Email.Trim().ToLower();

            // 2. Kiểm tra Email được mời có tồn tại trong bảng Users không. Nếu không, ném KeyNotFoundException
            var invitedUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted);
            if (invitedUser == null)
            {
                throw new KeyNotFoundException("Không tìm thấy tài khoản người dùng với email này.");
            }

            // 3. Kiểm tra xem người được mời đã là Owner hoặc đã có trong TripMembers chưa
            if (invitedUser.Id == trip.OwnerId)
            {
                throw new InvalidOperationException("Người dùng này là chủ sở hữu của chuyến đi.");
            }

            var existingMember = await _context.TripMembers
                .FirstOrDefaultAsync(m => m.TripId == tripId && m.UserId == invitedUser.Id);

            if (existingMember != null)
            {
                if (existingMember.Status == "Accepted")
                {
                    throw new InvalidOperationException("Người dùng này đã là thành viên của chuyến đi.");
                }
                if (existingMember.Status == "Pending")
                {
                    throw new InvalidOperationException("Lời mời đã được gửi trước đó.");
                }
                if (existingMember.Status == "Declined")
                {
                    existingMember.Status = "Pending";
                    existingMember.Role = "Member";
                    existingMember.JoinedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return true;
                }
            }

            // 4. Thêm bản ghi mới vào TripMembers với Status = "Pending"
            var tripMember = new TripMember
            {
                TripId = tripId,
                UserId = invitedUser.Id,
                Role = "Member",
                Status = "Pending",
                JoinedAt = DateTime.UtcNow
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
                IsPublic = trip.IsPublic,
                CloneCount = trip.CloneCount,
                ImageUrl = trip.ImageUrl,
                ItineraryItems = trip.ItineraryItems != null
                    ? trip.ItineraryItems.OrderBy(i => i.StartTime).Select(i => new ItineraryItemDto
                    {
                        Id = i.Id,
                        TripId = i.TripId,
                        Title = i.Title,
                        Location = i.Location,
                        Destination = i.Destination,
                        Notes = i.Notes,
                        StartTime = i.StartTime,
                        EndTime = i.EndTime,
                        Transport = i.Transport,
                        Assignee = i.Assignee,
                        Status = i.Status,
                        CreatedAt = i.CreatedAt,
                        IsPlanB = i.IsPlanB,
                        ReplacesItemId = i.ReplacesItemId
                    }).ToList()
                    : new List<ItineraryItemDto>(),
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
            
            bool isMember = trip.OwnerId == userId || trip.Members.Any(m => m.UserId == userId && m.Status == "Accepted");
            if (!isMember) return new List<MemberDto>();

            var members = new List<MemberDto>();

            string ownerInitials = !string.IsNullOrWhiteSpace(trip.Owner?.FullName)
                ? string.Join("", trip.Owner.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(s => s[0])).ToUpper()
                : "H";
            members.Add(new MemberDto
            {
                Id = trip.OwnerId,
                Name = trip.Owner?.FullName ?? "Host",
                Email = trip.Owner?.Email ?? "",
                AvatarUrl = trip.Owner?.AvatarUrl ?? "",
                Role = "Host",
                Status = "Accepted",
                Initials = ownerInitials
            });

            foreach (var m in trip.Members.Where(m => m.Status != "Declined"))
            {
                string initials = !string.IsNullOrWhiteSpace(m.User?.FullName)
                    ? string.Join("", m.User.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(s => s[0])).ToUpper()
                    : "M";
                members.Add(new MemberDto
                {
                    Id = m.UserId,
                    Name = m.User?.FullName ?? "Thành viên",
                    Email = m.User?.Email ?? "",
                    AvatarUrl = m.User?.AvatarUrl ?? "",
                    Role = string.Equals(m.Role, "Host", StringComparison.OrdinalIgnoreCase) ? "Host" : "Member",
                    Status = string.IsNullOrWhiteSpace(m.Status) ? "Accepted" : m.Status,
                    Initials = initials
                });
            }

            return members;
        }

        public async Task<int> CloneTripAsync(int originalTripId, CloneTripDto request, int userId)
        {
            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            if (string.IsNullOrWhiteSpace(request.NewTripName))
            {
                throw new ArgumentException("Tên chuyến đi mới không được để trống.", nameof(request.NewTripName));
            }

            // Xử lý Transaction an toàn
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Truy vấn Trip gốc kèm theo danh sách ItineraryItems
                // TUYỆT ĐỐI KHÔNG include/sao chép bảng Expenses (Chi phí) và Collaborators (Thành viên)
                var originalTrip = await _context.Trips
                    .Include(t => t.ItineraryItems)
                    .FirstOrDefaultAsync(t => t.Id == originalTripId);

                if (originalTrip == null)
                {
                    throw new KeyNotFoundException($"Không tìm thấy chuyến đi có ID {originalTripId}.");
                }

                // 2. Ném lỗi nếu cố clone trip chưa được Public
                if (!originalTrip.IsPublic)
                {
                    throw new UnauthorizedAccessException("Chuyến đi này chưa được chia sẻ công khai nên không thể sao chép.");
                }

                // 3. Logic Tịnh tiến ngày (Date Shifting): offsetDays = (NewStartDate.Date - originalTrip.StartDate.Date).Days
                int offsetDays = (request.NewStartDate.Date - originalTrip.StartDate.Date).Days;

                // 4. Khởi tạo Trip mới với OwnerId là User đang request
                var newTrip = new Trip
                {
                    Title = request.NewTripName.Trim(),
                    Origin = originalTrip.Origin,
                    Destination = originalTrip.Destination,
                    StartDate = originalTrip.StartDate.AddDays(offsetDays),
                    EndDate = originalTrip.EndDate.AddDays(offsetDays),
                    Budget = originalTrip.Budget,
                    NumberOfParticipants = originalTrip.NumberOfParticipants,
                    Preferences = originalTrip.Preferences,
                    OwnerId = userId,
                    IsPublic = false,
                    CloneCount = 0,
                    ImageUrl = originalTrip.ImageUrl,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Trips.Add(newTrip);
                await _context.SaveChangesAsync();

                // 5. Deep Copy ItineraryItems: tịnh tiến ngày Item.Date = Item.Date.AddDays(offsetDays), giữ nguyên StartTime và EndTime
                var oldToNewItemMap = new Dictionary<int, ItineraryItem>();

                foreach (var item in originalTrip.ItineraryItems)
                {
                    var clonedItem = new ItineraryItem
                    {
                        TripId = newTrip.Id,
                        Title = item.Title,
                        Location = item.Location,
                        Destination = item.Destination,
                        Notes = item.Notes,
                        StartTime = item.StartTime.AddDays(offsetDays),
                        EndTime = item.EndTime.AddDays(offsetDays),
                        Transport = item.Transport,
                        Assignee = item.Assignee,
                        Status = "Chưa bắt đầu",
                        IsPlanB = item.IsPlanB,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.ItineraryItems.Add(clonedItem);
                    oldToNewItemMap[item.Id] = clonedItem;
                }

                await _context.SaveChangesAsync();

                // Cập nhật ReplacesItemId cho các hoạt động Plan B nếu có
                bool hasPlanBUpdates = false;
                foreach (var item in originalTrip.ItineraryItems)
                {
                    if (item.ReplacesItemId.HasValue && oldToNewItemMap.TryGetValue(item.ReplacesItemId.Value, out var targetNewItem))
                    {
                        if (oldToNewItemMap.TryGetValue(item.Id, out var currentNewItem))
                        {
                            currentNewItem.ReplacesItemId = targetNewItem.Id;
                            hasPlanBUpdates = true;
                        }
                    }
                }

                if (hasPlanBUpdates)
                {
                    await _context.SaveChangesAsync();
                }

                // 6. Tăng CloneCount của Trip gốc lên 1
                originalTrip.CloneCount += 1;
                await _context.SaveChangesAsync();

                // Commit transaction
                await transaction.CommitAsync();

                return newTrip.Id;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<TripDto>> GetPublicTripsAsync()
        {
            var trips = await _context.Trips
                .Include(t => t.ItineraryItems)
                .Where(t => t.IsPublic)
                .OrderByDescending(t => t.CloneCount)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();

            return trips.Select(MapToDto);
        }

        public async Task<bool> ApplyTemplateAsync(int targetTripId, int templateTripId, int userId, bool overwrite = false)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var targetTrip = await _context.Trips
                    .Include(t => t.Members)
                    .Include(t => t.ItineraryItems)
                    .FirstOrDefaultAsync(t => t.Id == targetTripId && (t.OwnerId == userId || t.Members.Any(m => m.UserId == userId && m.Status == "Accepted")));

                if (targetTrip == null)
                {
                    throw new KeyNotFoundException("Không tìm thấy chuyến đi đích hoặc bạn không có quyền thao tác.");
                }

                var templateTrip = await _context.Trips
                    .Include(t => t.ItineraryItems)
                    .FirstOrDefaultAsync(t => t.Id == templateTripId && t.IsPublic);

                if (templateTrip == null)
                {
                    throw new KeyNotFoundException("Không tìm thấy lịch trình mẫu công khai.");
                }

                if (overwrite && targetTrip.ItineraryItems.Any())
                {
                    _context.ItineraryItems.RemoveRange(targetTrip.ItineraryItems);
                    await _context.SaveChangesAsync();
                }

                int offsetDays = (targetTrip.StartDate.Date - templateTrip.StartDate.Date).Days;
                var oldToNewItemMap = new Dictionary<int, ItineraryItem>();

                foreach (var item in templateTrip.ItineraryItems)
                {
                    var newItem = new ItineraryItem
                    {
                        TripId = targetTrip.Id,
                        Title = item.Title,
                        Location = item.Location,
                        Destination = item.Destination,
                        Notes = item.Notes,
                        StartTime = item.StartTime.AddDays(offsetDays),
                        EndTime = item.EndTime.AddDays(offsetDays),
                        Transport = item.Transport,
                        Assignee = item.Assignee,
                        Status = "Chưa bắt đầu",
                        IsPlanB = item.IsPlanB,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.ItineraryItems.Add(newItem);
                    oldToNewItemMap[item.Id] = newItem;
                }

                await _context.SaveChangesAsync();

                // Cập nhật ReplacesItemId cho các hoạt động Plan B nếu có
                bool hasPlanBUpdates = false;
                foreach (var item in templateTrip.ItineraryItems)
                {
                    if (item.ReplacesItemId.HasValue && oldToNewItemMap.TryGetValue(item.ReplacesItemId.Value, out var targetNewItem))
                    {
                        if (oldToNewItemMap.TryGetValue(item.Id, out var currentNewItem))
                        {
                            currentNewItem.ReplacesItemId = targetNewItem.Id;
                            hasPlanBUpdates = true;
                        }
                    }
                }

                if (hasPlanBUpdates)
                {
                    await _context.SaveChangesAsync();
                }

                templateTrip.CloneCount += 1;
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
