using Microsoft.AspNetCore.Mvc;
using TravelWorkspace.API.Models.DTOs;
using TravelWorkspace.API.Services;

namespace TravelWorkspace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto request)
        {
            var result = await _authService.RegisterAsync(request);
            if (result == null)
            {
                return BadRequest("Email is already taken.");
            }
            return Ok(result);
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail([FromQuery] string email, [FromQuery] string token)
        {
            var result = await _authService.ConfirmEmailAsync(email, token);
            if (!result)
                return BadRequest("Invalid email confirmation request.");
            
            return Ok(new { message = "Email confirmed successfully." });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginDto request)
        {
            try
            {
                var result = await _authService.LoginAsync(request);
                if (result == null)
                {
                    return BadRequest("Invalid credentials.");
                }
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
        }

        [HttpPost("google")]
        public async Task<ActionResult<AuthResponseDto>> GoogleLogin(GoogleLoginDto request)
        {
            var result = await _authService.GoogleLoginAsync(request);
            if (result == null)
            {
                return BadRequest("Invalid Google token.");
            }
            return Ok(result);
        }
    }
}
