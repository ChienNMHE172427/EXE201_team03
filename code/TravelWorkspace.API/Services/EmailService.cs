using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using System;
using System.Threading.Tasks;
using TravelWorkspace.API.Models;

namespace TravelWorkspace.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly SmtpSettings _smtpSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<SmtpSettings> smtpSettings, ILogger<EmailService> logger)
        {
            _smtpSettings = smtpSettings.Value;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            // Kiểm tra thông tin cấu hình SMTP
            if (string.IsNullOrWhiteSpace(_smtpSettings.UserName) || 
                string.IsNullOrWhiteSpace(_smtpSettings.Password) ||
                _smtpSettings.UserName.Contains("your_email"))
            {
                _logger.LogWarning("Chưa cấu hình tài khoản SMTP hợp lệ. Giả lập gửi email đến {ToEmail}", toEmail);
                Console.WriteLine("====================================================");
                Console.WriteLine($"[MOCK EMAIL TỚI {toEmail}]");
                Console.WriteLine($"Subject: {subject}");
                Console.WriteLine($"Body: {body}");
                Console.WriteLine("====================================================");
                return;
            }

            try
            {
                var message = new MimeMessage();
                var fromDisplayName = !string.IsNullOrWhiteSpace(_smtpSettings.FromDisplayName) 
                    ? _smtpSettings.FromDisplayName 
                    : "TravelWorkspace";
                var fromEmail = !string.IsNullOrWhiteSpace(_smtpSettings.FromEmail) 
                    ? _smtpSettings.FromEmail 
                    : _smtpSettings.UserName;

                message.From.Add(new MailboxAddress(fromDisplayName, fromEmail));
                message.To.Add(new MailboxAddress("", toEmail));
                message.Subject = subject;

                var bodyBuilder = new BodyBuilder { HtmlBody = body };
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();

                // Cấu hình cổng và giao thức bảo mật SSL/TLS
                // Port 465 dùng SslOnConnect, Port 587 dùng StartTls
                var secureSocketOption = _smtpSettings.Port == 465 
                    ? SecureSocketOptions.SslOnConnect 
                    : (_smtpSettings.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto);

                await client.ConnectAsync(_smtpSettings.Host, _smtpSettings.Port, secureSocketOption);
                
                // Xác thực tài khoản Gmail (Username và App Password 16 ký tự)
                await client.AuthenticateAsync(_smtpSettings.UserName, _smtpSettings.Password.Replace(" ", ""));
                
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Đã gửi email thành công đến {ToEmail}", toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gửi email đến {ToEmail} qua SMTP host {Host}:{Port}", 
                    toEmail, _smtpSettings.Host, _smtpSettings.Port);
                throw;
            }
        }
    }
}
