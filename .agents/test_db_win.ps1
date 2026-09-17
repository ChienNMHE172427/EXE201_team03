$connectionString = "Server=DESKTOP-CE9FVAP;Database=master;Trusted_Connection=True;TrustServerCertificate=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connectionString)
try {
    Write-Host "Attempting to connect using Windows Authentication..."
    $conn.Open()
    Write-Host "Connection successful!"
    $conn.Close()
} catch {
    Write-Host "Connection failed:"
    Write-Host $_.Exception.ToString()
}
