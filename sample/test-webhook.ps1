$Body = Get-Content "$PSScriptRoot\fake-webhook.json" -Raw
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/webhooks/transactions" `
  -Method Post `
  -ContentType "application/json" `
  -Body $Body
