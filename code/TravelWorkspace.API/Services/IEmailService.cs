using System.Threading.Tasks;

namespace TravelWorkspace.API.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }
}
