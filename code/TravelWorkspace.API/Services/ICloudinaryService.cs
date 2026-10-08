using Microsoft.AspNetCore.Http;
using TravelWorkspace.API.Models.DTOs;

namespace TravelWorkspace.API.Services
{
    public interface ICloudinaryService
    {
        Task<UploadPhotoResultDto?> UploadPhotoAsync(IFormFile file, string folder = "travelworkspace/trips");
        Task<bool> DeletePhotoAsync(string publicId);
    }
}
