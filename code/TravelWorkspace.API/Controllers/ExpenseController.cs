using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelWorkspace.API.Models.DTOs;
using TravelWorkspace.API.Services;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/trips/{tripId}/expenses")]
    [Authorize]
    public class ExpenseController : ControllerBase
    {
        private readonly IExpenseService _expenseService;

        public ExpenseController(IExpenseService expenseService)
        {
            _expenseService = expenseService;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpenses(int tripId, [FromQuery] bool? isPersonal = null)
        {
            var userId = GetUserId();
            var expenses = await _expenseService.GetExpensesByTripIdAsync(tripId, userId, isPersonal);
            return Ok(expenses);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ExpenseSummaryDto>> GetExpenseSummary(int tripId)
        {
            var userId = GetUserId();
            var summary = await _expenseService.GetExpenseSummaryAsync(tripId, userId);
            if (summary == null) return NotFound(new { message = "Không tìm thấy chuyến đi hoặc không có quyền truy cập." });
            return Ok(summary);
        }

        [HttpPost("upload-receipt")]
        public async Task<IActionResult> UploadReceipt(int tripId, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn hình ảnh hóa đơn/khoản chi." });
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "Kích thước ảnh không được vượt quá 5MB." });
            }

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Chỉ chấp nhận định dạng ảnh JPG, JPEG, PNG hoặc WEBP." });
            }

            var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "expenses");
            if (!Directory.Exists(uploadFolder))
            {
                Directory.CreateDirectory(uploadFolder);
            }

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativeUrl = $"/uploads/expenses/{uniqueFileName}";
            return Ok(new { url = relativeUrl });
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseDto>> AddExpense(int tripId, CreateExpenseDto request)
        {
            var userId = GetUserId();
            var expense = await _expenseService.AddExpenseAsync(tripId, request, userId);
            if (expense == null) return BadRequest("Cannot add expense. Trip not found or access denied.");
            return Ok(expense);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ExpenseDto>> UpdateExpense(int tripId, int id, [FromBody] UpdateExpenseDto request)
        {
            try
            {
                if (request.Amount < 0)
                {
                    return BadRequest(new { message = "Số tiền chi tiêu không thể âm." });
                }

                var userId = GetUserId();
                var updatedExpense = await _expenseService.UpdateExpenseAsync(tripId, id, request, userId);
                if (updatedExpense == null)
                {
                    return NotFound(new { message = "Không tìm thấy khoản chi phí hoặc bạn không có quyền truy cập." });
                }

                return Ok(updatedExpense);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = $"Lỗi máy chủ khi cập nhật chi phí: {ex.Message}" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int tripId, int id)
        {
            try
            {
                var userId = GetUserId();
                var isDeleted = await _expenseService.DeleteExpenseAsync(tripId, id, userId);
                if (!isDeleted)
                {
                    return NotFound(new { message = "Không tìm thấy khoản chi phí hoặc bạn không có quyền truy cập." });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = $"Lỗi máy chủ khi xóa chi phí: {ex.Message}" });
            }
        }
    }
}
