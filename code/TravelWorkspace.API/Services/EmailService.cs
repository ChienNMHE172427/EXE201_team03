using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using System.Threading.Tasks;

namespace TravelWorkspace.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            var senderEmail = emailSettings["SenderEmail"];
            var appPassword = emailSettings["AppPassword"];
            
            // Nếu chưa cấu hình email thật, bỏ qua không gửi để không bị lỗi ứng dụng
            if (string.IsNullOrEmpty(senderEmail) || string.IsNullOrEmpty(appPassword) || senderEmail == "your_email@gmail.com")
            {
                return;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Travel Workspace", senderEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = body };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(senderEmail, appPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}
