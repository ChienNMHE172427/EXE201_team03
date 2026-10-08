using Microsoft.EntityFrameworkCore;
using TravelWorkspace.API.Models;

namespace TravelWorkspace.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Trip> Trips { get; set; }
        public DbSet<Destination> Destinations { get; set; }
        public DbSet<TripMember> TripMembers { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<ItineraryItem> ItineraryItems { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<TodoItem> TodoItems { get; set; }
        public DbSet<AffiliatePartner> AffiliatePartners { get; set; }
        public DbSet<PackingItem> PackingItems { get; set; }
        public DbSet<TripPhoto> TripPhotos { get; set; }
        public DbSet<PlaceReview> PlaceReviews { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Global Query Filter: Tự động loại bỏ các User đã bị xóa mềm (IsDeleted == true)
            modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);

            // Cấu hình kiểu dữ liệu decimal cho tỷ lệ hoa hồng của AffiliatePartner
            modelBuilder.Entity<AffiliatePartner>()
                .Property(a => a.CommissionRate)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Expense>()
                .HasOne(e => e.PaidBy)
                .WithMany()
                .HasForeignKey(e => e.PaidById)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TripMember>()
                .HasOne(tm => tm.User)
                .WithMany()
                .HasForeignKey(tm => tm.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ItineraryItem>()
                .HasOne(i => i.Trip)
                .WithMany(t => t.ItineraryItems)
                .HasForeignKey(i => i.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Trip)
                .WithMany(t => t.Messages)
                .HasForeignKey(m => m.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.User)
                .WithMany()
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TodoItem>()
                .HasOne(td => td.Trip)
                .WithMany(t => t.TodoItems)
                .HasForeignKey(td => td.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TodoItem>()
                .HasOne(td => td.AssignedToUser)
                .WithMany()
                .HasForeignKey(td => td.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PackingItem>()
                .HasOne(p => p.Trip)
                .WithMany()
                .HasForeignKey(p => p.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PackingItem>()
                .HasOne(p => p.Assignee)
                .WithMany()
                .HasForeignKey(p => p.AssigneeId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<TripPhoto>()
                .HasOne(tp => tp.Trip)
                .WithMany()
                .HasForeignKey(tp => tp.TripId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TripPhoto>()
                .HasOne(tp => tp.UploadedBy)
                .WithMany()
                .HasForeignKey(tp => tp.UploadedById)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<PlaceReview>()
                .HasOne(pr => pr.User)
                .WithMany()
                .HasForeignKey(pr => pr.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Trip>()
                .Property(t => t.IsPublic)
                .HasDefaultValue(false);

            modelBuilder.Entity<Trip>()
                .Property(t => t.CloneCount)
                .HasDefaultValue(0);
        }
    }
}
