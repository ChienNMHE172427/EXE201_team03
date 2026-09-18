using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWorkspace.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDestinationToItineraryItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Destination",
                table: "ItineraryItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Destination",
                table: "ItineraryItems");
        }
    }
}
