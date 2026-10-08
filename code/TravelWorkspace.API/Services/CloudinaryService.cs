using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary? _cloudinary;
        private readonly ILogger<CloudinaryService> _logger;
        private readonly bool _isConfigured;

        public CloudinaryService(IConfiguration configuration, ILogger<CloudinaryService> logger)
        {
            _logger = logger;

            var cloudName = configuration["CloudinarySettings:CloudName"];
            var apiKey = configuration["CloudinarySettings:ApiKey"];
            var apiSecret = configuration["CloudinarySettings:ApiSecret"];

            if (!string.IsNullOrWhiteSpace(cloudName) && 
                !string.IsNullOrWhiteSpace(apiKey) && 
                !string.IsNullOrWhiteSpace(apiSecret) &&
                !apiSecret.Contains("your-cloudinary-api-secret"))
            {
                var account = new Account(cloudName, apiKey, apiSecret);
                _cloudinary = new Cloudinary(account);
                _cloudinary.Api.Secure = true;
                _isConfigured = true;
                _logger.LogInformation("CloudinaryService initialized successfully for cloud: {CloudName}", cloudName);
            }
            else
            {
                _isConfigured = false;
                _logger.LogWarning("Cloudinary credentials are not configured or using placeholders. Falling back to local storage.");
            }
        }

        public async Task<UploadPhotoResultDto?> UploadPhotoAsync(IFormFile file, string folder = "travelworkspace/trips")
        {
            if (file == null || file.Length == 0) return null;

            // 1. Nếu có cấu hình Cloudinary hợp lệ, tải thẳng lên Cloudinary
            if (_isConfigured && _cloudinary != null)
            {
                try
                {
                    await using var stream = file.OpenReadStream();
                    var uploadParams = new ImageUploadParams
                    {
                        File = new FileDescription(file.FileName, stream),
                        Folder = folder,
                        Transformation = new Transformation().Quality("auto").FetchFormat("auto")
                    };

                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    if (uploadResult.Error != null)
                    {
                        _logger.LogError("Cloudinary upload error: {Error}", uploadResult.Error.Message);
                        // Fallback xuống local nếu Cloudinary báo lỗi
                    }
                    else
                    {
                        return new UploadPhotoResultDto
                        {
                            PhotoUrl = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? string.Empty,
                            PublicId = uploadResult.PublicId
                        };
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Exception when uploading to Cloudinary, falling back to local file storage");
                }
            }

            // 2. Fallback lưu trữ vật lý local khi chưa setup Cloudinary account
            try
            {
                var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "gallery");
                if (!Directory.Exists(uploadDir))
                {
                    Directory.CreateDirectory(uploadDir);
                }

                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                var guid = Guid.NewGuid().ToString("N");
                var uniqueFileName = $"{guid}{extension}";
                var filePath = Path.Combine(uploadDir, uniqueFileName);

                await using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }

                return new UploadPhotoResultDto
                {
                    PhotoUrl = $"/uploads/gallery/{uniqueFileName}",
                    PublicId = $"local_gallery_{guid}"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload photo to local storage");
                return null;
            }
        }

        public async Task<bool> DeletePhotoAsync(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId)) return false;

            // Xử lý ảnh lưu local fallback
            if (publicId.StartsWith("local_gallery_"))
            {
                try
                {
                    var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "gallery");
                    var guid = publicId.Replace("local_gallery_", "");
                    var files = Directory.GetFiles(uploadDir, $"{guid}.*");
                    foreach (var f in files)
                    {
                        File.Delete(f);
                    }
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting local photo file");
                    return false;
                }
            }

            // Xóa ảnh trên Cloudinary
            if (_isConfigured && _cloudinary != null)
            {
                try
                {
                    var deleteParams = new DeletionParams(publicId);
                    var result = await _cloudinary.DestroyAsync(deleteParams);
                    return result.Result == "ok" || result.Result == "not found";
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error deleting photo from Cloudinary with publicId: {PublicId}", publicId);
                    return false;
                }
            }

            return true;
        }
    }
}
