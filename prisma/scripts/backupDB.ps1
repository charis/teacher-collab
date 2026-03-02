<#
.SYNOPSIS
    Backup a PostgreSQL database using Docker (no local PostgreSQL required).

.DESCRIPTION
    This script uses a PostgreSQL Docker container to run pg_dump.
    It creates a timestamped backup folder and optionally prompts for the password.
#>

# ===== 1. Database connection details =====
$User     = '3b0475e023be9d3484d9460338cdd956e3d9b7d154830c14b7605cc798ef834a'
$Password = 'sk_FC5PbzS8jjbXifH_y7h_1'
$DbHost   = 'db.prisma.io'
$Port     = '5432'
$DbName   = 'postgres'

# ===== 2. Backup configuration =====
$BackupRoot = "C:\Users\Charis\teachercollab\prisma\db_backups"
# Create folder if it doesn't exist
if (-not (Test-Path $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot | Out-Null
}

$Timestamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupFile = "backup-$($DbName)-$Timestamp.dump"
$BackupPath = Join-Path $BackupRoot $BackupFile

Write-Host "Starting backup of database '$DbName' on host '$DbHost'..."
Write-Host "Backup will be saved to: $BackupPath"

# ===== 3. Run pg_dump in Docker =====
# Build the full Docker argument array
$dockerArgs = @(
    "run", "--rm",
    "-e", "PGPASSWORD=$Password",
    "-v", "$($BackupRoot):/backups",
    "postgres:17",
    "pg_dump",
    "--host=$DbHost",
    "--port=$Port",
    "--username=$User",
    "--format=c",
    "--blobs",
    "--verbose",
    "--file=/backups/$BackupFile",
    "$DbName"
)

# Show info
Write-Host "Executing Docker command..."

# Run Docker safely using array of arguments
try {
    & docker @dockerArgs
    Write-Host "Backup completed successfully: $BackupPath"
}
catch {
    Write-Host "Backup failed. Error details:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
finally {
    # Clean up sensitive password variables
    Remove-Variable PlainPassword -ErrorAction SilentlyContinue
    Remove-Variable BSTR -ErrorAction SilentlyContinue
    Remove-Variable Password -ErrorAction SilentlyContinue
    Write-Host "Sensitive variables cleaned from memory."
}
