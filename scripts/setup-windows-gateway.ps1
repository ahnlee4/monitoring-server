#Requires -RunAsAdministrator

param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')]
    [string]$WslAddress,
    [string]$WslDistribution = 'Ubuntu',
    [string]$ProjectPath = '/home/lee/projects/monitoring-server'
)

$ErrorActionPreference = 'Stop'
$rules = @(
    @{ ListenPort = 8080; ConnectPort = 80; Name = 'Monitoring Gateway HTTP' },
    @{ ListenPort = 8443; ConnectPort = 443; Name = 'Monitoring Gateway HTTPS' },
    @{ ListenPort = 18080; ConnectPort = 8080; Name = 'Monitoring Central Server' }
)

foreach ($rule in $rules) {
    & netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$($rule.ListenPort) | Out-Null
    & netsh interface portproxy add v4tov4 `
        listenaddress=0.0.0.0 `
        listenport=$($rule.ListenPort) `
        connectaddress=$WslAddress `
        connectport=$($rule.ConnectPort) | Out-Null

    Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule `
        -DisplayName $rule.Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $rule.ListenPort | Out-Null
}

$taskName = 'Monitoring Gateway Certificate Renewal'
$taskAction = New-ScheduledTaskAction `
    -Execute 'wsl.exe' `
    -Argument "-d $WslDistribution --cd $ProjectPath ./scripts/renew-gateway-cert.sh"
$taskTrigger = New-ScheduledTaskTrigger -Daily -At '03:17'
$taskPrincipal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Highest
$taskSettings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $taskAction `
    -Trigger $taskTrigger `
    -Principal $taskPrincipal `
    -Settings $taskSettings `
    -Force | Out-Null

Write-Host "Windows gateway forwarding configured for WSL $WslAddress"
Write-Host 'Router: external 80 -> 192.168.7.140:8080'
Write-Host 'Router: external 443 -> 192.168.7.140:8443'
Write-Host 'LAN central server: 192.168.7.140:18080 -> WSL:8080'
Write-Host "Scheduled task registered: $taskName"
