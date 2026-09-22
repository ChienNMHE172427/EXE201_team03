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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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
        }
    }
}
