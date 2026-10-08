using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWorkspace.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddItineraryPlanB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPlanB",
                table: "ItineraryItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ReplacesItemId",
                table: "ItineraryItems",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPlanB",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "ReplacesItemId",
                table: "ItineraryItems");
        }
    }
}
