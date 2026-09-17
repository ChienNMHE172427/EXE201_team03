using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWorkspace.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddItineraryItemFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Assignee",
                table: "ItineraryItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "ItineraryItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Transport",
                table: "ItineraryItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Assignee",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "Transport",
                table: "ItineraryItems");
        }
    }
}
