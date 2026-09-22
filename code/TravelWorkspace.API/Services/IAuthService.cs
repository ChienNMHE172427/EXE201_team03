using TravelWorkspace.API.Models.DTOs;
using System.Threading.Tasks;

namespace TravelWorkspace.API.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto?> RegisterAsync(RegisterDto request);
        Task<AuthResponseDto?> LoginAsync(LoginDto request);
        Task<AuthResponseDto?> GoogleLoginAsync(GoogleLoginDto request);
        Task<bool> ConfirmEmailAsync(string email, string token);
    }
}
