Add a customer:
curl -X POST http://localhost:2900/customers?secret=YOUR_SECRET_KEY \
  -H "Content-Type: application/json" \
  -d '{"customer": "cust3"}'

Set quota:
curl -X POST http://localhost:2900/customers/cust3/quota?secret=YOUR_SECRET_KEY \
  -H "Content-Type: application/json" \
  -d '{"size": "50M"}'

Get report:
curl http://localhost:2900/report?secret=YOUR_SECRET_KEY