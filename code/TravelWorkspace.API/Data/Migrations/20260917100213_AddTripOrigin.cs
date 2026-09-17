using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWorkspace.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTripOrigin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "Trips",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Origin",
                table: "Trips");
        }
    }
}
