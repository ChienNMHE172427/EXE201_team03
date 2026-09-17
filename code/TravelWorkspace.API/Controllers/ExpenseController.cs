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
        public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpenses(int tripId)
        {
            var userId = GetUserId();
            var expenses = await _expenseService.GetExpensesByTripIdAsync(tripId, userId);
            return Ok(expenses);
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseDto>> AddExpense(int tripId, CreateExpenseDto request)
        {
            var userId = GetUserId();
            var expense = await _expenseService.AddExpenseAsync(tripId, request, userId);
            if (expense == null) return BadRequest("Cannot add expense. Trip not found or access denied.");
            return Ok(expense);
        }
    }
}
