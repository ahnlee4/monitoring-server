#Requires -RunAsAdministrator

param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')]
    [string]$WslAddress
)

$ErrorActionPreference = 'Stop'
$rules = @(
    @{ ListenPort = 8080; ConnectPort = 80; Name = 'Monitoring Gateway HTTP' },
    @{ ListenPort = 8443; ConnectPort = 443; Name = 'Monitoring Gateway HTTPS' }
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

Write-Host "Windows gateway forwarding configured for WSL $WslAddress"
Write-Host 'Router: external 80 -> 192.168.7.140:8080'
Write-Host 'Router: external 443 -> 192.168.7.140:8443'
