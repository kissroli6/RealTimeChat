using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealTimeChat.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserAId",
                table: "ChatRooms",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserBId",
                table: "ChatRooms",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatRooms_UserAId",
                table: "ChatRooms",
                column: "UserAId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatRooms_UserBId",
                table: "ChatRooms",
                column: "UserBId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatRooms_Users_UserAId",
                table: "ChatRooms",
                column: "UserAId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ChatRooms_Users_UserBId",
                table: "ChatRooms",
                column: "UserBId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatRooms_Users_UserAId",
                table: "ChatRooms");

            migrationBuilder.DropForeignKey(
                name: "FK_ChatRooms_Users_UserBId",
                table: "ChatRooms");

            migrationBuilder.DropIndex(
                name: "IX_ChatRooms_UserAId",
                table: "ChatRooms");

            migrationBuilder.DropIndex(
                name: "IX_ChatRooms_UserBId",
                table: "ChatRooms");

            migrationBuilder.DropColumn(
                name: "UserAId",
                table: "ChatRooms");

            migrationBuilder.DropColumn(
                name: "UserBId",
                table: "ChatRooms");
        }
    }
}
